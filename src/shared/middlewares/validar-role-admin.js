const { response } = require('express');
const { getCompanyConnection } = require('../database/connection');

const validarRoleAdmin = async (req, res = response, next) => {
    try {
        const uid = req.uid;
        const empresaId = req.tenantToken;

        if (!uid || !empresaId) {
            return res.status(401).json({
                ok: false,
                msg: 'Token no contiene información suficiente para validar permisos'
            });
        }

        let connection;
        if (empresaId.toLowerCase() === 'global') {
            const { globalConnection } = require('../database/connection');
            connection = globalConnection;
        } else {
            connection = getCompanyConnection(empresaId);
            if (connection.readyState !== 1) {
                await connection.asPromise();
            }
        }

        let User;
        if (empresaId.toLowerCase() === 'global') {
            User = require('../../services/global/models/users.model');
        } else {
            User = require('../../services/company/models/users.model')(connection);
        }

        const userDB = await User.findById(uid);

        if (!userDB) {
            console.log(`Usuario no encontrado en la BD: uid=${uid}, empresaId=${empresaId}, modelName=${User.modelName}`);
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado en la BD' });
        }

        req.userRole = userDB.role;

        if (userDB.role !== 'OWNER' && userDB.role !== 'ADMIN' && userDB.role !== 'ADMINISTRADOR' && userDB.role !== 'SUPERVISOR') {
            return res.status(403).json({
                ok: false,
                msg: 'Privilegios insuficientes. Módulo reservado para administración.'
            });
        }

        next();

    } catch (error) {
        console.error('Error en validarRoleAdmin:', error);
        return res.status(500).json({ ok: false, msg: 'Hable con el administrador' });
    }
};

const validarRoleResolucion = async (req, res = response, next) => {
    // Si la request es para resolver una incidencia (PAGADO o MANTENER_PENDIENTE desde auditoría)
    // El OWNER no puede resolver.
    if (req.body.accion === 'PAGADO' || req.body.accion === 'MANTENER_PENDIENTE') {
        
        // Ensure user role is fetched
        let userRole = req.userRole;
        if (!userRole) {
            try {
                const uid = req.uid;
                const empresaId = req.tenantToken;
                let connection;
                if (empresaId.toLowerCase() === 'global') {
                    const { globalConnection } = require('../database/connection');
                    connection = globalConnection;
                } else {
                    connection = getCompanyConnection(empresaId);
                    if (connection.readyState !== 1) await connection.asPromise();
                }
                const User = empresaId.toLowerCase() === 'global' ? 
                    require('../../services/global/models/users.model') : 
                    require('../../services/company/models/users.model')(connection);
                
                const userDB = await User.findById(uid);
                if (userDB) userRole = userDB.role;
            } catch (err) {
                return res.status(500).json({ ok: false, msg: 'Error validando rol' });
            }
        }

        if (userRole === 'OWNER') {
            return res.status(403).json({
                ok: false,
                msg: 'Los usuarios OWNER tienen acceso de solo lectura en Auditoría.'
            });
        }
        if (userRole !== 'ADMIN' && userRole !== 'ADMINISTRADOR' && userRole !== 'SUPERVISOR') {
            return res.status(403).json({
                ok: false,
                msg: 'Privilegios insuficientes para resolver incidencias.'
            });
        }
    }
    next();
};

module.exports = {
    validarRoleAdmin,
    validarRoleResolucion
};
