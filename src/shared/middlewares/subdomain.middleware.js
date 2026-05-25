const Subdomain = require('../../services/global/models/subdomain.model');
const { getCompanyConnection, getBranchConnection } = require('../database/connection');

const injectDynamicConnections = async (req, res, next) => {
    try {
        // 1. Detectar el subdominio desde el header custom o el Host
        let subdominio = req.headers['x-subdomain'];

        if (!subdominio) {
            const host = req.get('host') || '';
            const parts = host.split('.');
            if (parts.length >= 3 && parts[0] !== 'www') {
                subdominio = parts[0];
            }
        }

        // Para desarrollo o si no hay subdominio (ej: peticiones globales puras)
        if (!subdominio) {
            // Podríamos dejar que la ruta global continúe si no requiere contexto de empresa
            // Pero si la ruta necesita DB de empresa, fallará más adelante.
            return next();
        }

        // 2. Buscar en la Base Global
        const subdomainData = await Subdomain.findOne({ subdominio: subdominio.toLowerCase(), isActive: true });

        if (!subdomainData) {
            return res.status(404).json({
                ok: false,
                msg: `El subdominio '${subdominio}' no está registrado o está inactivo.`
            });
        }

        // 3. Inyectar datos en el request
        req.empresaId = subdomainData.empresaId;
        req.sucursalId = subdomainData.sucursalId;

        // 4. Inyectar conexiones pre-establecidas
        req.companyDb = getCompanyConnection(req.empresaId);
        req.branchDb = getBranchConnection(req.sucursalId);


        next();
    } catch (error) {
        console.error('Error en injectDynamicConnections:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno resolviendo el contexto de base de datos.'
        });
    }
};

module.exports = {
    injectDynamicConnections
};
