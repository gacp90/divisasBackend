const fs = require('fs');
const path = 'd:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/src/services/branch/controllers/movimientos.controller.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('const Inventory = getInventoryModel(req.branchDb);\n        const Inventory = getInventoryModel(req.branchDb);', 'const Inventory = getInventoryModel(req.branchDb);');
content = content.replace('const Inventory = getInventoryModel(req.branchDb);\r\n        const Inventory = getInventoryModel(req.branchDb);', 'const Inventory = getInventoryModel(req.branchDb);');

fs.writeFileSync(path, content);
console.log('Fixed double declaration');
