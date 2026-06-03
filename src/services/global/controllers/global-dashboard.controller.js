const { response } = require('express');
const Subdomain = require('../models/subdomain.model');
const { getCompanyConnection } = require('../../../shared/database/connection');

const getGlobalDashboardStats = async (req, res = response) => {
    try {
        const subdomains = await Subdomain.find();
        
        let empresasActivas = 0;
        let suscripcionesOK = 0;
        let suscripcionesVencidas = 0;
        let totalSucursales = 0;
        
        const now = new Date();

        for (const sub of subdomains) {
            if (sub.isActive) {
                empresasActivas++;
                
                try {
                    const companyDb = getCompanyConnection(sub.subdominio);
                    let BranchModel;
                    try {
                        BranchModel = companyDb.model('Branch');
                    } catch (err) {
                        const branchSchema = require('../../company/models/branch.model');
                        BranchModel = branchSchema(companyDb);
                    }
                    
                    const branches = await BranchModel.find();
                    totalSucursales += branches.length;

                    for (const branch of branches) {
                        if (branch.fechaVencimiento && new Date(branch.fechaVencimiento) >= now) {
                            suscripcionesOK++;
                        } else {
                            suscripcionesVencidas++;
                        }
                    }
                } catch (innerError) {
                    console.error(`Error contando sucursales para ${sub.subdominio}:`, innerError);
                }
            }
        }

        res.json({
            ok: true,
            stats: {
                empresasActivas,
                suscripcionesOK,
                suscripcionesVencidas,
                totalSucursales
            }
        });

    } catch (error) {
        console.error('Error en getGlobalDashboardStats:', error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
};

module.exports = {
    getGlobalDashboardStats
};
