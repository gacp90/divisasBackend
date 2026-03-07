const { Schema, model } = require('mongoose');

const CitySchema = Schema({

    name: {
        type: String,
        require: true
    },

    code: {
        type: String,
        require: true
    },

    zip: {
        type: String
    },

    department: {
        type: Schema.Types.ObjectId,
        ref: 'Departments'
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