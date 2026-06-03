//

const path = require('path');
const { response } = require('express');
const fs = require('fs');

const { v4: uuidv4 } = require('uuid');

const ObjectId = require('mongoose').Types.ObjectId;
const sharp = require('sharp');
const { updateImage } = require('../helpers/update-image');


/** =====================================================================
 *  UPLOADS
=========================================================================*/
const fileUpload = async(req, res = response) => {

    const tipo = req.params.tipo;
    const id = req.params.id;
    const desc = req.query.desc || 'img';

    const validType = ['logo', 'user'];

    // VALID TYPES
    if (!validType.includes(tipo)) {
        return res.status(400).json({
            ok: false,
            msg: 'El tipo es invalido'
        });
    }

    // VALIDATE IMAGE
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
            ok: false,
            msg: 'No has seleccionado ningún archivo'
        });
    }

    // PROCESS IMAGE
    const file = await sharp(req.files.image.data).metadata();

    // const nameShort = file.format.split('.');
    const extFile = file.format;

    // VALID EXT
    const validExt = ['jpg', 'png', 'jpeg', 'webp', 'bmp', 'svg'];
    if (!validExt.includes(extFile)) {
        return res.status(400).json({
            ok: false,
            msg: 'No se permite este tipo de imagen, solo extenciones JPG - PNG - WEBP - SVG'
        });
    }
    // VALID EXT

    // GENERATE NAME UID
    const nameFile = `${ uuidv4() }.webp`;

    // PATH IMAGE
    const path = `./uploads/${ tipo }/${ nameFile }`;

    // CONVERTIR A WEBP
    if (tipo === 'logo') {

        sharp(req.files.image.data)
            .resize(200, 200)
            .webp({ equality: 75, effort: 6 })
            .toFile(path, (err, info) => {

                // UPDATE IMAGE
                updateImage(tipo, id, nameFile, desc, req);

                res.json({
                    ok: true,
                    msg: 'Imagen Actualizada',
                    nombreArchivo: nameFile,
                    date: Date.now()
                });

            });

    } else{

        sharp(req.files.image.data)
            .webp({ equality: 75, effort: 6 })
            .toFile(path, (err, info) => {

                // UPDATE IMAGE
                updateImage(tipo, id, nameFile, desc, req);

                res.json({
                    ok: true,
                    msg: 'Imagen Actualizada',
                    nombreArchivo: nameFile,
                    date: Date.now()
                });

            });

    } 

};

/** =====================================================================
 *  GET IMAGES
=========================================================================*/
const getImages = (req, res = response) => {

    const tipo = req.params.tipo;
    const image = req.params.image;

    const pathImg = path.join(__dirname, `../../../uploads/${tipo}/${image}`);

    // IMAGE DEFAULT
    if (fs.existsSync(pathImg)) {
        res.sendFile(pathImg);
    } else {
        // CHECK TYPE
        if (tipo !== 'user') {
            const pathImg = path.join(__dirname, `../../../uploads/default.png`);
            res.sendFile(pathImg);
        } else {
            const pathImg = path.join(__dirname, `../../../uploads/user/user-default.png`);
            res.sendFile(pathImg);
        }
    }

};
/** =====================================================================
 *  GET IMAGES
=========================================================================*/

// EXPORTS
module.exports = {
     getImages,
     fileUpload
};