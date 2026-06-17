const mongoose = require('mongoose');
const getInventoryModel = require('../services/branch/models/inventory.model');
const getTurnoModel = require('../services/branch/models/turnos.model');
const getTransaccionModel = require('../services/branch/models/transacciones.model');

mongoose.connect('mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/branch_demo2_simidmas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB branch_demo2_simidmas for Orphan Analysis");
    
    const Inventory = getInventoryModel(mongoose.connection);
    const Turno = getTurnoModel(mongoose.connection);
    const Transaccion = getTransaccionModel(mongoose.connection);
    
    // Get all valid currency IDs
    const currencies = await Inventory.find({}, '_id');
    const validCurrencyIds = new Set(currencies.map(c => c._id.toString()));
    
    console.log(`Total valid currencies in Inventory: ${validCurrencyIds.size}`);
    
    // Analyze Turnos
    const turnos = await Turno.find({}).lean();
    console.log(`Total turnos analyzed: ${turnos.length}`);
    let orphanedTurnosCount = 0;
    const orphanedCurrencyIds = new Set();
    
    turnos.forEach(turno => {
        if (turno.saldos && turno.saldos.length > 0) {
            let hasOrphan = false;
            turno.saldos.forEach(saldo => {
                if (saldo.moneda) {
                    const monId = saldo.moneda.toString();
                    if (!validCurrencyIds.has(monId)) {
                        console.log(`[ORPHAN TURNO] Turno ID: ${turno._id} has orphan currency ID: ${monId}`);
                        orphanedCurrencyIds.add(monId);
                        hasOrphan = true;
                    }
                }
            });
            if (hasOrphan) orphanedTurnosCount++;
        }
    });
    console.log(`Total turnos affected by orphans: ${orphanedTurnosCount}`);
    
    // Analyze Transacciones
    const transacciones = await Transaccion.find({}).lean();
    console.log(`Total transacciones analyzed: ${transacciones.length}`);
    let orphanedTransaccionesCount = 0;
    
    transacciones.forEach(tx => {
        if (tx.items && tx.items.length > 0) {
            let hasOrphan = false;
            tx.items.forEach(item => {
                if (item.moneda) {
                    const monId = item.moneda.toString();
                    if (!validCurrencyIds.has(monId)) {
                        console.log(`[ORPHAN TRANSACCION] Tx ID: ${tx._id} has orphan currency ID: ${monId}`);
                        orphanedCurrencyIds.add(monId);
                        hasOrphan = true;
                    }
                }
            });
            if (hasOrphan) orphanedTransaccionesCount++;
        }
    });
    console.log(`Total transacciones affected by orphans: ${orphanedTransaccionesCount}`);
    
    console.log("Orphaned Currency IDs found:");
    orphanedCurrencyIds.forEach(id => console.log(`- ${id}`));
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
