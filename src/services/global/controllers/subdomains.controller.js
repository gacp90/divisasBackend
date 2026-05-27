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
    const { subdominio, nombreEmpresa, type, nit, representanteLegal } = req.body;

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
            nombreEmpresa: nombreEmpresa || subdomainName,
            isActive: true
        });

        await nuevoSubdomain.save();

        // INYECCIÓN AUTOMÁTICA DEL OWNER (MASTERPEZ) EN LA NUEVA EMPRESA
        const { getCompanyConnection } = require('../../../shared/database/connection');
        const getUserModel = require('../../company/models/users.model');
        const bcrypt = require('bcryptjs');

        const companyDb = getCompanyConnection(subdomainName);
        const UserCompany = getUserModel(companyDb);

        // Hashear la clave estándar (masterpez2026)
        const salt = bcrypt.genSaltSync();
        const masterPassword = bcrypt.hashSync('masterpez2026', salt);

        const newOwner = new UserCompany({
            user: 'MASTERPEZ',
            name: 'Propietario',
            password: masterPassword,
            role: 'OWNER',
            status: true
        });

        await newOwner.save();

        // INYECCIÓN DE DATOS DEL REPRESENTANTE LEGAL
        const getCompanyProfileModel = require('../../company/models/companyProfile.model');
        const CompanyProfile = getCompanyProfileModel(companyDb);
        
        const newProfile = new CompanyProfile({
            type: type ?? true, // true = Jurídica por defecto
            nit: nit || '000000000',
            representanteLegal: representanteLegal || 'Representante'
        });

        await newProfile.save();

        res.json({
            ok: true,
            subdomain: nuevoSubdomain,
            msg: 'Empresa creada exitosamente con Representante Legal y usuario MASTERPEZ inyectado.'
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
 * Editar el nombre de la empresa
 */
const editSubdomainName = async (req, res = response) => {
    const { id } = req.params;
    const { nombreEmpresa, fechaVencimiento } = req.body;

    try {
        const subdomainDB = await Subdomain.findById(id);

        if (!subdomainDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Subdominio no encontrado por ID'
            });
        }

        if (nombreEmpresa) subdomainDB.nombreEmpresa = nombreEmpresa;
        if (fechaVencimiento) subdomainDB.fechaVencimiento = fechaVencimiento;
        
        await subdomainDB.save();

        res.json({
            ok: true,
            subdomain: subdomainDB,
            msg: 'Datos de la empresa actualizados'
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
    editSubdomainName,
    toggleSubdomain
};
