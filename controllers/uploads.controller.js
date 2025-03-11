//

const path = require('path');
const { response } = require('express');
const fs = require('fs');

const ObjectId = require('mongoose').Types.ObjectId;
const sharp = require('sharp');

/** =====================================================================
 *  GET IMAGES
=========================================================================*/
const getImages = (req, res = response) => {

    const tipo = req.params.tipo;
    const image = req.params.image;

    const pathImg = path.join(__dirname, `../uploads/${tipo}/${image}`);

    // IMAGE DEFAULT
    if (fs.existsSync(pathImg)) {
        res.sendFile(pathImg);
    } else {
        // CHECK TYPE
        if (tipo !== 'user') {
            const pathImg = path.join(__dirname, `../uploads/default.png`);
            res.sendFile(pathImg);
        } else {
            const pathImg = path.join(__dirname, `../uploads/user/user-default.png`);
            res.sendFile(pathImg);
        }
    }

};
/** =====================================================================
 *  GET IMAGES
=========================================================================*/

// EXPORTS
module.exports = {
     getImages    
};