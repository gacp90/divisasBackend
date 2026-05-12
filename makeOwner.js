require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/users.model');

const makeOwner = async () => {
    try {
        const username = process.argv[2];
        if (!username) {
            console.log('Debes proporcionar el nombre de usuario. Ejemplo: node makeOwner.js masterpez');
            process.exit(1);
        }

        await mongoose.connect(process.env.DB_CNN);
        console.log('Base de datos conectada');

        let user = await User.findOne({ user: username });

        if (!user) {
            console.log(`No se encontró el usuario: ${username}. Creándolo ahora...`);
            const bcrypt = require('bcryptjs');
            const salt = bcrypt.genSaltSync();
            const defaultPassword = bcrypt.hashSync('123456', salt); // Contraseña por defecto

            user = new User({
                user: username,
                name: 'Propietario del Sistema',
                password: defaultPassword,
                role: 'OWNER',
                isOwner: true,
                status: true
            });
            await user.save();
            console.log(`¡Éxito! Usuario '${username}' creado con rol OWNER.`);
        } else {
            user.role = 'OWNER';
            user.isOwner = true; // Por retrocompatibilidad por si acaso
            await user.save();
            console.log(`¡Éxito! El usuario '${username}' existente ahora tiene el rol OWNER.`);
        }
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

makeOwner();
