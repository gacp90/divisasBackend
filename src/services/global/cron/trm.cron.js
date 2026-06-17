const cron = require('node-cron');
const axios = require('axios');
const Subdomain = require('../models/subdomain.model');
const { getCompanyConnection } = require('../../../shared/database/connection');
const getTrmModel = require('../../company/models/trm.model');
const getBranchModel = require('../../company/models/branch.model');
const { getBranchConnection } = require('../../../shared/database/connection');
const getInventoryModel = require('../../branch/models/inventory.model');

const iniciarCronTRM = () => {
    
    // Se ejecuta todos los días a las 3:00 AM
    cron.schedule('0 3 * * *', async () => {
        try {
            const url = 'https://www.datos.gov.co/resource/ceyp-9c7c.json?$order=vigenciadesde DESC&$limit=1';
            const { data } = await axios.get(url);

            if (data && data.length > 0) {
                const trmActual = data[0];
                const valorNuevo = Number(trmActual.valor);

                // Obtener todos los subdominios activos
                const subdomains = await Subdomain.find({ isActive: true });

                for (const sub of subdomains) {
                    try {
                        const companyDb = getCompanyConnection(sub.subdominio);
                        const Trm = getTrmModel(companyDb);

                        // 1. Obtener/Actualizar la TRM global de la empresa
                        const latestTrm = await Trm.findOne().sort({ _id: -1 });

                        if (!latestTrm || latestTrm.valor !== valorNuevo) {
                            const newTrm = new Trm({ valor: valorNuevo, fecha: new Date() });
                            await newTrm.save();
                            console.log(`[CRON] TRM actualizada para empresa ${sub.subdominio}: $${valorNuevo}`);
                        }

                        // 2. Actualizar el inventario USD en todas las sucursales activas de la empresa
                        const Branch = getBranchModel(companyDb);
                        const branches = await Branch.find({ isActive: true });

                        for (const branch of branches) {
                            try {
                                const branchDb = getBranchConnection(sub.subdominio, branch.path);
                                const Inventory = getInventoryModel(branchDb);

                                const inventarioUSD = await Inventory.findOne({ code: 'USD' });

                                if (inventarioUSD) {
                                    if (inventarioUSD.trm !== valorNuevo || !inventarioUSD.trmUpdate) {
                                        inventarioUSD.trm = valorNuevo;
                                        inventarioUSD.trmUpdate = new Date();
                                        await inventarioUSD.save();
                                        console.log(`[CRON] TRM USD actualizada en sucursal ${branch.path} (${sub.subdominio}): $${valorNuevo}`);
                                    }
                                }
                            } catch (branchError) {
                                console.error(`[CRON] Error actualizando TRM en sucursal ${branch.path} (${sub.subdominio}):`, branchError.message);
                            }
                        }

                    } catch (companyError) {
                        console.error(`[CRON] Error procesando empresa ${sub.subdominio}:`, companyError.message);
                    }
                }
            }
        } catch (error) {
            console.error('[CRON] Error consultando la TRM al Banco de la Republica. Ignorando...', error.message);
        }
    }, {
        scheduled: true,
        timezone: "America/Bogota"
    });

    console.log('CronJob de TRM programado y vinculado al esquema SaaS Multitenant');
};

module.exports = { iniciarCronTRM };
