const cron = require('node-cron');
const axios = require('axios');
const Subdomain = require('../models/subdomain.model');
const { getCompanyConnection } = require('../../../shared/database/connection');
const getTrmModel = require('../../company/models/trm.model');

const iniciarCronTRM = () => {
    
    // Se ejecuta cada 10 minutos
    cron.schedule('*/10 * * * *', async () => {
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

                        // Obtener la TRM mas reciente
                        const latestTrm = await Trm.findOne().sort({ _id: -1 });

                        if (!latestTrm || latestTrm.valor !== valorNuevo) {
                            const newTrm = new Trm({ valor: valorNuevo, fecha: new Date() });
                            await newTrm.save();
                            console.log(`[CRON] TRM actualizada para empresa ${sub.subdominio}: $${valorNuevo}`);
                        }
                    } catch (companyError) {
                        console.error(`[CRON] Error actualizando TRM para empresa ${sub.subdominio}:`, companyError.message);
                    }
                }
            }
        } catch (error) {
            console.error('[CRON] Error consultando la TRM al Banco de la Republica. Ignorando...', error.message);
        }
    });

    console.log('CronJob de TRM programado y vinculado al esquema SaaS Multitenant');
};

module.exports = { iniciarCronTRM };
