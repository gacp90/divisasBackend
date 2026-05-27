const getUserModel = require('../../services/company/models/users.model');

const validarAccesoPagos = async (req, res, next) => {

    try {

        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto empresa' });
        
        let UserCompany;
        if (req.tenantToken === 'global') {
            UserCompany = require('../../services/global/models/users.model');
        } else {
            const { getCompanyConnection } = require('../database/connection');
            const companyDb = getCompanyConnection(req.tenantToken);
            UserCompany = getUserModel(companyDb);
        }

        const uid = req.uid;

        let user = await UserCompany.findById(uid).catch(()=>null);

        // Fallback: Si no está en Company, buscar en Global (Modo Dios - OWNER global)
        if (!user) {
            const UserGlobal = require('../../services/global/models/users.model');
            user = await UserGlobal.findById(uid).catch(()=>null);
        }

        if (!user) {
            return res.status(401).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        const esOwner = user.role === 'OWNER';

        if (!esOwner) {
            return res.status(403).json({
                ok: false,
                msg: 'No autorizado para pagos'
            });
        }

        next();

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno'
        });
    }

};

module.exports = { validarAccesoPagos };
