const { response } = require('express');
const getTrasladosSucursalesModel = require('../models/trasladosSucursales.model');
const { getBranchConnection } = require('../../../shared/database/connection');
const getTurnosModel = require('../../branch/models/turnos.model');

/** =====================================================================
 *  CREATE TRASLADO ENTRE SUCURSALES
=========================================================================*/
const createTrasladoSucursal = async (req, res = response) => {
    const uid = req.uid;

    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        
        // Bloqueo estricto de COP
        if (req.body.monedaEntregadaCode === 'COP' || req.body.monedaRecibidaCode === 'COP') {
            return res.status(400).json({
                ok: false,
                msg: 'OPERACIÓN RECHAZADA: No está permitido el traslado de moneda local (COP) entre sucursales.'
            });
        }

        const sucursalOrigenId = req.sucursalIdToken;
        const { sucursalDestinoId, turnoEmisorId, turnoReceptorId, montoEntregado, montoRecibido, monedaEntregada, monedaRecibida } = req.body;

        if (!sucursalDestinoId || sucursalOrigenId === sucursalDestinoId) {
            return res.status(400).json({
                ok: false,
                msg: 'Debe especificar una sucursal destino diferente a la sucursal de origen.'
            });
        }

        const subdomain = req.headers['x-subdomain'] || '';
        // Conexiones a las Branch DB
        const dbOrigen = getBranchConnection(subdomain, sucursalOrigenId);
        const dbDestino = getBranchConnection(subdomain, sucursalDestinoId);

        // Esperar conexión
        if (dbOrigen.readyState !== 1) await dbOrigen.asPromise();
        if (dbDestino.readyState !== 1) await dbDestino.asPromise();

        const TurnoOrigen = getTurnosModel(dbOrigen);
        const TurnoDestino = getTurnosModel(dbDestino);

        const tEmisor = await TurnoOrigen.findById(turnoEmisorId);
        const tReceptor = await TurnoDestino.findById(turnoReceptorId);

        if (!tEmisor || !tReceptor) {
            return res.status(404).json({ ok: false, msg: 'No se encontraron los turnos en las sucursales respectivas.' });
        }

        const mEntregado = Number(montoEntregado);
        const mRecibido = Number(montoRecibido);

        // LOGICA DE DESCUENTO EN ORIGEN
        let idxEmisorEntregada = tEmisor.saldos.findIndex(s => String(s.moneda) === String(monedaEntregada));
        let idxEmisorRecibida = tEmisor.saldos.findIndex(s => String(s.moneda) === String(monedaRecibida));

        if (idxEmisorRecibida === -1) {
            tEmisor.saldos.push({ moneda: monedaRecibida, montoInicial: 0, saldoActual: 0, tasaInicial: 1 });
            idxEmisorRecibida = tEmisor.saldos.length - 1; 
        }

        if (idxEmisorEntregada === -1 || tEmisor.saldos[idxEmisorEntregada].saldoActual < mEntregado) {
            return res.status(400).json({ ok: false, msg: `No tienes saldo suficiente en la sucursal origen. Intentas enviar ${mEntregado}.` });
        }

        // LOGICA DE INCREMENTO EN DESTINO
        let idxReceptorEntregada = tReceptor.saldos.findIndex(s => String(s.moneda) === String(monedaEntregada));
        let idxReceptorRecibida = tReceptor.saldos.findIndex(s => String(s.moneda) === String(monedaRecibida));

        if (idxReceptorEntregada === -1) {
            tReceptor.saldos.push({ moneda: monedaEntregada, montoInicial: 0, saldoActual: 0, tasaInicial: 1 });
            idxReceptorEntregada = tReceptor.saldos.length - 1;
        }

        // Si el traslado no es "pendiente", verificamos que el receptor tenga saldo para enviar la contraparte
        if (req.body.pendiente === false) {
             if (idxReceptorRecibida === -1 || tReceptor.saldos[idxReceptorRecibida].saldoActual < mRecibido) {
                return res.status(400).json({ ok: false, msg: 'El receptor en la sucursal destino no tiene saldo suficiente para la contraparte, o debe marcar el traslado como PENDIENTE.' });
            }
            // Receptor entrega la contraparte
            tReceptor.saldos[idxReceptorRecibida].saldoActual -= mRecibido;
            tEmisor.saldos[idxEmisorRecibida].saldoActual += mRecibido;
        }

        // Descontamos del emisor y sumamos al receptor la divisa original
        tEmisor.saldos[idxEmisorEntregada].saldoActual -= mEntregado; 
        tReceptor.saldos[idxReceptorEntregada].saldoActual += mEntregado; 

        // GUARDAR TURNOS EN SUS RESPECTIVAS DB
        await Promise.all([tEmisor.save(), tReceptor.save()]);

        // GUARDAR REGISTRO CORPORATIVO EN COMPANY DB
        const TrasladosSucursales = getTrasladosSucursalesModel(req.companyDb);
        req.body.emisorId = uid;
        req.body.sucursalOrigenId = sucursalOrigenId;
        
        const trasladoNew = new TrasladosSucursales(req.body);
        await trasladoNew.save();

        res.json({
            ok: true,
            traslado: trasladoNew
        });

    } catch (error) {
        console.error('Error en createTrasladoSucursal:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno al procesar el traslado entre sucursales'
        });
    }
};

/** =====================================================================
 *  GET TRASLADOS CORPORATIVOS
=========================================================================*/
const getTrasladosSucursalesQuery = async(req, res) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        const TrasladosSucursales = getTrasladosSucursalesModel(req.companyDb);

        const { desde, hasta, sort, ...query } = req.body;

        const [traslados, total] = await Promise.all([
            TrasladosSucursales.find(query)
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            TrasladosSucursales.countDocuments(query)
        ]);

        res.json({
            ok: true,
            traslados,
            total
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

// EXPORTS
module.exports = {
    createTrasladoSucursal,
    getTrasladosSucursalesQuery
};
