const fs = require('fs');
const path = 'd:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/src/services/branch/controllers/movimientos.controller.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('const Turno = getTurnoModel(req.branchDb);\r\n        \r\n        // Validar movimiento', 'const Turno = getTurnoModel(req.branchDb);\n        const Inventory = getInventoryModel(req.branchDb);\r\n        \r\n        // Validar movimiento');

content = content.replace('const Turno = getTurnoModel(req.branchDb);\n        \n        // Validar movimiento', 'const Turno = getTurnoModel(req.branchDb);\n        const Inventory = getInventoryModel(req.branchDb);\n        \n        // Validar movimiento');

fs.writeFileSync(path, content);
console.log('Fixed Inventory missing declaration');
