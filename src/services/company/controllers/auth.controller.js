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

        console.log('EMPRESA DB:', req.companyDb.name);
        console.log('EMPRESA ID:', req.empresaId);
        console.log('SUCURSAL ID:', req.sucursalId);

        const UserCompany = getUserModel(req.companyDb);
        const UserBranch = getUserModel(req.branchDb);

        // VALIDATE USER (primero en empresa, luego en sucursal si no existe)
        let userDB = await UserCompany.findOne({ user });
        
        if (!userDB) {
            userDB = await UserBranch.findOne({ user });
        }

        console.log('USER ENCONTRADO:', userDB ? userDB.user : 'No encontrado');

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
        } else {

            if (userDB.status) {
                // Pass empresaId and sucursalId to JWT
                const token = await generarJWT(userDB.id, req.empresaId, req.sucursalId);
                res.json({
                    ok: true,
                    token,
                    usuario: userDB
                });
            } else {
                return res.status(401).json({
                    ok: false,
                    msg: 'Tu cuenta a sido desactivada por un administrador'
                });
            }
        }

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

    const uid = req.uid;
    const empresaId = req.empresaIdToken || req.empresaId;
    const sucursalId = req.sucursalIdToken || req.sucursalId;

    // GENERAR TOKEN - JWT
    const token = await generarJWT(uid, empresaId, sucursalId);

    try {
        const UserCompany = getUserModel(req.companyDb);
        const UserBranch = getUserModel(req.branchDb);

        // SEARCH USER
        let usuario = await UserCompany.findById(uid, 'user name role img address uid valid turno fecha status');
        
        if (!usuario) {
            usuario = await UserBranch.findById(uid, 'user name role img address uid valid turno fecha status');
        }

        res.status(200).json({
            ok: true,
            token,
            usuario
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al renovar token' });
    }

};
/** =====================================================================
 *  RENEW TOKEN
=========================================================================*/


module.exports = {
    login,
    renewJWT
};