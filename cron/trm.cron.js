const cron = require('node-cron');
const axios = require('axios');
const Subdomain = require('../src/services/global/models/subdomain.model');
const { getCompanyConnection } = require('../src/shared/database/connection');
const getTrmModel = require('../src/services/company/models/trm.model');

const iniciarCronTRM = () => {
    
    // Se ejecuta cada 10 minutos
    cron.schedule('*/10 * * * *', async () => {
        try {
            const url = 'https://www.datos.gov.co/resource/ceyp-9c7c.json?$order=vigenciadesde DESC&$limit=1';
            const { data } = await axios.get(url);

            if (data && data.length > 0) {
                const trmActual = data[0];
                const valorNuevo = Number(trmActual.valor);

                // Obtener todas las empresas registradas en Global
                const empresas = await Subdomain.distinct('empresaId');

                for (const empresaId of empresas) {
                    if (!empresaId) continue;
                    
                    const companyDb = getCompanyConnection(empresaId);
                    const Trm = getTrmModel(companyDb);

                    const trmDB = await Trm.findOne().sort({ _id: -1 });

                    if (!trmDB || trmDB.valor !== valorNuevo) {
                        const nuevaTrm = new Trm({ valor: valorNuevo, fecha: new Date() });
                        await nuevaTrm.save();
                        console.log(`[CRON] TRM actualizada para empresa ${empresaId}: $${valorNuevo}`);
                    }
                }
            }
        } catch (error) {
            console.error('[CRON] Error actualizando TRM en empresas. Ignorando...', error.message);
        }
    });

    console.log('CronJob de TRM programado para empresas');
};

module.exports = { iniciarCronTRM };