const { response } = require('express');

const getRateModel = require('../models/rates.model');

/** ======================================================================
 *  GET RATES
=========================================================================*/
const getRatesQuery = async(req, res) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Rate = getRateModel(req.branchDb);

        const { desde, hasta, sort, ...query } = req.body;

        const [rates, total] = await Promise.all([

            Rate.find(query)
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Rate.countDocuments({ status: true })
        ])

        res.json({
            ok: true,
            rates,
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
 *  GET RATE ID
=========================================================================*/
const getRateId = async(req, res = response) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Rate = getRateModel(req.branchDb);
        const id = req.params.id;

        const rateDB = await Rate.findById(id);
        if (!rateDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado esta tasa, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            rate: rateDB
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });
    }

};


// EXPORTS
module.exports = {
    getRatesQuery,
    getRateId
};