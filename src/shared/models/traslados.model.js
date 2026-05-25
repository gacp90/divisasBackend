const { Schema } = require('mongoose');

module.exports = (connection) => {
    if (connection.models['Traslados']) {
        return connection.models['Traslados'];
    }

    const TrasladosSchema = Schema({
        emisor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        turnoEmisor: { type: Schema.Types.ObjectId, ref: 'turnos', required: true },
        receptor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        turnoReceptor: { type: Schema.Types.ObjectId, ref: 'turnos', required: true },
        monedaEntregada: { type: Schema.Types.ObjectId, ref: 'Inventories', required: true },
        montoEntregado: { type: Number, required: true },
        monedaRecibida: { type: Schema.Types.ObjectId, ref: 'Inventories', required: true },
        montoRecibido: { type: Number, required: true },
        tasaIntercambio: { type: Number },
        fecha: { type: Date, default: Date.now },
        pendiente: { type: Boolean, default: false },
        status: { type: Boolean, default: true }
    });

    TrasladosSchema.method('toJSON', function() {
        const { __v, _id, ...object } = this.toObject();
        object.trasladoId = _id;
        return object;
    });

    return connection.model('Traslados', TrasladosSchema);
};
