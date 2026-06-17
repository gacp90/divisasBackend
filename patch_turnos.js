const fs = require('fs');
const path = 'd:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/src/services/branch/controllers/turnos.controller.js';
let content = fs.readFileSync(path, 'utf8');

// Modificando updateTurno
content = content.replace(
    '// VALIDATE\r\n        const {...campos } = req.body;\r\n\r\n        // UPDATE',
    'if (!turnoDB.abierto) {\n            return res.status(403).json({\n                ok: false,\n                msg: "Inmutabilidad Histórica: No puedes editar un turno que ya ha sido cerrado"\n            });\n        }\n\n        // VALIDATE\n        const {...campos } = req.body;\n\n        // SANITIZACION DE INMUTABILIDAD FINANCIERA\n        delete campos.saldos;\n        delete campos.totalEntradasCOP;\n        delete campos.totalSalidasCOP;\n\n        // UPDATE'
);
content = content.replace( // fallback \n
    '// VALIDATE\n        const {...campos } = req.body;\n\n        // UPDATE',
    'if (!turnoDB.abierto) {\n            return res.status(403).json({\n                ok: false,\n                msg: "Inmutabilidad Histórica: No puedes editar un turno que ya ha sido cerrado"\n            });\n        }\n\n        // VALIDATE\n        const {...campos } = req.body;\n\n        // SANITIZACION DE INMUTABILIDAD FINANCIERA\n        delete campos.saldos;\n        delete campos.totalEntradasCOP;\n        delete campos.totalSalidasCOP;\n\n        // UPDATE'
);

fs.writeFileSync(path, content);
console.log('turnos.controller.js patched successfully');
