require('dotenv').config();
const { dbConection } = require('../database/config');
const { runCierreEstrictoCajeros, runCierreTurnosGlobal } = require('../src/services/global/cron/turnos.cron');

const runTest = async () => {
    console.log("=== INICIANDO PRUEBA CRON TURNOS ===");
    await dbConection();

    // 1. Probar Vigilante de Cajeros (8 PM / 20:00)
    console.log("\n-----------------------------------------------------");
    console.log("1. SIMULANDO LAS 20:05 (8:05 PM) PARA VIGILANTE DE CAJEROS");
    console.log("-----------------------------------------------------");
    const mockDate8PM = new Date();
    mockDate8PM.setHours(20, 5, 0, 0); // 8:05 PM
    await runCierreEstrictoCajeros(mockDate8PM);

    // 2. Probar Cierre Global (23:59)
    console.log("\n-----------------------------------------------------");
    console.log("2. SIMULANDO LAS 23:59 PARA CIERRE TOTAL DE SUCURSALES");
    console.log("-----------------------------------------------------");
    await runCierreTurnosGlobal();

    console.log("\n=== PRUEBA CRON TURNOS FINALIZADA ===");
    process.exit(0);
};

runTest();
