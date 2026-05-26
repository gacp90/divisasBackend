const { Schema } = require('mongoose');
const { globalConnection } = require('../../../shared/database/connection');

const SubdomainSchema = Schema({
    subdominio: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    nombreEmpresa: {
        type: String,
        default: 'Nueva Empresa'
    },
    fechaVencimiento: {
        type: Date,
        default: () => {
            // Por defecto, 7 días de gracia al crear la empresa
            const fecha = new Date();
            fecha.setDate(fecha.getDate() + 7);
            return fecha;
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

SubdomainSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
});

module.exports = globalConnection.model('Subdomain', SubdomainSchema);
