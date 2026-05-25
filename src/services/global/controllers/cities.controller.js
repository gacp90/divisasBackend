const { response } = require('express');

const City = require('../models/cities.model');

/** ======================================================================
 *  GET CITY
=========================================================================*/
const getCitiesQuery = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [cities, total] = await Promise.all([
            City.find(query)
            .populate('department')
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            City.countDocuments({ status: true })
        ])

        res.json({
            ok: true,
            cities,
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
 *  GET CITY ID
=========================================================================*/
const getCityId = async(req, res = response) => {

    try {
        const citid = req.params.id;

        const cityDB = await City.findById(citid);
        if (!cityDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado esta ciudad, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            city: cityDB
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
 *  CREATE CITY
=========================================================================*/
const createCity = async(req, res = response) => {

    let { code, department, name } = req.body;

    code = code.trim();

    try {

        const validateCity = await City.findOne({ code, department });

        if (validateCity) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existe una ciudad con este codigo'
            });
        }

        const cityNew = new City(req.body);

        cityNew.code = code;
        cityNew.name = name.trim().toUpperCase();

        // SAVE
        await cityNew.save();

        const city = await City.findById(cityNew._id);

        res.json({
            ok: true,
            city
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
 *  CREATE EXCEL
=========================================================================*/
const createCitiesExcel = async (req, res = response) => {
    try {
        let { ciudades } = req.body;

        if (!ciudades || ciudades.length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'Lista de ciudades está vacía'
            });
        }
        const ops = ciudades
            .filter(c => c.code && c.department)
            .map(ciudad => ({
                updateOne: {
                    filter: { code: ciudad.code, department: ciudad.department },
                    update: { $setOnInsert: ciudad },
                    upsert: true
                }
            }));

        if (ops.length === 0) {
            return res.status(400).json({ ok: false, msg: 'No hay ciudades válidas para procesar' });
        }

        // GUARDAMOS CON EL BULKWRITE
        const result = await City.bulkWrite(ops);

        res.json({
            ok: true,
            total: result.upsertedCount,
            totalProcesados: ops.length,
            msg: `Se han creado ${result.upsertedCount} nuevas ciudades.`
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, hable con el administrador'
        });
    }
};

/** =====================================================================
 *  UPDATE CITY
=========================================================================*/
const updateCity = async(req, res = response) => {

    const citid = req.params.id;

    try {

        // SEARCH
        const cityDB = await City.findById(citid);
        if (!cityDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ninguna ciudad con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        const { code, ...campos } = req.body;
        if (cityDB.code !== code) {
            const validateCode = await City.findOne({ code });
            if (validateCode) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe una ciudad con este codigo...'
                });
            }

            campos.code = code.trim();
        }

        // UPDATE
        const cityUpdate = await City.findByIdAndUpdate(citid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            city: cityUpdate
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
    getCitiesQuery,
    createCity,
    updateCity,
    getCityId,
    createCitiesExcel
};