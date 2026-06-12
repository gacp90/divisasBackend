const cron = require('node-cron');
const axios = require('axios');
const Subdomain = require('../src/services/global/models/subdomain.model');
const { getCompanyConnection } = require('../src/shared/database/connection');
const getTrmModel = require('../src/services/company/models/trm.model');

const runTrmUpdate = async () => {
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

                    const latestTrm = await Trm.findOne().sort({ _id: -1 });

                    // Verificamos si ya existe una TRM para hoy
                    const hoy = new Date();
                    hoy.setHours(0,0,0,0);
                    
                    let insertNew = false;
                    if (!latestTrm) {
                        insertNew = true;
                    } else {
                        const latestDate = new Date(latestTrm.fecha);
                        latestDate.setHours(0,0,0,0);
                        
                        // Insertamos si cambió el valor o si cambió de día
                        if (latestDate.getTime() !== hoy.getTime() || latestTrm.valor !== valorNuevo) {
                            insertNew = true;
                        }
                    }

                    if (insertNew) {
                        const newTrm = new Trm({ valor: valorNuevo, fecha: new Date() });
                        await newTrm.save();
                        console.log(`[CRON] TRM actualizada para empresa ${sub.subdominio}: $${valorNuevo}`);
                    } else {
                        console.log(`[CRON] TRM para empresa ${sub.subdominio} ya está actualizada al valor: $${valorNuevo}`);
                    }
                } catch (companyError) {
                    console.error(`[CRON] Error actualizando TRM para empresa ${sub.subdominio}:`, companyError.message);
                }
            }
        }
    } catch (error) {
        console.error('[CRON] Error consultando la TRM al Banco de la Republica. Ignorando...', error.message);
    }
};

const iniciarCronTRM = () => {
    // Se ejecuta cada 10 minutos
    cron.schedule('*/10 * * * *', runTrmUpdate);
    console.log('CronJob de TRM programado y vinculado al esquema SaaS Multitenant');
};

module.exports = { iniciarCronTRM, runTrmUpdate };