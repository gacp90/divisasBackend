const { Schema } = require('mongoose');
const { globalConnection } = require('../../../shared/database/connection');

const PaisSchema = Schema({

    code: {
        type: String,
        require: true,
        unique: true
    },

    name: {
        type: String,
        require: true
    },
    nocopera: {
        type: Boolean,
        default: false
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

PaisSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.pid = _id;
    return object;
});

module.exports = globalConnection.model('Pais', PaisSchema);
