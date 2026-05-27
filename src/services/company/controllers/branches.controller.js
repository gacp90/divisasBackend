const { response } = require('express');

const getBranches = async (req, res = response) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        
        let BranchModel;
        try {
            BranchModel = req.companyDb.model('Branch');
        } catch (err) {
            const branchSchema = require('../models/branch.model');
            BranchModel = branchSchema(req.companyDb);
        }

        const branches = await BranchModel.find({ isActive: true });

        res.json({
            ok: true,
            branches
        });

    } catch (error) {
        console.error('Error en getBranches:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno al consultar las sucursales'
        });
    }
};

module.exports = {
    getBranches
};
