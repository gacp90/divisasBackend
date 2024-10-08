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

    tb: {
        type: Number,
        dafault: 0
    },

    status: {
        type: Boolean,
        require: true
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