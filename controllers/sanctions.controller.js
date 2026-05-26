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

    // Ejecutaremos las búsquedas en paralelo para mayor velocidad
    const searchPromises = [];

    // Búsqueda por documento
    if (document) {
      const cleanDoc = document.toString().replace(/[-_.\s]/g, '').trim();
      if (cleanDoc.length > 0) {
        const escapedDoc = cleanDoc.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const regexPattern = '^' + escapedDoc.split('').join('[-_.\\s]?');
        
        searchPromises.push(
          SanctionsEntry.find({ 
            active: true, 
            'documents.number': { $regex: regexPattern } 
          }).limit(10)
        );
      } else {
        searchPromises.push(
          SanctionsEntry.find({ active: true, 'documents.number': document }).limit(10)
        );
      }
    }

    // Búsqueda por Nombre (USANDO INDICE TEXT)
    if (fullName) {
      const nameUpper = fullName.toUpperCase().trim();
      // El índice text es muchísimo más rápido que un regex sin ancla
      // Lo encerramos en comillas dobles para que busque la frase exacta
      searchPromises.push(
        SanctionsEntry.find({ 
          active: true, 
          $text: { $search: `"${nameUpper}"` } 
        }).limit(10)
      );
    }

    // 3. Ejecutar búsquedas
    const resultsArrays = await Promise.all(searchPromises);
    
    // Unir resultados y eliminar duplicados por _id
    let matches = [];
    const seen = new Set();
    
    for (const arr of resultsArrays) {
      for (const item of arr) {
        if (!seen.has(item._id.toString())) {
          seen.add(item._id.toString());
          matches.push(item);
        }
      }
    }

    // Limitar el resultado final a 10
    matches = matches.slice(0, 10);

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
