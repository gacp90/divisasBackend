const { response } = require('express');
const { getCompanyConnection } = require('../database/connection');
const getUserModel = require('../../services/company/models/users.model');

const validarRoleGlobal = async (req, res = response, next) => {
    
    try {
        const uid = req.uid;
        const empresaId = req.tenantToken;

        if (!uid || !empresaId) {
            return res.status(401).json({
                ok: false,
                msg: 'Token no contiene información suficiente para validar permisos globales'
            });
        }

        // Obtener conexión a la DB correspondiente
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

        // Obtener modelo de usuario inyectando la conexión
        let User;
        if (empresaId.toLowerCase() === 'global') {
            User = require('../../services/global/models/users.model');
        } else {
            User = require('../../services/company/models/users.model')(connection);
        }

        // Buscar usuario
        const userDB = await User.findById(uid);

        if (!userDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado en la base de datos de la empresa'
            });
        }

        if (userDB.role !== 'OWNER') {
            return res.status(403).json({
                ok: false,
                msg: 'Privilegios insuficientes. Sólo un OWNER puede modificar catálogos globales.'
            });
        }

        next();

    } catch (error) {
        console.error('Error en validarRoleGlobal:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }

};

module.exports = {
    validarRoleGlobal
};
