const { response } = require('express');

const Client = require('../models/clients.model');

/** ======================================================================
 *  GET CLIENTS
=========================================================================*/
const getClientsQuery = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [clients, total] = await Promise.all([

            Client.find(query)
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Client.countDocuments({ status: true })
        ])

        res.json({
            ok: true,
            clients,
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
 *  GET CLIENT ID
=========================================================================*/
const getClientId = async(req, res = response) => {

    try {
        const id = req.params.id;

        const clientDB = await Client.findById(id);
        if (!clientDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este cliente, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            client: clientDB
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
 *  CREATE CLIENT
=========================================================================*/
const createClient = async(req, res = response) => {

    let { numberid, email } = req.body;

    numberid = numberid.trim();
    email = email.trim();

    try {

        const validateClient = await Client.findOne({ numberid });

        if (validateClient) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existe un cliente con este numero de identificación'
            });
        }

        const client = new Client(req.body);

        client.email = email;
        client.numberid = numberid;

        // SAVE USER
        await client.save();

        res.json({
            ok: true,
            client
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
 *  UPDATE CLIENT
=========================================================================*/
const updateClient = async(req, res = response) => {

    const cid = req.params.id;

    try {

        // SEARCH
        const clientDB = await Client.findById(cid);
        if (!clientDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun cliente con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        const { numberid, ...campos } = req.body;
        if (clientDB.numberid !== numberid) {
            const validateNumberId = await Client.findOne({ numberid });
            if (validateNumberId) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un cliente con este numero de identificación...'
                });
            }

            campos.numberid = numberid;
        }

        // UPDATE
        const clientUpdate = await Client.findByIdAndUpdate(cid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            client: clientUpdate
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
    getClientsQuery,
    createClient,
    updateClient,
    getClientId
};