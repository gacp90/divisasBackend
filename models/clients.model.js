const { Schema, model } = require('mongoose');

const ClientsSchema = Schema({

    capital: {
        type: Number
    },

    razon: {
        type: String
    },

    name: {
        type: String      
    },

    secondname: {
        type: String
    },

    lastname: {
        type: String
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
    resp: {
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
    origin: {
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
        require: true
    },

    dvb: {
        type: String
    },
    
    type: {
        type: String,
        require: true,
        default: '2'
    },

    representante: {
        type: Schema.Types.ObjectId,
        ref: 'Clients'
    },

    pep: {
        type: Boolean,
        dafault: false
    },
    dr: {
        type: Boolean,
        dafault: false
    },
    pnc: {
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

ClientsSchema.index({ typeid: 1, numberid: 1 }, { unique: true });

ClientsSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.cid = _id;
    return object;

});

module.exports = model('Clients', ClientsSchema);