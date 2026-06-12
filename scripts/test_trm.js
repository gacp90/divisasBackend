require('dotenv').config();
const { dbConection } = require('../database/config');
const { globalConnection } = require('../src/shared/database/connection');
const { runTrmUpdate } = require('../cron/trm.cron');
const Subdomain = require('../src/services/global/models/subdomain.model');

const runTest = async () => {
    console.log("=== INICIANDO PRUEBA CRON TRM ===");
    await dbConection();
    
    console.log("\n-> Ejecutando proceso de TRM...");
    await runTrmUpdate();

    console.log("\n=== PRUEBA CRON TRM FINALIZADA ===");
    process.exit(0);
};

runTest();
