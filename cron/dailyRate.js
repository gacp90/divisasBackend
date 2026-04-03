const cron = require('node-cron');
const Inventory = require('../models/inventory.model');
const Rate = require('../models/rates.model');

const runDailyAverageRate = () => {

  // 🕛 Todos los días a las 12:05 AM || 5 0 * * *  ||  */10 * * * *
  cron.schedule('5 0 * * *', async () => {

    try {
      console.log('⏱ Ejecutando cierre de tasa diaria...');

      let yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      yesterday = yesterday.toISOString().split('T')[0]; // Formato YYYY-MM-DD

      console.log('Fecha: ', yesterday);
      

      // Buscar solo monedas con movimientos ayer
      const dailyRates = await Rate.find({ date: new Date(yesterday) });

      // Si no hubo transacciones, no se hace nada
      if (!dailyRates.length) {
        console.log('ℹ️ No hubo transacciones ayer. No se actualiza tb.');
        return;
      }

      for (const rate of dailyRates) {

        console.log(rate.currency);
        

        if (rate.avgRate <= 0 && rate.avgRatec <= 0) continue;

        console.log('Actualizando..');
        

        await Inventory.findByIdAndUpdate(
          rate.currency,
          { tb: rate.avgRate, tbc: rate.avgRatec  }
        );
      }

      console.log('✅ Tasas promedio del día anterior actualizadas');

    } catch (error) {
      console.error('❌ Error en cron de tasa diaria:', error);
    }

  });
};

module.exports = runDailyAverageRate;
