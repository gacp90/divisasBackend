const Concecutive = require('../models/concecutives.model');

/** =====================================================================
 *  CONCECUTIVE
=========================================================================*/
const concecutive = async(type) => {

    try {
        const concecutive = await Concecutive.findOneAndUpdate({ type }, { $inc: { seq: 1 } }, { new: true, upsert: true })
        return concecutive.seq;
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

};

module.exports = {
    concecutive
}