const Inventory = require('../models/inventory.model');

const updateInventory = async(transaccion) => {

    try {

        const inventory = await Inventory.findById(transaccion.moneda);
        const pesos = await Inventory.findOne({ code: 'COP' });

        // VERIFICAR EL TIPO DE TRANSACCION PARA SUMAR O RESTAR EL INVENTARIO
        if (transaccion.transaccion === 'Compra') {

            // COMPRO MONEDA SUMA A LA MISMA MONEDA
            inventory.amount += transaccion.monto;
            // RESTA LOS PESOS
            pesos.amount -= transaccion.total;

        } else if (transaccion.transaccion === 'Venta') {

            // VENDIO MONEDA RESTA A LA MISMA MONEDA
            inventory.amount -= transaccion.monto;
            // SUMA LOS PESOS
            pesos.amount += transaccion.total;

        }

        await Promise.all([
            inventory.save(),
            pesos.save()
        ])

        return true;

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }


}

MediaSourceHandle.exports = {
    updateInventory
}