const { response } = require('express');
const Pago = require('../models/pagos.model');
const User = require('../models/users.model');
const Empresa = require('../models/empresa.model');

/** =========================================
 *  OBTENER PAGOS (SOLO OWNER)
=========================================*/
const getPagos = async (req, res = response) => {

    try {

       const pagos = await Pago.find().sort({ fecha: -1 });

        res.json({
            ok: true,
            pagos
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener pagos'
        });
    }

};


/** =========================================
 *  CREAR PAGO (USUARIO NORMAL - YA PAGUÉ)
=========================================*/
const crearPago = async (req, res = response) => {

    try {

        const { empresa, usuario, monto, referencia } = req.body;

        // Verificar si ya existe un pago para esta empresa en el mes actual
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        const pagoExistente = await Pago.findOne({
            empresa,
            fecha: { $gte: startOfMonth, $lte: endOfMonth }
        });

        if (pagoExistente) {
            // Actualizar la fecha al momento actual
            pagoExistente.fecha = new Date();
            if (referencia) {
                pagoExistente.referencia = referencia;
            }
            await pagoExistente.save();

            return res.json({
                ok: true,
                pago: pagoExistente,
                msg: 'Pago actualizado con la fecha más reciente'
            });
        }

        const pago = new Pago({
            empresa,
            usuario,
            monto,
            referencia,
            estado: 'PENDIENTE'
        });

        await pago.save();

        res.json({
            ok: true,
            pago
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear pago'
        });
    }

};


/** =========================================
 *  APROBAR PAGO (SOLO OWNER)
=========================================*/
const aprobarPago = async (req, res = response) => {

    try {

        const uid = req.uid;
        const user = await User.findById(uid);

        const { id } = req.params;

        const pago = await Pago.findById(id);

        if (!pago) {
            return res.status(404).json({
                ok: false,
                msg: 'Pago no encontrado'
            });
        }

        pago.estado = 'ACTIVO';

        await pago.save();

        const empresa = await Empresa.findOne();

        if (empresa) {
            empresa.suscripcion = {
                estado: 'ACTIVA',
                ultimoPago: new Date()
            };

            await empresa.save();
        }

        res.json({
            ok: true,
            pago
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al aprobar pago'
        });
    }

};

module.exports = {
    getPagos,
    crearPago,
    aprobarPago
};
