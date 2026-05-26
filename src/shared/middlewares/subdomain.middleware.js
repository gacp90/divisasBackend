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

        // 2. Manejar subdominio especial 'global'
        if (subdominio.toLowerCase() === 'global') {
            const { globalConnection } = require('../database/connection');
            req.companyDb = globalConnection;
            return next();
        }

        // 3. Buscar en la Base Global
        const subdomainData = await Subdomain.findOne({ subdominio: subdominio.toLowerCase(), isActive: true });

        if (!subdomainData) {
            return res.status(404).json({
                ok: false,
                msg: `El subdominio '${subdominio}' no está registrado o está inactivo.`
            });
        }

        // Validación de Pagos (Vencimiento)
        if (subdomainData.fechaVencimiento && new Date() > new Date(subdomainData.fechaVencimiento)) {
            // El interceptor atrapará el 403 y enviará al usuario a la pantalla de Suscripciones
            return res.status(403).json({
                ok: false,
                msg: `La suscripción de la empresa ha vencido. Por favor realice el pago para continuar operando.`
            });
        }

        // 3. Inyectar conexión Company
        req.companyDb = getCompanyConnection(subdomainData.subdominio);
        
        // 4. Intentar detectar branch desde header x-branch
        let branchPath = req.headers['x-branch'];
        if (branchPath) {
            req.branchDb = getBranchConnection(branchPath.toLowerCase());
        }

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
