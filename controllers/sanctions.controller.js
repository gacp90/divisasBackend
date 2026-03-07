const SanctionsEntry = require('../models/sanctionsEntry.model');

/** =====================================================================
 *  CHEQUEAR CLIENTE
=========================================================================*/
const checkClient = async (req, res) => {
  try {
    const { document, nationality, fullName } = req.body;

    if (!document && !fullName) {
      return res.status(400).json({
        ok: false,
        msg: 'Documento o nombre son requeridos'
      });
    }

    const query = {
      active: true,
      $or: []
    };

    if (document) {
      query.$or.push({ 'documents.number': document });
    }

    if (fullName) {
        const regex = new RegExp(fullName, 'i');
        query.$or.push({ fullName: regex });
    }

    if (nationality) {
        const regex = new RegExp(nationality, 'i');
        query.nationality = {
            $in: [regex]
        };
    }

    const matches = await SanctionsEntry.find(query).limit(10);

    return res.json({
      ok: true,
      matched: matches.length > 0,
      total: matches.length,
      results: matches
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: 'Error validando listas de sanción'
    });
  }
};

module.exports = {
  checkClient
};
