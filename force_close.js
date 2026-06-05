const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/.env' });
const { getCompanyConnection, getBranchConnection } = require('d:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/src/shared/database/connection');
const getBranchModel = require('d:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/src/services/company/models/branch.model');
const getTurnosModel = require('d:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/src/services/branch/models/turnos.model');

async function closeAllTurnos() {
    // wait for mongoose to connect globally if needed, actually our connections are explicit
    const companyDb = getCompanyConnection('simidmas');
    await companyDb.asPromise();
    const Branch = getBranchModel(companyDb);
    const branches = await Branch.find({});
    
    for (const b of branches) {
        const branchDb = getBranchConnection('simidmas', b.path);
        await branchDb.asPromise();
        const Turno = getTurnosModel(branchDb);
        const result = await Turno.updateMany({ abierto: true }, { $set: { abierto: false, status: 'cierre_automatico' } });
        console.log(`Closed ${result.modifiedCount} turnos in ${b.name}`);
    }
    console.log('All turnos closed.');
    process.exit(0);
}
closeAllTurnos().catch(console.error);
