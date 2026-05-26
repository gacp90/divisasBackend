const { response } = require('express');
const Subdomain = require('../models/subdomain.model');

/**
 * Obtener todos los subdominios (Empresas)
 */
const getSubdomains = async (req, res = response) => {
    try {
        const subdomains = await Subdomain.find().sort({ createdAt: -1 });

        res.json({
            ok: true,
            subdomains
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
};

/**
 * Crear un nuevo subdominio (Empresa)
 */
const createSubdomain = async (req, res = response) => {
    const { subdominio } = req.body;

    try {
        const subdomainName = subdominio.toLowerCase().trim();

        const existe = await Subdomain.findOne({ subdominio: subdomainName });
        if (existe) {
            return res.status(400).json({
                ok: false,
                msg: 'El subdominio ya está registrado'
            });
        }

        const nuevoSubdomain = new Subdomain({
            subdominio: subdomainName,
            isActive: true
        });

        await nuevoSubdomain.save();

        res.json({
            ok: true,
            subdomain: nuevoSubdomain,
            msg: 'Empresa creada exitosamente'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
};

/**
 * Activar o Desactivar un subdominio
 */
const toggleSubdomain = async (req, res = response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
        const subdomainDB = await Subdomain.findById(id);

        if (!subdomainDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Subdominio no encontrado por ID'
            });
        }

        subdomainDB.isActive = isActive;
        await subdomainDB.save();

        res.json({
            ok: true,
            subdomain: subdomainDB,
            msg: isActive ? 'Empresa activada' : 'Empresa desactivada'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
};

module.exports = {
    getSubdomains,
    createSubdomain,
    toggleSubdomain
};
