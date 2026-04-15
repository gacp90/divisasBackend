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
      query.$or.push({ 'documents.number': document });
    }

    // Búsqueda por Nombre
    if (fullName) {
      
      // MAYUSCULAS Y SIN ESPACIOS
      const nameUpper = fullName.toUpperCase().trim();
      
      query.$or.push({ fullName: nameUpper });
      
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

module.exports = {
  checkClient
};
