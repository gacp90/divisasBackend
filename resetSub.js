require('dotenv').config();
const mongoose = require('mongoose');
const Empresa = require('./models/empresa.model');

const resetSubscription = async () => {
    try {
        await mongoose.connect(process.env.DB_CNN);
        console.log('Base de datos conectada');

        const empresa = await Empresa.findOne();

        if (!empresa) {
            console.log(`No se encontró ninguna empresa.`);
            process.exit(1);
        }

        // Establecemos el último pago al mes pasado para simular que está inactiva/bloqueada
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 2);

        empresa.suscripcion = {
            estado: 'INACTIVA',
            ultimoPago: lastMonth
        };

        await empresa.save();

        console.log(`¡Éxito! La empresa '${empresa.name}' ha sido marcada como INACTIVA con fecha de último pago ${lastMonth.toISOString()}`);
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetSubscription();
