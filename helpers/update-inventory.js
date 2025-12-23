const Inventory = require('../models/inventory.model');

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
    
            } else if (transaccion.transaccion === 'Venta') {
    
                // VENDIO MONEDA RESTA A LA MISMA MONEDA
                inventory.amount -= t.monto;
                // SUMA LOS PESOS
                pesos.amount += (t.monto * t.tasa);
    
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