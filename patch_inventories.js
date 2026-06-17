const fs = require('fs');
const path = 'd:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/src/services/branch/controllers/inventories.controller.js';
let content = fs.readFileSync(path, 'utf8');

// Modificando updateInventory
content = content.replace(
    '// VALIDATE\r\n        const { currency, ...campos } = req.body;',
    '// VALIDATE\n        const { currency, ...campos } = req.body;\n\n        // 1. Sanitización incondicional de TPC\n        delete campos.tpc;\n\n        // 2. Validación Inteligente de Siembras de Efectivo Físico\n        if (campos.amount !== undefined || campos.disponible !== undefined) {\n            if (inventoryDB.amount !== inventoryDB.disponible) {\n                // Regla A: Hubo movimiento de caja. Se bloquea la siembra manual.\n                delete campos.amount;\n                delete campos.disponible;\n            } else {\n                // Regla B: Validación profunda en base de datos para garantizar inmutabilidad histórica\n                const txAsociada = await Transaccion.findOne({ \"items.moneda\": invid });\n                const trasladoAsociado = await Traslado.findOne({ \n                    $or: [{ monedaEntregada: invid }, { monedaRecibida: invid }] \n                });\n\n                if (txAsociada || trasladoAsociado) {\n                    // Regla C: Ya hay historial contable. Se bloquea la siembra manual.\n                    delete campos.amount;\n                    delete campos.disponible;\n                }\n                // Si no entra en los IF, es una Siembra de Saldo Inicial Válida y permitimos la edición.\n            }\n        }'
);
content = content.replace( // fallback \n
    '// VALIDATE\n        const { currency, ...campos } = req.body;',
    '// VALIDATE\n        const { currency, ...campos } = req.body;\n\n        // 1. Sanitización incondicional de TPC\n        delete campos.tpc;\n\n        // 2. Validación Inteligente de Siembras de Efectivo Físico\n        if (campos.amount !== undefined || campos.disponible !== undefined) {\n            if (inventoryDB.amount !== inventoryDB.disponible) {\n                // Regla A: Hubo movimiento de caja. Se bloquea la siembra manual.\n                delete campos.amount;\n                delete campos.disponible;\n            } else {\n                // Regla B: Validación profunda en base de datos para garantizar inmutabilidad histórica\n                const txAsociada = await Transaccion.findOne({ \"items.moneda\": invid });\n                const trasladoAsociado = await Traslado.findOne({ \n                    $or: [{ monedaEntregada: invid }, { monedaRecibida: invid }] \n                });\n\n                if (txAsociada || trasladoAsociado) {\n                    // Regla C: Ya hay historial contable. Se bloquea la siembra manual.\n                    delete campos.amount;\n                    delete campos.disponible;\n                }\n                // Si no entra en los IF, es una Siembra de Saldo Inicial Válida y permitimos la edición.\n            }\n        }'
);

fs.writeFileSync(path, content);
console.log('inventories.controller.js patched successfully');
