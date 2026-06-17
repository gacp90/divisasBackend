const mongoose = require('mongoose');
const getTurnoModel = require('../services/branch/models/turnos.model');
const getInventoryModel = require('../services/branch/models/inventory.model');

mongoose.connect('mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/branch_demo2_simidmas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB for Deep Orphan Investigation");
    
    const Turno = getTurnoModel(mongoose.connection);
    const Inventory = getInventoryModel(mongoose.connection);
    
    // 1. Structure of the affected Turno
    const turnoId = '6a2b83e4f6d966cd50285844';
    const turno = await Turno.findById(turnoId).lean();
    console.log("\n=== TURNO AFFECTED ESTRUCTURA ===");
    console.log(`Turno ID: ${turno._id}`);
    console.log(`Abierto: ${turno.abierto}`);
    console.log(`Fecha Open: ${turno.open}`);
    console.log(`Fecha Close: ${turno.close}`);
    console.log("Saldos Array:");
    turno.saldos.forEach(s => {
        console.log(`- Moneda ObjectId: ${s.moneda}`);
        console.log(`  Saldo Anterior: ${s.saldoAnterior}`);
        console.log(`  Saldo Actual: ${s.saldoActual}`);
        console.log(`  Saldo Fisico: ${s.saldoFisico}`);
    });
    
    // 2. Current Inventory IDs
    const inventories = await Inventory.find({}).lean();
    console.log("\n=== CURRENT INVENTORIES ===");
    inventories.forEach(i => {
        console.log(`- Code: ${i.code}, ID: ${i._id}, Amount: ${i.amount}`);
    });
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
