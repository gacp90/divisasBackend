const { response } = require('express');

const path = require('path');
const fs = require('fs');
const ObjectId = require('mongoose').Types.ObjectId;

const sharp = require('sharp');

const { v4: uuidv4 } = require('uuid');

const getEmpresaModel = require('../models/empresa.model');

/** ======================================================================
 *  GET EMPRESA
=========================================================================*/
const getEmpresa = async(req, res) => {

    try {
        const dbConnection = req.companyDb || req.branchDb;
        if (!dbConnection) return res.status(400).json({ ok: false, msg: 'Falta contexto de base de datos' });
        const Empresa = getEmpresaModel(dbConnection);

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
        const dbConnection = req.companyDb || req.branchDb;
        if (!dbConnection) return res.status(400).json({ ok: false, msg: 'Falta contexto de base de datos' });
        const Empresa = getEmpresaModel(dbConnection);

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
        const dbConnection = req.companyDb || req.branchDb;
        if (!dbConnection) return res.status(400).json({ ok: false, msg: 'Falta contexto de base de datos' });
        const Empresa = getEmpresaModel(dbConnection);
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
        const dbConnection = req.companyDb || req.branchDb;
        if (!dbConnection) return res.status(400).json({ ok: false, msg: 'Falta contexto de base de datos' });
        const Empresa = getEmpresaModel(dbConnection);

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

/** =====================================================================
 *  ESTADO DE SUSCRIPCIÓN
=========================================================================*/

const getEstadoSuscripcion = async (req, res) => {
    
    // Si no hay branchDb, intentamos usar companyDb porque la empresa/suscripción debería ser global para la compañía.
    const dbConnection = req.companyDb || req.branchDb;
    if (!dbConnection) return res.status(500).json({ ok: false, msg: 'Falta contexto de base de datos' });
    
    const Empresa = getEmpresaModel(dbConnection);

    const empresa = await Empresa.findOne();

    if (!empresa) {
        return res.status(404).json({
            ok: false,
            msg: 'Empresa no encontrada'
        });
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    
    // Obtener el último día del mes actual
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const isLastTwoDays = currentDay >= 24;
    const isFirstThreeDays = currentDay <= 5;
    const isPastFourth = currentDay >= 6;

    const ultimoPago = empresa.suscripcion?.ultimoPago;
    
    let isPaidForCurrentMonth = false;
    
    if (ultimoPago) {
        const uPago = new Date(ultimoPago);
        // Si pagó este mismo mes, está al día.
        if (uPago.getMonth() === currentMonth && uPago.getFullYear() === currentYear) {
            isPaidForCurrentMonth = true;
        } else if (
            // Si pagó a final del mes pasado (pago adelantado)
            uPago.getFullYear() === currentYear && 
            uPago.getMonth() === currentMonth - 1 && 
            uPago.getDate() >= 24
        ) {
            isPaidForCurrentMonth = true;
        } else if (
            // Si pagó a final de diciembre del año pasado para enero de este año
            uPago.getFullYear() === currentYear - 1 && 
            uPago.getMonth() === 11 && currentMonth === 0 &&
            uPago.getDate() >= 24
        ) {
            isPaidForCurrentMonth = true;
        }
    }

    let estadoCalculado = 'ACTIVA';
    let diasRestantes = 0;
    let mensajeSuscripcion = '';

    if (!isPaidForCurrentMonth) {
        if (isPastFourth) {
            estadoCalculado = 'BLOQUEADA';
            mensajeSuscripcion = 'Tu suscripción ha sido bloqueada por falta de pago.';
        } else if (isFirstThreeDays) {
            estadoCalculado = 'ALERTA';
            diasRestantes = 6 - currentDay; // Ej. si es día 2, faltan 4 días para el bloqueo (día 6)
            mensajeSuscripcion = `Tu suscripción está vencida. Te quedan ${diasRestantes} día(s) de gracia antes del bloqueo.`;
        } else if (isLastTwoDays) {
            estadoCalculado = 'ALERTA';
            diasRestantes = (lastDayOfMonth - currentDay) + 6; // Ej. día 29 de 30 = 1 día del mes + 5 de gracia = 6 días
            mensajeSuscripcion = `Tu suscripción está próxima a vencer.`;
        } else {
            estadoCalculado = 'BLOQUEADA';
            mensajeSuscripcion = 'Tu suscripción ha sido bloqueada por falta de pago.';
        }
    } else {
        if (isLastTwoDays) {
            estadoCalculado = 'ALERTA';
            diasRestantes = (lastDayOfMonth - currentDay) + 6;
            mensajeSuscripcion = `Tu suscripción vencerá pronto. Recuerda renovarla para el próximo mes.`;
        }
    }

    // Si en la base de datos está inactiva manualmente
    if (empresa.suscripcion?.estado === 'INACTIVA' && !ultimoPago) {
         estadoCalculado = 'INACTIVA';
         mensajeSuscripcion = 'Suscripción inactiva manualmente.';
    }

    res.json({
        ok: true,
        estado: estadoCalculado,
        dias: diasRestantes,
        mensaje: mensajeSuscripcion
    });
};


// EXPORTS
module.exports = {
    getEmpresa,
    createEmpresa,
    updateEmpresa,
    updateLogo,
    getEstadoSuscripcion
};