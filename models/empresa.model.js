const { Schema, model } = require("mongoose");

const OficialSchema = Schema({
    name: { type: String },
    numberid: { type: String },
    address: { type: String },
    phone: { type: String },
    department: { type: String },
    city: { type: String },
    email: { type: String },
    fecha: { type: Date }
})

const CamaraSchema = Schema({
    department: { type: String },
    city: { type: String },
    numberMat: { type: String },
})

const ResolucionSchema = Schema({
    numberRes: { type: String },
    prefijo: { type: String },
    desde: { type: Number },
    hasta: { type: Number },
    fechaAp: { type: Date },
    fechaIni: { type: Date },
    fechaExp: { type: Date },
})

const conexusSchema = Schema({
    GuidEmpresa: {type: String},
    GuidOrigen: {type: String},
    HashSeguridad: {type: String},
    ClaveTecnica: {type: String}
})

const EmpresaSchema = Schema({
    name: {
        type: String
    },
    nit: {
        type: String
    },
    represent: {
        type: String
    },
    phone: {
        type: String
    },
    address: {
        type: String
    },
    department: {
        type: String
    },
    city: {
        type: String
    },
    email: {
        type: String
    },
    capital: {
        type: Number,
        default: 0
    },
    emailcorp: {
        type: String
    },
    camara: CamaraSchema,
    resolucionC: ResolucionSchema,
    resolucionV: ResolucionSchema,
    numberSuc: {
        type: String
    },
    phoneSuc: {
        type: String
    },
    regimen: {
        type: String
    },
    codigo: {
        type: String
    },
    oficial: OficialSchema,
    logo: {
        type: String
    },
    suscripcion: {
    estado: {
        type: String,
        default: 'INACTIVA' 
    },
    ultimoPago: {
        type: Date
    }
    },
    numberRes: {
        type: String
    },
    desde: {
        type: Number
    },
    hasta: {
        type: Number
    },
    fechaAp: {
        type: Date
    },
    fechaOfi: {
        type: Date
    },
    fechaIni: {
        type: Date
    },
    fechaExp: {
        type: Date
    },
    status: {
        type: Boolean,
        default: true
    },
    frontera: {
        type: Boolean,
        default: true
    },
    fe: {
        type: Boolean,
        default: true
    },
    type: {
        type: Boolean,
        default: true
    },
    conexus: conexusSchema,
    fecha: {
        type: Date,
        defaul: Date.now
    },
})

EmpresaSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.eid = _id;
    return object;

});

module.exports = model('Empresas', EmpresaSchema);