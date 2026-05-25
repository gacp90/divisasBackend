const getTurnosModel = require('../../services/branch/models/turnos.model');

const actualizarSaldosTraslado = async (dataTraslado, branchDb) => {
    if (!branchDb) throw new Error('Se requiere contexto de sucursal para actualizar saldos');
    const Turno = getTurnosModel(branchDb);

    const { turnoEmisor, turnoReceptor, monedaEntregada, montoEntregado, monedaRecibida, montoRecibido } = dataTraslado;

    const mEntregado = Number(montoEntregado);
    const mRecibido = Number(montoRecibido);

    try {
        const [tEmisor, tReceptor] = await Promise.all([
            Turno.findById(turnoEmisor),
            Turno.findById(turnoReceptor)
        ]);

        if (!tEmisor || !tReceptor) throw new Error('Uno de los turnos no existe');

        // INDEXAMOS
        let idxEmisorEntregada = tEmisor.saldos.findIndex(s => String(s.moneda) === String(monedaEntregada));
        let idxEmisorRecibida = tEmisor.saldos.findIndex(s => String(s.moneda) === String(monedaRecibida));

        // RECEPTOR
        let idxReceptorEntregada = tReceptor.saldos.findIndex(s => String(s.moneda) === String(monedaEntregada));
        let idxReceptorRecibida = tReceptor.saldos.findIndex(s => String(s.moneda) === String(monedaRecibida));

        
        // VALIDAR SI EXITE LA MONEDA EN EL EMISOR
        if (idxEmisorRecibida === -1) {
            tEmisor.saldos.push({ moneda: monedaRecibida, montoInicial: 0, saldoActual: 0, tasaInicial: 1 });
            idxEmisorRecibida = tEmisor.saldos.length - 1; 
        }

        // VALIDAMOS SI EXISTE LA MONEDA EN EL RECEPTOR
        if (idxReceptorEntregada === -1) {
            tReceptor.saldos.push({ moneda: monedaEntregada, montoInicial: 0, saldoActual: 0, tasaInicial: 1 });
            idxReceptorEntregada = tReceptor.saldos.length - 1;
        }

        // ==========================================================
        // VALIDACIONES ESTRICTAS DE FONDOS
        // ==========================================================
        if (idxEmisorEntregada === -1 || tEmisor.saldos[idxEmisorEntregada].saldoActual < mEntregado) {
            throw new Error(`No tienes saldo suficiente. Intentas enviar ${mEntregado}.`);
        }

        if (idxReceptorRecibida === -1 || tReceptor.saldos[idxReceptorRecibida].saldoActual < mRecibido) {
            throw new Error(`El receptor no tiene saldo suficiente para darte el equivalente.`);
        }
        
        // CAJA EMISOR
        tEmisor.saldos[idxEmisorEntregada].saldoActual -= mEntregado; 
        tEmisor.saldos[idxEmisorRecibida].saldoActual += mRecibido;   

        // CAJA RECEPTOR
        tReceptor.saldos[idxReceptorRecibida].saldoActual -= mRecibido; 
        tReceptor.saldos[idxReceptorEntregada].saldoActual += mEntregado; 

        // SAVE
        await Promise.all([ tEmisor.save(), tReceptor.save() ]);

        return { ok: true, tEmisor, tReceptor };

    } catch (error) {
        throw error; 
    }
};

module.exports = { actualizarSaldosTraslado };