const mongoose = require('mongoose');
const getTurnoModel = require('../services/branch/models/turnos.model');

mongoose.connect('mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/branch_demo2_simidmas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB for Full Document Dump");
    
    const Turno = getTurnoModel(mongoose.connection);
    
    const turnoId = '6a2b83e4f6d966cd50285844';
    const turno = await Turno.findById(turnoId).lean();
    
    console.log(JSON.stringify(turno, null, 2));
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
