//Env
require('dotenv').config();
const path = require('path');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

//Conection DB
const { dbConection } = require('./database/config');

// Crear el servidor express
const app = express();

// CORS
app.use(cors());

//app.use(express.bodyParser({ limit: '50mb' }));
// READ BODY
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

// BY GILMER C.
// DataBase
dbConection();

// DIRECTORIO PUBLICO
app.use(express.static('public'));

// RUTAS
app.use('/api/v1/cities', require('./routes/cities.route'));
app.use('/api/v1/clients', require('./routes/clients.route'));
app.use('/api/v1/departments', require('./routes/departments.route'));
app.use('/api/v1/empresa', require('./routes/empresa.route'));
app.use('/api/v1/inventory', require('./routes/inventory.route'));
app.use('/api/v1/login', require('./routes/auth.route'));
app.use('/api/v1/movimientos', require('./routes/movimientos.route'));
app.use('/api/v1/users', require('./routes/users.route'));
app.use('/api/v1/search', require('./routes/search.route'));
app.use('/api/v1/transacciones', require('./routes/transacciones.route'));

// SPA
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public/index.html'));
});

app.listen(process.env.PORT, () => {
    console.log('Servidor Corriendo en el Puerto', process.env.PORT);
});