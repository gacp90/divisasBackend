const { Schema, model } = require('mongoose');

const DepartmentsSchema = Schema({

    department: {
        type: String,
        require: true
    },

    code: {
        type: String,
        require: true
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