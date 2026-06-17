const mongoose = require('mongoose');
async function main() {
    const uri = 'mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/';
    const connection = await mongoose.createConnection(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).asPromise();

    const adminDb = connection.db.admin();
    const result = await adminDb.listDatabases();
    const branchDbs = result.databases.filter(db => db.name.startsWith('branch_')).map(db => db.name);
    
    let allVentas = [];

    for (const dbName of branchDbs) {
        const db = connection.useDb(dbName);
        const transacciones = db.collection('transacciones');
        const ventas = await transacciones.find({ transaccion: 'Venta', status: true })
            .sort({ fecha: -1 })
            .limit(2)
            .toArray();
        if(ventas.length > 0) {
            ventas.forEach(v => { v._dbName = dbName; allVentas.push(v); });
        }
    }
    
    // Sort all collected sales across DBs by date descending
    allVentas.sort((a, b) => b.fecha - a.fecha);
    
    // Take the top 2
    const top2 = allVentas.slice(0, 2);

    for (const v of top2) {
        console.log('--- DATABASE:', v._dbName, '---');
        console.log('ID:', v._id);
        console.log('Fecha:', v.fecha);
        v.items.forEach((item, index) => {
            console.log(`Item ${index}:`);
            console.log(`  Monto: ${item.monto}`);
            console.log(`  Tasa (TV): ${item.tasa}`);
            console.log(`  PCDA Real: ${item.pcda}`);
            console.log(`  DIFT Regulado: ${item.dift}`);
            console.log(`  BASELIQ Regulada: ${item.baseliq}`);
        });
    }

    process.exit(0);
}
main().catch(console.error);
