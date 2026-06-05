const { Schema, model } = require('mongoose');

const TrasladosSucursalesSchema = Schema({
    
    emisorId: {
        type: String,
        required: true
    },
    sucursalOrigenId: {
        type: String,
        required: true
    },
    turnoEmisorId: {
        type: String,
        required: true
    },

    receptorId: {
        type: String,
        required: true
    },
    sucursalDestinoId: {
        type: String,
        required: true
    },
    turnoReceptorId: {
        type: String,
        required: true
    },

    monedaEntregada: {
        type: String,
        required: true
    },
    monedaEntregadaCode: {
        type: String, // ej. 'USD'
        required: true
    },
    montoEntregado: {
        type: Number,
        required: true
    },

    monedaRecibida: {
        type: String,
        required: true
    },
    monedaRecibidaCode: {
        type: String, // ej. 'EUR'
        required: true
    },
    montoRecibido: {
        type: Number,
        required: true
    },

    tasaIntercambio: {
        type: Number
    },

    fecha: {
        type: Date,
        default: Date.now
    },

    pendiente: {
        type: Boolean,
        default: false
    },

    requiereRevision: {
        type: Boolean,
        default: false
    },

    historialRevision: [{
        fecha: { type: Date, default: Date.now },
        usuario: { type: String },
        accion: { type: String, enum: ['PAGADO', 'MANTENER_PENDIENTE'] },
        nota: { type: String }
    }],

    status: {
        type: Boolean,
        default: true
    }
});

TrasladosSucursalesSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.trasladoId = _id;
    return object;
});

module.exports = (companyDb) => {
    return companyDb.models.TrasladosSucursales || companyDb.model('TrasladosSucursales', TrasladosSucursalesSchema);
};
