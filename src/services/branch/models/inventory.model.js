const { Schema, model } = require('mongoose');

const InvetorySchema = Schema({

    code: {
        type: String,
        require: true,
        unique: true
    },

    currency: {
        type: String,
        require: true,
        unique: true
    },

    amount: {
        type: Number,
        dafault: 0
    },

    disponible: {
        type: Number,
        dafault: 0
    },

    anterior: {
        type: Number,
        dafault: 0
    },

    tc: {
        type: Number,
        require: true
    },

    tv: {
        type: Number,
        require: true
    },

    tpc: {
        type: Number,
        default: 0
    },

    trm: {
        type: Number,
        default: 0
    },

    trmUpdate: {
        type: Date
    },

    ta: {
        type: Number,
        default: 0
    },

    modoUtilidad: {
        type: String,
        enum: ['HISTORICO', 'PROMEDIO_MOVIL'],
        default: 'HISTORICO'
    },

    status: {
        type: Boolean,
        default: true
    },

    fecha: {
        type: Date,
        default: Date.now
    }

});

InvetorySchema.method('toJSON', function() {

    const { __v, _id, password, ...object } = this.toObject();
    object.invid = _id;
    return object;

});

const getInventoryModel = (connection) => {
    return connection.model('Inventories', InvetorySchema);
};
module.exports = getInventoryModel;