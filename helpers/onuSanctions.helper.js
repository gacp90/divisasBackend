const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const SanctionsSource = require('../models/sanctionsSource.model');
const SanctionsEntry = require('../models/sanctionsEntry.model');

const ONU_URL = 'https://scsanctions.un.org/resources/xml/en/consolidated.xml';

/** =====================================================================
 *  OBETENER LISTA ONU Y GUARDARLA EN MONGODB
=========================================================================*/
const downloadAndProcessONU = async () => {
  console.log('🔄 Descargando lista ONU...');

  const response = await axios.get(ONU_URL, { responseType: 'text' });
  const xmlData = response.data;

  // 🔐 Hash del documento
  const hash = crypto.createHash('sha256').update(xmlData).digest('hex');

  // 📄 Parse XML
  const parser = new xml2js.Parser({ explicitArray: false });
  const parsed = await parser.parseStringPromise(xmlData);

  const list = parsed.CONSOLIDATED_LIST;
  const documentDate = new Date(list.$.dateGenerated);

  // 🔍 Verificar si ya existe esa versión
  const existingSource = await SanctionsSource.findOne({
    name: 'ONU',
    hash
  });

  if (existingSource) {
    console.log('✅ Lista ONU ya actualizada');
    return;
  }

  //  Desactivar registros anteriores
  await SanctionsEntry.updateMany(
    { source: 'ONU', active: true },
    { active: false }
  );

  let total = 0;

  const individuals = list.INDIVIDUALS?.INDIVIDUAL || [];
  const entries = Array.isArray(individuals) ? individuals : [individuals];

  for (const person of entries) {
    try {
        const firstName = person.FIRST_NAME || '';
        const lastName = person.SECOND_NAME || '';
        const fullName = `${firstName} ${lastName}`.trim();

        const nationality = [];

        if (person.NATIONALITY?.VALUE) {
        if (Array.isArray(person.NATIONALITY.VALUE)) {
            nationality.push(
            ...person.NATIONALITY.VALUE.map(v => v.trim()).filter(Boolean)
            );
        } else {
            nationality.push(person.NATIONALITY.VALUE.trim());
        }
        }

        const documents = [];

        if (person.INDIVIDUAL_DOCUMENT) {
        const docs = Array.isArray(person.INDIVIDUAL_DOCUMENT)
            ? person.INDIVIDUAL_DOCUMENT
            : [person.INDIVIDUAL_DOCUMENT];

        docs.forEach(d => {
            if (d.NUMBER) {
            documents.push({
                type: d.TYPE || 'UNKNOWN',
                number: d.NUMBER
            });
            }
        });
        }

        await SanctionsEntry.create({
        source: 'ONU',
        entityType: 'INDIVIDUAL',
        fullName,
        firstName,
        lastName,
        nationality,
        documents,
        aliases: [],
        remarks: person.COMMENTS1 || '',
        active: true
        });

        total++;

    } catch (err) {
        console.error(
        'Error ONU entry:',
        person?.FIRST_NAME,
        person?.SECOND_NAME,
        err.message
        );
    }
   }


  //  Guardar metadata
  await SanctionsSource.create({
    name: 'ONU',
    url: ONU_URL,
    documentDate,
    lastDownload: new Date(),
    hash,
    totalRecords: total
  });

  console.log(`Lista ONU procesada: ${total} registros`);
};

module.exports = {
  downloadAndProcessONU
};
