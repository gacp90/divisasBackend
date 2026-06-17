require('dotenv').config();
const mongoose = require('mongoose');

const checkDriftDetailed = async () => {
    try {
        await mongoose.connect(process.env.DB_CNN || 'mongodb://127.0.0.1:27017/simidDB');
        console.log('--- AUDITORÍA HISTÓRICA DETALLADA DE SUCURSALES ---');
        
        const adminDb = mongoose.connection.useDb('admin');
        const { databases } = await adminDb.db.admin().listDatabases();
        
        for (const database of databases) {
            if (database.name === 'admin' || database.name === 'config' || database.name === 'local') continue;
            
            const branchDb = mongoose.connection.useDb(database.name);
            const Movimiento = branchDb.collection('movimientos');
            const Inventory = branchDb.collection('inventories');
            
            const entradas = await Movimiento.aggregate([
                { $match: { type: 'Entrada' } }, 
                { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
            ]).toArray();
            
            const salidas = await Movimiento.aggregate([
                { $match: { type: 'Salida' } }, 
                { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
            ]).toArray();
            
            const entradasData = entradas.length > 0 ? entradas[0] : { count: 0, total: 0 };
            const salidasData = salidas.length > 0 ? salidas[0] : { count: 0, total: 0 };
            
            const netDrift = entradasData.total - salidasData.total;
            
            if (entradasData.count === 0 && salidasData.count === 0) {
                // Skip output if no administrative movements exist
                continue;
            }
            
            console.log(`\n===========================================`);
            console.log(`SUCURSAL: ${database.name}`);
            console.log(`===========================================`);
            console.log(`[+] ENTRADAS ENCONTRADAS : ${entradasData.count} movimientos`);
            console.log(`[+] VALOR TOTAL ENTRADAS : $${entradasData.total}`);
            console.log(`[-] SALIDAS ENCONTRADAS  : ${salidasData.count} movimientos`);
            console.log(`[-] VALOR TOTAL SALIDAS  : $${salidasData.total}`);
            console.log(`[=] RESULTADO NETO CALC  : ${netDrift > 0 ? '+' : ''}$${netDrift}`);
            console.log(`-------------------------------------------`);
            
            const copInventory = await Inventory.findOne({ code: 'COP' });
            if (copInventory) {
                const projectedAmount = copInventory.amount + netDrift;
                console.log(`[*] INVENTORY.AMOUNT ACTUAL     : $${copInventory.amount}`);
                console.log(`[*] INVENTORY.AMOUNT PROYECTADO : $${projectedAmount}`);
                console.log(`[*] INVENTORY.DISPONIBLE ACTUAL : $${copInventory.disponible} (Intacto)`);
            } else {
                console.log(`[*] No hay inventario de COP en esta sucursal.`);
            }
        }
        console.log(`\n--- FIN DE LA AUDITORÍA ---`);
        
    } catch (error) {
        console.error(error);
    } finally {
        mongoose.disconnect();
    }
};

checkDriftDetailed();
