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
            // Podriamos dejar que la ruta global continue si no requiere contexto de empresa
            // Pero si la ruta necesita DB de empresa, fallara mas adelante.
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
                msg: `El subdominio '${subdominio}' no esta registrado o esta inactivo.`
            });
        }

        // 3. Inyectar conexion Company
        req.companyDb = getCompanyConnection(subdomainData.subdominio);
        
        // 4. Intentar detectar branch desde header x-branch
        let branchPath = req.headers['x-branch'];
        if (branchPath) {
            req.branchDb = getBranchConnection(subdomainData.subdominio, branchPath.toLowerCase());

            // Validacion de Pagos a nivel de Sucursal (Branch)
            let BranchModel;
            try {
                BranchModel = req.companyDb.model('Branch');
            } catch (err) {
                const branchSchema = require('../../company/models/branch.model');
                BranchModel = branchSchema(req.companyDb);
            }

            const branchData = await BranchModel.findOne({ path: branchPath.toLowerCase() });
            if (branchData && branchData.fechaVencimiento && new Date() > new Date(branchData.fechaVencimiento)) {
                // Almacenamos el estado en el req para que otros middlewares (si existen) puedan decidir
                req.isBranchExpired = true;
            }
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
