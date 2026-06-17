const cron = require('node-cron');
const axios = require('axios');
const Inventory = require('../models/inventory.model'); // Tu modelo actual

const iniciarCronTRM = () => {
    
    // Se ejecuta todos los días a las 3:00 AM
    cron.schedule('0 3 * * *', async () => {
        try {
            const url = 'https://www.datos.gov.co/resource/ceyp-9c7c.json?$order=vigenciadesde DESC&$limit=1';
            const { data } = await axios.get(url);

            if (data && data.length > 0) {
                const trmActual = data[0];
                const valorNuevo = Number(trmActual.valor);

                // 1. Buscamos el inventario correspondiente al Dólar
                const inventarioUSD = await Inventory.findOne({ code: 'USD' });

                if (inventarioUSD) {
                    // 2. Comparamos para no hacer guardados innecesarios en la BD si la TRM no ha cambiado
                    // También validamos si trmUpdate está vacío para forzar la primera actualización
                    if (inventarioUSD.trm !== valorNuevo || !inventarioUSD.trmUpdate) {
                        
                        inventarioUSD.trm = valorNuevo;
                        inventarioUSD.trmUpdate = new Date(); 
                        
                        await inventarioUSD.save();
                        console.log(`[CRON] TRM actualizada en el Inventario USD: $${valorNuevo}`);
                    }
                } else {
                    console.log('[CRON] No se encontró la moneda USD en el inventario para actualizar la TRM.');
                }
            }
        } catch (error) {
            console.error('[CRON] Error consultando la TRM al Banco de la República. Ignorando...');
        }
    }, {
        scheduled: true,
        timezone: "America/Bogota"
    });

    console.log('CronJob de TRM programado y vinculado al Inventario USD');
};

module.exports = { iniciarCronTRM };