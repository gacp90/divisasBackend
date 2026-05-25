const { response } = require('express');
const bcrypt = require('bcryptjs');

const getUserModel = require('../models/users.model');

/** ======================================================================
 *  GET USERS
=========================================================================*/
const getUsers = async(req, res) => {

    try {
        if (!req.companyDb || !req.branchDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos de base de datos' });
        
        const UserCompany = getUserModel(req.companyDb);
        const UserBranch = getUserModel(req.branchDb);

        const [usersC, totalC, usersB, totalB] = await Promise.all([
            UserCompany.find(),
            UserCompany.countDocuments(),
            UserBranch.find(),
            UserBranch.countDocuments()
        ]);

        res.json({
            ok: true,
            users: [...usersC, ...usersB],
            total: totalC + totalB
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });

    }


};
/** =====================================================================
 *  GET USERS
=========================================================================*/

/** =====================================================================
 *  GET USERS ID
=========================================================================*/
const getUserId = async(req, res = response) => {

    try {
        if (!req.companyDb || !req.branchDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos de base de datos' });
        
        const UserCompany = getUserModel(req.companyDb);
        const UserBranch = getUserModel(req.branchDb);
        
        const id = req.params.id;

        let userDB = await UserCompany.findById(id);
        if (!userDB) userDB = await UserBranch.findById(id);
        if (!userDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este usuario, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            user: userDB
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });
    }

};
/** =====================================================================
 *  GET USERS ID
=========================================================================*/

/** =====================================================================
 *  CREATE USERS
=========================================================================*/
const createUsers = async(req, res = response) => {

    let { user, password } = req.body;
    user = user.trim();

    try {
        if (!req.companyDb || !req.branchDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos de base de datos' });
        
        const UserCompany = getUserModel(req.companyDb);
        const UserBranch = getUserModel(req.branchDb);

        // Validar permisos según el rol del usuario que solicita
        let reqUser = await UserCompany.findById(req.uid);
        if (!reqUser) reqUser = await UserBranch.findById(req.uid);
        
        if (!reqUser) return res.status(404).json({ok: false, msg: 'Usuario no encontrado'});

        if (req.body.role === 'OWNER' && reqUser.role !== 'OWNER') {
            return res.status(403).json({ok: false, msg: 'Solo el OWNER puede crear usuarios OWNER.'});
        }
        
        if (reqUser.role === 'SUPERVISOR' && req.body.role !== 'CAJERO') {
            return res.status(403).json({ok: false, msg: 'El SUPERVISOR solo puede crear CAJEROS.'});
        }
        
        if (reqUser.role === 'CAJERO') {
            return res.status(403).json({ok: false, msg: 'El CAJERO no puede crear usuarios.'});
        }

        const TargetUser = req.body.role === 'CAJERO' ? UserBranch : UserCompany;

        let validarUsuario = await UserCompany.findOne({ user });
        if (!validarUsuario) validarUsuario = await UserBranch.findOne({ user });

        if (validarUsuario) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existen alguien con este nombre de usuario'
            });
        }

        const userNew = new TargetUser(req.body);

        // ENCRYPTAR PASSWORD
        const salt = bcrypt.genSaltSync();
        userNew.password = bcrypt.hashSync(password, salt);
        userNew.user = user;

        // SAVE USER
        await userNew.save();

        res.json({
            ok: true,
            user: userNew
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }
};
/** =====================================================================
 *  CREATE USERS
=========================================================================*/

/** =====================================================================
 *  UPDATE USER
=========================================================================*/
const updateUser = async(req, res = response) => {

    const uid = req.params.id;
   

    try {
        if (!req.companyDb || !req.branchDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos de base de datos' });
        const UserCompany = getUserModel(req.companyDb);
        const UserBranch = getUserModel(req.branchDb);

        // SEARCH USER
        let userDB = await UserCompany.findById(uid);
        let TargetUser = UserCompany;
        
        if (!userDB) {
            userDB = await UserBranch.findById(uid);
            TargetUser = UserBranch;
        }

        if (!userDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun usuario con este ID'
            });
        }
        
        // Validar permisos para editar usuarios
        let reqUser = await UserCompany.findById(req.uid);
        if (!reqUser) reqUser = await UserBranch.findById(req.uid);
        
        if (!reqUser) return res.status(404).json({ok: false, msg: 'Usuario no encontrado'});

        if (userDB.role === 'OWNER' && reqUser.role !== 'OWNER') {
            return res.status(403).json({ok: false, msg: 'Solo un OWNER puede editar a otro OWNER.'});
        }
        
        if (req.body.role === 'OWNER' && reqUser.role !== 'OWNER') {
            return res.status(403).json({ok: false, msg: 'Solo un OWNER puede asignar el rol OWNER.'});
        }
        
        if (reqUser.role === 'SUPERVISOR' && userDB.role !== 'CAJERO' && reqUser.id !== userDB.id) {
            return res.status(403).json({ok: false, msg: 'El SUPERVISOR solo puede editar a CAJEROS o a sí mismo.'});
        }
        
        if (reqUser.role === 'CAJERO' && reqUser.id !== userDB.id) {
            return res.status(403).json({ok: false, msg: 'El CAJERO solo puede editar su propio perfil.'});
        }

        // VALIDATE USER
        const { password, user, ...campos } = req.body;
        if (userDB.user !== user) {
            let validarUsuario = await UserCompany.findOne({ user });
            if (!validarUsuario) validarUsuario = await UserBranch.findOne({ user });
            if (validarUsuario) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un usuario con este nombre'
                });
            }
        }

        if (password) {

            // ENCRYPTAR PASSWORD
            const salt = bcrypt.genSaltSync();
            campos.password = bcrypt.hashSync(password, salt);

        }

        // UPDATE
        campos.user = user;
        const userUpdate = await TargetUser.findByIdAndUpdate(uid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            user: userUpdate
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

};
/** =====================================================================
 *  UPDATE USER
=========================================================================*/
/** =====================================================================
 *  DELETE USER
=========================================================================*/
const deleteUser = async(req, res = response) => {

    const id = req.uid;

    const uid = req.params.id;

    try {
        if (!req.companyDb || !req.branchDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos de base de datos' });
        const UserCompany = getUserModel(req.companyDb);
        const UserBranch = getUserModel(req.branchDb);

        // SEARCH USER
        let userDB = await UserCompany.findById(uid);
        let TargetUser = UserCompany;
        
        if (!userDB) {
            userDB = await UserBranch.findById(uid);
            TargetUser = UserBranch;
        }

        if (!userDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No existe ningun usuario con este ID'
            });
        }
        
        // Validar permisos para eliminar/desactivar usuarios
        let reqUser = await UserCompany.findById(req.uid);
        if (!reqUser) reqUser = await UserBranch.findById(req.uid);
        
        if (!reqUser) return res.status(404).json({ok: false, msg: 'Usuario no encontrado'});

        if (userDB.role === 'OWNER' && reqUser.role !== 'OWNER') {
            return res.status(403).json({ok: false, msg: 'Solo un OWNER puede desactivar a otro OWNER.'});
        }
        
        if (reqUser.role === 'SUPERVISOR' && userDB.role !== 'CAJERO') {
            return res.status(403).json({ok: false, msg: 'El SUPERVISOR solo puede desactivar a CAJEROS.'});
        }
        
        if (reqUser.role === 'CAJERO') {
            return res.status(403).json({ok: false, msg: 'El CAJERO no puede desactivar usuarios.'});
        }

        // CHANGE STATUS
        if (userDB.status === true) {

            if (id === uid) {
                return res.status(400).json({
                    ok: false,
                    msg: 'El mismo usuario no puede desactivarse o activarse'
                });
            }

            userDB.status = false;

        } else {
            userDB.status = true;
        }
        // CHANGE STATUS

        const userUpdate = await TargetUser.findByIdAndUpdate(uid, userDB, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            user: userUpdate
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });
    }

};
/** =====================================================================
 *  DELETE USER
=========================================================================*/


// EXPORTS
module.exports = {
    getUsers,
    createUsers,
    updateUser,
    deleteUser,
    getUserId
};