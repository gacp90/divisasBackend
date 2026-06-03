const { response } = require('express');
const bcrypt = require('bcryptjs');

const getUserModel = require('../models/users.model');

const { generarJWT, generarJWTClient } = require('../../../shared/helpers/jwt');

/** =====================================================================
 *  LOGIN
 =========================================================================*/
const login = async (req, res = response) => {

    const { user, password } = req.body;

    try {
        if (!req.companyDb) {
            return res.status(400).json({ ok: false, msg: 'No se detectó el contexto de la empresa' });
        }

        const UserCompany = getUserModel(req.companyDb);

        // 1. Buscar en Company DB (OWNER, ADMIN, SUPERVISOR, CAJERO)
        let userDB = await UserCompany.findOne({ user });

        // 2. Si no está en Company, buscar en Global
        if (!userDB) {
            const UserGlobal = require('../../global/models/users.model');
            const foundUser = await UserGlobal.findOne({ user });
            if (foundUser) {
                userDB = foundUser;
            }
        }

        if (!userDB) {
            return res.status(404).json({
                ok: false,
                msg: 'El usuario o la contraseña es incorrecta'
            });
        }

        // PASSWORD
        const validPassword = bcrypt.compareSync(password, userDB.password);
        if (!validPassword) {
            return res.status(400).json({
                ok: false,
                msg: 'El usuario o la contraseña es incorrecta'
            });
        }

        if (!userDB.status) {
            return res.status(401).json({
                ok: false,
                msg: 'Tu cuenta ha sido desactivada por un administrador'
            });
        }

        // PREVENCIÓN DE SESIÓN CONCURRENTE (Solo para CAJEROS)
        if (userDB.role === 'CAJERO') {
            // Nota: En vez de bloquear, simplemente permitimos el login 
            // (el sistema de turnos ya evita que abran múltiples turnos simultáneamente).
            userDB.isLoggedIn = true;
            await userDB.save();
        }

        // Subdominio se asume que viene desde req.headers['x-subdomain']
        const subdomain = req.headers['x-subdomain'] || '';

        // Token inyecta: uid, tenant(subdomain). No necesitamos inyectar activeBranchPath para cajeros aquí, ya que pueden seleccionar la sucursal.
        const token = await generarJWT(userDB.id, subdomain, null);

        res.json({
            ok: true,
            token,
            usuario: userDB,
            tenant: subdomain,
            branch: null // Ya no se autoconecta a una sucursal, el usuario debe elegirla.
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }

};
/** =====================================================================
 *  LOGIN
=========================================================================*/

/** =====================================================================
 *  RENEW TOKEN
======================================================================*/
const renewJWT = async (req, res = response) => {

    try {

        const uid = req.uid;
        const tenant = req.tenantToken;
        const branchPath = req.branchPathToken;

        if (!uid) {
            return res.status(401).json({
                ok: false,
                msg: 'Token inválido (sin uid)'
            });
        }

        let userDbConnection;
        if (tenant === 'global') {
            const { globalConnection } = require('../../../shared/database/connection');
            userDbConnection = globalConnection;
        } else {
            const { getCompanyConnection } = require('../../../shared/database/connection');
            userDbConnection = getCompanyConnection(tenant);
            if (userDbConnection.readyState !== 1) {
                await userDbConnection.asPromise();
            }
        }

        const UserCompany = getUserModel(userDbConnection);

        let usuario = await UserCompany.findById(uid, 'user name role img address uid valid turno activeShiftBranch fecha status');

        if (!usuario) {
            const UserGlobal = require('../../global/models/users.model');
            usuario = await UserGlobal.findById(uid, 'user name role img address uid valid turno activeShiftBranch fecha status');
        }

        if (!usuario) {
            console.error('RENEW JWT ERROR: Usuario no encontrado para el uid:', uid);
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        const token = await generarJWT(uid, tenant, branchPath);

        return res.status(200).json({
            ok: true,
            token,
            usuario
        });

    } catch (error) {
        console.error('ERROR RENEW:', error);

        return res.status(401).json({
            ok: false,
            msg: 'Error al renovar token'
        });
    }
};
/** =====================================================================
 *  RENEW TOKEN
=========================================================================*/


/** =====================================================================
 *  LOGOUT
=========================================================================*/
const logout = async (req, res = response) => {
    try {
        const uid = req.uid;
        if (!uid) return res.status(401).json({ ok: false, msg: 'Sin uid' });

        let userDB = null;
        if (req.companyDb) {
            const UserCompany = getUserModel(req.companyDb);
            userDB = await UserCompany.findById(uid);
        }

        if (!userDB) {
            const UserGlobal = require('../../global/models/users.model');
            userDB = await UserGlobal.findById(uid);
        }

        if (userDB) {
            userDB.isLoggedIn = false;
            await userDB.save();
        }

        res.json({ ok: true, msg: 'Sesión cerrada exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error inesperado al cerrar sesión' });
    }
};

module.exports = {
    login,
    renewJWT,
    logout
};