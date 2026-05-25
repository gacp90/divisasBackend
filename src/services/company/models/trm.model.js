const { Schema, model } = require('mongoose');

const TrmSchema = Schema({

    valor: {
        type: Number,
        required: true,
    },
    fecha: {
        type: Date,
        default: () => {
            const localDate = new Date();
            localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
            return localDate;
        },
    },

});

TrmSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.trmid = _id;
    return object;

});

const getTrmModel = (connection) => {
    return connection.model('Trm', TrmSchema);
};

module.exports = getTrmModel;