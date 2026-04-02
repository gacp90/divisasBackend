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

        if (transaccionPopulated.transaccion === 'Venta') {
            fechaIni = empresa.resolucionV.fechaIni.toISOString().slice(0, 10).replace(' ', ' ');
            fechaExp = empresa.resolucionV.fechaExp.toISOString().slice(0, 10).replace(' ', ' ');
            AutNumAutorizacion  = empresa.resolucionV.numberRes;
            AutFechaInicio  = fechaIni;
            AutFechaFinal   = fechaExp
            AutPrefijo  = empresa.resolucionV.prefijo;
            AutSecuenciaInicio  = empresa.resolucionV.desde;
            AutSecuenciaFinal   = empresa.resolucionV.hasta;
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
                    "EmiPrefijo": empresa.prefijo
                },
                "CompradorFactura": {
                    "CompradorTipoPersona": cliente.type || "2",
                    "CompradorTipoIdentificacion": cliente.typeid || "13",
                    "CompradorIdentificacion": cliente.numberid,
                    "CompradorPrimerNombre": cliente.name,
                    "CompradorApellidos": cliente.lastname,
                    "CompradorNombreCompleto": `${cliente.name} ${cliente.lastname}`,
                    "CompradorPais": pais.code.slice(0, 2) || "CO",
                    "CompradorNombrePais": pais.name || "Colombia",
                    "CompradorDepartamento": departamento.name || "NORTE DE SANTANDER",
                    "CompradorCodDepartamento": departamento.code || "54",
                    "CompradorCiudad": ciudad.name || "CUCUTA",
                    "CompradorCodCiudad": departamento.code + ciudad.code || "54001",
                    "CompradorCodPostal": ciudad.zip || "54001",
                    "CompradorDireccion": cliente.address || "",
                    "CompradorEnviarCorreo": true,
                    "CompradorRespFiscal": cliente.respFiscal || "R-99-PN",
                    "CompradorCorreoElectronico": cliente.email || empresa.email.toLowerCase()
                },
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

module.exports = {
    enviarFacturaConexus
};