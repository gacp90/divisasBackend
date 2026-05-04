const User = require('../models/users.model');

const validarAccesoPagos = async (req, res, next) => {

    try {

        const uid = req.uid;

        const user = await User.findById(uid);

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
