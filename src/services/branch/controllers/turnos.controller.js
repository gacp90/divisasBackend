const { response } = require('express');

const getTurnoModel = require('../models/turnos.model');
const getInventoryModel = require('../models/inventory.model');
const getUserModel = require('../../company/models/users.model');

/** ======================================================================
 *  GET QUERY
=========================================================================*/
const getTurnosQuery = async(req, res) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Turno = getTurnoModel(req.branchDb);
        const User = getUserModel(req.branchDb);
        const Inventory = getInventoryModel(req.branchDb); // FIx: needed for population

        const { desde, hasta, sort, ...query } = req.body;

        const [turnos, total] = await Promise.all([
            Turno.find(query)
            .populate('user')
            .populate('saldos.moneda')
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Turno.countDocuments(query)
        ])

        res.json({
            ok: true,
            turnos,
            total
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado: ' + (error.message || error)
        });

    }


};

/** =====================================================================
 *  GET ID
=========================================================================*/
const getTurnoId = async(req, res = response) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Turno = getTurnoModel(req.branchDb);
        const User = getUserModel(req.branchDb);
        const turid = req.params.id;

        const turnoDB = await Turno.findById(turid)
            .populate('user')
            .populate('saldos.moneda')
        if (!turnoDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este turno, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            turno: turnoDB
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });
    }

};

/** =====================================================================
 *  CREATE
=========================================================================*/
const createTurno = async (req, res = response) => {
    const uid = req.uid;

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Turno = getTurnoModel(req.branchDb);
        const User = getUserModel(req.branchDb);
        const Inventory = getInventoryModel(req.branchDb);
        const { saldos } = req.body;
        
        let userDB = await User.findById(uid).populate('turno');
        
        if (!userDB) {
            // Sincronizar desde la base de datos global de la empresa
            if (req.companyDb) {
                const UserCompany = getUserModel(req.companyDb);
                const userC = await UserCompany.findById(uid);
                
                if (userC) {
                    userDB = new User(userC.toObject());
                    await userDB.save();
                } else {
                    return res.status(404).json({ ok: false, msg: 'Usuario no encontrado en la empresa' });
                }
            } else {
                return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
            }
        }

        if (userDB.turno?.abierto) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya tienes un turno abierto'
            });
        }

        // 1. Obtener la hora límite desde la configuración de la sucursal (Empresa)
        let horaLimiteStr = '20:00'; // Default 8 PM
        if (req.branchDb) {
            const EmpresaModel = req.branchDb.models.Empresas;
            if (EmpresaModel) {
                const empresa = await EmpresaModel.findOne({});
                if (empresa && empresa.horaCierreTurno) {
                    horaLimiteStr = empresa.horaCierreTurno;
                }
            }
        }

        // 2. Verificar la hora actual en Bogotá
        const dateEnBogota = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Bogota"}));
        const hh = dateEnBogota.getHours().toString().padStart(2, '0');
        const mm = dateEnBogota.getMinutes().toString().padStart(2, '0');
        const currentHoraBogota = `${hh}:${mm}`;

        // Si la hora actual superó la hora límite O es madrugada (ej. antes de las 5 AM)
        if (currentHoraBogota >= horaLimiteStr || currentHoraBogota < '05:00') {
            let autorizado = userDB.autorizadoTurnoExtra;
            if (req.companyDb) {
                const UserCompanyModel = getUserModel(req.companyDb);
                const userC = await UserCompanyModel.findById(uid);
                if (userC && userC.autorizadoTurnoExtra) autorizado = true;
            }

            if (userDB.role !== 'ADMIN' && userDB.role !== 'SUPERVISOR' && !autorizado) {
                return res.status(403).json({
                    ok: false,
                    msg: `No puedes abrir turno en este horario (Límite: ${horaLimiteStr}). Solicita autorización al administrador.`
                });
            }
        }

        // VALIDAR SALDO DISPONIBLE EN INVENTARIO
        const inventariosParaActualizar = [];

        for (const saldo of saldos) {
            // SALDO DE APERTURA
            const montoInicial = Number(saldo.montoInicial) || 0;
            
            if (montoInicial > 0) {
                const inventario = await Inventory.findById(saldo.moneda);
                
                if (!inventario) {
                    return res.status(404).json({ ok: false, msg: 'Una de las monedas solicitadas no existe en el inventario' });
                }

                // VALIDAMOS SI TENEMOS EL SALDO SUFICIENTE
                if (inventario.disponible < montoInicial) {
                    return res.status(400).json({ 
                        ok: false, 
                        msg: `No hay suficiente saldo disponible en bóveda. Solicitas ${montoInicial}, pero solo hay ${inventario.disponible}${inventario.code}.` 
                    });
                }
                
                inventario.disponible -= montoInicial;
                inventariosParaActualizar.push(inventario);
            }
        }

        // CREAMOS EL TURNO
        const turno = new Turno({
            ...req.body,
            user: uid,
            abierto: true,
            saldos
        });

        // Promise ALL
        const promesasDeGuardado = [
            turno.save(),
            userDB.updateOne({ turno: turno._id, activeShiftBranch: req.headers['x-branch'], autorizadoTurnoExtra: false }),
            ...inventariosParaActualizar.map(inv => inv.save())
        ];
        
        // UPDATE COMPANY DB PARA GLOBAL TRACKING DE CAJEROS
        if (req.companyDb) {
            const UserCompany = getUserModel(req.companyDb);
            await UserCompany.updateOne({ _id: uid }, { turno: turno._id, activeShiftBranch: req.headers['x-branch'], autorizadoTurnoExtra: false });
        }

        
        const [turnoGuardado] = await Promise.all(promesasDeGuardado);
        const turnoNew = await Turno.findById(turnoGuardado._id)
            .populate('user')
            .populate('saldos.moneda');

        res.status(201).json({
            ok: true,
            turno: turnoNew
        });

    } catch (error) {
        console.error('Error en createTurno:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear el turno, hable con el administrador'
        });
    }
};

/** =====================================================================
 *  UPDATE
=========================================================================*/
const updateTurno = async(req, res = response) => {

    const turid = req.params.id;

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Turno = getTurnoModel(req.branchDb);

        // SEARCH
        const turnoDB = await Turno.findById(turid);
        if (!turnoDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun turno con este ID'
            });
        }
        // SEARCH

        if (!turnoDB.abierto) {
            return res.status(403).json({
                ok: false,
                msg: "Inmutabilidad Hist�rica: No puedes editar un turno que ya ha sido cerrado"
            });
        }

        // VALIDATE
        const {...campos } = req.body;

        // SANITIZACION DE INMUTABILIDAD FINANCIERA
        delete campos.saldos;
        delete campos.totalEntradasCOP;
        delete campos.totalSalidasCOP;

        // UPDATE
        const turnoUpdate = await Turno.findByIdAndUpdate(turid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            turno: turnoUpdate
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

};

/** =====================================================================
 *  CERRAR TURNO
=========================================================================*/
const cerrarTurno = async (req, res = response) => {
    
    const { turnoId, arqueo } = req.body;
    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Turno = getTurnoModel(req.branchDb);
        const Inventory = getInventoryModel(req.branchDb);
        const turno = await Turno.findById(turnoId);
        
        if (!turno) {
            return res.status(404).json({ ok: false, msg: 'Turno no encontrado' });
        }

        if (!turno.abierto) {
            return res.status(400).json({ ok: false, msg: 'El turno ya se encuentra cerrado' });
        }

        for (const item of arqueo) {
            const idx = turno.saldos.findIndex(s => String(s.moneda) === String(item.monedaId));            
            
            if (idx !== -1) {
                turno.saldos[idx].saldoFisico = item.fisico;
                turno.saldos[idx].diferencia = item.diferencia;
                
                const inventario = await Inventory.findById(item.monedaId);
                
                if (inventario) {
                    
                    if (!inventario.disponible) {inventario.disponible = 0;}

                    inventario.disponible += item.fisico;
                    await inventario.save();
                }
            }
        }

        // 2. Cerramos formalmente el turno
        turno.abierto = false;
        turno.close = Date.now();

        await turno.save();

        const UserBranch = getUserModel(req.branchDb);
        await UserBranch.updateOne({ _id: turno.user }, { activeShiftBranch: null, turno: null });
        
        if (req.companyDb) {
            const UserCompany = getUserModel(req.companyDb);
            await UserCompany.updateOne({ _id: turno.user }, { activeShiftBranch: null, turno: null });
        }

        res.json({
            ok: true,
            msg: 'Turno cerrado con éxito',
            turno
        });

    } catch (error) {
        console.error('Error al cerrar turno:', error);
        res.status(500).json({ ok: false, msg: 'Error inesperado al procesar el cierre' });
    }
};


// EXPORTS
module.exports = {
    getTurnosQuery,
    createTurno,
    updateTurno,
    getTurnoId,
    cerrarTurno
};