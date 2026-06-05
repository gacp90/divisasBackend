const { Schema, model } = require('mongoose');

const TrasladosSchema = Schema({
    
    emisor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    turnoEmisor: {
        type: Schema.Types.ObjectId,
        ref: 'turnos',
        required: true
    },

    receptor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    turnoReceptor: {
        type: Schema.Types.ObjectId,
        ref: 'turnos',
        required: true
    },

    monedaEntregada: {
        type: Schema.Types.ObjectId,
        ref: 'Inventories',
        required: true
    },
    montoEntregado: {
        type: Number,
        required: true
    },

    monedaRecibida: {
        type: Schema.Types.ObjectId,
        ref: 'Inventories',
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

TrasladosSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.trasladoId = _id;
    return object;
});

module.exports = (branchDb) => {
    return branchDb.models.Traslados || branchDb.model('Traslados', TrasladosSchema);
};