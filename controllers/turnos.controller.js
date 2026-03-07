const { response } = require('express');

const Turno = require('../models/turnos.model');
const User = require('../models/users.model');

/** ======================================================================
 *  GET QUERY
=========================================================================*/
const getTurnosQuery = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [turnos, total] = await Promise.all([
            Turno.find(query)
            .populate('user')
            .populate('saldos.moneda')
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Turno.countDocuments(query)
        ])

        res.json({
            ok: true,
            turnos,
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
 *  GET ID
=========================================================================*/
const getTurnoId = async(req, res = response) => {

    try {
        const turid = req.params.id;

        const turnoDB = await Turno.findById(turid)
            .populate('user')
            .populate('saldos.moneda')
        if (!turnoDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este turno, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            turno: turnoDB
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
const createTurno = async (req, res = response) => {
    const uid = req.uid;

    try {

        const {saldos} = req.body;
        
        const userDB = await User.findById(uid)
            .populate('turno');
        if (!userDB) {
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        }

        if (userDB.turno?.abierto) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya tienes un turno abierto'
            });
        }

        const turno = new Turno({
            ...req.body,
            user: uid,
            abierto: true,
            saldos
        });

        const [turnoGuardado] = await Promise.all([
            turno.save(),
            userDB.updateOne({ turno: turno._id })
        ]);

        const turnoNew = await Turno.findById(turnoGuardado._id)
            .populate('user')
            .populate('saldos.moneda');

        res.status(201).json({
            ok: true,
            turno: turnoNew
        });

    } catch (error) {
        console.error('Error en createTurno:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear el turno, hable con el administrador'
        });
    }
};

/** =====================================================================
 *  UPDATE
=========================================================================*/
const updateTurno = async(req, res = response) => {

    const turid = req.params.id;

    try {

        // SEARCH
        const turnoDB = await Turno.findById(turid);
        if (!turnoDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun turno con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        const {...campos } = req.body;

        // UPDATE
        const turnoUpdate = await Turno.findByIdAndUpdate(turid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            turno: turnoUpdate
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
    getTurnosQuery,
    createTurno,
    updateTurno,
    getTurnoId
};