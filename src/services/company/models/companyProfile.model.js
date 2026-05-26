const { Schema, model } = require('mongoose');

const CompanyProfileSchema = Schema({
    tipoPersona: {
        type: String,
        required: true
    },
    nit: {
        type: String,
        required: true,
        unique: true
    },
    representanteLegal: {
        type: String,
        required: true
    },
    nombreComercial: {
        type: String
    },
    direccionPrincipal: {
        type: String
    },
    telefono: {
        type: String
    },
    emailContacto: {
        type: String
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

CompanyProfileSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.profileId = _id;
    return object;
});

module.exports = (companyDb) => {
    return companyDb.models.CompanyProfile || companyDb.model('CompanyProfile', CompanyProfileSchema);
};
