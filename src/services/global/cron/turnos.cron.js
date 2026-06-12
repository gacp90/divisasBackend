const cron = require('node-cron');
const Subdomain = require('../models/subdomain.model');
const { getCompanyConnection, getBranchConnection } = require('../../../shared/database/connection');
const getBranchModel = require('../../company/models/branch.model');
const getUserModel = require('../../company/models/users.model');
const getTurnoModel = require('../../branch/models/turnos.model');
const getInventoryModel = require('../../branch/models/inventory.model');
const { processPendingTransfersForTurno } = require('../../../shared/helpers/processPendingTransfers');

/** =====================================================================
 *  CRON: CIERRE AUTOMÁTICO DE TURNOS
 *  Ejecución: 23:59 todos los días ('59 23 * * *')
 * =========================================================================*/
const runCierreTurnosGlobal = async () => {
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
          const branches = await Branch.find({ isActive: true });
          
          for (const branch of branches) {
            console.log(`  -> Procesando Sucursal: ${branch.name} (${branch.path})`);
            
            try {
              // Conectar a la base de datos de la sucursal
              const branchDb = getBranchConnection(sub.subdominio, branch.path);
              const Turno = getTurnoModel(branchDb);
              const Inventory = getInventoryModel(branchDb);
              const UserBranch = getUserModel(branchDb);
              
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
                
                // Procesar traslados pendientes
                await processPendingTransfersForTurno(turno, branchDb, companyDb, sub.subdominio, branch.name);

                // 5. Cerrar formalmente el turno
                turno.abierto = false;
                turno.close = Date.now();
                turno.cierreAutomatico = true; // Flag para identificar que fue cerrado por el sistema
                await turno.save();
                
                // 6. Actualizar al usuario en la BD de la empresa y sucursal (liberarlo del turno)
                if (turno.user) {
                  // Si está populado o si es solo el ID
                  const userId = turno.user._id || turno.user;
                  await User.findByIdAndUpdate(userId, { turno: null });
                  await UserBranch.findByIdAndUpdate(userId, { turno: null });
                }
              }
            } catch (errBranch) {
              console.error(`[CRON TURNOS ERROR] Fallo al procesar sucursal ${branch.name}:`, errBranch.message);
            }
          }
          
          // --- LIMPIEZA DE AUDITORÍA (VENTANA DE 7 DÍAS) ---
          const getAuditCronLogsModel = require('../../company/models/auditCronLogs.model');
          const AuditCronLogs = getAuditCronLogsModel(companyDb);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const eliminados = await AuditCronLogs.deleteMany({ fechaCierreAuto: { $lt: sevenDaysAgo } });
          console.log(`[CRON LIMPIEZA] Eliminados ${eliminados.deletedCount} registros de auditoría anteriores a 7 días en ${sub.subdominio}.`);
          
        } catch (errCompany) {
          console.error(`[CRON TURNOS ERROR] Fallo al procesar empresa ${sub.subdominio}:`, errCompany.message);
        }
      }
      
      console.log('--- FIN CRON DE CIERRE AUTOMÁTICO DE TURNOS ---');
      
    } catch (error) {
      console.error('[CRON TURNOS ERROR CRÍTICO]', error);
    }
};

const startTurnosCron = () => {
  cron.schedule('59 23 * * *', runCierreTurnosGlobal, {
    timezone: 'America/Bogota'
  });
};

/** =====================================================================
 *  CRON: CIERRE ESTRICTO DE CAJEROS (VIGILANTE MINUTO A MINUTO)
 *  Ejecución: Cada minuto ('* * * * *')
 * =========================================================================*/

const runCierreEstrictoCajeros = async (mockDate = null) => {
    try {
      const nowBogota = mockDate || new Date(new Date().toLocaleString("en-US", {timeZone: "America/Bogota"}));
      console.log(`[VIGILANTE CAJEROS] Verificando turnos a las: ${nowBogota.toLocaleTimeString()}`);
      
      // 1. Obtener todas las empresas/subdominios activos
      const subdomains = await Subdomain.find({ isActive: true });
      
      for (const sub of subdomains) {
        try {
          const companyDb = getCompanyConnection(sub.subdominio);
          const Branch = getBranchModel(companyDb);
          const User = getUserModel(companyDb);
          
          const branches = await Branch.find({ isActive: true });
          
          for (const branch of branches) {
            try {
              const branchDb = getBranchConnection(sub.subdominio, branch.path);
              const Turno = getTurnoModel(branchDb);
              const Inventory = getInventoryModel(branchDb);
              const UserBranch = getUserModel(branchDb);
              const getEmpresaModel = require('../../branch/models/empresa.model');
              const Empresa = getEmpresaModel(branchDb);
              
              // Obtener hora límite de la sucursal
              const empresaInfo = await Empresa.findOne();
              const horaCierreTurnoStr = (empresaInfo && empresaInfo.horaCierreTurno) ? empresaInfo.horaCierreTurno : '20:00';
              
              // Parsear hora límite a objeto Date para hoy
              const [horasL, minsL] = horaCierreTurnoStr.split(':').map(Number);
              const horaLimiteDate = new Date(nowBogota);
              horaLimiteDate.setHours(horasL, minsL, 0, 0);
              
              // Verificar si la hora actual ya superó o es igual a la hora de cierre configurada
              if (nowBogota >= horaLimiteDate) {
                 
                 // Buscar turnos abiertos en esta sucursal
                 const turnosAbiertos = await Turno.find({ abierto: true }).populate('user');
                 
                 for (const turno of turnosAbiertos) {
                    if (turno.user && turno.user.role === 'CAJERO') {
                        
                        // REGLA DE TOLERANCIA
                        // Comparamos a qué hora se abrió este turno específicamente
                        const turnoOpenBogota = new Date(new Date(turno.open).toLocaleString("en-US", {timeZone: "America/Bogota"}));
                        
                        // Si se abrió ANTES de la hora límite de hoy, significa que es un turno diurno vencido. Lo cerramos de golpe.
                        if (turnoOpenBogota < horaLimiteDate) {
                            console.log(`[CRON CAJEROS] Cerrando de golpe el turno del cajero: ${turno.user.name || turno.user} de sucursal ${branch.name}`);
                            
                            // Devolver los saldos físicos al inventario
                            for (const saldo of turno.saldos) {
                              saldo.saldoFisico = saldo.saldoActual;
                              saldo.diferencia = 0;
                              
                              const inventario = await Inventory.findById(saldo.moneda);
                              if (inventario) {
                                if (!inventario.disponible) inventario.disponible = 0;
                                inventario.disponible += saldo.saldoActual;
                                await inventario.save();
                              }
                            }
                            
                            // Procesar traslados pendientes
                            await processPendingTransfersForTurno(turno, branchDb, companyDb, sub.subdominio, branch.name);

                            // Cerrar formalmente el turno
                            turno.abierto = false;
                            turno.close = Date.now();
                            turno.cierreAutomatico = true;
                            await turno.save();
                            
                            // Liberar usuario
                            const userId = turno.user._id || turno.user;
                            await User.findByIdAndUpdate(userId, { turno: null });
                            await UserBranch.findByIdAndUpdate(userId, { turno: null });
                        }
                    }
                 }
              }
              
            } catch (errBranch) {
               console.error(`[CRON CAJEROS ERROR] Fallo al procesar sucursal ${branch.name}:`, errBranch.message);
            }
          }
        } catch (errCompany) {
           console.error(`[CRON CAJEROS ERROR] Fallo al procesar empresa ${sub.subdominio}:`, errCompany.message);
        }
      }
    } catch (error) {
      console.error('[CRON CAJEROS ERROR CRÍTICO]', error);
    }
};

const startCierreEstrictoCajerosCron = () => {
  cron.schedule('* * * * *', () => runCierreEstrictoCajeros(), {
    timezone: 'America/Bogota'
  });
};

module.exports = {
  startTurnosCron,
  startCierreEstrictoCajerosCron,
  runCierreTurnosGlobal,
  runCierreEstrictoCajeros
};
