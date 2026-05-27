const { Schema } = require('mongoose');
const { globalConnection } = require('../../../shared/database/connection');

const DocumentSchema = new Schema({
  type: String,     // CC, PAS, NIT, etc
  number: String
}, { _id: false });

const SanctionsEntrySchema = new Schema({
  source: {
    type: String, // ONU, OFAC
    index: true
  },
  entityType: {
    type: String, // INDIVIDUAL | ENTITY
    index: true
  },
  fullName: {
    type: String,
    index: 'text'
  },
  firstName: String,
  lastName: String,
  aliases: {
    type: [String],
    index: 'text'
  },
  nationality: {
    type: [String],
    index: true
  },
  documents: {
    type: [DocumentSchema],
    index: true
  },
  remarks: String,
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

SanctionsEntrySchema.method("toJSON", function () {
  const { __v, _id, ...object } = this.toObject();
  object.seid = _id;
  return object;
});

SanctionsEntrySchema.index({ fullName: 1, source: 1 });
SanctionsEntrySchema.index({ 'documents.number': 1 }); // Indice critico para evitar 504 Timeout

module.exports = globalConnection.model('SanctionsEntrys', SanctionsEntrySchema);
