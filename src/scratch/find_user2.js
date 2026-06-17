const mongoose = require('mongoose');
const getTurnoModel = require('../services/branch/models/turnos.model');

mongoose.connect('mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/branch_demo2_simidmas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB to find User of Orphan Turno");
    
    const Turno = getTurnoModel(mongoose.connection);
    const getUserModel = require('../services/company/models/users.model');
    const User = getUserModel(mongoose.connection);
    
    const turnoId = '6a2b83e4f6d966cd50285844';
    const turno = await Turno.findById(turnoId).lean();
    
    if (turno && turno.user) {
        console.log(`\n=== USUARIO DEL TURNO HUÉRFANO ===`);
        console.log(`ID: ${turno.user}`);
        const user = await User.findById(turno.user).lean();
        if (user) {
            console.log(`Nombre: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Rol: ${user.role}`);
        } else {
             // Maybe user is in the company db?
             const companyConn = mongoose.createConnection('mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/company_demo_simidmas');
             const CompanyUser = getUserModel(companyConn);
             const cUser = await CompanyUser.findById(turno.user).lean();
             if (cUser) {
                  console.log(`Nombre: ${cUser.name}`);
                  console.log(`Email: ${cUser.email}`);
                  console.log(`Rol: ${cUser.role}`);
             } else {
                 console.log("User not found in branch or company DB.");
             }
        }
    }
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
