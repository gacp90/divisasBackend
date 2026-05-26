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

module.exports = {
    getGlobalBranches,
    editGlobalBranchName
};
