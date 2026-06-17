const { response } = require('express');

const getInventoryModel = require('../models/inventory.model');
const getTransaccionModel = require('../models/transacciones.model');
const getTrasladoModel = require('../models/traslados.model');
const getTrmModel = require('../../company/models/trm.model');

/** ======================================================================
 *  GET INVENTORY
=========================================================================*/
const getInventoriesQuery = async (req, res) => {

    try {
        if (!req.branchDb || !req.companyDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos de base de datos' });

        const Inventory = getInventoryModel(req.branchDb);
        const Transaccion = getTransaccionModel(req.branchDb);
        const Traslado = getTrasladoModel(req.branchDb); // Traslados internos en la misma sucursal
        const Trm = getTrmModel(req.companyDb);

        const { desde, hasta, sort, ...query } = req.body;

        const [inventories, total, latestTrm] = await Promise.all([
            Inventory.find(query)
                .limit(hasta)
                .skip(desde)
                .sort(sort)
                .lean(),
            Inventory.countDocuments({ status: true }),
            Trm.findOne().sort({ _id: -1 })
        ]);

        const usedInTx = await Transaccion.distinct('items.moneda');
        const usedInTrEntregada = await Traslado.distinct('monedaEntregada');
        const usedInTrRecibida = await Traslado.distinct('monedaRecibida');

        const usedSet = new Set([
            ...usedInTx.map(id => id.toString()),
            ...usedInTrEntregada.map(id => id.toString()),
            ...usedInTrRecibida.map(id => id.toString())
        ]);

        const inventoriesWithFlag = inventories.map(inv => {
            let trmToApply = inv.trm;
            let trmUpdateToApply = inv.trmUpdate;

            if (inv.code === 'USD' && latestTrm) {
                trmToApply = latestTrm.valor;
                trmUpdateToApply = latestTrm.fecha;
            }

            return {
                ...inv,
                trm: trmToApply,
                trmUpdate: trmUpdateToApply,
                hasTransactions: usedSet.has(inv._id.toString()),
                invid: inv._id
            };
        });

        res.json({
            ok: true,
            inventories: inventoriesWithFlag,
            total
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
 *  GET INVENTORY ID
=========================================================================*/
const getInventoryId = async (req, res = response) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Inventory = getInventoryModel(req.branchDb);

        const invid = req.params.id;

        const inventoryDB = await Inventory.findById(invid);
        if (!inventoryDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este inventario, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            inventory: inventoryDB
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
 *  CREATE INVENTORY
=========================================================================*/
const createInventory = async (req, res = response) => {

    let { currency, code } = req.body;

    currency = currency.trim();
    code = code.trim().toUpperCase();

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Inventory = getInventoryModel(req.branchDb);

        const validate = await Inventory.findOne({ currency });

        if (validate) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existe una moneda con este nombre'
            });
        }

        const validateCode = await Inventory.findOne({ code })
        if (validateCode) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existe una moneda con este codigo'
            });
        }

        const inventory = new Inventory(req.body);
        console.log('--- CREANDO DIVISA ---');
        console.log('Payload recibido:', req.body);
        inventory.code = code;
        inventory.currency = currency;
        inventory.disponible = inventory.amount;
        inventory.anterior = inventory.amount;
        inventory.modoUtilidad = 'HISTORICO'; // Default value

        // Inicializar tasas en el punto de partida (TPC arranca igual que TA)
        if (req.body.ta !== undefined && req.body.ta !== null) {
            inventory.ta = req.body.ta;
            inventory.tpc = req.body.ta;
        }


        // SAVE
        await inventory.save();

        res.json({
            ok: true,
            inventory
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
 *  UPDATE INVENTORY
=========================================================================*/
const updateInventory = async (req, res = response) => {

    const invid = req.params.id;

    try {
        if (!req.branchDb || !req.companyDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos' });

        const Inventory = getInventoryModel(req.branchDb);
        const Transaccion = getTransaccionModel(req.branchDb);
        const Traslado = getTrasladoModel(req.companyDb);
        const Trm = getTrmModel(req.companyDb);

        // SEARCH
        const inventoryDB = await Inventory.findById(invid);
        if (!inventoryDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ninguna moneda con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        const { currency, ...campos } = req.body;

        // 1. Sanitizaci�n incondicional de TPC
        delete campos.tpc;

        // 2. Validaci�n Inteligente de Siembras de Efectivo F�sico
        if (campos.amount !== undefined || campos.disponible !== undefined) {
            if (inventoryDB.amount !== inventoryDB.disponible) {
                // Regla A: Hubo movimiento de caja. Se bloquea la siembra manual.
                delete campos.amount;
                delete campos.disponible;
            } else {
                // Regla B: Validaci�n profunda en base de datos para garantizar inmutabilidad hist�rica
                const txAsociada = await Transaccion.findOne({ "items.moneda": invid });
                const trasladoAsociado = await Traslado.findOne({ 
                    $or: [{ monedaEntregada: invid }, { monedaRecibida: invid }] 
                });

                if (txAsociada || trasladoAsociado) {
                    // Regla C: Ya hay historial contable. Se bloquea la siembra manual.
                    delete campos.amount;
                    delete campos.disponible;
                }
                // Si no entra en los IF, es una Siembra de Saldo Inicial V�lida y permitimos la edici�n.
            }
        }

        // 1. Sanitizaci�n incondicional de TPC
        delete campos.tpc;

        // 2. Validaci�n Inteligente de Siembras de Efectivo F�sico
        if (campos.amount !== undefined || campos.disponible !== undefined) {
            if (inventoryDB.amount !== inventoryDB.disponible) {
                // Regla A: Hubo movimiento de caja. Se bloquea la siembra manual.
                delete campos.amount;
                delete campos.disponible;
            } else {
                // Regla B: Validaci�n profunda en base de datos para garantizar inmutabilidad hist�rica
                const txAsociada = await Transaccion.findOne({ "items.moneda": invid });
                const trasladoAsociado = await Traslado.findOne({ 
                    $or: [{ monedaEntregada: invid }, { monedaRecibida: invid }] 
                });

                if (txAsociada || trasladoAsociado) {
                    // Regla C: Ya hay historial contable. Se bloquea la siembra manual.
                    delete campos.amount;
                    delete campos.disponible;
                }
                // Si no entra en los IF, es una Siembra de Saldo Inicial V�lida y permitimos la edici�n.
            }
        }
        if (currency && inventoryDB.currency !== currency) {
            const validateCurrency = await Inventory.findOne({ currency });
            if (validateCurrency) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe una moneda con este nombre...'
                });
            }

            campos.currency = currency.trim();
        }

        // Evitar que se modifiquen los parámetros históricos o base (Monto Inicial, TA, TPC) si ya hubo transacciones
        const currentAmount = inventoryDB.amount || 0;
        const newAmount = campos.amount !== undefined && campos.amount !== null ? Number(campos.amount) : currentAmount;

        const currentTa = inventoryDB.ta || 0;
        const newTa = campos.ta !== undefined && campos.ta !== null ? Number(campos.ta) : currentTa;

        const currentTc = inventoryDB.tc || 0;
        const newTc = campos.tc !== undefined && campos.tc !== null ? Number(campos.tc) : currentTc;

        if (newAmount !== currentAmount || newTa !== currentTa || newTc !== currentTc) {
            const usedInTx = await Transaccion.exists({ 'items.moneda': invid });
            const usedInTr = await Traslado.exists({ $or: [{ monedaEntregada: invid }, { monedaRecibida: invid }] });

            if (inventoryDB.amount !== inventoryDB.disponible || usedInTx || usedInTr) {
                return res.status(400).json({
                    ok: false,
                    msg: 'No se pueden modificar los montos iniciales ni las tasas base (TA/TPC) porque esta divisa ya tiene un historial operativo activo.'
                });
            }
        }

        if (campos.modoUtilidad && campos.modoUtilidad !== inventoryDB.modoUtilidad) {
            if (inventoryDB.amount !== 0) {
                return res.status(400).json({
                    ok: false,
                    msg: 'No se puede modificar el Método de Utilidad si la divisa tiene existencia mayor a cero.'
                });
            }
        }

        if (campos.trm !== undefined) {
            // VERIFICAR ROL PARA TRM
            const getUserModel = require('../../company/models/users.model');
            const UserCompany = getUserModel(req.companyDb);
            const UserBranch = getUserModel(req.branchDb);
            let reqUser = await UserCompany.findById(req.uid);
            if (!reqUser) reqUser = await UserBranch.findById(req.uid);

            if (!reqUser || (reqUser.role !== 'ADMIN' && reqUser.role !== 'OWNER')) {
                return res.status(403).json({
                    ok: false,
                    msg: 'No tienes privilegios para modificar la TRM global de la empresa.'
                });
            }

            const newTrm = new Trm({ valor: campos.trm, fecha: new Date() });
            await newTrm.save();
        }

        // ACTUALIZAR ta y tpc SI LA DIVISA AUN ESTA EN CERO INVENTARIO
        if (inventoryDB.amount === 0 || inventoryDB.amount == null) {
            if (campos.ta !== undefined) {
                campos.ta = campos.ta;
                campos.tpc = campos.ta;
            }
        }

        // UPDATE
        const inventoryUpdate = await Inventory.findByIdAndUpdate(invid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            inventory: inventoryUpdate
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

};


// EXPORTS
module.exports = {
    getInventoriesQuery,
    createInventory,
    updateInventory,
    getInventoryId
};