const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const SanctionsSource = require('../models/sanctionsSource.model');
const SanctionsEntry = require('../models/sanctionsEntry.model');

const ONU_URL = 'https://scsanctions.un.org/resources/xml/en/consolidated.xml';

const downloadAndProcessONU = async () => {
  try {
    console.log('🔄 Descargando lista ONU...');
    // 0. Obtener la última vez que descargamos
    const lastSource = await SanctionsSource.findOne({ name: 'ONU' }).sort({ lastDownload: -1 });
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    if (lastSource && lastSource.lastDownload) {
      headers['If-Modified-Since'] = new Date(lastSource.lastDownload.getTime() - 60000).toUTCString();
    }

    const response = await axios.get(ONU_URL, {
      responseType: 'text',
      headers,
      validateStatus: status => status === 200 || status === 304
    });

    if (response.status === 304) {
      console.log('✅ Lista ONU ya está actualizada (304 Not Modified).');
      return;
    }

    const xmlData = response.data;

    // 🔐 Generar Hash para detectar cambios
    const hash = crypto.createHash('sha256').update(xmlData).digest('hex');

    // 📄 Parsear XML
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(xmlData);

    const list = parsed.CONSOLIDATED_LIST;
    const documentDate = new Date(list.$.dateGenerated);

    // 🔍 1. Verificar si el contenido es idéntico al último procesado
    const existingSource = await SanctionsSource.findOne({ name: 'ONU', hash });
    if (existingSource) {
      console.log('✅ Lista ONU ya está actualizada (mismo hash).');
      return;
    }

    console.log('🆕 Nueva versión detectada, procesando registros...');

    // 准备 (Prepare) el array para inserción masiva
    const bulkEntries = [];
    const individuals = list.INDIVIDUALS?.INDIVIDUAL || [];
    const entries = Array.isArray(individuals) ? individuals : [individuals];

    for (const person of entries) {
      try {
        const firstName = (person.FIRST_NAME || '').toUpperCase();
        const lastName = (person.SECOND_NAME || '').toUpperCase();
        const fullName = `${firstName} ${lastName}`.trim();

        // --- Procesar Nacionalidades ---
        const nationality = [];
        if (person.NATIONALITY?.VALUE) {
          const values = Array.isArray(person.NATIONALITY.VALUE)
            ? person.NATIONALITY.VALUE
            : [person.NATIONALITY.VALUE];

          values.forEach(v => {
            if (v && typeof v === 'string') nationality.push(v.trim().toUpperCase());
          });
        }

        // --- Procesar Documentos ---
        const documents = [];
        if (person.INDIVIDUAL_DOCUMENT) {
          const docs = Array.isArray(person.INDIVIDUAL_DOCUMENT)
            ? person.INDIVIDUAL_DOCUMENT
            : [person.INDIVIDUAL_DOCUMENT];

          docs.forEach(d => {
            if (d.NUMBER) {
              documents.push({
                type: (d.TYPE || 'UNKNOWN').toUpperCase(),
                number: String(d.NUMBER).trim()
              });
            }
          });
        }

        // Agregar al lote
        bulkEntries.push({
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

      } catch (err) {
        console.error(`⚠️ Error parseando entrada ONU (${person?.FIRST_NAME}):`, err.message);
      }
    }

    // 🚀 OPERACIONES DE BASE DE DATOS EN BLOQUE

    // A. Desactivar registros viejos (Audit Trail)
    await SanctionsEntry.updateMany(
      { source: 'ONU', active: true },
      { active: false }
    );

    // B. Inserción masiva (Mucho más rápido que .create uno por uno)
    if (bulkEntries.length > 0) {
      await SanctionsEntry.insertMany(bulkEntries, { lean: true });
    }

    // C. Guardar registro en SanctionsSource (Historial de Auditoría)
    await SanctionsSource.create({
      name: 'ONU',
      url: ONU_URL,
      documentDate,
      lastDownload: new Date(),
      hash,
      totalRecords: bulkEntries.length
    });

    // D. Opcional: Eliminar los registros inactivos para no saturar el disco
    // await SanctionsEntry.deleteMany({ source: 'ONU', active: false });

    console.log(`✅ Lista ONU finalizada: ${bulkEntries.length} registros insertados.`);

  } catch (error) {
    console.error('❌ Error crítico en downloadAndProcessONU:', error.message);
    throw error; // Lanzar para que el cron lo capture
  }
};

module.exports = { downloadAndProcessONU };