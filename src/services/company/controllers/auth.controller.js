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
        const getBranchModel = require('../models/branch.model');
        const { getBranchConnection } = require('../../../shared/database/connection');

        // 1. Buscar en Company DB (OWNER, ADMIN, SUPERVISOR)
        let userDB = await UserCompany.findOne({ user });
        let activeBranchPath = null;
        
        // 2. Si no está en Company, iterar por las sucursales (CAJEROS)
        if (!userDB) {
            const Branch = getBranchModel(req.companyDb);
            const branches = await Branch.find({ isActive: true });
            
            for (const branch of branches) {
                const tempBranchDb = getBranchConnection(branch.path);
                const UserBranch = getUserModel(tempBranchDb);
                
                const foundUser = await UserBranch.findOne({ user });
                if (foundUser) {
                    userDB = foundUser;
                    activeBranchPath = branch.path;
                    break; // Cortar el ciclo si lo encuentra
                }
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

        // Subdominio se asume que viene desde req.headers['x-subdomain'] pero es mejor pasarlo al JWT
        const subdomain = req.headers['x-subdomain'] || '';
        
        // Token inyecta: uid, tenant(subdomain), branchPath(si aplica)
        const token = await generarJWT(userDB.id, subdomain, activeBranchPath);
        
        res.json({
            ok: true,
            token,
            usuario: userDB,
            tenant: subdomain,
            branch: activeBranchPath // Retornarlo explícito para facilitar el enrutamiento Angular
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