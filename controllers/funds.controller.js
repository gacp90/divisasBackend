const { response } = require('express');

const Funds = require('../models/funds.model');

/** ======================================================================
 *  GET FUNDS
=========================================================================*/
const getFundsQuery = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [funds, total] = await Promise.all([
            Funds.find(query)
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Funds.countDocuments({ status: true })
        ])

        res.json({
            ok: true,
            funds,
            total
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, por favor intente nuevamente'
        });

    }


};

/** =====================================================================
 *  GET FUNDS ID
=========================================================================*/
const getFundsId = async(req, res = response) => {

    try {
        const funid = req.params.id;

        const fundsDB = await Funds.findById(funid);
        if (!fundsDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este fondo, por favor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            funds: fundsDB
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, por favor intente nuevamente'
        });
    }

};

/** =====================================================================
 *  CREATE FUNDS
=========================================================================*/
const createFunds = async(req, res = response) => {

    let { name } = req.body;

    name = name.trim();

    try {

        const validateFunds = await Funds.findOne({ name });

        if (validateFunds) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existe un origen de fondos con este nombre'
            });
        }

        const funds = new Funds(req.body);

        funds.name = name;

        // SAVE
        await funds.save();

        res.json({
            ok: true,
            funds
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
 *  UPDATE FUNDS
=========================================================================*/
const updateFunds = async(req, res = response) => {

    const funid = req.params.id;

    try {

        // SEARCH
        const fundsDB = await Funds.findById(funid);
        if (!fundsDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun fondo con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        const { name, ...campos } = req.body;
        if (fundsDB.name !== name) {
            const validateNumberId = await Funds.findOne({ name });
            if (validateNumberId) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un fondo con este nombre...'
                });
            }

            campos.name = name;
        }

        // UPDATE
        const fundsUpdate = await Funds.findByIdAndUpdate(funid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            funds: fundsUpdate
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
    getFundsQuery,
    createFunds,
    updateFunds,
    getFundsId
};