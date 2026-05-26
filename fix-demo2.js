require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const fix = async () => {
    try {
        const uri = process.env.GLOBAL_DB_CNN.replace('/simid_global_db', '/company_demo2');
        await mongoose.connect(uri);
        
        const UserCompany = mongoose.model('User', new mongoose.Schema({
            user: { type: String, required: true },
            name: { type: String, required: true },
            password: { type: String, required: true },
            role: { type: String, required: true },
            status: { type: Boolean, default: true }
        }));

        const exists = await UserCompany.findOne({ user: 'MASTERPEZ' });
        if (exists) {
            console.log('MASTERPEZ ya existe en demo2');
            process.exit(0);
        }

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
        console.log('MASTERPEZ inyectado en demo2');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
fix();
