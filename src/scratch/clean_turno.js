const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const getTurnoModel = require('../services/branch/models/turnos.model');

mongoose.connect('mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/branch_demo2_simidmas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB for Turno Cleanup");
    
    const Turno = getTurnoModel(mongoose.connection);
    const turnoId = '6a2b83e4f6d966cd50285844';
    
    // 1. Fetch and Backup Document
    const turno = await Turno.findById(turnoId).lean();
    if (!turno) {
        console.error("Turno no encontrado.");
        process.exit(1);
    }
    
    const backupPath = path.join(__dirname, 'turno_backup_6a2b83e4f6d966cd50285844.json');
    fs.writeFileSync(backupPath, JSON.stringify(turno, null, 2));
    console.log(`Respaldo creado exitosamente en: ${backupPath}`);
    
    // 2. Ejecutar la limpieza (El comando Mongo exacto que pide el usuario)
    // Comando exacto: db.turnos.updateOne({ _id: ObjectId('6a2b83e4f6d966cd50285844') }, { $set: { saldos: [] } })
    const result = await Turno.updateOne({ _id: turnoId }, { $set: { saldos: [] } });
    console.log(`Limpieza ejecutada. Documentos modificados: ${result.modifiedCount}`);
    
    // 3. Verify
    const turnoClean = await Turno.findById(turnoId).lean();
    console.log("Estado post-limpieza del arreglo saldos:", turnoClean.saldos);
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
