const { response } = require('express');

const getTrasladoModel = require('../models/traslados.model');
const getUserModel = require('../models/users.model');
const { actualizarSaldosTraslado } = require('../../../shared/helpers/updateSaldosTurnos');

/** ======================================================================
 *  GET QUERY
=========================================================================*/
const getTrasladosQuery = async(req, res) => {

    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'No se detectó el contexto de la empresa' });
        const Traslado = getTrasladoModel(req.companyDb);
        const User = getUserModel(req.companyDb);

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
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'No se detectó el contexto de la empresa' });
        const Traslado = getTrasladoModel(req.companyDb);
        const User = getUserModel(req.companyDb);

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
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'No se detectó el contexto de la empresa' });
        const Traslado = getTrasladoModel(req.companyDb);
        const User = getUserModel(req.companyDb);
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
        if (!req.companyDb || !req.branchDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos DB' });
        const Traslado = getTrasladoModel(req.companyDb);
        const UserBranch = getUserModel(req.branchDb);
        
        const userDB = await UserBranch.findById(uid).populate('turno');
        
        if (!userDB) {
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        }

        if (!userDB.turno?.abierto) {
            return res.status(400).json({ ok: false, msg: 'Debes tener un turno abierto' });
        }

        req.body.emisor = uid;
        req.body.turnoEmisor = userDB.turno._id;
        const traslado = new Traslado(req.body);
        
        const resultadoSaldos = await actualizarSaldosTraslado(req.body, req.branchDb);

        traslado.receptor = resultadoSaldos.tReceptor.user;

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
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'No se detectó el contexto de la empresa' });
        const Traslado = getTrasladoModel(req.companyDb);

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
        const {...campos } = req.body;

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