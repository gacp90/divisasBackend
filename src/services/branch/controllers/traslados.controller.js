const { response } = require('express');

const getTrasladoModel = require('../models/traslados.model');
const getUserModel = require('../../company/models/users.model');
const { actualizarSaldosTraslado } = require('../../../shared/helpers/updateSaldosTurnos');

/** ======================================================================
 *  GET QUERY
=========================================================================*/
const getTrasladosQuery = async(req, res) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'No se detectó el contexto de la sucursal' });
        const Traslado = getTrasladoModel(req.branchDb);
        const User = getUserModel(req.branchDb);

        const { desde, hasta, sort, ...query } = req.body;

        const [traslados, total] = await Promise.all([
            Traslado.find(query)
            .populate('user')
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Traslado.countDocuments(query)
        ])

        res.json({
            ok: true,
            traslados,
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

/** ======================================================================
 *  GET QUERY CIERRES
=========================================================================*/
const getTrasladosCierre = async(req, res) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'No se detectó el contexto de la sucursal' });
        const Traslado = getTrasladoModel(req.branchDb);
        const User = getUserModel(req.branchDb);

        const { turno } = req.body;

        const [trasladosEmitidos, trasladosRecibidos] = await Promise.all([
            Traslado.find({turnoEmisor: turno })
                .populate('emisor')
                .populate('receptor')
                .populate('monedaEntregada')
                .populate('monedaRecibida'),
            Traslado.find({turnoReceptor: turno })
                .populate('emisor')
                .populate('receptor')
                .populate('monedaEntregada')
                .populate('monedaRecibida')
        ])

        res.json({
            ok: true,
            trasladosEmitidos,
            trasladosRecibidos
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
 *  GET ID
=========================================================================*/
const getTrasladoId = async(req, res = response) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'No se detectó el contexto de la sucursal' });
        const Traslado = getTrasladoModel(req.branchDb);
        const User = getUserModel(req.branchDb);
        const trasladoID = req.params.id;

        const trasladoDB = await Traslado.findById(trasladoID)
            .populate('user')
        if (!trasladoDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este traslado, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            traslado: trasladoDB
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
 *  CREATE
=========================================================================*/
const createTraslado = async (req, res = response) => {
    const uid = req.uid;

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos DB' });
        const Traslado = getTrasladoModel(req.branchDb);
        const UserBranch = getUserModel(req.branchDb);
        
        const userDB = await UserBranch.findById(uid).populate('turno');
        
        if (!userDB) {
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        }

        if (!userDB.turno?.abierto) {
            return res.status(400).json({ ok: false, msg: 'Debes tener un turno abierto para realizar traslados.' });
        }

        // VALIDAR VIGENCIA DEL TURNO (NO PERMITIR OPERACIONES SI CAMBIÓ EL DÍA)
        if (userDB.turno.open) {
            const dateEnBogota = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Bogota"}));
            const turnoOpenDate = new Date(new Date(userDB.turno.open).toLocaleString("en-US", {timeZone: "America/Bogota"}));
            
            if (dateEnBogota.toDateString() !== turnoOpenDate.toDateString()) {
                return res.status(403).json({
                    ok: false,
                    msg: 'Tu turno ha expirado por cambio de fecha (es de un día anterior). Debes cerrarlo obligatoriamente para continuar.'
                });
            }
        }

        req.body.emisor = uid;
        req.body.turnoEmisor = userDB.turno._id;
        const traslado = new Traslado(req.body);
        
        const resultadoSaldos = await actualizarSaldosTraslado(req.body, req.branchDb);

        traslado.receptor = resultadoSaldos.tReceptor.user;

        const Turno = require('../models/turnos.model')(req.branchDb);
        const [trasladoNew, turno] = await Promise.all([
            traslado.save(),
            Turno.findById(resultadoSaldos.tEmisor._id || resultadoSaldos.tEmisor.turid)
                .populate('user')
                .populate('saldos.moneda')
        ]);

        res.json({
            ok: true,
            traslado: trasladoNew,
            turno
        });

    } catch (error) {
        console.error('Error en createTraslado:', error);
        if (error.message) {
             return res.status(400).json({
                ok: false,
                msg: error.message
            });
        }

        res.status(500).json({
            ok: false,
            msg: 'Error interno al procesar el traslado'
        });
    }
};

/** =====================================================================
 *  UPDATE
=========================================================================*/
const updateTraslado = async(req, res = response) => {

    const trasladoID = req.params.id;

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'No se detectó el contexto de la sucursal' });
        const Traslado = getTrasladoModel(req.branchDb);

        // SEARCH
        const trasladoDB = await Traslado.findById(trasladoID);
        if (!trasladoDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun traslado con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        let campos = { ...req.body };

        if (campos.accion === 'PAGADO' || campos.pendiente === false) {
            
            if (trasladoDB.pendiente === false && trasladoDB.requiereRevision === false) {
                return res.status(400).json({ ok: false, msg: 'El traslado ya fue resuelto previamente.' });
            }

            campos.pendiente = false;
            campos.requiereRevision = false;
            let historialItem = {
                fecha: new Date(),
                usuario: req.uid,
                accion: 'PAGADO',
                nota: campos.nota || 'Préstamo interno saldado operativamente.'
            };
            campos.$push = { historialRevision: historialItem };
            delete campos.accion;
            delete campos.nota;

        } else if (campos.accion === 'MANTENER_PENDIENTE') {
            let historialItem = {
                fecha: new Date(),
                usuario: req.uid,
                accion: 'MANTENER_PENDIENTE',
                nota: campos.nota || 'Pendiente mantenido'
            };
            campos.$push = { historialRevision: historialItem };
            delete campos.accion;
            delete campos.nota;
            campos.pendiente = true;
            campos.requiereRevision = true;
        }

        // UPDATE
        const trasladoUpdate = await Traslado.findByIdAndUpdate(trasladoID, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            traslado: trasladoUpdate
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
    getTrasladosQuery,
    createTraslado,
    updateTraslado,
    getTrasladoId,
    getTrasladosCierre
};