const getConsecutiveModel = require('../models/concecutives.model');

/** =====================================================================
 *  CONCECUTIVE
 =========================================================================*/
const concecutive = async(type, branchDb) => {

    try {
        if (!branchDb) throw new Error('Se requiere contexto de base de datos sucursal para los consecutivos');
        const Concecutive = getConsecutiveModel(branchDb);
        const concecutive = await Concecutive.findOneAndUpdate({ type }, { $inc: { seq: 1 } }, { new: true, upsert: true })
        return concecutive.seq;
    } catch (error) {
        console.log(error);
        throw new Error('Error Inesperado al obtener el consecutivo');
    }

};

module.exports = {
    concecutive
}