const { Schema, model } = require('mongoose');

const UserGlobalSchema = Schema({
    user: { type: String, require: true, unique: true },
    name: { type: String, require: true },
    password: { type: String, require: true },
    role: { type: String, default: 'OWNER', require: true },
    status: { type: Boolean, default: true },
    fecha: { type: Date, default: Date.now }
});

UserGlobalSchema.method('toJSON', function() {
    const { __v, _id, password, ...object } = this.toObject();
    object.uid = _id;
    return object;
});

const { globalConnection } = require('../../../shared/database/connection');

module.exports = globalConnection.model('UserGlobal', UserGlobalSchema);
