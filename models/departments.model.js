const { Schema, model } = require('mongoose');

const DepartmentsSchema = Schema({
    
    code: {
        type: String,
        require: true
    },

    name: {
        type: String,
        require: true
    },

    pais: {
        type: Schema.Types.ObjectId,
        ref: 'Pais'
    },

    fecha: {
        type: Date,
        default: Date.now
    }

});

DepartmentsSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.depid = _id;
    return object;

});

module.exports = model('Departments', DepartmentsSchema);