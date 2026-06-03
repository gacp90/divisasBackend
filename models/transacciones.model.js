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

const ItemsSchema = Schema({

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

const conexusSchema = Schema({
    CodQR: {type: String},
    Base64QR: {type: String},
    CodigoTransaccion: {type: String},
    FechaValidacion: {type: Date},
    estado: {type: String}
})

const TransaccionesSchema = Schema({

    transaccion: {
        type: String,
        enum: ['Compra', 'Venta', 'Nota de Credito']
    },

    client: {
        type: Schema.Types.ObjectId,
        ref: 'Clients'
    },

    declarant: {
        type: Schema.Types.ObjectId,
        ref: 'Clients'
    },

    cajero: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    prefix: {
        type: String
    },

    prefix2: {
        type: String
    },

    number: {
        type: Number
    },

    total: {
        type: Number
    },

    subtotal: {
        type: Number
    },

    equivalencia: {
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

    tipoNeg: {
        type: String,
        default: '1'
    },

    items: [ItemsSchema],

    payments: [PaymentsSchema],

    formaPago: {
        type: String
    },

    resolucion: ResolucionSchema,

    // PAIS NO COPERANTE
    pnc: {
        type: Boolean,
        default: false
    },

    alerta: {
        type: Boolean,
        default: false
    },

    // DECLARACION DE RENTA
    dr: {
        type: Boolean,
        default: false
    },

    intensificada: {
        type: Boolean,
        default: false
    },

    motivosIntensificada: [{
        type: String
    }],

    otraRazonIntensificada: {
        type: String
    },

    reforzada: {
        type: Boolean,
        default: false
    },

    simplificada: {
        type: Boolean,
        default: false
    },

    typetransaction: {
        type: String,
        default: 'Simplificada'
    },
    status: {
        type: Boolean,
        default: true
    },

    fecha: {
        type: Date,
        default: Date.now
    },
    userCancel: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    turno: {
        type: Schema.Types.ObjectId,
        ref: 'turnos'
    },

    electronica: {
        type: Boolean,
        default: true
    },

    estado: {type: String},

    nc: {
        type: Schema.Types.ObjectId,
        ref: 'Transacciones'
    },

    conexus: conexusSchema,
    
    fechaCancel: {
        type: Date,
    },

});

TransaccionesSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.tid = _id;
    return object;

});

module.exports = model('Transacciones', TransaccionesSchema);