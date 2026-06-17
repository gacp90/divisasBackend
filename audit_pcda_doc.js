const mongoose = require('mongoose');
async function main() {
    const uri = 'mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/';
    const connection = await mongoose.createConnection(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).asPromise();

    const db = connection.useDb('branch_simid_ibague'); // assuming one is simid_ibague or we can just iterate
    const adminDb = connection.db.admin();
    const result = await adminDb.listDatabases();
    const branchDbs = result.databases.filter(db => db.name.startsWith('branch_')).map(db => db.name);
    
    for (const dbName of branchDbs) {
        const db = connection.useDb(dbName);
        const transacciones = db.collection('transacciones');
        const v = await transacciones.findOne({ transaccion: 'Venta', status: true });
        if(v) {
            console.log('Database:', dbName);
            console.log(JSON.stringify(v, null, 2));
            break;
        }
    }
    process.exit(0);
}
main().catch(console.error);
