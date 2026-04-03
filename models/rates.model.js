const { Schema, model } = require('mongoose');

const RatesSchema = Schema({

  currency: {
    type: Schema.Types.ObjectId,
    ref: 'Inventories',
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  totalAmount: {
    type: Number,
    default: 0
  },

  totalAmountV: {
    type: Number,
    default: 0
  },

  totalValue: {
    type: Number,
    default: 0
  },

  totalValueV: {
    type: Number,
    default: 0
  },

  avgRate: {
    type: Number,
    default: 0
  },
  
  avgRatec: {
    type: Number,
    default: 0
  }
});

RatesSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.ratid = _id;
    return object;

});

module.exports = model('Rates', RatesSchema);