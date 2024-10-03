const { Schema, model } = require('mongoose');

const ConsecutiveSchema = Schema({

    type: {
        type: String,
        enum: ['Compra', 'Venta', '1100', '1099', '1121']
    },
    seq: {
        type: Number,
        default: 0
    }
})

ConsecutiveSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.consid = _id;
    return object;

});

module.exports = model('Consecutives', ConsecutiveSchema);