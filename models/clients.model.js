const { Schema, model } = require('mongoose');

const ClientsSchema = Schema({

    name: {
        type: String,
        require: true
    },

    secondname: {
        type: String
    },

    lastname: {
        type: String,
        require: true
    },
    secondlastname: {
        type: String
    },
    address: {
        type: String
    },
    phone: {
        type: String
    },
    email: {
        type: String
    },
    city: {
        type: String
    },
    department: {
        type: String
    },
    occupation: {
        type: String
    },
    funds: {
        type: String
    },
    destination: {
        type: String
    },
    citizenship: {
        type: String
    },
    citybirth: {
        type: String
    },
    datebirth: {
        type: Date
    },

    typeid: {
        type: String,
        require: true
    },    
    
    numberid: {
        type: String,
        require: true,
        unique: true
    },
    
    type: {
        type: String,
        require: true,
        default: 'Natural'
    },

    pep: {
        type: Boolean,
        dafault: false
    },

    img: {
        type: String
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

ClientsSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.cid = _id;
    return object;

});

module.exports = model('Clients', ClientsSchema);