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
            .populate('representante')
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

        const clientDB = await Client.findById(id)
            .populate('representante');
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
 *  GET DUPLICATES
=========================================================================*/
const getDuplicates = async (req, res) => {
    try {
        // Recibimos el array de campos desde el body
        const { field } = req.body; 

        // Validamos que 'field' sea un array
        if (!Array.isArray(field)) {
            return res.status(400).json({ message: "Se esperaba un array de campos en 'field'" });
        }

        // Ejecutamos una agregación por cada campo enviado
        const results = await Promise.all(field.map(async (f) => {
            const duplicates = await Client.aggregate([
                {
                    // Agrupamos por el campo actual de la iteración
                    $group: {
                        _id: `$${f}`, 
                        count: { $sum: 1 },         
                        docs: { $push: "$$ROOT" }    
                    }
                },
                {
                    // Filtramos: que se repita y que no sea nulo/vacío
                    $match: {
                        count: { $gt: 1 },
                        _id: { $ne: null, $ne: "" } 
                    }
                },
                {
                    $project: {
                        _id: 0,
                        valorDuplicado: "$_id",
                        repeticiones: "$count",
                        usuarios: "$docs"
                    }
                }
            ]);

            return {
                campo: f,
                cantidadDuplicados: duplicates.length,
                detalles: duplicates
            };
        }));

        const reporteFinal = results.filter(item => item.cantidadDuplicados > 0);
        res.status(200).json({
            mensaje: "Auditoría de duplicados finalizada",
            reporte: reporteFinal, // Este array ahora solo tiene lo que "falló"
            totalCamposConErrores: reporteFinal.length
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al detectar duplicados", error: error.message });
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
    getClientId,
    getDuplicates
};