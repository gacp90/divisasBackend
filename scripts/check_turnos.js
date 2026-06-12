require('dotenv').config();
const { dbConection } = require('../database/config');
const Subdomain = require('../src/services/global/models/subdomain.model');
const { getCompanyConnection, getBranchConnection } = require('../src/shared/database/connection');
const getBranchModel = require('../src/services/company/models/branch.model');
const getTurnoModel = require('../src/services/branch/models/turnos.model');

const checkTurnos = async () => {
    await dbConection();
    const subdomains = await Subdomain.find({ isActive: true });
    
    for (const sub of subdomains) {
        const companyDb = getCompanyConnection(sub.subdominio);
        const Branch = getBranchModel(companyDb);
        const branches = await Branch.find({ isActive: true });
        
        for (const branch of branches) {
            const branchDb = getBranchConnection(sub.subdominio, branch.path);
            const Turno = getTurnoModel(branchDb);
            const turnosAbiertos = await Turno.find({ abierto: true }).populate('user', 'name role');
            console.log(`Sucursal: ${branch.name} (${sub.subdominio}) -> Turnos abiertos: ${turnosAbiertos.length}`);
            turnosAbiertos.forEach(t => {
                console.log(`  - Cajero: ${t.user?.name || 'Desconocido'} (Rol: ${t.user?.role}) | Abierto: ${t.open}`);
            });
        }
    }
    process.exit(0);
};

checkTurnos();
