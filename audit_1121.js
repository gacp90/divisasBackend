require('dotenv').config();
const mongoose = require('mongoose');
const Transaccion = require('./models/transacciones.model');
const Inventories = require('./models/inventory.model');
const Empresa = require('./models/empresa.model');
require('./models/clients.model'); // Registrar schemas para el populate
require('./models/users.model');

async function audit() {
    await mongoose.connect(process.env.DB_CNN, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conectado a la BD.");

    const usdInventory = await Inventories.findOne({ code: 'USD' });
    const usdId = usdInventory ? String(usdInventory._id) : null;
    console.log("USD ID obtenido de Inventories:", usdId);

    const query = {
        status: true,
        transaccion: { $in: ['Compra', 'Venta'] }
    };

    // Traemos un lote grande pero limitado de las últimas transacciones
    const transaccionesDB = await Transaccion.find(query)
        .populate({ path: 'client', populate: { path: 'representante' } })
        .populate('items.moneda')
        .sort({ fecha: -1 })
        .limit(200)
        .lean();
    
    console.log(`\nAnalizando ${transaccionesDB.length} transacciones recientes...`);
    
    let evaluadas = 0;

    for (const tx of transaccionesDB) {
        
        let usdMontoOriginal = 0; // Simulamos la lógica exacta que había original
        if (usdId && tx.items && Array.isArray(tx.items)) {
            for (const item of tx.items) {
                if (item.moneda && String(item.moneda._id) === usdId) {
                    usdMontoOriginal += (Number(item.monto) || 0);
                }
            }
        }
        
        const equivalencia = Number(tx.equivalencia) || 0;
        
        // Vamos a calcular el USD físico real ignorando el populate para ver si había discrepancia
        let usdMontoReal = 0;
        for (const item of tx.items) {
            let id = item.moneda && item.moneda._id ? String(item.moneda._id) : String(item.moneda);
            if (id === usdId) {
                usdMontoReal += (Number(item.monto) || 0);
            }
        }

        // Si la factura cae en los bordes problemáticos que menciona el usuario:
        // - USD reales >= 500 y Equivalencia < 500
        // - USD reales < 500 y Equivalencia >= 500
        // - O si la lógica antigua lo clasificaba diferente a la realidad.
        let isCandidata = false;
        let tipoCandidata = "";

        if (usdMontoReal >= 500 && equivalencia < 500) {
            isCandidata = true;
            tipoCandidata = "Factura A (USD >= 500, Equiv < 500)";
        } else if (usdMontoReal < 500 && equivalencia >= 500 && usdMontoReal > 0) {
            isCandidata = true;
            tipoCandidata = "Factura B (USD < 500, Equiv >= 500)";
        }

        if (isCandidata && evaluadas < 5) { // Mostrar máximo 5 para no saturar los logs
            evaluadas++;
            console.log("\n=========================================");
            console.log(`[!] ENCONTRADA ${tipoCandidata}`);
            console.log("1. OBJETO TRANSACCION OBTENIDO DE MONGO (Resumen):");
            console.log("   - _id:", tx._id);
            console.log("   - prefix + number:", tx.prefix + String(tx.number));
            console.log("   - control guardado en DB:", tx.control);
            console.log("   - equivalencia guardada en DB:", equivalencia);
            
            console.log("2. EVALUANDO LOS ITEMS (Moneda):");
            for (const item of tx.items) {
                console.log("   - item.monto:", item.monto);
                console.log("   - item.moneda typeof:", typeof item.moneda);
                console.log("   - item.moneda:", JSON.stringify(item.moneda));
                console.log("   - item.moneda._id:", item.moneda ? item.moneda._id : 'N/A');
                console.log("   - ¿Coincide el String(item.moneda._id) con usdId?:", item.moneda ? (String(item.moneda._id) === usdId) : false);
            }
            
            console.log("3. CALCULO DE USD FISICOS (Lógica Original en reportes.service.js):");
            console.log("   - usdMonto (Original):", usdMontoOriginal);
            console.log("   - usdMonto (Real esperado):", usdMontoReal);
            console.log("   - equivalencia:", equivalencia);
            
            const maxValOriginal = Math.max(equivalencia, usdMontoOriginal);
            const maxValReal = Math.max(equivalencia, usdMontoReal);

            console.log("4. CALCULO DEL MAXVAL:");
            console.log(`   - maxVal (Original): Math.max(${equivalencia}, ${usdMontoOriginal}) = ${maxValOriginal}`);
            console.log(`   - maxVal (Real): Math.max(${equivalencia}, ${usdMontoReal}) = ${maxValReal}`);
            
            console.log("5. EVALUACION DE REGLAS PARA XML DIAN:");
            console.log(`   Con el maxVal Original (${maxValOriginal}):`);
            console.log("   - ¿Aparecería en 1099/1100? (>= 500):", maxValOriginal >= 500);
            console.log("   - ¿Aparecería en 1121? (> 200 y < 500):", (maxValOriginal > 200 && maxValOriginal < 500));
            
            console.log(`   Con el maxVal Real (${maxValReal}):`);
            console.log("   - ¿Aparecería en 1099/1100? (>= 500):", maxValReal >= 500);
            console.log("   - ¿Aparecería en 1121? (> 200 y < 500):", (maxValReal > 200 && maxValReal < 500));
        }
    }
    
    if (evaluadas === 0) {
        console.log("\nNo se encontraron facturas en los últimos 200 registros que cumplan las condiciones A o B.");
        console.log("Busquemos la transacción específica que reporta el usuario por el control 1099...");
        // Podríamos ampliar la búsqueda si es necesario.
    }

    console.log("=========================================\nAuditoría finalizada.");
    process.exit(0);
}

audit().catch(err => {
    console.error(err);
    process.exit(1);
});
