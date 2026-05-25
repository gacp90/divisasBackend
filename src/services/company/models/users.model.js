const { Schema } = require('mongoose');

module.exports = (connection) => {
    if (connection.models['User']) {
        return connection.models['User'];
    }

    const UserSchema = Schema({
        user: { type: String, require: true, unique: true },
        name: { type: String, require: true },
        address: { type: String },
        phone: { type: String },
        password: { type: String, require: true },
        role: { type: String, default: 'STAFF', require: true },
        isOwner: { type: Boolean, default: false },
        img: { type: String },
        turno: { type: Schema.Types.ObjectId, ref: 'turnos' },
        status: { type: Boolean, default: true },
        fecha: { type: Date, default: Date.now }
    });

    UserSchema.method('toJSON', function() {
        const { __v, _id, password, ...object } = this.toObject();
        object.uid = _id;
        return object;
    });

    return connection.model('User', UserSchema);
};
