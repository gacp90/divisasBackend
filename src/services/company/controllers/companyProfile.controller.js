const { response } = require('express');
const getCompanyProfileModel = require('../models/companyProfile.model');

/** =====================================================================
 *  GET COMPANY PROFILE
=========================================================================*/
const getCompanyProfile = async (req, res = response) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        const CompanyProfile = getCompanyProfileModel(req.companyDb);

        const profile = await CompanyProfile.findOne();

        res.json({
            ok: true,
            profile: profile || null
        });

    } catch (error) {
        console.error('Error en getCompanyProfile:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno al consultar el perfil de la empresa'
        });
    }
};

/** =====================================================================
 *  SAVE / UPDATE COMPANY PROFILE
=========================================================================*/
const saveCompanyProfile = async (req, res = response) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        const CompanyProfile = getCompanyProfileModel(req.companyDb);

        const { ...campos } = req.body;

        let profile = await CompanyProfile.findOne();

        if (profile) {
            // Update
            profile = await CompanyProfile.findByIdAndUpdate(profile._id, campos, { new: true, useFindAndModify: false });
        } else {
            // Create
            profile = new CompanyProfile(campos);
            await profile.save();
        }

        res.json({
            ok: true,
            profile
        });

    } catch (error) {
        console.error('Error en saveCompanyProfile:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno al guardar el perfil de la empresa'
        });
    }
};

module.exports = {
    getCompanyProfile,
    saveCompanyProfile
};
