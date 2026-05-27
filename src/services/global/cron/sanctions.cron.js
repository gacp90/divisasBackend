const cron = require('node-cron');
const { downloadAndProcessONU } = require('../helpers/onuSanctions.helper');
const { downloadAndProcessOFAC } = require('../helpers/ofac.helper');

/** =====================================================================
 *  EJECUTAR LA DESCARGA DE LA LISTA ONU A LAS 2:30 AM
=========================================================================*/
// */5 * * * *
const startSanctionsCron = () => {
  cron.schedule('30 2 * * *', async () => {
    console.log('Ejecutando cron sanciones ONU y OFAC (a las 2:30 AM)');

    try {
      await downloadAndProcessONU();
    } catch (e) {
      console.error('Error ONU:', e.message);
    }

    try {
      await downloadAndProcessOFAC();
    } catch (e) {
      console.error('Error OFAC:', e.message);
    }
  });
};

module.exports = {
  startSanctionsCron
};
