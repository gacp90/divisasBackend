const SanctionsEntry = require('../models/sanctionsEntry.model');

const checkClient = async (req, res) => {
  try {
    const { document, fullName } = req.body;

    if (!document && !fullName) {
      return res.status(400).json({
        ok: false,
        msg: 'Documento o nombre son requeridos'
      });
    }

    // Usaremos un $or para buscar o por documento o por nombre
    const query = {
      active: true,
      $or: []
    };

    // Búsqueda por documento
    if (document) {
      // Quitamos guiones, puntos y espacios de la entrada del usuario
      const cleanDoc = document.toString().replace(/[-_.\s]/g, '').trim();
      
      if (cleanDoc.length > 0) {
        // Escapamos los caracteres para evitar inyecciones en regex
        const escapedDoc = cleanDoc.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        
        // Expresión regular que permite espacios/guiones opcionales solo al medio
        const regexPattern = escapedDoc.split('').join('[-_.\\s]?');
        
        // IMPORTANTE: Solo buscamos en documents.number. Buscar en remarks o aliases
        // con regex (sin índice texto completo) causa un escaneo completo de colección (Full Collection Scan)
        // lo que provoca que la BD se cuelgue y devuelva 504 / 502 Timeout.
        query.$or.push({ 'documents.number': { $regex: regexPattern, $options: 'i' } });
      } else {
        query.$or.push({ 'documents.number': document });
      }
    }

    // Búsqueda por Nombre
    if (fullName) {
      
      // MAYUSCULAS Y SIN ESPACIOS
      const nameUpper = fullName.toUpperCase().trim();
      
      // Buscamos con regex para hacer match parcial
      const escapedName = nameUpper.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.$or.push({ fullName: { $regex: escapedName, $options: 'i' } });
      
      // OPCIONAL TENGO QUE TESTEAR SI ES MAS RAPIDO ASI
      // query.$or.push({ $text: { $search: nameUpper } }); 
    }

    // 3. Ejecutar búsqueda
    const matches = await SanctionsEntry.find(query)
      .limit(10);

    return res.json({
      ok: true,
      matched: matches.length > 0,
      total: matches.length,
      results: matches
    });

  } catch (error) {
    console.error('Error en checkClient:', error);
    res.status(500).json({
      ok: false,
      msg: 'Error validando listas de sanción'
    });
  }
};

const { downloadAndProcessOFAC } = require('../helpers/ofac.helper');
const { downloadAndProcessONU } = require('../helpers/onuSanctions.helper');

const forceDownload = async (req, res) => {
  try {
    await downloadAndProcessONU();
    await downloadAndProcessOFAC();
    res.json({ ok: true, msg: 'Descarga finalizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: 'Error durante la descarga', error: error.message });
  }
}

module.exports = {
  checkClient,
  forceDownload
};
