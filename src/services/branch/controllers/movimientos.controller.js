const { response } = require('express');

const getMovimientoModel = require('../models/movimientos.model');
const getUserModel = require('../../company/models/users.model');
const getTurnoModel = require('../models/turnos.model');


/** ======================================================================
 *  GET MOVIMIENTOS
=========================================================================*/
const getMovimientosQuery = async(req, res) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Movimiento = getMovimientoModel(req.branchDb);

        const { desde, hasta, sort, ...query } = req.body;

        const [movimientos, total] = await Promise.all([
            Movimiento.find(query)
            .populate('user')
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Movimiento.countDocuments(query)
        ])

        res.json({
            ok: true,
            movimientos,
            total
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });

    }


};

/** =====================================================================
 *  GET MOVIMIENTO ID
=========================================================================*/
const getMovimientoId = async(req, res = response) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Movimiento = getMovimientoModel(req.branchDb);
        const movid = req.params.id;

        const movimientoDB = await Movimiento.findById(movid)
            .populate('user')
        if (!movimientoDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este movimiento, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            movimiento: movimientoDB
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });
    }

};

/** =====================================================================
 *  CREATE MOVIMIENTO
=========================================================================*/
const createMovimiento = async(req, res = response) => {


    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Movimiento = getMovimientoModel(req.branchDb);
        const User = getUserModel(req.branchDb);
        const Turno = getTurnoModel(req.branchDb);

        const uid = req.uid;
        const user = await User.findById(uid)
            .populate('turno');
        if (!user) {
            return res.status(400).json({
                ok: false,
                msg: 'No existe ningun usuario con este ID'
            });
        }

        if (!user.turno || !user.turno.abierto) {
            return res.status(400).json({
                ok: false,
                msg: 'No tienes un turno abierto para operar. Por favor, abre uno.'
            });
        }

        // VALIDAR VIGENCIA DEL TURNO (NO PERMITIR OPERACIONES SI CAMBIÓ EL DÍA)
        if (user.turno.open) {
            const dateEnBogota = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Bogota"}));
            const turnoOpenDate = new Date(new Date(user.turno.open).toLocaleString("en-US", {timeZone: "America/Bogota"}));
            
            if (dateEnBogota.toDateString() !== turnoOpenDate.toDateString()) {
                return res.status(403).json({
                    ok: false,
                    msg: 'Tu turno ha expirado por cambio de fecha (es de un día anterior). Debes cerrarlo obligatoriamente para continuar.'
                });
            }
        }

        req.body.user = uid;
        req.body.turno = user.turno._id;
        const movimiento = new Movimiento(req.body);

        if (movimiento.amount <= 0) {
            return res.status(400).json({ ok: false, msg: 'Error: El monto del movimiento debe ser mayor a cero.' });
        }

        // SI es entrada o salida
        const turno = await Turno.findById(user.turno._id).populate('saldos.moneda');
        const idxCop = turno.saldos.findIndex(s => s.moneda && s.moneda.code === 'COP');

        if (idxCop === -1) {
            return res.status(400).json({ 
                ok: false, 
                msg: 'La moneda COP no está inicializada en la caja de este turno' 
            });
        }
        if (movimiento.type === 'Entrada') {
            turno.saldos[idxCop].saldoActual += movimiento.amount;
            turno.totalEntradasCOP += movimiento.amount;
            
        }else{
            if (turno.saldos[idxCop].saldoActual < movimiento.amount) {
                return res.status(400).json({ 
                    ok: false, 
                    msg: 'No tienes suficiente efectivo físico en COP para registrar esta salida' 
                });
            }
            turno.saldos[idxCop].saldoActual -= movimiento.amount; 
            turno.totalSalidasCOP += movimiento.amount;
        }

        //save
        const [movimientoNew, turnoNew] = await Promise.all([
            movimiento.save(),
            turno.save()
        ])

        await turnoNew.populate('saldos.moneda');

        res.json({
            ok: true,
            movimiento: movimientoNew,
            turno: turnoNew
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }
};

/** =====================================================================
 *  UPDATE MOVIMIENTO
=========================================================================*/
const updateMovimiento = async(req, res = response) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Movimiento = getMovimientoModel(req.branchDb);
        const movid = req.params.id;

        // SEARCH
        const movimientoDB = await Movimiento.findById(movid);
        if (!movimientoDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun movimiento con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        const {...campos } = req.body;

        // UPDATE
        const movimientoUpdate = await Movimiento.findByIdAndUpdate(movid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            movimiento: movimientoUpdate
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

};

const deleteMovimiento = async(req, res = response) => {
        
    const movimientoId = req.params.id; 

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Movimiento = getMovimientoModel(req.branchDb);
        const Turno = getTurnoModel(req.branchDb);
        
        // Validar movimiento
        const movimiento = await Movimiento.findById(movimientoId);
        if (!movimiento) {
            return res.status(404).json({ ok: false, msg: 'El movimiento no existe' });
        }

        // Validar turno
        const turno = await Turno.findById(movimiento.turno).populate('saldos.moneda');
        if (!turno) {
            return res.status(404).json({ ok: false, msg: 'El turno asociado no existe' });
        }        
        if (!turno.abierto) {
            return res.status(400).json({ ok: false, msg: 'No puedes eliminar movimientos de un turno cerrado' });
        }

        // INDX
        const idxCop = turno.saldos.findIndex(s => s.moneda && s.moneda.code === 'COP');
        if (idxCop === -1) {
            return res.status(400).json({ ok: false, msg: 'Moneda COP no encontrada en el turno' });
        }

        const amount = movimiento.amount;

        // Tipo de movimiento
        if (movimiento.type === 'Entrada') {
        
        
            if (turno.saldos[idxCop].saldoActual < amount) {
                return res.status(400).json({ 
                    ok: false, 
                    msg: 'No puedes eliminar esta entrada porque ya gastaste o vendiste ese dinero. La caja quedaría en negativo.' 
                });
            }
            turno.saldos[idxCop].saldoActual -= amount;
            turno.totalEntradasCOP -= amount;

        } else if (movimiento.type === 'Salida') {
        
            turno.saldos[idxCop].saldoActual += amount; 
            turno.totalSalidasCOP -= amount;
        }

    
        await Promise.all([
            movimiento.deleteOne(),
            turno.save()           
        ]);

        await turno.populate('saldos.moneda');

        res.json({
            ok: true,
            msg: 'Movimiento eliminado y saldos restaurados',
            turno
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }
};


// EXPORTS
module.exports = {
    getMovimientosQuery,
    createMovimiento,
    updateMovimiento,
    getMovimientoId,
    deleteMovimiento
};