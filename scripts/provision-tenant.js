require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Importar conexiones dinámicas
const { globalConnection, getCompanyConnection, getBranchConnection } = require('../src/shared/database/connection');

// Importar Modelos
const Subdomain = require('../src/services/global/models/subdomain.model');
const getUserModel = require('../src/services/company/models/users.model');
const getFundsModel = require('../src/services/company/models/funds.model');
const getTrmModel = require('../src/services/company/models/trm.model');

const getEmpresaModel = require('../src/services/branch/models/empresa.model');
const getConsecutiveModel = require('../src/services/branch/models/concecutives.model');
const getInventoryModel = require('../src/services/branch/models/inventory.model');

// ============================================================================
// 1. Parseo y Validación de Argumentos
// ============================================================================
const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
        params[args[i].substring(2)] = args[i + 1];
    }
}

const requiredParams = [
    'subdomain', 
    'empresa_id', 
    'sucursal_id', 
    'empresa_nombre', 
    'admin_user', 
    'admin_pass', 
    'admin_name'
];

const validateParams = () => {
    for (const req of requiredParams) {
        if (!params[req]) {
            console.error(`❌ Faltó el parámetro obligatorio: --${req}`);
            console.log('Uso correcto: node scripts/provision-tenant.js --subdomain <x> --empresa_id <y> --sucursal_id <z> --empresa_nombre <w> --admin_user <u> --admin_pass <p> --admin_name <n>');
            process.exit(1);
        }
    }
    // Validar formato de subdominio (no caracteres especiales)
    if (!/^[a-z0-9-]+$/.test(params.subdomain)) {
        console.error(`❌ El subdominio solo puede contener letras minúsculas, números y guiones.`);
        process.exit(1);
    }
};

// ============================================================================
// 2. Ejecución Principal (Aprovisionamiento)
// ============================================================================
const runProvisioner = async () => {
    validateParams();

    console.log(`\n🚀 Iniciando aprovisionamiento seguro para: ${params.subdomain}`);

    // Esperar a que la base global esté lista
    if (globalConnection.readyState !== 1) {
        await new Promise((resolve) => {
            globalConnection.once('connected', resolve);
        });
    }

    try {
        // --- A. VALIDACIÓN GLOBAL ---
        console.log(`🔍 Verificando disponibilidad del subdominio en Global DB...`);
        const existingSubdomain = await Subdomain.findOne({ subdominio: params.subdomain.toLowerCase() });
        if (existingSubdomain) {
            console.error(`❌ Error: El subdominio '${params.subdomain}' ya está registrado.`);
            process.exit(1);
        }

        // Preparar conexiones
        const companyConnection = getCompanyConnection(params.empresa_id);
        const branchConnection = getBranchConnection(params.sucursal_id);

        await Promise.all([
            companyConnection.asPromise(),
            branchConnection.asPromise()
        ]);
        console.log(`✅ Conexiones a bases de datos establecidas.`);

        // Iniciar transacción (Rollback manual simulado)
        console.log(`📝 Registrando inquilino en Global DB...`);
        const newSubdomain = new Subdomain({
            subdominio: params.subdomain.toLowerCase(),
            empresaId: params.empresa_id,
            sucursalId: params.sucursal_id,
            isActive: true
        });
        await newSubdomain.save();

        // --- B. COMPANY DB (Usuarios, Cajas, TRM) ---
        console.log(`👤 Configurando Company DB (Usuarios, TRM, Fondos)...`);
        
        // 1. Usuario Admin (OWNER)
        const User = getUserModel(companyConnection);
        const existingUser = await User.findOne({ user: params.admin_user });
        if (!existingUser) {
            const salt = bcrypt.genSaltSync();
            const hashedPassword = bcrypt.hashSync(params.admin_pass, salt);

            const newAdmin = new User({
                user: params.admin_user,
                name: params.admin_name,
                password: hashedPassword,
                role: 'OWNER',
                isOwner: true,
                status: true
            });
            await newAdmin.save();
        } else {
            console.log(`⚠️  El usuario ${params.admin_user} ya existe en esta Company DB. Se omitirá su creación.`);
        }

        // 2. TRM Base
        const Trm = getTrmModel(companyConnection);
        const trmCount = await Trm.countDocuments();
        if (trmCount === 0) {
            await new Trm({ valor: 3900 }).save();
        }

        // 3. Fondos Base (Cajas)
        const Funds = getFundsModel(companyConnection);
        const fundsCount = await Funds.countDocuments();
        if (fundsCount === 0) {
            await new Funds({ code: 'CAJAP', name: 'CAJA PRINCIPAL' }).save();
            await new Funds({ code: 'BANCO', name: 'BANCO' }).save();
        }

        // --- C. BRANCH DB (Sucursal, Consecutivos, Inventario) ---
        console.log(`🏢 Configurando Branch DB (Datos sucursal, Consecutivos, Inventario)...`);
        
        // 1. Datos Base Empresa/Sucursal
        const Empresa = getEmpresaModel(branchConnection);
        const empCount = await Empresa.countDocuments();
        if (empCount === 0) {
            await new Empresa({
                name: params.empresa_nombre,
                suscripcion: { estado: 'ACTIVA', ultimoPago: new Date() },
                status: true,
                capital: 0,
                fecha: new Date()
            }).save();
        }

        // 2. Consecutivos
        const Consecutive = getConsecutiveModel(branchConnection);
        const defaultsSeq = ['Compra', 'Venta', '1100', '1099', '1121'];
        for (const type of defaultsSeq) {
            const exists = await Consecutive.findOne({ type });
            if (!exists) {
                await new Consecutive({ type, seq: 1 }).save();
            }
        }

        // 3. Inventario Base (Monedas)
        const Inventory = getInventoryModel(branchConnection);
        const monedas = [
            { code: 'USD', currency: 'Dolares' },
            { code: 'EUR', currency: 'Euros' }
        ];
        
        for (const m of monedas) {
            const exists = await Inventory.findOne({ code: m.code });
            if (!exists) {
                await new Inventory({
                    code: m.code,
                    currency: m.currency,
                    amount: 0,
                    disponible: 0,
                    tc: 3800,
                    tv: 3900,
                    status: true
                }).save();
            }
        }

        console.log(`\n🎉 Aprovisionamiento completado con éxito!`);
        console.log(`=========================================`);
        console.log(`🌐 Subdominio Registrado: ${params.subdomain}`);
        console.log(`🔗 Empresa ID: ${params.empresa_id}`);
        console.log(`🔗 Sucursal ID: ${params.sucursal_id}`);
        console.log(`👤 Usuario Admin: ${params.admin_user}`);
        console.log(`=========================================\n`);

    } catch (error) {
        console.error(`\n❌ Error crítico durante el aprovisionamiento:`, error);
        
        // Intentar rollback manual en Global DB
        try {
            console.log(`⚠️ Intentando hacer rollback en Global DB (Eliminar subdominio registrado)...`);
            await Subdomain.deleteOne({ subdominio: params.subdomain.toLowerCase() });
            console.log(`✅ Rollback de subdominio exitoso.`);
        } catch (rollbackError) {
            console.error(`❌ Falló el rollback en Global DB:`, rollbackError);
        }
        process.exit(1);
    } finally {
        process.exit(0);
    }
};

runProvisioner();
