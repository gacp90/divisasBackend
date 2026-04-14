const axios = require('axios');
const Empresa = require('../models/empresa.model');
const Pais = require('../models/pais.model');
const Departamento = require('../models/departments.model');
const Ciudad = require('../models/cities.model');

const enviarFacturaConexus = async (transaccionPopulated) => {
    try {
        
        const empresa = await Empresa.findOne(); 
        
        if (!empresa) {
            throw new Error('Configuración de empresa no encontrada');
        }

        const cliente = transaccionPopulated.client;

        // NOTAS
        let lsnotas = [];
        lsnotas.push({"DescripcionCabecera": `Debida deligencia: ${transaccionPopulated.typetransaction || 'Simplificada'}`});
        lsnotas.push({"DescripcionCabecera": `Origen de fondos: ${cliente.origin || 'ahorros'}`});
        lsnotas.push({ "DescripcionCabecera": `Destino de fondos: ${cliente.destination || 'ahorros'}`});

        // SET DEPART AND CITY CODES
        const pais = await Pais.findOne({ name: cliente.citizenship });        
        const departamento = await Departamento.findOne({ code: cliente.department, pais: pais._id });
        const ciudad = await Ciudad.findOne({ code: cliente.city, department: departamento._id });


        // SET FECHAS
        const fechaActual = new Date();
        const fechaFactura = fechaActual.toISOString().slice(0, 19).replace('T', ' ');
        const fechaVencimiento = fechaFactura.split(' ')[0];

        // SET VARIABES DE CODIGO DE OPERACION Y NUMERO DE DOCUMENTO
        const codOperacion = transaccionPopulated.transaccion === 'Compra' ? "15" : "16";
        const numeroDocumento = `${transaccionPopulated.prefix}${transaccionPopulated.number}`;
        const totalFactura = transaccionPopulated.total.toFixed(2);
        const nit = empresa.nit.split('-')[0];
        const dv = empresa.nit.split('-')[1];        

        // SETEAMOS EL CLIENTE O BENEFICIARIO DEPENDIENDO DE SI ES PERSONA NATURAL O JURIDICA
        let compradorFactura = {
            "CompradorTipoIdentificacion": cliente.typeid,
            "CompradorIdentificacion": cliente.numberid,
            "CompradorPais": pais.code.slice(0, 2) || "CO",
            "CompradorNombrePais": pais.name || "Colombia",
            "CompradorDepartamento": departamento.name || "NORTE DE SANTANDER",
            "CompradorCodDepartamento": departamento.code || "54",
            "CompradorCiudad": ciudad.name || "CUCUTA",
            "CompradorCodCiudad": departamento.code + ciudad.code || "54001",
            "CompradorCodPostal": ciudad.zip || "54001", 
            "CompradorDireccion": cliente.direccion,
            "CompradorEnviarCorreo": true,
            "CompradorTipoRegimen": cliente.regimen || "49",
            "CompradorRespFiscal": cliente.respFiscal || "R-99-PN",
            "CompradorCorreoElectronico": cliente.email || empresa.email.toLowerCase()
        };

        if (cliente.type === '1' || cliente.razon) {
                
            compradorFactura.CompradorTipoPersona = "1";
            compradorFactura.CompradorRazonSocial = cliente.razon;
            
            // DVB (si existe, lo agregamos al payload)
            if (cliente.dvb) {
                compradorFactura.CompradorDVIdentificacion = cliente.dvb;
            }

            // AGREGAMOS EL BENEFICIARIO SI EL CLIENTE TIENE REPRESENTANTE LEGAL
            if (cliente.representante) {
                compradorFactura.Beneficiario = {
                    "BeneficiarioTipoIdentificacion": cliente.representante.typeid || "13",
                    "BeneficiarioIdentificacion": cliente.representante.numberid,
                    "BeneficiarioNombres": cliente.representante.name,
                    "BeneficiarioApellidos": cliente.representante.lastname
                };
            }

        } else {
            // Es una PERSONA NATURAL
            compradorFactura.CompradorTipoPersona = "2";
            compradorFactura.CompradorPrimerNombre = cliente.name;
            compradorFactura.CompradorApellidos = cliente.lastname;
            compradorFactura.CompradorNombreCompleto = `${cliente.name} ${cliente.lastname}`.trim();
        }

        // MAP DE LOS ITEMS DE LA FACTURA
        const LsDetalle = transaccionPopulated.items.map((item, index) => {
            return {
                "DetFacConsecutivo": (index + 1).toString(),
                "Codigo": item.moneda.code,
                "CodigoEstandar": "999",
                "Codificacion": "999",
                "Descripcion": `${transaccionPopulated.transaccion} de Divisas ${item.moneda.code}`,
                "Cantidad": item.monto.toFixed(2),
                "UnidadMedida": "94",
                "PrecioUnitario": item.tasa.toFixed(2),
                "PrecioSinImpuestos": (item.monto * item.tasa).toFixed(2),
                "PrecioTotal": (item.monto * item.tasa).toFixed(2)
            };
        });

        // AUTORIZACION DE FACTURA EN CONEXUS SI ES RES DE COMPRA O VENTA DEPENDIENDO DEL TIPO DE TRANSACCION
        let fechaIni = empresa.resolucionC.fechaIni.toISOString().slice(0, 10).replace(' ', ' ');
        let fechaExp = empresa.resolucionC.fechaExp.toISOString().slice(0, 10).replace(' ', ' ');
        let AutNumAutorizacion  = empresa.resolucionC.numberRes;
        let AutFechaInicio  = fechaIni;
        let AutFechaFinal   = fechaExp
        let AutPrefijo  = empresa.resolucionC.prefijo;
        let AutSecuenciaInicio  = empresa.resolucionC.desde;
        let AutSecuenciaFinal   = empresa.resolucionC.hasta;
        let prefijo = empresa.resolucionC.prefijo;

        if (transaccionPopulated.transaccion === 'Venta') {
            fechaIni = empresa.resolucionV.fechaIni.toISOString().slice(0, 10).replace(' ', ' ');
            fechaExp = empresa.resolucionV.fechaExp.toISOString().slice(0, 10).replace(' ', ' ');
            AutNumAutorizacion  = empresa.resolucionV.numberRes;
            AutFechaInicio  = fechaIni;
            AutFechaFinal   = fechaExp
            AutPrefijo  = empresa.resolucionV.prefijo;
            AutSecuenciaInicio  = empresa.resolucionV.desde;
            AutSecuenciaFinal   = empresa.resolucionV.hasta;
            prefijo = empresa.resolucionV.prefijo;
        }

        // PAYLOAD PARA CONEXUS
        const dataFactura = {
            "Documento": {
                "SoftwareSeguridad": {
                    "TipoDocumento": "FAC",
                    "GuidEmpresa": empresa.conexus.GuidEmpresa,
                    "GuidOrigen": empresa.conexus.GuidOrigen,
                    "HashSeguridad": empresa.conexus.HashSeguridad,
                    "NumeroDocumento": numeroDocumento,
                    "CodigoErp": "1000",
                    "ClaveTecnica": empresa.conexus.ClaveTecnica
                },
                "EmisorData": {
                    "EmiTipoPersona": "1",
                    "EmiTipoIdentificacion": "31",
                    "EmiIdentificacion": nit,
                    "EmiDVIdentificacion": dv || "5",
                    "EmiPrefijo": prefijo
                },
                "CompradorFactura": compradorFactura,
                "EncabezadoData": {
                    "FacTipoFactura": "01",
                    "FacCodOperacion": codOperacion,
                    "FacFechaHoraFactura": fechaFactura,
                    "FacFechaVencimiento": fechaVencimiento
                },
                "InfoMonetarioData": {
                    "FacCodMoneda": "COP",
                    "FacTotalImporteBruto": totalFactura,
                    "FacTotalBaseImponible": totalFactura,
                    "FacTotalBrutoMasImp": totalFactura,
                    "FacTotalFactura": totalFactura,
                    "FacTotalAnticipos": "0.00",
                    "FacTotalCargos": "0.00",
                    "FacTotalDescuentos": "0.00"
                },
                "DebidaDiligencia": {
                    "CodDiligencia": "01" //TODO: Ojo debemso de mapear esto
                },
                "LsDetalle": LsDetalle,
                "LsImpuestos": [
                    {
                        "CodigoImpuesto": "01",
                        "EsRetencionImpuesto": "false",
                        "BaseImponible": totalFactura,
                        "Porcentaje": "0.00",
                        "ValorImpuesto": "0.00",
                        "Redondeo": "0.00"
                    }
                ],
                "LsDetalleImpuesto": [
                    {
                        "Secuencia": "1",
                        "CodigoImpuesto": "01",
                        "EsRetencionImpuesto": "false",
                        "BaseImponible": totalFactura,
                        "Porcentaje": "0.00",
                        "ValorImpuesto": "0.00",
                        "Redondeo": "0.00"
                    }
                ],
                "lsCargos": [],
                "LsDetalleCargos": [],
                "lsAnticipos": [],
                "LsFormaPago": [
                    {
                        "FacMetodoPago": "1",
                        "FacFormaPago": "10",
                        "FacVencimientoFac": fechaVencimiento
                    }
                ],
                "lsNotas": lsnotas,
                "AutorizacionFactura": {
                    "AutNumAutorizacion": AutNumAutorizacion,
                    "AutFechaInicio": AutFechaInicio,
                    "AutFechaFinal": AutFechaFinal,
                    "AutPrefijo": AutPrefijo,
                    "AutSecuenciaInicio": AutSecuenciaInicio,
                    "AutSecuenciaFinal": AutSecuenciaFinal
                }
            }
        };

        // ENVIO DE FACTURA A CONEXUS
        const urlConexus = 'https://demo.conexusit.com/ServicioWebAPI/Service.svc/SetDocument';
        
        const response = await axios.post(urlConexus, dataFactura, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Retornar la respuesta
        return {
            ok: true,
            data: response.data
        };

    } catch (error) {
        console.error('Error al enviar factura a Conexus:', error.response?.data || error.message);
        return {
            ok: false,
            msg: error.response?.data || error.message
        };
    }
};

/** =====================================================================
 *  ENVIAR NOTA DE CRÉDITO A CONEXUS
=========================================================================*/
const enviarNotaCreditoConexus = async (transaccionDevolucion, transaccionOriginal) => {
    try {
        const empresa = await Empresa.findOne(); 
        
        if (!empresa) {
            throw new Error('Configuración de empresa no encontrada');
        }

        // El cliente sigue siendo el mismo de la transacción que estamos anulando
        const cliente = transaccionDevolucion.client;

        // NOTAS
        let lsnotas = [];
        lsnotas.push({"DescripcionCabecera": `Anulación de transacción original: ${transaccionOriginal.prefix}${transaccionOriginal.number}`});

        // SET DEPART AND CITY CODES
        const pais = await Pais.findOne({ name: cliente.citizenship });        
        const departamento = await Departamento.findOne({ code: cliente.department, pais: pais._id });
        const ciudad = await Ciudad.findOne({ code: cliente.city, department: departamento._id });

        // SET FECHAS PARA LA NOTA DE CRÉDITO
        const fechaActual = new Date();
        const fechaNC = fechaActual.toISOString().slice(0, 19).replace('T', ' ');
        const fechaVencimientoNC = fechaNC.split(' ')[0];

        // FECHA DE LA FACTURA ORIGINAL
        // Ajusta "fechaC" si en tu modelo la fecha de creación se llama "fecha"
        const fechaOriginal = transaccionOriginal.fechaC ? transaccionOriginal.fechaC.toISOString().slice(0, 19).replace('T', ' ') : fechaNC;

        // SET VARIABLES DEL DOCUMENTO
        const numeroDocumentoNC = `${transaccionDevolucion.prefix}${transaccionDevolucion.number}`; // Ej: NC15
        const totalFactura = transaccionDevolucion.total.toFixed(2);
        const nit = empresa.nit.split('-')[0];
        const dv = empresa.nit.split('-')[1];        

        // SETEAMOS EL COMPRADOR (Igual que en la factura)
        let compradorFactura = {
            "CompradorTipoIdentificacion": cliente.typeid,
            "CompradorIdentificacion": cliente.numberid,
            "CompradorPais": pais.code.slice(0, 2) || "CO",
            "CompradorNombrePais": pais.name || "Colombia",
            "CompradorDepartamento": departamento.name || "NORTE DE SANTANDER",
            "CompradorCodDepartamento": departamento.code || "54",
            "CompradorCiudad": ciudad.name || "CUCUTA",
            "CompradorCodCiudad": departamento.code + ciudad.code || "54001",
            "CompradorCodPostal": ciudad.zip || "54001", 
            "CompradorDireccion": cliente.direccion,
            "CompradorEnviarCorreo": true,
            "CompradorTipoRegimen": cliente.regimen || "49",
            "CompradorRespFiscal": cliente.respFiscal || "R-99-PN",
            "CompradorCorreoElectronico": cliente.email || empresa.email.toLowerCase()
        };

        if (cliente.type === '1' || cliente.razon) {
            compradorFactura.CompradorTipoPersona = "1";
            compradorFactura.CompradorRazonSocial = cliente.razon;
            if (cliente.dvb) compradorFactura.CompradorDVIdentificacion = cliente.dvb;
        } else {
            compradorFactura.CompradorTipoPersona = "2";
            compradorFactura.CompradorPrimerNombre = cliente.name;
            compradorFactura.CompradorApellidos = cliente.lastname;
            compradorFactura.CompradorNombreCompleto = `${cliente.name} ${cliente.lastname}`.trim();
        }

        // MAP DE LOS ITEMS (Se devuelven exactamente los mismos items)
        const LsDetalle = transaccionDevolucion.items.map((item, index) => {
            return {
                "DetFacConsecutivo": (index + 1).toString(),
                "Codigo": item.moneda.code,
                "CodigoEstandar": "999",
                "Codificacion": "999",
                "Descripcion": `Anulación de ${transaccionDevolucion.transaccion} de Divisas ${item.moneda.code}`,
                "Cantidad": item.monto.toFixed(2),
                "UnidadMedida": "94",
                "PrecioUnitario": item.tasa.toFixed(2),
                "PrecioSinImpuestos": (item.monto * item.tasa).toFixed(2),
                "PrecioTotal": (item.monto * item.tasa).toFixed(2)
            };
        });

        // NOTA: Para las NC, la DIAN no exige una resolución formal como en las facturas, 
        // pero Conexus puede requerir el bloque. Enviamos la misma resolución de la factura original.
        let resolucion = transaccionDevolucion.transaccion === 'Venta' ? empresa.resolucionV : empresa.resolucionC;

        // PAYLOAD PARA CONEXUS (NOTA DE CRÉDITO)
        const dataNotaCredito = {
            "Documento": {
                "SoftwareSeguridad": {
                    "TipoDocumento": "NCR", // <--- CAMBIO IMPORTANTE: NCR
                    "GuidEmpresa": empresa.conexus.GuidEmpresa,
                    "GuidOrigen": empresa.conexus.GuidOrigen,
                    "HashSeguridad": empresa.conexus.HashSeguridad,
                    "NumeroDocumento": numeroDocumentoNC,
                    "CodigoErp": "1000",
                    "ClaveTecnica": empresa.conexus.ClaveTecnica
                },
                "EmisorData": {
                    "EmiTipoPersona": "1",
                    "EmiTipoIdentificacion": "31",
                    "EmiIdentificacion": nit,
                    "EmiDVIdentificacion": dv || "5"
                    // NOTA: Si rechaza por prefijo, agrega "EmiPrefijo": "NC"
                },
                "CompradorFactura": compradorFactura,
                "EncabezadoData": {
                    "FacTipoFactura": "01", // Mantenemos 01 o 91 según el estándar, el JSON muestra 01
                    "FacCodOperacion": "22", // <--- CAMBIO: Operación para NC
                    "FacFechaHoraFactura": fechaNC,
                    "FacFechaVencimiento": fechaVencimientoNC
                },
                // ==========================================================
                // BLOQUE NUEVO Y OBLIGATORIO PARA NOTAS DE CRÉDITO
                // ==========================================================
                "ReferenciaFactura": {
                    "ConceptoNota": "2", // Código DIAN: 2 = Anulación de factura electrónica
                    "DescNatCorreccion": "Anulación de la operación comercial",
                    "NumeroFactura": `${transaccionOriginal.prefix}${transaccionOriginal.number}`,
                    "CufeFactura": transaccionOriginal.conexus?.CodigoTransaccion || "",
                    "FechaFactura": fechaOriginal
                },
                // ==========================================================
                "InfoMonetarioData": {
                    "FacCodMoneda": "COP",
                    "FacTotalImporteBruto": totalFactura,
                    "FacTotalBaseImponible": totalFactura,
                    "FacTotalBrutoMasImp": totalFactura,
                    "FacTotalFactura": totalFactura,
                    "FacTotalAnticipos": "0.00",
                    "FacTotalCargos": "0.00",
                    "FacTotalDescuentos": "0.00"
                },
                "LsDetalle": LsDetalle,
                "LsImpuestos": [
                    {
                        "CodigoImpuesto": "01",
                        "EsRetencionImpuesto": "false",
                        "BaseImponible": totalFactura,
                        "Porcentaje": "0.00",
                        "ValorImpuesto": "0.00",
                        "Redondeo": "0.00"
                    }
                ],
                "LsDetalleImpuesto": [
                    {
                        "Secuencia": "1",
                        "CodigoImpuesto": "01",
                        "EsRetencionImpuesto": "false",
                        "BaseImponible": totalFactura,
                        "Porcentaje": "0.00",
                        "ValorImpuesto": "0.00",
                        "Redondeo": "0.00"
                    }
                ],
                "lsCargos": [],
                "LsDetalleCargos": [],
                "lsAnticipos": [],
                "LsFormaPago": [
                    {
                        "FacMetodoPago": "1",
                        "FacFormaPago": "10",
                        "FacVencimientoFac": fechaVencimientoNC
                    }
                ],
                "lsNotas": lsnotas
            }
        };

        console.log(JSON.stringify(dataNotaCredito));
        

        const urlConexus = 'https://demo.conexusit.com/ServicioWebAPI/Service.svc/SetDocument';
        
        const response = await axios.post(urlConexus, dataNotaCredito, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return {
            ok: true,
            data: response.data
        };

    } catch (error) {
        console.error('Error al enviar Nota de Crédito a Conexus:', error.response?.data || error.message);
        return {
            ok: false,
            msg: error.response?.data || error.message
        };
    }
};

module.exports = {
    enviarFacturaConexus,
    enviarNotaCreditoConexus
};