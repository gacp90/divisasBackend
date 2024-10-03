const { Schema, model } = require('mongoose');

const CitySchema = Schema({

    city: {
        type: String,
        require: true
    },

    code: {
        type: String,
        require: true
    },

    department: {
        type: String
    },

    fecha: {
        type: Date,
        default: Date.now
    }

});

CitySchema.method('toJSON', function() {

    const { __v, _id, password, ...object } = this.toObject();
    object.citid = _id;
    return object;

});

module.exports = model('Cities', CitySchema);