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
                
                if (sub.fechaVencimiento && new Date(sub.fechaVencimiento) >= now) {
                    suscripcionesOK++;
                } else {
                    suscripcionesVencidas++;
                }

                try {
                    const companyDb = getCompanyConnection(sub.subdominio);
                    let BranchModel;
                    try {
                        BranchModel = companyDb.model('Branch');
                    } catch (err) {
                        const branchSchema = require('../../company/models/branch.model');
                        BranchModel = branchSchema(companyDb);
                    }
                    
                    const branchesCount = await BranchModel.countDocuments();
                    totalSucursales += branchesCount;
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
