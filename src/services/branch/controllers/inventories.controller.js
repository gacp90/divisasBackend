const { response } = require('express');

const getInventoryModel = require('../models/inventory.model');
const getTransaccionModel = require('../models/transacciones.model');
const getTrasladoModel = require('../models/traslados.model');
const getTrmModel = require('../../company/models/trm.model');

/** ======================================================================
 *  GET INVENTORY
=========================================================================*/
const getInventoriesQuery = async(req, res) => {

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
const getInventoryId = async(req, res = response) => {

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
const createInventory = async(req, res = response) => {

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
        inventory.code = code;
        inventory.currency = currency;
        inventory.disponible = inventory.amount;
        inventory.anterior = inventory.amount;


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
const updateInventory = async(req, res = response) => {

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

        // Evitar que se modifique el monto inicial si ya hubo transacciones en el historial
        if (campos.amount !== undefined) {
            const usedInTx = await Transaccion.exists({ 'items.moneda': invid });
            const usedInTr = await Traslado.exists({ $or: [{ monedaEntregada: invid }, { monedaRecibida: invid }] });

            if (inventoryDB.amount !== inventoryDB.disponible || usedInTx || usedInTr) {
                return res.status(400).json({
                    ok: false,
                    msg: 'No se puede modificar el monto porque esta divisa ya tiene un historial de transacciones o traslados.'
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