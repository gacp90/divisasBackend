const { response } = require('express');
const Pago = require('../../global/models/pagos.model');
const getEmpresaModel = require('../models/empresa.model');
const { getBranchConnection } = require('../../../shared/database/connection');

/** =========================================
 *  OBTENER PAGOS (SOLO OWNER)
 *  Ahora consulta simid_global_db
=========================================*/
const getPagos = async (req, res = response) => {
    try {
        // En Global Dashboard, el token ya tiene los permisos
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
 *  Se guarda en simid_global_db
=========================================*/
const crearPago = async (req, res = response) => {
    try {
        const { empresa, usuario, monto, referencia } = req.body;
        
        // El tenant y branch deben venir del token del usuario que hace la solicitud
        const tenant = req.tenantToken;
        const branchPath = req.branchPathToken;

        if (!tenant) {
            return res.status(400).json({ ok: false, msg: 'No se pudo identificar el tenant del usuario' });
        }

        // Verificar si ya existe un pago para esta empresa en el mes actual
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        const pagoExistente = await Pago.findOne({
            tenant,
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
            tenant,
            branchPath,
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

        // SUMAR 30 DÍAS AL VENCIMIENTO DE LA EMPRESA EN LA BD GLOBAL
        const Subdomain = require('../../global/models/subdomain.model');
        const subdomainDB = await Subdomain.findOne({ subdominio: pago.tenant });
        
        if (subdomainDB) {
            let fechaActual = subdomainDB.fechaVencimiento ? new Date(subdomainDB.fechaVencimiento) : new Date();
            // Si ya estaba vencida, se cuenta desde hoy
            if (fechaActual < new Date()) {
                fechaActual = new Date();
            }
            fechaActual.setDate(fechaActual.getDate() + 30);
            subdomainDB.fechaVencimiento = fechaActual;
            await subdomainDB.save();
        }

        // Si el pago tiene un branchPath, actualizar la suscripción en la DB de esa sucursal
        if (pago.branchPath) {
            const tempBranchDb = getBranchConnection(pago.tenant, pago.branchPath);
            // Esperar conexión
            if (tempBranchDb.readyState !== 1) {
                await tempBranchDb.asPromise();
            }

            const Empresa = getEmpresaModel(tempBranchDb);
            const empresaBranch = await Empresa.findOne();

            if (empresaBranch) {
                empresaBranch.suscripcion = {
                    estado: 'ACTIVA',
                    ultimoPago: new Date()
                };
                await empresaBranch.save();
            }
        }

        res.json({
            ok: true,
            pago,
            subdomainDB
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

