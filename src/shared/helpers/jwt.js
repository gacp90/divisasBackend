/**
 * JWT
 */

const jwt = require('jsonwebtoken');


const generarJWT = (uid, empresaId, sucursalId) => {

    return new Promise((resolve, reject) => {

        const payload = {
            uid,
            empresaId,
            sucursalId
        };

        jwt.sign(payload, process.env.SECRET_SEED_JWT, {
            expiresIn: '12h'
        }, (err, token) => {

            if (err) {
                console.log(err);
                reject('No se pudo generar el token');
            } else {
                resolve(token);
            }

        });
    });

};

const generarJWTClient = (cid) => {

    return new Promise((resolve, reject) => {

        const payload = {
            cid
        };

        jwt.sign(payload, process.env.SECRET_SEED_JWT, {
            expiresIn: '12h'
        }, (err, token) => {

            if (err) {
                console.log(err);
                reject('No se pudo generar el token');
            } else {
                resolve(token);
            }

        });
    });

};

module.exports = {
    generarJWT,
    generarJWTClient
};