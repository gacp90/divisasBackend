const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');

// Pool de conexiones dinámicas
const connectionsPool = new Map();

// Create the global connection synchronously. Mongoose queues operations until connected.
const globalConnection = mongoose.createConnection(process.env.GLOBAL_DB_CNN, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Initialize auto-increment
autoIncrement.initialize(globalConnection);

globalConnection.on('connected', () => {
    console.log('Global DB Online');
});

globalConnection.on('error', (err) => {
    console.error('Error connecting to Global DB', err);
});

// Extraemos la URI base removiendo la DB al final (ej. /simid_global_db)
const getBaseUri = () => {
    const uri = process.env.GLOBAL_DB_CNN || '';
    return uri.substring(0, uri.lastIndexOf('/'));
};

const getDynamicConnection = (dbName) => {
    if (connectionsPool.has(dbName)) {
        return connectionsPool.get(dbName);
    }

    console.log(`Creando nueva conexión dinámica a: ${dbName}`);
    const uri = `${getBaseUri()}/${dbName}`;
    const connection = mongoose.createConnection(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    // AutoIncrement para conexiones dinámicas si lo requieren
    autoIncrement.initialize(connection);

    connectionsPool.set(dbName, connection);
    return connection;
};

const getCompanyConnection = (empresaId) => {
    if (!empresaId) throw new Error('empresaId es requerido para obtener la conexión');
    return getDynamicConnection(`simid_empresa_${empresaId}_db`);
};

const getBranchConnection = (sucursalId) => {
    if (!sucursalId) throw new Error('sucursalId es requerido para obtener la conexión');
    return getDynamicConnection(`simid_sucursal_${sucursalId}_db`);
};

module.exports = {
    globalConnection,
    getCompanyConnection,
    getBranchConnection
};
