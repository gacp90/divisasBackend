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
    empresaId: {
        type: String,
        required: true
    },
    sucursalId: {
        type: String,
        required: true
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
