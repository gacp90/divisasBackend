const mongoose = require('mongoose');
const getTurnoModel = require('../services/branch/models/turnos.model');

mongoose.connect('mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/branch_demo2_simidmas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB to find User of Orphan Turno");
    
    const Turno = getTurnoModel(mongoose.connection);
    
    const turnoId = '6a2b83e4f6d966cd50285844';
    const turno = await Turno.findById(turnoId).populate('user').lean();
    
    if (turno && turno.user) {
        console.log(`\n=== USUARIO DEL TURNO HUÉRFANO ===`);
        console.log(`ID: ${turno.user._id}`);
        console.log(`Nombre: ${turno.user.name}`);
        console.log(`Email: ${turno.user.email}`);
        console.log(`Rol: ${turno.user.role}`);
    } else {
        console.log("Turno no encontrado o usuario no populado.");
        if (turno) {
            console.log(`Solo ID de usuario disponible: ${turno.user}`);
        }
    }
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
