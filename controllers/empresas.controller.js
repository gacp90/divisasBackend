const { response } = require('express');

const path = require('path');
const fs = require('fs');
const ObjectId = require('mongoose').Types.ObjectId;

const sharp = require('sharp');

const { v4: uuidv4 } = require('uuid');

const Empresa = require('../models/empresa.model');

/** ======================================================================
 *  GET EMPRESA
=========================================================================*/
const getEmpresa = async(req, res) => {

    try {

        const {...query } = req.body;

        const empresa = await Empresa.findOne(query)

        res.json({
            ok: true,
            empresa
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
 *  CREATE EMRESA
=========================================================================*/
const createEmpresa = async(req, res = response) => {

    try {

        const validarDatos = await Empresa.find();

        if (validarDatos.length !== 0) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya se crearon los datos de la empresa en el sistema'
            });
        }

        const empresa = new Empresa(req.body);

        // SAVE EMPRESA
        await empresa.save();

        res.json({
            ok: true,
            empresa
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
 *  UPDATE EMPRESA
=========================================================================*/
const updateEmpresa = async(req, res = response) => {


    try {
        const eid = req.params.id;

        // SEARCH EMPRESA
        const empresaDB = await Empresa.findById(eid);
        if (!empresaDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Error al actualizar los datos de la empresa, ID incorrecto'
            });
        }
        // SEARCH EMPRESA

        // VALIDATE EMPRESA
        const campos = req.body;

        // UPDATE
        const empresaUpdate = await Empresa.findByIdAndUpdate(eid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            empresa: empresaUpdate
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
 *  UPDATE LOGO
=========================================================================*/
const updateLogo = async(req, res = response) => {

    try {

        const eid = req.params.id;

        // SEARCH EMPRESA
        const empresaDB = await Empresa.findById(eid);
        if (!empresaDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Error al actualizar los datos de la empresa, ID incorrecto'
            });
        }

        // VALIDATE IMAGE
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'No has seleccionado ningún archivo'
            });
        }

        // PROCESS IMAGE
        const file = await sharp(req.files.image.data).metadata();

        // FORMAT
        const extFile = file.format;

        // VALID EXT
        const validExt = ['jpg', 'png', 'jpeg', 'webp', 'bmp', 'svg'];
        if (!validExt.includes(extFile)) {
            return res.status(400).json({
                ok: false,
                msg: 'No se permite este tipo de imagen, solo extenciones JPG - PNG - WEBP - SVG'
            });
        }

        // GENERATE NAME UID
        const nameFile = `${ uuidv4() }.webp`;

        // PATH IMAGE
        const path = `./uploads/logo/${ nameFile }`;

        sharp(req.files.image.data)
            .resize(600, 400)
            .webp({ equality: 75, effort: 6 })
            .toFile(path, (err, info) => {

                // VALIDATE IMAGE
                if (empresaDB.logo) {                    
                    if (fs.existsSync(`./uploads/logo/${ empresaDB.logo }`)) {
                        // DELET IMAGE OLD
                        fs.unlinkSync(`./uploads/logo/${ empresaDB.logo }`);
                    }
                }

                // UPDATE IMAGE
                empresaDB.logo = nameFile;
                empresaDB.save();

                res.json({
                    ok: true,
                    empresa: empresaUpdate
                });
                

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
    getEmpresa,
    createEmpresa,
    updateEmpresa,
    updateLogo
};