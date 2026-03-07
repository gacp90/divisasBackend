const cron = require('node-cron');
const { downloadAndProcessONU } = require('../helpers/onuSanctions.helper');
const { downloadAndProcessOFAC } = require('../helpers/ofac.helper');

/** =====================================================================
 *  EJECUTAR LA DESCARGA DE LA LISTA ONU A LAS 2:30 AM
=========================================================================*/
const startSanctionsCron = () => {
  cron.schedule('30 2 * * *', async () => {
    console.log('Ejecutando cron sanciones ONU');
    try {
      await downloadAndProcessONU();
      await downloadAndProcessOFAC();
    } catch (err) {
      console.error('❌ Error cron ONU:', err.message);
    }
  });
};

module.exports = {
  startSanctionsCron
};
