const { Schema, model } = require('mongoose');

const FundsSchema = Schema({

    code: {
        type: String,
        require: true
    },
    
    name: {
        type: String,
        require: true
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

FundsSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.funid = _id;
    return object;

});

module.exports = model('Funds', FundsSchema);