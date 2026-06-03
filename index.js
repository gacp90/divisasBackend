//Env
require('dotenv').config();
const path = require('path');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// CRON JOBS
const runDailyAverageRate = require('./cron/dailyRate');
const { iniciarCronTRM } = require('./cron/trm.cron');
const { startSanctionsCron } = require('./src/services/global/cron/sanctions.cron');
const { startTurnosCron, startCierreEstrictoCajerosCron } = require('./src/services/global/cron/turnos.cron');



//Conection DB
const { dbConection } = require('./database/config');
const { globalConnection } = require('./src/shared/database/connection');

// Crear el servidor express
const app = express();

// CORS
app.use(cors());

//app.use(express.bodyParser({ limit: '50mb' }));
// READ BODY
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

const { injectDynamicConnections } = require('./src/shared/middlewares/subdomain.middleware');
app.use(injectDynamicConnections);

// BY GILMER C.
// DataBase
dbConection();

// DIRECTORIO PUBLICO
app.use(express.static('public'));

// RUTAS
app.use('/api/v1/cities', require('./src/services/global/routes/cities.route'));
app.use('/api/v1/clients', require('./src/services/company/routes/clients.route'));
app.use('/api/v1/pais', require('./src/services/global/routes/pais.route'));
app.use('/api/v1/departments', require('./src/services/global/routes/departments.route'));
app.use('/api/v1/funds', require('./src/services/company/routes/funds.route'));
app.use('/api/v1/company-profile', require('./src/services/company/routes/companyProfile.route'));
app.use('/api/v1/company-branches', require('./src/services/company/routes/branches.route'));
app.use('/api/v1/empresa', require('./src/services/branch/routes/empresa.route'));
app.use('/api/v1/inventory', require('./src/services/branch/routes/inventory.route'));
app.use('/api/v1/login', require('./src/services/company/routes/auth.route'));
app.use('/api/v1/movimientos', require('./src/services/branch/routes/movimientos.route'));
app.use('/api/v1/rates', require('./src/services/branch/routes/rates.route'));
app.use('/api/v1/search', require('./src/shared/routes/search.route'));
app.use('/api/v1/users', require('./src/services/company/routes/users.route'));
app.use('/api/v1/transacciones', require('./src/services/branch/routes/transacciones.route'));
app.use('/api/v1/sanctions', require('./src/services/global/routes/sanctions.routes'));
app.use('/api/v1/sources', require('./src/shared/routes/sources.route'));
app.use('/api/v1/subdomains', require('./src/services/global/routes/subdomains.route'));
app.use('/api/v1/global-branches', require('./src/services/global/routes/global-branches.route'));
app.use('/api/v1/traslados', require('./src/services/branch/routes/traslados.route'));
app.use('/api/v1/traslados-sucursales', require('./src/services/company/routes/trasladosSucursales.route'));
app.use('/api/v1/turnos', require('./src/services/branch/routes/turnos.route'));
app.use('/api/v1/uploads', require('./src/shared/routes/uploads.route'));
app.use('/api/v1/pagos', require('./src/services/branch/routes/pagos.route'));
app.use('/api/v1/global-dashboard', require('./src/services/global/routes/global-dashboard.route'));
app.use('/api/v1/consecutivos', require('./src/services/branch/routes/consecutivos.route'));

// SPA
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public/index.html'));
});

app.listen(process.env.PORT, () => {
    console.log('Servidor Corriendo en el Puerto', process.env.PORT);
});

// Iniciar cron jobs
runDailyAverageRate();
iniciarCronTRM();
startSanctionsCron();
startTurnosCron();
startCierreEstrictoCajerosCron();