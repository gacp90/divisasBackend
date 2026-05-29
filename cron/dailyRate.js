const cron = require('node-cron');
const Subdomain = require('../src/services/global/models/subdomain.model');
const { getBranchConnection } = require('../src/shared/database/connection');
const getInventoryModel = require('../src/services/branch/models/inventory.model');
const getRateModel = require('../src/services/branch/models/rates.model');

const runDailyAverageRate = () => {

  // 🕛 Todos los días a las 12:05 AM || 5 0 * * *  ||  */1 * * * *
  cron.schedule('5 0 * * * ', async () => {

    try {
      console.log('⏱ Ejecutando cierre de tasa diaria en sucursales...');

      let yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      yesterday = yesterday.toISOString().split('T')[0]; // Formato YYYY-MM-DD

      console.log('Fecha: ', yesterday);
      
      const subdomains = await Subdomain.find({ isActive: true });

      for (const sub of subdomains) {
          const { getCompanyConnection } = require('../src/shared/database/connection');
          const companyDb = getCompanyConnection(sub.subdominio);
          const getBranchModel = require('../src/services/company/models/branch.model');
          const Branch = getBranchModel(companyDb);
          
          const branches = await Branch.find({ status: true });
          
          for (const branch of branches) {
              const branchDb = getBranchConnection(sub.subdominio, branch.path);
              const Rate = getRateModel(branchDb);
              const Inventory = getInventoryModel(branchDb);

              // Buscar solo monedas con movimientos ayer
              const dailyRates = await Rate.find({ date: new Date(yesterday) }).populate('currency', 'code amount anterior tbc')

              // Si no hubo transacciones, no se hace nada
              if (!dailyRates.length) {
                console.log(`ℹ️ No hubo transacciones ayer en sucursal ${branch.path} (${sub.subdominio}). No se actualiza tb.`);
                continue;
              }

              for (const rate of dailyRates) {

                if (rate.avgRate <= 0 && rate.avgRatec <= 0) continue;

                let saldoCopAnterior = (rate.currency.anterior * rate.currency.tbc);
                let totalDivisa = rate.totalAmount + rate.currency.anterior;
                let totalCop = rate.totalValue + saldoCopAnterior;

                await Inventory.findByIdAndUpdate(
                  rate.currency,
                  { 
                    tb: rate.avgRate, 
                    tbc: (totalCop / totalDivisa).toFixed(2),
                    tpc: (totalCop / totalDivisa).toFixed(2),
                    anterior: rate.currency.amount
                  }
                ); 
              }

              console.log(`✅ Tasas promedio del día anterior actualizadas para sucursal ${branch.path} (${sub.subdominio})`);
          }
      }

    } catch (error) {
      console.error('❌ Error en cron de tasa diaria:', error);
    }

  });
};

module.exports = runDailyAverageRate;
