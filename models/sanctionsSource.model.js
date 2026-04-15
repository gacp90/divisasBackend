const { Schema, model } = require("mongoose");

const SanctionsSourceSchema = new Schema({

    name: {
      type: String,
      required: true
    },

    url: {
      type: String,
      required: true,
    },

    documentDate: {
      type: Date,
      required: true,
    },

    lastDownload: {
      type: Date,
      required: true,
    },

    hash: {
      type: String,
      required: true,
    },

    totalRecords: {
      type: Number,
      default: 0,
    },

    },
    {
        timestamps: true,
});

SanctionsSourceSchema.method("toJSON", function () {
  const { __v, _id, ...object } = this.toObject();
  object.ssid = _id;
  return object;
});

module.exports = model("SanctionsSources", SanctionsSourceSchema);
