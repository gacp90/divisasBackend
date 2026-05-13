const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const SanctionsSource = require('../models/sanctionsSource.model');
const SanctionsEntry = require('../models/sanctionsEntry.model');

const OFAC_XML_URL = 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML';

const downloadAndProcessOFAC = async () => {
  try {
    console.log('🔄 Descargando lista OFAC (XML)...');

    // Obtener la última vez que descargamos
    const lastSource = await SanctionsSource.findOne({ name: 'OFAC' }).sort({ lastDownload: -1 });
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    if (lastSource && lastSource.lastDownload) {
      headers['If-Modified-Since'] = new Date(lastSource.lastDownload.getTime() - 60000).toUTCString();
    }

    const response = await axios.get(OFAC_XML_URL, {
      responseType: 'text',
      headers,
      validateStatus: status => status === 200 || status === 304
    });

    if (response.status === 304) {
      console.log('✅ Lista OFAC ya está actualizada (304 Not Modified).');
      return;
    }

    const xmlData = response.data;

    // 1. Hash para detectar cambios
    const hash = crypto.createHash('sha256').update(xmlData).digest('hex');

    // 2. Parse XML
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(xmlData);

    const list = parsed?.sdnList;
    if (!list || !list.sdnEntry) {
      throw new Error('Formato OFAC inválido: sdnEntry no encontrado');
    }

    // Fecha del documento
    let documentDate = new Date();
    if (list.publishInformation?.Publish_Date) {
      documentDate = new Date(list.publishInformation.Publish_Date);
    }

    // 3. Verificar si ya existe esta versión (Auditoría)
    const existingSource = await SanctionsSource.findOne({ name: 'OFAC', hash });
    if (existingSource) {
      console.log('✅ Lista OFAC ya está actualizada (mismo hash).');
      return;
    }

    console.log('🆕 Nueva versión OFAC detectada. Procesando...');

    const entries = Array.isArray(list.sdnEntry) ? list.sdnEntry : [list.sdnEntry];
    const bulkEntries = [];

    // 4. Mapeo de datos al array masivo
    for (const entry of entries) {
      try {
        const entityType = entry.sdnType === 'Individual' ? 'INDIVIDUAL' : 'ENTITY';
        const firstName = (entry.firstName || '').toUpperCase();
        const lastName = (entry.lastName || '').toUpperCase();

        const fullName = entityType === 'INDIVIDUAL'
          ? `${firstName} ${lastName}`.trim().toUpperCase()
          : lastName.toUpperCase();

        // --- Nacionalidad / Países ---
        const nationalitySet = new Set();

        // IDs
        const idsRaw = entry.idList?.id ? (Array.isArray(entry.idList.id) ? entry.idList.id : [entry.idList.id]) : [];
        idsRaw.forEach(id => { if (id.idCountry) nationalitySet.add(id.idCountry.toUpperCase()); });

        // Direcciones
        const addrsRaw = entry.addressList?.address ? (Array.isArray(entry.addressList.address) ? entry.addressList.address : [entry.addressList.address]) : [];
        addrsRaw.forEach(addr => { if (addr.country) nationalitySet.add(addr.country.toUpperCase()); });

        // Programas (Fallback)
        if (nationalitySet.size === 0 && entry.programList?.program) {
          const progsRaw = Array.isArray(entry.programList.program) ? entry.programList.program : [entry.programList.program];
          progsRaw.forEach(p => nationalitySet.add(p.toUpperCase()));
        }

        // --- Documentos ---
        const documents = idsRaw
          .filter(id => id.idNumber && id.idType && id.idType.toLowerCase() !== 'gender')
          .map(id => ({
            type: id.idType.toUpperCase(),
            number: String(id.idNumber).trim(),
            country: id.idCountry ? id.idCountry.toUpperCase() : null
          }));

        // --- Alias ---
        const aliases = [];
        if (entry.akaList?.aka) {
          const akaRaw = Array.isArray(entry.akaList.aka) ? entry.akaList.aka : [entry.akaList.aka];
          akaRaw.forEach(a => {
            const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
            if (name) aliases.push(name.toUpperCase());
          });
        }

        bulkEntries.push({
          source: 'OFAC',
          entityType,
          fullName,
          firstName,
          lastName,
          nationality: Array.from(nationalitySet),
          documents,
          aliases,
          remarks: entry.remarks || '',
          active: true
        });

      } catch (e) {
        console.error(`⚠️ Error en registro OFAC UID ${entry?.uid}:`, e.message);
      }
    }

    // 5. Operaciones de Base de Datos Atómicas    
    // A. Desactivar anteriores
    await SanctionsEntry.updateMany({ source: 'OFAC', active: true }, { active: false });

    // B. Inserción masiva (Rendimiento optimizado)
    if (bulkEntries.length > 0) {
      // Usamos insertMany con lean para mayor velocidad
      await SanctionsEntry.insertMany(bulkEntries);
    }

    // C. Guardar registro de Auditoría
    await SanctionsSource.create({
      name: 'OFAC',
      url: OFAC_XML_URL,
      documentDate,
      lastDownload: new Date(),
      hash,
      totalRecords: bulkEntries.length
    });

    console.log(`✅ Lista OFAC procesada: ${bulkEntries.length} registros insertados.`);

  } catch (error) {
    console.error('❌ Error crítico OFAC:', error.message);
    throw error;
  }
};

module.exports = { downloadAndProcessOFAC };