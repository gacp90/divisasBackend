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
    const { name, fechaVencimiento, numero } = req.body;

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

        if (name) branchDB.name = name;
        if (fechaVencimiento) branchDB.fechaVencimiento = new Date(fechaVencimiento);
        if (numero) branchDB.numero = Number(numero);
        
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

        const count = await BranchModel.countDocuments();

        const nuevaSucursal = new BranchModel({
            name,
            path,
            numero: count + 1,
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

        // 3. Crear moneda base USD por defecto para la TRM
        const getInventoryModel = require('../../branch/models/inventory.model');
        const InventoryModel = getInventoryModel(branchDb);
        const usdExists = await InventoryModel.findOne({ code: 'USD' });
        if (!usdExists) {
            const usdInventory = new InventoryModel({
                code: 'USD',
                currency: 'Dolar Americano',
                amount: 0,
                disponible: 0,
                anterior: 0,
                trm: 0
            });
            await usdInventory.save();
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

/**
 * Eliminar una sucursal lógicamente del registro de la empresa
 */
const deleteGlobalBranch = async (req, res = response) => {
    const { subdominio, branchId } = req.params;

    try {
        const companyDb = getCompanyConnection(subdominio);
        
        let BranchModel;
        try {
            BranchModel = companyDb.model('Branch');
        } catch (err) {
            const branchSchema = require('../../company/models/branch.model');
            BranchModel = branchSchema(companyDb);
        }

        const branchDB = await BranchModel.findByIdAndDelete(branchId);
        
        if (!branchDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Sucursal no encontrada'
            });
        }

        res.json({
            ok: true,
            msg: 'Sucursal eliminada del registro de la empresa'
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
 * Activar/Desactivar una sucursal lógicamente
 */
const toggleGlobalBranch = async (req, res = response) => {
    const { subdominio, branchId } = req.params;
    const { isActive } = req.body;

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

        branchDB.isActive = isActive;
        await branchDB.save();

        res.json({
            ok: true,
            branch: branchDB,
            msg: `Sucursal ${isActive ? 'activada' : 'desactivada'} correctamente`
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
    createGlobalBranch,
    deleteGlobalBranch,
    toggleGlobalBranch
};
