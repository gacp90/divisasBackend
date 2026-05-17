const Inventory = require('../models/inventory.model');
const Rate = require('../models/rates.model');
const Turno = require('../models/turnos.model');

const updateInventoryAmount = async(transaccion, turno) => {

    try {

        for (const t of transaccion.items) {
            
            const inventory = await Inventory.findById(t.moneda);
            const pesos = await Inventory.findOne({ code: 'COP' });

            const indexDivisaTurno = turno.saldos.findIndex(s => String(s.moneda._id) === String(inventory._id));
            const indexCopTurno = turno.saldos.findIndex(s => String(s.moneda._id) === String(pesos._id));
    
            // VERIFICAR EL TIPO DE TRANSACCION PARA SUMAR O RESTAR EL INVENTARIO
            if (transaccion.transaccion === 'Compra') {
    
                // COMPRO MONEDA SUMA A LA MISMA MONEDA
                inventory.amount += t.monto;
                // RESTA LOS PESOS
                pesos.amount -= (t.monto * t.tasa);

                // --- CAJA DEL TURNO ---
                if (indexDivisaTurno >= 0) turno.saldos[indexDivisaTurno].saldoActual += t.monto;
                if (indexCopTurno >= 0) turno.saldos[indexCopTurno].saldoActual -= (t.monto * t.tasa);

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
                ).populate('currency', 'anterior tbc');

                // TASA PROMEDIO ACTUAL
                daily.avgRatec = daily.totalValue / daily.totalAmount;
                inventory.tpc = daily.totalValue / daily.totalAmount;
                inventory.tc = t.tasa;

                // CALCULAR LA TASA ACTUAL CON LA EL MONTO DE COMPRAS DEL DIA ANTERIOR
                let saldoCopAnterior = (daily.currency.anterior * daily.currency.tbc);
                let totalDivisa = daily.totalAmount + daily.currency.anterior;
                let totalCop = daily.totalValue + saldoCopAnterior;

                inventory.ta = (totalCop / totalDivisa).toFixed(4);

                await daily.save();
    
            } else if (transaccion.transaccion === 'Venta') {
    
                // VENDIO MONEDA RESTA A LA MISMA MONEDA
                inventory.amount -= t.monto;
                // SUMA LOS PESOS
                pesos.amount += (t.monto * t.tasa);

                // --- CAJA DEL TURNO ---
                if (indexDivisaTurno >= 0) turno.saldos[indexDivisaTurno].saldoActual -= t.monto;
                if (indexCopTurno >= 0) turno.saldos[indexCopTurno].saldoActual += (t.monto * t.tasa);

                // ACTUALIZAR TASA DIARIA
                const today = new Date();
                today.setHours(0,0,0,0);

                const daily = await Rate.findOneAndUpdate(
                    { currency: inventory._id, date: today },
                    {
                    $inc: {
                        totalAmountV: t.monto,
                        totalValueV: t.monto * t.tasa
                    }
                    },
                    { upsert: true, new: true }
                );

                // TASA PROMEDIO ACTUAL
                daily.avgRate = daily.totalValueV / daily.totalAmountV;
                inventory.tp = daily.totalValueV / daily.totalAmountV;
                
                inventory.tv = t.tasa;

                await daily.save();
    
            }
    
            await Promise.all([
                inventory.save(),
                pesos.save()
            ])
        }

        // CALCULAR Y ACTUALIZAR UTILIDAD DEL TURNO (Solo en Ventas sumamos Base Liquida)
        if (transaccion.transaccion === 'Venta') {
            let totalBaseliq = 0;
            for (const t of transaccion.items) {
                if (t.baseliq > 0) {
                    totalBaseliq += t.baseliq;
                }
            }
            if (totalBaseliq > 0) {
                turno.utilidad = (turno.utilidad || 0) + totalBaseliq;
            }
        }
        
        // GUARDAMOS EL TURNO ACTUALIZADO
        await turno.save();
        return true;

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }
}

const revertInventoryAmount = async(transaccion, turno) => {

    try {
        for (const t of transaccion.items) {
            
            const inventory = await Inventory.findById(t.moneda);
            const pesos = await Inventory.findOne({ code: 'COP' });

            const indexDivisaTurno = turno.saldos.findIndex(s => String(s.moneda) === String(inventory._id));
            const indexCopTurno = turno.saldos.findIndex(s => String(s.moneda) === String(pesos._id));

            
            const transactionDate = new Date(transaccion.fecha);
            transactionDate.setHours(0,0,0,0);
    
            if (transaccion.transaccion === 'Compra') {

                // VALIDACIÓN DEl TURNO
                if (indexDivisaTurno === -1 || turno.saldos[indexDivisaTurno].saldoActual < t.monto) {
                    throw new Error(`Fondos insuficientes en gaveta. No tienes ${t.monto} ${inventory.code} para devolver al cliente.`);
                }

                inventory.amount -= t.monto;
                pesos.amount += (t.monto * t.tasa);

                if (indexDivisaTurno >= 0) turno.saldos[indexDivisaTurno].saldoActual -= t.monto;
                if (indexCopTurno >= 0) turno.saldos[indexCopTurno].saldoActual += (t.monto * t.tasa);

                const daily = await Rate.findOneAndUpdate(
                    { currency: inventory._id, date: transactionDate },
                    {
                        $inc: {
                            totalAmount: -t.monto,
                            totalValue: -(t.monto * t.tasa) 
                        }
                    },
                    { new: true } 
                );

                if (daily) {
                    if (daily.totalAmount > 0) {
                        daily.avgRatec = daily.totalValue / daily.totalAmount;
                        inventory.tpc = daily.totalValue / daily.totalAmount;
                    } else {
                        daily.avgRatec = 0; 
                    }
                    await daily.save();
                }
    
            } else if (transaccion.transaccion === 'Venta') {

                // VALIDACIÓN DE TURNO
                const pesosADevolver = t.monto * t.tasa;
                if (indexCopTurno === -1 || turno.saldos[indexCopTurno].saldoActual < pesosADevolver) {
                    throw new Error(`Fondos insuficientes en gaveta. No tienes ${pesosADevolver} COP para devolver al cliente.`);
                }

                inventory.amount += t.monto;
                pesos.amount -= pesosADevolver;

                if (indexDivisaTurno >= 0) turno.saldos[indexDivisaTurno].saldoActual += t.monto;
                if (indexCopTurno >= 0) turno.saldos[indexCopTurno].saldoActual -= pesosADevolver;

                const daily = await Rate.findOneAndUpdate(
                    { currency: inventory._id, date: transactionDate },
                    {
                        $inc: {
                            totalAmount: -t.monto,
                            totalValue: -(t.monto * t.tasa)
                        }
                    },
                    { new: true }
                );

                if (daily) {
                    if (daily.totalAmount > 0) {
                        daily.avgRate = daily.totalValue / daily.totalAmount;
                        inventory.tp = daily.totalValue / daily.totalAmount;
                    } else {
                        daily.avgRate = 0;
                    }
                    await daily.save();
                }
            }
    
            // Guardamos Inventarios Globales
            await Promise.all([
                inventory.save(),
                pesos.save()
            ]);
        }

        // REVERTIR UTILIDAD DEL TURNO SI FUE UNA VENTA ANULADA
        if (transaccion.transaccion === 'Venta') {
            let totalBaseliq = 0;
            for (const t of transaccion.items) {
                if (t.baseliq > 0) {
                    totalBaseliq += t.baseliq;
                }
            }
            if (totalBaseliq > 0) {
                turno.utilidad = (turno.utilidad || 0) - totalBaseliq;
                // Evitar utilidades negativas por inconsistencias pasadas
                if (turno.utilidad < 0) turno.utilidad = 0;
            }
        }
        
        // Guardamos el Turno
        await turno.save();
        return true;

    } catch (error) {
        // Relanzamos el error para que el controlador lo atrape y lo mande al frontend (Ej: "Fondos insuficientes")
        throw new Error(error.message || 'Error al revertir inventario'); 
    }
}

/* const revertInventoryAmount = async(transaccion) => {

    try {

        for (const t of transaccion.items) {
            
            const inventory = await Inventory.findById(t.moneda);
            const pesos = await Inventory.findOne({ code: 'COP' });

            // Usamos la fecha de la transacción original para revertir la estadística correcta
            const transactionDate = new Date(transaccion.fecha);
            transactionDate.setHours(0,0,0,0);
    
            // VERIFICAR EL TIPO DE TRANSACCION PARA INVERTIR LA OPERACION
            if (transaccion.transaccion === 'Compra') {
    
                // REVERTIR COMPRA:
                // 1. Restamos la moneda que habíamos sumado
                inventory.amount -= t.monto;
                // 2. Devolvemos los pesos que habíamos restado
                pesos.amount += (t.monto * t.tasa);

                // 3. ACTUALIZAR TASA DIARIA (Restamos los valores acumulados)
                const daily = await Rate.findOneAndUpdate(
                    { currency: inventory._id, date: transactionDate },
                    {
                        $inc: {
                            totalAmount: -t.monto,
                            totalValue: -(t.monto * t.tasa) 
                        }
                    },
                    { new: true } 
                );

                if (daily) {
                    // Recalcular el promedio evitando división por cero
                    if (daily.totalAmount > 0) {
                        daily.avgRatec = daily.totalValue / daily.totalAmount;
                        inventory.tpc = daily.totalValue / daily.totalAmount;
                    } else {
                        // Si se anulan todas las operaciones del día, volvemos a 0 o al valor anterior
                        daily.avgRatec = 0; 
                        
                    }
                    
                    
                    await daily.save();
                }
    
            } else if (transaccion.transaccion === 'Venta') {
    
                // REVERTIR VENTA:
                inventory.amount += t.monto;
                
                pesos.amount -= (t.monto * t.tasa);

                // 3. ACTUALIZAR TASA DIARIA
                const daily = await Rate.findOneAndUpdate(
                    { currency: inventory._id, date: transactionDate },
                    {
                        $inc: {
                            totalAmount: -t.monto,
                            totalValue: -(t.monto * t.tasa)
                        }
                    },
                    { new: true }
                );

                if (daily) {
                    if (daily.totalAmount > 0) {
                        daily.avgRate = daily.totalValue / daily.totalAmount;
                        inventory.tp = daily.totalValue / daily.totalAmount;
                    } else {
                        daily.avgRate = 0;
                    }
                    
                    await daily.save();
                }
            }
    
            await Promise.all([
                inventory.save(),
                pesos.save()
            ]);
        }
        
        return true;

    } catch (error) {
        console.log(error);        
        throw new Error('Error al revertir inventario'); 
    }
} */

module.exports = {
    updateInventoryAmount,
    revertInventoryAmount
}