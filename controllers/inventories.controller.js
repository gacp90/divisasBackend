const { response } = require('express');

const Inventory = require('../models/inventory.model');
const Transaccion = require('../models/transacciones.model');
const Traslado = require('../models/traslados.model');

/** ======================================================================
 *  GET INVENTORY
=========================================================================*/
const getInventoriesQuery = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [inventories, total] = await Promise.all([
            Inventory.find(query)
            .limit(hasta)
            .skip(desde)
            .sort(sort)
            .lean(),
            Inventory.countDocuments({ status: true })
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
            return {
                ...inv,
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