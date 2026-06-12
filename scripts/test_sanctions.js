require('dotenv').config();
const { dbConection } = require('../database/config');
const { startSanctionsCron } = require('../src/services/global/cron/sanctions.cron');
const { downloadAndProcessONU } = require('../src/services/global/helpers/onuSanctions.helper');
const { downloadAndProcessOFAC } = require('../src/services/global/helpers/ofac.helper');

const runTest = async () => {
    console.log("=== INICIANDO PRUEBA CRON SANCIONES ===");
    await dbConection();
    
    console.log("\n-> Descargando y procesando ONU...");
    try {
        await downloadAndProcessONU();
        console.log("-> ONU Procesado correctamente.");
    } catch (e) {
        console.error('Error ONU:', e.message);
    }

    console.log("\n-> Descargando y procesando OFAC (Clinton)...");
    try {
        await downloadAndProcessOFAC();
        console.log("-> OFAC Procesado correctamente.");
    } catch (e) {
        console.error('Error OFAC:', e.message);
    }

    console.log("\n=== PRUEBA CRON SANCIONES FINALIZADA ===");
    process.exit(0);
};

runTest();
