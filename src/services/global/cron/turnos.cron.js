const cron = require('node-cron');
const Subdomain = require('../models/subdomain.model');
const { getCompanyConnection, getBranchConnection } = require('../../../shared/database/connection');
const getBranchModel = require('../../company/models/branch.model');
const getUserModel = require('../../company/models/users.model');
const getTurnoModel = require('../../branch/models/turnos.model');
const getInventoryModel = require('../../branch/models/inventory.model');

/** =====================================================================
 *  CRON: CIERRE AUTOMÁTICO DE TURNOS
 *  Ejecución: 23:59 todos los días ('59 23 * * *')
 * =========================================================================*/
const startTurnosCron = () => {
  cron.schedule('59 23 * * *', async () => {
    console.log('--- INICIANDO CRON DE CIERRE AUTOMÁTICO DE TURNOS (23:59) ---');

    try {
      // 1. Obtener todas las empresas/subdominios activos
      const subdomains = await Subdomain.find({ isActive: true });
      
      for (const sub of subdomains) {
        console.log(`[CRON TURNOS] Procesando Empresa: ${sub.subdominio}`);
        
        try {
          // Conectar a la base de datos de la empresa
          const companyDb = getCompanyConnection(sub.subdominio);
          const Branch = getBranchModel(companyDb);
          const User = getUserModel(companyDb);
          
          // 2. Obtener todas las sucursales de esta empresa
          const branches = await Branch.find({ status: true });
          
          for (const branch of branches) {
            console.log(`  -> Procesando Sucursal: ${branch.name} (${branch.path})`);
            
            try {
              // Conectar a la base de datos de la sucursal
              const branchDb = getBranchConnection(branch.path);
              const Turno = getTurnoModel(branchDb);
              const Inventory = getInventoryModel(branchDb);
              
              // 3. Buscar turnos abiertos en esta sucursal
              const turnosAbiertos = await Turno.find({ abierto: true }).populate('user');
              
              for (const turno of turnosAbiertos) {
                // Verificamos si debemos excluir OWNER (el usuario indicó "tambien lo cierra", así que cerramos todos)
                // Se cierra todo turno que esté abierto.
                
                console.log(`    -> Cerrando turno del usuario: ${turno.user?.name || turno.user}`);
                
                // 4. Devolver los saldos físicos al inventario asumiendo diferencia = 0
                for (const saldo of turno.saldos) {
                  // Asumimos que el físico es el saldo que el sistema calculó
                  saldo.saldoFisico = saldo.saldoActual;
                  saldo.diferencia = 0;
                  
                  // Actualizar inventario de la bóveda
                  const inventario = await Inventory.findById(saldo.moneda);
                  if (inventario) {
                    if (!inventario.disponible) inventario.disponible = 0;
                    inventario.disponible += saldo.saldoActual;
                    await inventario.save();
                  }
                }
                
                // 5. Cerrar formalmente el turno
                turno.abierto = false;
                turno.close = Date.now();
                turno.cierreAutomatico = true; // Flag para identificar que fue cerrado por el sistema
                await turno.save();
                
                // 6. Actualizar al usuario en la BD de la empresa (liberarlo del turno)
                if (turno.user) {
                  // Si está populado o si es solo el ID
                  const userId = turno.user._id || turno.user;
                  await User.findByIdAndUpdate(userId, { turno: null });
                }
              }
            } catch (errBranch) {
              console.error(`[CRON TURNOS ERROR] Fallo al procesar sucursal ${branch.name}:`, errBranch.message);
            }
          }
        } catch (errCompany) {
          console.error(`[CRON TURNOS ERROR] Fallo al procesar empresa ${sub.subdominio}:`, errCompany.message);
        }
      }
      
      console.log('--- FIN CRON DE CIERRE AUTOMÁTICO DE TURNOS ---');
      
    } catch (error) {
      console.error('[CRON TURNOS ERROR CRÍTICO]', error);
    }
  });
};

module.exports = {
  startTurnosCron
};
