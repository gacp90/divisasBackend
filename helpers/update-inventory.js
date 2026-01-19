const Inventory = require('../models/inventory.model');
const Rate = require('../models/rates.model');

const updateInventoryAmount = async(transaccion) => {

    try {

        for (const t of transaccion.items) {
            
            const inventory = await Inventory.findById(t.moneda);
            const pesos = await Inventory.findOne({ code: 'COP' });
    
            // VERIFICAR EL TIPO DE TRANSACCION PARA SUMAR O RESTAR EL INVENTARIO
            if (transaccion.transaccion === 'Compra') {
    
                // COMPRO MONEDA SUMA A LA MISMA MONEDA
                inventory.amount += t.monto;
                // RESTA LOS PESOS
                pesos.amount -= (t.monto * t.tasa);

                // ACTUALIZAR TASA DIARIA
                const today = new Date();
                today.setHours(0,0,0,0);

                const daily = await Rate.findOneAndUpdate(
                    { currency: inventory._id, date: today },
                    {
                    $inc: {
                        totalAmount: t.monto,
                        totalValue: t.monto * t.tasa
                    }
                    },
                    { upsert: true, new: true }
                );

                // TASA PROMEDIO ACTUAL
                daily.avgRatec = daily.totalValue / daily.totalAmount;
                inventory.tpc = daily.totalValue / daily.totalAmount;

                await daily.save();
    
            } else if (transaccion.transaccion === 'Venta') {
    
                // VENDIO MONEDA RESTA A LA MISMA MONEDA
                inventory.amount -= t.monto;
                // SUMA LOS PESOS
                pesos.amount += (t.monto * t.tasa);

                // ACTUALIZAR TASA DIARIA
                const today = new Date();
                today.setHours(0,0,0,0);

                const daily = await Rate.findOneAndUpdate(
                    { currency: inventory._id, date: today },
                    {
                    $inc: {
                        totalAmount: t.monto,
                        totalValue: t.monto * t.tasa
                    }
                    },
                    { upsert: true, new: true }
                );

                // TASA PROMEDIO ACTUAL
                daily.avgRate = daily.totalValue / daily.totalAmount;
                inventory.tp = daily.totalValue / daily.totalAmount;

                await daily.save();
    
            }
    
            await Promise.all([
                inventory.save(),
                pesos.save()
            ])
        }
        

        return true;

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }


}

module.exports = {
    updateInventoryAmount
}