const { response } = require('express');
const getConsecutiveModel = require('../models/concecutives.model');

/** =====================================================================
 *  GET Consecutivos
 =========================================================================*/
const getConsecutivos = async (req, res = response) => {
    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto de sucursal' });
        const Consecutive = getConsecutiveModel(req.branchDb);

        const requiredTypes = ['Compra', 'Venta', 'NC', '1099', '1100', '1121'];
        for (const type of requiredTypes) {
            await Consecutive.findOneAndUpdate(
                { type }, 
                { $setOnInsert: { type } }, 
                { upsert: true, setDefaultsOnInsert: true }
            );
        }

        const consecutivos = await Consecutive.find();

        res.json({
            ok: true,
            consecutivos
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, por favor intente nuevamente'
        });
    }
};

/** =====================================================================
 *  UPDATE Consecutivo
 =========================================================================*/
const updateConsecutivo = async (req, res = response) => {
    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto de sucursal' });
        const Consecutive = getConsecutiveModel(req.branchDb);
        
        const id = req.params.id;
        const { seq } = req.body;

        const consecutivoDB = await Consecutive.findById(id);

        if (!consecutivoDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningún consecutivo con este ID'
            });
        }

        const consecutivoActualizado = await Consecutive.findByIdAndUpdate(id, { seq }, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            consecutivo: consecutivoActualizado,
            msg: 'Consecutivo actualizado exitosamente'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }
};

module.exports = {
    getConsecutivos,
    updateConsecutivo
};
