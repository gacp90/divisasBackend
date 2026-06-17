const mongoose = require('mongoose');
const getInventoryModel = require('../services/branch/models/inventory.model');

mongoose.connect('mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/branch_demo2_simidmas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB demo");
    const Inventory = getInventoryModel(mongoose.connection);
    
    // Find all currencies
    const divisas = await Inventory.find({}, 'code currency amount disponible tc tv tpc ta modoUtilidad');
    console.log("================ CURRENT CURRENCIES IN DB ================");
    divisas.forEach(d => {
        console.log(`- ${d.code} (${d.currency}): amount=${d.amount}, TC=${d.tc}, TV=${d.tv}, TPC=${d.tpc}, TA=${d.ta}, MODO=${d.modoUtilidad}`);
    });
    console.log("==========================================================");

    const getTransaccionModel = require('../services/branch/models/transacciones.model');
    const Transaccion = getTransaccionModel(mongoose.connection);
    
    // Find last transaction
    const lastTx = await Transaccion.findOne({ transaccion: 'Compra' }).sort({ fecha: -1 }).populate('items.moneda');
    console.log("================ LAST TRANSACTION (COMPRA) ================");
    if (lastTx) {
        console.log(`Transaccion ID: ${lastTx._id}`);
        console.log(`Fecha: ${lastTx.fecha}`);
        lastTx.items.forEach(it => {
            console.log(`- Item Moneda: ${it.moneda?.code || it.moneda}`);
            console.log(`  Monto Comprado: ${it.monto}`);
            console.log(`  Tasa Ingresada: ${it.tasa}`);
            console.log(`  Update Tasa Default: ${it.updateTasaDefault}`);
        });
    } else {
        console.log("No transactions found.");
    }
    console.log("==========================================================");
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
