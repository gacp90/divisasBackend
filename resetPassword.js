require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/users.model');
const bcrypt = require('bcryptjs');

const resetPassword = async () => {
    try {
        const username = process.argv[2];
        if (!username) {
            console.log('Debes proporcionar el nombre de usuario. Ejemplo: node resetPassword.js MASTERPEZ');
            process.exit(1);
        }

        await mongoose.connect(process.env.DB_CNN);
        console.log('Base de datos conectada');

        let user = await User.findOne({ user: username });

        if (!user) {
            console.log(`No se encontró el usuario: ${username}.`);
        } else {
            const salt = bcrypt.genSaltSync();
            user.password = bcrypt.hashSync('123456', salt);
            await user.save();
            console.log(`¡Éxito! La contraseña del usuario '${username}' ha sido restablecida a '123456'.`);
        }
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetPassword();
