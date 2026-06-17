require('dotenv').config();
const mongoose = require('mongoose');

const auditMovements = async () => {
    try {
        await mongoose.connect(process.env.DB_CNN || 'mongodb://127.0.0.1:27017/simidDB');
        console.log('--- LISTADO EXACTO DE MOVIMIENTOS HISTÓRICOS ---');
        
        const adminDb = mongoose.connection.useDb('admin');
        const { databases } = await adminDb.db.admin().listDatabases();
        
        for (const database of databases) {
            if (database.name === 'admin' || database.name === 'config' || database.name === 'local') continue;
            
            const branchDb = mongoose.connection.useDb(database.name);
            const Movimiento = branchDb.collection('movimientos');
            
            const movimientos = await Movimiento.find({ type: { $in: ['Entrada', 'Salida'] } })
                                                .sort({ fecha: 1 })
                                                .toArray();
            
            if (movimientos.length === 0) continue;
            
            console.log(`\n===========================================`);
            console.log(`SUCURSAL: ${database.name}`);
            console.log(`===========================================`);
            
            let totalEntradas = 0;
            let totalSalidas = 0;
            
            for (let i = 0; i < movimientos.length; i++) {
                const mov = movimientos[i];
                console.log(`[${i+1}] Fecha: ${mov.fecha ? mov.fecha.toISOString() : 'N/A'} | Tipo: ${mov.type} | Valor: $${mov.amount} | Desc: ${mov.description} | ID: ${mov._id}`);
                
                if (mov.type === 'Entrada') totalEntradas += mov.amount;
                if (mov.type === 'Salida') totalSalidas += mov.amount;
            }
            
            console.log(`-------------------------------------------`);
            console.log(`RESUMEN: Entradas = $${totalEntradas} | Salidas = $${totalSalidas} | Neto = ${totalEntradas - totalSalidas}`);
        }
        console.log(`\n--- FIN DE LA AUDITORÍA ---`);
        
    } catch (error) {
        console.error(error);
    } finally {
        mongoose.disconnect();
    }
};

auditMovements();
