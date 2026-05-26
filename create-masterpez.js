require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserGlobal = require('./src/services/global/models/users.model');

const createMasterpez = async () => {
    try {
        console.log('Connecting to global DB...');
        await mongoose.connect(process.env.GLOBAL_DB_CNN);
        
        console.log('Connected. Checking if MASTERPEZ exists...');
        const exists = await UserGlobal.findOne({ user: 'MASTERPEZ' });
        if (exists) {
            console.log('MASTERPEZ already exists!');
            process.exit(0);
        }

        const salt = bcrypt.genSaltSync();
        const password = bcrypt.hashSync('masterpez2026', salt);

        const admin = new UserGlobal({
            user: 'MASTERPEZ',
            name: 'Propietario',
            password: password,
            role: 'OWNER'
        });

        await admin.save();
        console.log('MASTERPEZ created successfully in global DB!');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

createMasterpez();
