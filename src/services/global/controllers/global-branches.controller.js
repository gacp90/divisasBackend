const { response } = require('express');
const Subdomain = require('../models/subdomain.model');
const { getCompanyConnection } = require('../../../shared/database/connection');

/**
 * Obtener todas las sucursales agrupadas por empresa
 */
const getGlobalBranches = async (req, res = response) => {
    try {
        const subdomains = await Subdomain.find().sort({ createdAt: -1 });
        const companyBranches = [];

        for (const sub of subdomains) {
            try {
                const companyDb = getCompanyConnection(sub.subdominio);
                
                // Asegurar que el modelo Branch esté registrado en esa conexión
                let BranchModel;
                try {
                    BranchModel = companyDb.model('Branch');
                } catch (err) {
                    const branchSchema = require('../../company/models/branch.model');
                    BranchModel = branchSchema(companyDb);
                }

                const branches = await BranchModel.find();
                
                companyBranches.push({
                    subdomain: sub,
                    branches: branches
                });
            } catch (innerError) {
                console.error(`Error obteniendo sucursales de ${sub.subdominio}:`, innerError);
                // Continue with other subdomains even if one fails
                companyBranches.push({
                    subdomain: sub,
                    branches: [],
                    error: true
                });
            }
        }

        res.json({
            ok: true,
            companyBranches
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
};

/**
 * Editar el nombre de una sucursal específica
 */
const editGlobalBranchName = async (req, res = response) => {
    const { subdominio, branchId } = req.params;
    const { name } = req.body;

    try {
        const companyDb = getCompanyConnection(subdominio);
        
        let BranchModel;
        try {
            BranchModel = companyDb.model('Branch');
        } catch (err) {
            const branchSchema = require('../../company/models/branch.model');
            BranchModel = branchSchema(companyDb);
        }

        const branchDB = await BranchModel.findById(branchId);
        if (!branchDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Sucursal no encontrada'
            });
        }

        branchDB.name = name;
        await branchDB.save();

        res.json({
            ok: true,
            branch: branchDB,
            msg: 'Nombre de la sucursal actualizado'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
};

/**
 * Crear una nueva sucursal (SaaS Provisioning Wizard)
 */
const createGlobalBranch = async (req, res = response) => {
    const { subdominio } = req.params;
    const { name, path, oficial } = req.body;

    try {
        const { getCompanyConnection, getBranchConnection } = require('../../../shared/database/connection');
        const companyDb = getCompanyConnection(subdominio);

        // 1. Crear el Branch en Company DB
        let BranchModel;
        try {
            BranchModel = companyDb.model('Branch');
        } catch (err) {
            const branchSchema = require('../../company/models/branch.model');
            BranchModel = branchSchema(companyDb);
        }

        const existePath = await BranchModel.findOne({ path });
        if (existePath) {
            return res.status(400).json({
                ok: false,
                msg: 'La ruta de la sucursal ya existe'
            });
        }

        const nuevaSucursal = new BranchModel({
            name,
            path,
            isActive: true
        });

        await nuevaSucursal.save();

        // 2. Crear el documento Empresa en la nueva Branch DB
        const branchDb = getBranchConnection(subdominio, path);
        const getEmpresaModel = require('../../branch/models/empresa.model');
        const EmpresaModel = getEmpresaModel(branchDb);

        // Fecha en +30 días para la suscripción
        const fechaExpiracion = new Date();
        fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);

        const empresaExists = await EmpresaModel.findOne();
        if (!empresaExists) {
            const nuevaEmpresaInfo = new EmpresaModel({
                name, // Razón Social local de la sucursal
                oficial: oficial || {},
                status: true,
                suscripcion: {
                    estado: 'ACTIVA',
                    ultimoPago: fechaExpiracion
                }
            });

            await nuevaEmpresaInfo.save();
        } else {
            // Update the existing company info just in case
            empresaExists.suscripcion = {
                estado: 'ACTIVA',
                ultimoPago: fechaExpiracion
            };
            await empresaExists.save();
        }

        res.json({
            ok: true,
            branch: nuevaSucursal,
            msg: 'Sucursal creada y activada exitosamente'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
};

module.exports = {
    getGlobalBranches,
    editGlobalBranchName,
    createGlobalBranch
};
