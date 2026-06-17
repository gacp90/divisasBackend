require('dotenv').config();
const mongoose = require('mongoose');

const checkDrift = async () => {
    try {
        await mongoose.connect(process.env.DB_CNN || 'mongodb://127.0.0.1:27017/simidDB'); // Usa la conexion por defecto si no hay env
        console.log('DB Connected');
        
        const adminDb = mongoose.connection.useDb('admin');
        const { databases } = await adminDb.db.admin().listDatabases();
        
        for (const database of databases) {
            if (database.name === 'admin' || database.name === 'config' || database.name === 'local') continue;
            console.log(`Checking DB: ${database.name}`);
            const branchDb = mongoose.connection.useDb(database.name);
            const Movimiento = branchDb.collection('movimientos');
            const Inventory = branchDb.collection('inventories');
            
            const entradas = await Movimiento.aggregate([{ $match: { type: 'Entrada' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray();
            const salidas = await Movimiento.aggregate([{ $match: { type: 'Salida' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray();
            
            const totalEntradas = entradas.length > 0 ? entradas[0].total : 0;
            const totalSalidas = salidas.length > 0 ? salidas[0].total : 0;
            const netDrift = totalEntradas - totalSalidas;
            
            console.log(`- Total Entradas: ${totalEntradas}`);
            console.log(`- Total Salidas: ${totalSalidas}`);
            console.log(`- Desfase Neto Acumulado (Entradas - Salidas): ${netDrift}`);
            
            const copInventory = await Inventory.findOne({ code: 'COP' });
            if (copInventory) {
                console.log(`- Inventario COP Actual: amount=${copInventory.amount}, disponible=${copInventory.disponible}`);
            } else {
                console.log(`- No hay inventario COP`);
            }
            console.log('-----------------------------------');
        }
        
    } catch (error) {
        console.error(error);
    } finally {
        mongoose.disconnect();
    }
};

checkDrift();
