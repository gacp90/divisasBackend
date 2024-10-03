const { response } = require('express');

const Inventory = require('../models/inventory.model');

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
            .sort(sort),
            Inventory.countDocuments({ status: true })
        ])

        res.json({
            ok: true,
            inventories,
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

    let { currency } = req.body;

    currency = currency.trim();

    try {

        const validate = await Inventory.findOne({ currency });

        if (validate) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existe una moneda con este nombre'
            });
        }

        const inventory = new Inventory(req.body);
        inventory.currency = currency;

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
        if (inventoryDB.currency !== currency) {
            const validateCurrency = await Inventory.findOne({ currency });
            if (validateCurrency) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe una moneda con este nombre...'
                });
            }

            campos.currency = currency.trim();
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