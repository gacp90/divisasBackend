const fs = require('fs');

// MODELS
const User = require('../models/users.model');
const Empresa = require('../models/empresa.model');

/** =====================================================================
 *  DELETE IMAGE
=========================================================================*/
const deleteImage = (path) => {

    // VALIDATE IMAGE
    if (fs.existsSync(path)) {
        // DELET IMAGE OLD
        fs.unlinkSync(path);
    }

};

/** =====================================================================
 *  DELETE IMAGE
=========================================================================*/


/** =====================================================================
 *  UPDATE IMAGE 
=========================================================================*/
const updateImage = async(tipo, id, nameFile, desc) => {

    let pathOld = '';

    switch (tipo) {
        case 'logo':

            const empresa = await Empresa.findById(id);
            if (!empresa) {
                return false;
            }

            // VALIDATE IMAGE
            pathOld = `./uploads/user/${ empresa.logo }`;
            deleteImage(pathOld);

            empresa.logo = nameFile;
            await empresa.save();
            return true;

            // BREAK PRODUCT
            break;

        case 'user':

            // SEARCH USER BY ID
            const user = await User.findById(id);
            if (!user) {
                return false;
            }

            // VALIDATE IMAGE
            pathOld = `./uploads/user/${ user.img }`;
            deleteImage(pathOld);

            // SAVE IMAGE
            user.img = nameFile;
            await user.save();
            return true;

            break;

        default:
            break;
    }


};
/** =====================================================================
 *  UPDATE IMAGE
=========================================================================*/

// EXPORT
module.exports = {
    updateImage
};