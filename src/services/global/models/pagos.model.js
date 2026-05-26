const { Schema, model } = require('mongoose');

const PagoSchema = Schema({

    empresa: {
        type: String,
        required: true
    },

    tenant: {
        type: String,
        required: true
    },

    branchPath: {
        type: String
    },

    usuario: {
        type: String,
        required: true
    },

    monto: {
        type: Number,
        default: 0
    },

    estado: {
        type: String,
        default: 'PENDIENTE' 
        // PENDIENTE | ACTIVO | RECHAZADO
    },

    metodo: {
        type: String,
        default: 'TRANSFERENCIA'
    },

    referencia: {
        type: String // opcional (número de comprobante)
    },

    fecha: {
        type: Date,
        default: Date.now
    }

});

PagoSchema.method('toJSON', function () {
    const { __v, _id, ...object } = this.toObject();
    object.pid = _id;
    return object;
});

const { globalConnection } = require('../../../shared/database/connection');

module.exports = globalConnection.model('Pagos', PagoSchema);

