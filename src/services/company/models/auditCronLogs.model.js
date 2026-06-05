const { Schema, model } = require('mongoose');

const AuditCronLogsSchema = Schema({

    turnoId: {
        type: String,
        required: true
    },
    fechaApertura: {
        type: Date,
        required: true
    },
    fechaCierreAuto: {
        type: Date,
        required: true
    },
    usuario: {
        type: String,
        required: true
    },
    sucursal: {
        type: String,
        required: true
    },
    trasladosInvolucrados: {
        type: Array, // IDs de los traslados
        default: []
    },
    valorTotalCOP: {
        type: Number,
        required: true
    },
    estadoOriginal: {
        type: String,
        required: true
    },
    estadoFinal: {
        type: String,
        required: true
    },
    accionCron: {
        type: String,
        required: true
    },
    leido: {
        type: Boolean,
        default: false
    }

});

AuditCronLogsSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.auditId = _id;
    return object;
});

module.exports = (companyDb) => {
    return companyDb.models.AuditCronLogs || companyDb.model('AuditCronLogs', AuditCronLogsSchema);
};
