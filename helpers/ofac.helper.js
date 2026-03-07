const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const SanctionsSource = require('../models/sanctionsSource.model');
const SanctionsEntry = require('../models/sanctionsEntry.model');

const OFAC_XML_URL =
  'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML';

/** =====================================================================
 *  DESCARGAR Y PROCESAR LISTA OFAC (SDN.XML)
=========================================================================*/
const downloadAndProcessOFAC = async () => {
  try {
    console.log('🔄 Descargando lista OFAC (XML)...');

    const response = await axios.get(OFAC_XML_URL, { responseType: 'text' });
    const xmlData = response.data;

    // 🔐 Hash del documento
    const hash = crypto.createHash('sha256').update(xmlData).digest('hex');

    // 📄 Parse XML
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(xmlData);

    const list = parsed?.sdnList;
    if (!list || !list.sdnEntry) {
      throw new Error('Formato OFAC inválido: sdnEntry no encontrado');
    }

    // 📅 Fecha del documento
    let documentDate = new Date();
    if (list.publishInformation?.Publish_Date) {
      documentDate = new Date(list.publishInformation.Publish_Date);
    }

    // 🔍 Verificar si ya existe esta versión
    const existingSource = await SanctionsSource.findOne({
      name: 'OFAC',
      hash
    });

    if (existingSource) {
      console.log('✅ Lista OFAC ya actualizada');
      return;
    }

    // 🔴 Desactivar registros anteriores
    await SanctionsEntry.updateMany(
      { source: 'OFAC', active: true },
      { active: false }
    );

    const entries = Array.isArray(list.sdnEntry)
      ? list.sdnEntry
      : [list.sdnEntry];

    let total = 0;

    for (const entry of entries) {
      try {
        const entityType =
          entry.sdnType === 'Individual' ? 'INDIVIDUAL' : 'ENTITY';

        const firstName = entry.firstName || '';
        const lastName = entry.lastName || '';
        const fullName =
          entityType === 'INDIVIDUAL'
            ? `${firstName} ${lastName}`.trim()
            : lastName;

        /* =======================
           🌍 NACIONALIDAD / PAÍS
        ========================*/
        const nationalitySet = new Set();

        // 1️⃣ Desde documentos
        if (entry.idList?.id) {
          const ids = Array.isArray(entry.idList.id)
            ? entry.idList.id
            : [entry.idList.id];

          ids.forEach(id => {
            if (id.idCountry) {
              nationalitySet.add(id.idCountry.toUpperCase());
            }
          });
        }

        // 2️⃣ Desde dirección
        if (entry.addressList?.address) {
          const addresses = Array.isArray(entry.addressList.address)
            ? entry.addressList.address
            : [entry.addressList.address];

          addresses.forEach(addr => {
            if (addr.country) {
              nationalitySet.add(addr.country.toUpperCase());
            }
          });
        }

        // 3️⃣ Fallback: programas
        if (nationalitySet.size === 0 && entry.programList?.program) {
          const programs = Array.isArray(entry.programList.program)
            ? entry.programList.program
            : [entry.programList.program];

          programs.forEach(p => nationalitySet.add(p.toUpperCase()));
        }

        const nationality = Array.from(nationalitySet);

        /* =======================
           🆔 DOCUMENTOS
        ========================*/
        const documents = [];

        if (entry.idList?.id) {
          const ids = Array.isArray(entry.idList.id)
            ? entry.idList.id
            : [entry.idList.id];

          ids.forEach(id => {
            if (
              id.idNumber &&
              id.idType &&
              id.idType.toLowerCase() !== 'gender'
            ) {
              documents.push({
                type: id.idType.toUpperCase(),
                number: String(id.idNumber),
                country: id.idCountry ? id.idCountry.toUpperCase() : null
              });
            }
          });
        }

        /* =======================
           🧩 ALIAS
        ========================*/
        const aliases = [];
        if (entry.akaList?.aka) {
          const akaList = Array.isArray(entry.akaList.aka)
            ? entry.akaList.aka
            : [entry.akaList.aka];

          akaList.forEach(a => {
            const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
            if (name) aliases.push(name.toUpperCase());
          });
        }

        await SanctionsEntry.create({
          source: 'OFAC',
          entityType,
          fullName: fullName.toUpperCase(),
          firstName: firstName.toUpperCase(),
          lastName: lastName.toUpperCase(),
          nationality,
          documents,
          aliases,
          remarks: entry.remarks || '',
          active: true
        });

        total++;
      } catch (e) {
        console.error(
          '⚠️ Error procesando registro OFAC:',
          entry?.uid,
          e.message
        );
      }
    }

    // 📦 Metadata
    await SanctionsSource.create({
      name: 'OFAC',
      url: OFAC_XML_URL,
      documentDate,
      lastDownload: new Date(),
      hash,
      totalRecords: total
    });

    console.log(`✅ Lista OFAC procesada correctamente: ${total} registros`);
  } catch (error) {
    console.error('❌ Error procesando lista OFAC:', error.message);
  }
};

module.exports = {
  downloadAndProcessOFAC
};
