const fs = require('fs');
const path = 'd:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/src/services/branch/controllers/movimientos.controller.js';
let content = fs.readFileSync(path, 'utf8');

// 1. IMPORT
content = content.replace(
    "const getTurnoModel = require('../models/turnos.model');",
    "const getTurnoModel = require('../models/turnos.model');\nconst getInventoryModel = require('../models/inventory.model');"
);

// 2. CREATE MOVIMIENTO DECLARATIONS
content = content.replace(
    "const Turno = getTurnoModel(req.branchDb);",
    "const Turno = getTurnoModel(req.branchDb);\n        const Inventory = getInventoryModel(req.branchDb);"
);

// 3. CREATE MOVIMIENTO COP INVENTORY
content = content.replace(
    "const turno = await Turno.findById(user.turno._id).populate('saldos.moneda');",
    "const turno = await Turno.findById(user.turno._id).populate('saldos.moneda');\n        const inventarioCop = await Inventory.findOne({ code: 'COP' });\n        if (!inventarioCop) return res.status(400).json({ ok: false, msg: 'No se encontró el inventario global de COP' });"
);

// 4. CREATE MOVIMIENTO ENTRADA
content = content.replace(
    "turno.totalEntradasCOP += movimiento.amount;",
    "turno.totalEntradasCOP += movimiento.amount;\n            inventarioCop.amount += movimiento.amount;"
);

// 5. CREATE MOVIMIENTO SALIDA
content = content.replace(
    "turno.totalSalidasCOP += movimiento.amount;",
    "turno.totalSalidasCOP += movimiento.amount;\n            inventarioCop.amount -= movimiento.amount;"
);

// 6. CREATE MOVIMIENTO SAVE
content = content.replace(
    "movimiento.save(),\r\n            turno.save()\r\n        ])",
    "movimiento.save(),\n            turno.save(),\n            inventarioCop.save()\n        ])"
);
content = content.replace( // in case it is \n
    "movimiento.save(),\n            turno.save()\n        ])",
    "movimiento.save(),\n            turno.save(),\n            inventarioCop.save()\n        ])"
);

// 7. DELETE MOVIMIENTO DECLARATIONS
content = content.replace(
    "const Turno = getTurnoModel(req.branchDb);",
    "const Turno = getTurnoModel(req.branchDb);\n        const Inventory = getInventoryModel(req.branchDb);"
);

// 8. DELETE MOVIMIENTO COP INVENTORY
content = content.replace(
    "const amount = movimiento.amount;",
    "const inventarioCop = await Inventory.findOne({ code: 'COP' });\n        if (!inventarioCop) return res.status(400).json({ ok: false, msg: 'No se encontró el inventario global de COP' });\n\n        const amount = movimiento.amount;"
);

// 9. DELETE MOVIMIENTO ENTRADA
content = content.replace(
    "turno.totalEntradasCOP -= amount;",
    "turno.totalEntradasCOP -= amount;\n            inventarioCop.amount -= amount;"
);

// 10. DELETE MOVIMIENTO SALIDA
content = content.replace(
    "turno.totalSalidasCOP -= amount;",
    "turno.totalSalidasCOP -= amount;\n            inventarioCop.amount += amount;"
);

// 11. DELETE MOVIMIENTO SAVE
content = content.replace(
    "movimiento.deleteOne(),\r\n            turno.save()           \r\n        ]);",
    "movimiento.deleteOne(),\n            turno.save(),\n            inventarioCop.save()\n        ]);"
);
content = content.replace( // in case it is \n
    "movimiento.deleteOne(),\n            turno.save()           \n        ]);",
    "movimiento.deleteOne(),\n            turno.save(),\n            inventarioCop.save()\n        ]);"
);

fs.writeFileSync(path, content);
console.log('Backend patched successfully');
