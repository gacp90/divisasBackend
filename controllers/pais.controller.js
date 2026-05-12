const { response } = require('express');

const Pais = require('../models/pais.model');
const Department = require('../models/departments.model');
const City = require('../models/cities.model');

/** ======================================================================
 *  GET PAISES
=========================================================================*/
const getPaisesQuery = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [paises, total] = await Promise.all([

            Pais.find(query)
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Pais.countDocuments({ status: true })
        ])

        res.json({
            ok: true,
            paises,
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
 *  GET PAIS ID
=========================================================================*/
const getPaisId = async(req, res = response) => {

    try {
        const id = req.params.id;

        const paisDB = await Pais.findById(id);
        if (!paisDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este país, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            pais: paisDB
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
 *  CREATE PAIS
=========================================================================*/
const createPais = async(req, res = response) => {

    let { code, name } = req.body;

    code = code.trim();
    name = name.trim();

    try {

        const validatePais = await Pais.findOne({ code });

        if (validatePais) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existe un país con este código'
            });
        }

        const pais = new Pais(req.body);

        pais.name = name;
        pais.code = code;

        // SAVE PAIS
        await pais.save();

        res.json({
            ok: true,
            pais
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
 *  CREATE PAISES EXCEL
=========================================================================*/
const createPaisestExcel = async(req, res = response) => {

    try {

        let paises = req.body.paises;

        if (paises.length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'Lista de paises esta vacia, verifique he intene nuevamente'
            });
        }

        let i = 0;
        for (const pais of paises) {

            const validatePais = await Pais.findOne({ code: pais.code });

            if (!validatePais) {
                
                const paisNew = new Pais(pais);
    
                // SAVE PAIS
                await paisNew.save();
                i++;
            }

        }

        res.json({
            ok: true,
            total: i
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
 *  UPDATE PAIS
=========================================================================*/
const updatePais = async(req, res = response) => {

    const pid = req.params.id;

    try {

        // SEARCH
        const paisDB = await Pais.findById(pid);
        if (!paisDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun país con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        const { code, ...campos } = req.body;
        if (code && paisDB.code !== code) {
            const validateNumberId = await Pais.findOne({ code });
            if (validateNumberId) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un país con este código...'
                });
            }

            campos.code = code;
        }

        // UPDATE
        const paisUpdate = await Pais.findByIdAndUpdate(pid, campos, { new: true, useFindAndModify: false });

        // CASCADING DEACTIVATION
        if (campos.status === false || campos.status === 'false') {
            const departments = await Department.find({ pais: pid });
            const depIds = departments.map(d => d._id);
            
            await Department.updateMany({ pais: pid }, { status: false });
            if (depIds.length > 0) {
                await City.updateMany({ department: { $in: depIds } }, { status: false });
            }
        }
        
        // CASCADING ACTIVATION
        if (campos.status === true || campos.status === 'true') {
            const departments = await Department.find({ pais: pid });
            const depIds = departments.map(d => d._id);
            
            await Department.updateMany({ pais: pid }, { status: true });
            if (depIds.length > 0) {
                await City.updateMany({ department: { $in: depIds } }, { status: true });
            }
        }

        res.json({
            ok: true,
            pais: paisUpdate
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
    getPaisesQuery,
    createPais,
    updatePais,
    getPaisId,
    createPaisestExcel
};