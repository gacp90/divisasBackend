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
        const dbConnection = req.branchDb || req.companyDb;
        if (!dbConnection) return res.status(400).json({ ok: false, msg: 'Falta contexto de base de datos' });
        const Empresa = getEmpresaModel(dbConnection);

        const {...query } = req.body;

        let empresa = await Empresa.findOne(query);

        if (empresa && req.companyDb) {
            // Obtener el perfil global (CompanyProfile)
            const getCompanyProfileModel = require('../../company/models/companyProfile.model');
            const CompanyProfile = getCompanyProfileModel(req.companyDb);
            const profile = await CompanyProfile.findOne();

            if (profile) {
                // Combinar los datos globales del representante con los locales
                empresa = {
                    ...empresa.toObject(),
                    type: profile.type,
                    nit: profile.nit,
                    representanteLegal: profile.representanteLegal,
                    represent: profile.representanteLegal // alias para compatibilidad
                };
            }
        }

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
        const dbConnection = req.branchDb || req.companyDb;
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
        const dbConnection = req.branchDb || req.companyDb;
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

        // Extraer los campos globales antes de actualizar la sucursal local
        const globalFields = {
            type: campos.type,
            nit: campos.nit,
            representanteLegal: campos.representanteLegal || campos.represent
        };

        // Eliminar campos globales del objeto que se guardará en la sucursal
        delete campos.type;
        delete campos.nit;
        delete campos.representanteLegal;
        delete campos.represent;

        // ==========================================
        // LÓGICA DE INTERCAMBIO DE NÚMERO DE SUCURSAL
        // ==========================================
        if (campos.numberSuc && req.companyDb) {
            const newNumberSuc = Number(campos.numberSuc);
            const oldNumberSuc = Number(empresaDB.numberSuc || 1);

            if (newNumberSuc !== oldNumberSuc) {
                const getBranchModel = require('../../company/models/branch.model');
                const BranchModel = getBranchModel(req.companyDb);

                const currentPath = (req.headers['x-branch'] || req.branchPathToken || '').toLowerCase();
                const branchActual = await BranchModel.findOne({ path: currentPath });
                const branchConNuevoNumero = await BranchModel.findOne({ numero: newNumberSuc });

                if (branchConNuevoNumero && branchActual && branchConNuevoNumero.id !== branchActual.id) {
                    // Intercambiar en BranchModel
                    branchConNuevoNumero.numero = oldNumberSuc;
                    branchActual.numero = newNumberSuc;
                    await branchConNuevoNumero.save();
                    await branchActual.save();

                    // Intercambiar en el documento Empresa de la OTRA sucursal
                    const { getBranchConnection } = require('../../../shared/database/connection');
                    const otherBranchDb = getBranchConnection(req.tenantToken, branchConNuevoNumero.path);
                    
                    if (otherBranchDb.readyState !== 1) {
                        await otherBranchDb.asPromise();
                    }

                    const OtherEmpresa = getEmpresaModel(otherBranchDb);
                    const otherEmpresaDoc = await OtherEmpresa.findOne();
                    if (otherEmpresaDoc) {
                        otherEmpresaDoc.numberSuc = String(oldNumberSuc);
                        await otherEmpresaDoc.save();
                    }
                } else if (branchActual) {
                    // Si no existe otra sucursal con ese número, solo actualizamos la actual
                    branchActual.numero = newNumberSuc;
                    await branchActual.save();
                }
            }
        }
        // ==========================================

        // UPDATE
        const empresaUpdate = await Empresa.findByIdAndUpdate(eid, campos, { new: true, useFindAndModify: false });

        // UPDATE GLOBAL (CompanyProfile)
        if (req.companyDb) {
            const getCompanyProfileModel = require('../../company/models/companyProfile.model');
            const CompanyProfile = getCompanyProfileModel(req.companyDb);
            let profile = await CompanyProfile.findOne();
            if (profile) {
                if (globalFields.type !== undefined) profile.type = globalFields.type;
                if (globalFields.nit) profile.nit = globalFields.nit;
                if (globalFields.representanteLegal) profile.representanteLegal = globalFields.representanteLegal;
                await profile.save();
            } else {
                profile = new CompanyProfile(globalFields);
                await profile.save();
            }
        }

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
        const dbConnection = req.branchDb || req.companyDb;
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
    
    // Si no hay branchDb, intentamos usar companyDb
    const dbConnection = req.companyDb || req.branchDb;
    if (!dbConnection) return res.status(500).json({ ok: false, msg: 'Falta contexto de base de datos' });
    
    // Buscar la sucursal actual para revisar la fecha de vencimiento individual
    let branchPath = req.headers['x-branch'];
    let branchData = null;

    if (branchPath && req.companyDb) {
        let BranchModel;
        try {
            BranchModel = req.companyDb.model('Branch');
        } catch (err) {
            const branchSchema = require('../../company/models/branch.model');
            BranchModel = branchSchema(req.companyDb);
        }
        branchData = await BranchModel.findOne({ path: branchPath.toLowerCase() });
    }

    if (!branchData) {
        return res.json({
            ok: true,
            estado: 'ACTIVA',
            dias: 0,
            mensaje: 'Sucursal no encontrada, asumiendo estado activo.'
        });
    }

    let estadoCalculado = 'ACTIVA';
    let diasRestantes = 0;
    let mensajeSuscripcion = 'Tu suscripción está activa.';

    if (branchData.fechaVencimiento) {
        const today = new Date();
        const vencimiento = new Date(branchData.fechaVencimiento);
        
        // Normalizar fechas para comparar solo días
        const todayStr = today.toISOString().split('T')[0];
        const vencimientoStr = vencimiento.toISOString().split('T')[0];

        if (todayStr > vencimientoStr) {
            estadoCalculado = 'BLOQUEADA';
            mensajeSuscripcion = 'La suscripción de esta sucursal ha vencido por falta de pago.';
        } else {
            // Calcular diferencia en días
            const diffTime = Math.abs(vencimiento - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays <= 5) {
                estadoCalculado = 'ALERTA';
                diasRestantes = diffDays;
                mensajeSuscripcion = `Tu suscripción vencerá en ${diasRestantes} día(s). Recuerda renovarla.`;
            }
        }
    }

    // Si la sucursal está inactiva manualmente
    if (!branchData.isActive) {
         estadoCalculado = 'INACTIVA';
         mensajeSuscripcion = 'Sucursal inactiva manualmente.';
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