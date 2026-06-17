require('dotenv').config();
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const branchDbName = args[0];

if (!branchDbName) {
    console.error('ERROR: Debes proporcionar el nombre de la base de datos de la sucursal.');
    console.error('Ejemplo de uso: node reset_branch_data.js branch_demo2_simidmas');
    process.exit(1);
}

const resetBranchData = async () => {
    try {
        await mongoose.connect(process.env.DB_CNN || 'mongodb://127.0.0.1:27017/simidDB');
        console.log(`\n===========================================`);
        console.log(`⚠️ ADVERTENCIA: LIMPIEZA TOTAL DE DATOS ⚠️`);
        console.log(`===========================================`);
        console.log(`Conectado a la base de datos de la sucursal: ${branchDbName}\n`);
        
        const branchDb = mongoose.connection.useDb(branchDbName);
        
        // Colecciones operativas a limpiar
        const collectionsToDrop = [
            'transaccions', 
            'movimientos', 
            'rates', 
            'saldos', 
            'traslados', 
            'turnos',
            'cierres',
            'inventories'
        ];
        
        for (const colName of collectionsToDrop) {
            try {
                const collection = branchDb.collection(colName);
                const count = await collection.countDocuments();
                if (count > 0) {
                    await collection.deleteMany({});
                    console.log(`[+] Colección '${colName}' limpiada (${count} documentos eliminados).`);
                } else {
                    console.log(`[-] Colección '${colName}' ya estaba vacía.`);
                }
            } catch (err) {
                console.log(`[!] Error al limpiar '${colName}' (Posiblemente no existe).`);
            }
        }
        
        console.log(`\n===========================================`);
        console.log(`✅ LIMPIEZA COMPLETADA CON ÉXITO ✅`);
        console.log(`Nota: Los usuarios y clientes (que suelen estar en la DB central) no fueron tocados.`);
        console.log(`===========================================\n`);
        
    } catch (error) {
        console.error('Error durante la limpieza:', error);
    } finally {
        mongoose.disconnect();
    }
};

resetBranchData();
