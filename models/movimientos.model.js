const { Schema, model } = require('mongoose');

const MovimientosSchema = Schema({

    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },

    type: {
        type: String,
        require: true
    },

    description: {
        type: String,
        require: true
    },

    amount: {
        type: Number,
        require: true
    },

    turno: {
        type: Schema.Types.ObjectId,
        ref: 'turnos'
    },

    pendiente:{
        type: Boolean,
        default: false
    },

    fecha: {
        type: Date,
        default: Date.now
    }

});

MovimientosSchema.method('toJSON', function() {

    const { __v, _id, password, ...object } = this.toObject();
    object.movid = _id;
    return object;

});

module.exports = model('Movimientos', MovimientosSchema);