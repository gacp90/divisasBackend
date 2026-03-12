const { Schema, model } = require('mongoose');

const SaldosSchema = Schema({
    moneda: { 
        type: Schema.Types.ObjectId, 
        ref: 'Inventories', 
        required: true 
    },
    montoInicial: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    tasaInicial: { 
        type: Number, 
        required: true 
    }, 
    saldoActual: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    saldoFisico: { 
        type: Number, 
        default: null 
    }, 
    diferencia: { 
        type: Number, 
        default: 0 
    },     
    tasaFinal: { 
        type: Number 
    }                   
}, { _id: false });

const TurnosSchema = Schema({

    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },

    abierto: {
        type: Boolean,
        dafult: true
    },

    totalEntradasCOP: {
        type: Number,
        default: 0
    },
    totalSalidasCOP: {
        type: Number,
        default: 0
    },

    saldos: [SaldosSchema],

    open: {
        type: Date,
        default: Date.now
    },

    close: {
        type: Date
    }

});

TurnosSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.turid = _id;
    return object;

});

module.exports = model('turnos', TurnosSchema);