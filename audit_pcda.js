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

    let pcdaZero = 0;
    let pcdaNull = 0;
    let pcdaCorrect = 0;
    let latestZeroDate = new Date(0);
    let earliestCorrectDate = new Date('2030-01-01');

    for (const dbName of branchDbs) {
        const db = connection.useDb(dbName);
        const transacciones = db.collection('transacciones');
        
        const ventas = await transacciones.find({ transaccion: 'Venta', status: true }).toArray();

        for (const v of ventas) {
            for (const item of v.items) {
                if (item.pcda === undefined || item.pcda === null) {
                    pcdaNull++;
                } else if (item.pcda === 0) {
                    pcdaZero++;
                    if (v.fecha > latestZeroDate) {
                        latestZeroDate = v.fecha;
                    }
                } else {
                    pcdaCorrect++;
                    if (v.fecha < earliestCorrectDate) {
                        earliestCorrectDate = v.fecha;
                    }
                }
            }
        }
    }

    console.log('Total Ventas Items: ' + (pcdaNull + pcdaZero + pcdaCorrect));
    console.log('PCDA Null: ' + pcdaNull);
    console.log('PCDA = 0: ' + pcdaZero);
    console.log('PCDA > 0 (Correct): ' + pcdaCorrect);
    if(pcdaZero > 0) console.log('Latest PCDA=0 Date: ' + latestZeroDate.toISOString());
    if(pcdaCorrect > 0) console.log('Earliest PCDA Correct Date: ' + earliestCorrectDate.toISOString());
    
    process.exit(0);
}

main().catch(console.error);
