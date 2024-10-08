const { Schema, model } = require('mongoose');

const PaymentsSchema = Schema({

    monto: {
        type: Number
    },

    type: {
        type: String,
        default: 'EFECTIVO'
    },

    status: {
        type: Boolean,

    },

    fecha: {
        type: Date,
        default: Date.now
    }

});

const ResolucionSchema = Schema({
    numberRes: { type: String },
    prefijo: { type: String },
    desde: { type: Number },
    hasta: { type: Number },
    fechaAp: { type: Date },
    fechaIni: { type: Date },
    fechaExp: { type: Date },
})

const TransaccionesSchema = Schema({

    transaccion: {
        type: String,
        enum: ['Compra', 'Venta']
    },

    client: {
        type: Schema.Types.ObjectId,
        ref: 'Clients'
    },

    cajero: {
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },

    prefix: {
        type: String
    },

    number: {
        type: Number
    },

    control: {
        type: Number
    },

    type: {
        type: String,
        default: 'CONTADO'
    },

    fechaC: {
        type: Date,
    },

    moneda: {
        type: Schema.Types.ObjectId,
        ref: 'Inventories'
    },

    monto: {
        type: Number,
    },

    tasa: {
        type: Number,
    },

    subtotal: {
        type: Number,
    },

    iva: {
        type: Number,
        default: 0
    },

    riva: {
        type: Number,
        default: 0
    },

    rica: {
        type: Number,
        default: 0
    },

    rfte: {
        type: Number,
        default: 0
    },

    grav: {
        type: Number
    },

    total: {
        type: Number
    },

    pcda: {
        type: Number,
        default: 0
    },

    dift: {
        type: Number,
        default: 0
    },

    baseliq: {
        type: Number,
        default: 0
    },

    tvb: {
        type: Number,
        default: 0
    },

    trm: {
        type: Number,
        default: 0
    },

    equivalencia: {
        type: Number
    },

    tipoNeg: {
        type: String
    },

    payments: [PaymentsSchema],

    formaPago: {
        type: String
    },

    resolucion: ResolucionSchema,

    status: {
        type: Boolean,
        default: true
    },

    fecha: {
        type: Date,
        default: Date.now
    }

});

TransaccionesSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.tid = _id;
    return object;

});

module.exports = model('Transacciones', TransaccionesSchema);