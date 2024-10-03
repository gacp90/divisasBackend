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
    deparment: { type: String },
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
    phoneRep: {
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
    camara: CamaraSchema,
    resolucion: ResolucionSchema,
    numberSuc: {
        type: String
    },
    phoneSuc: {
        type: String
    },
    oficial: OficialSchema,
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