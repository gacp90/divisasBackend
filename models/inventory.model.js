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

    tp: {
        type: Number,
        dafault: 0
    },

    tpc: {
        type: Number,
        dafault: 0
    },

    trm: {
        type: Number,
        dafault: 0
    },

    trmUpdate: {
        type: Date
    },

    tb: {
        type: Number,
        dafault: 0
    },

    ta: {
        type: Number,
        dafault: 0
    },

    tbc: {
        type: Number,
        dafault: 0
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

module.exports = model('Inventories', InvetorySchema);