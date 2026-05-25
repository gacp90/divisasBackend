const { response } = require('express');

const Department = require('../models/departments.model');

/** ======================================================================
 *  GET DEPARTMENT
=========================================================================*/
const getDepartmentsQuery = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [departments, total] = await Promise.all([
            Department.find(query)
            .populate('pais')
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Department.countDocuments({ status: true })
        ])

        res.json({
            ok: true,
            departments,
            total
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
 *  GET DEPARTMENT ID
=========================================================================*/
const getDepartmentId = async(req, res = response) => {

    try {
        const depid = req.params.id;

        const departmentDB = await Department.findById(depid);
        if (!departmentDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este departamento, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            department: departmentDB
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
 *  CREATE DEPARTMENT
=========================================================================*/
const createDepartment = async(req, res = response) => {

    let { code, pais, name } = req.body;

    code = code.trim();

    try {

        const validateDepartment = await Department.findOne({ code, pais });

        if (validateDepartment) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existe un departamento con este numero de codigo'
            });
        }

        const departmentNew = new Department(req.body);

        departmentNew.code = code;
        departmentNew.name = name.trim().toUpperCase();

        // SAVE
        await departmentNew.save();

        const department = await Department.findById(departmentNew._id);



        res.json({
            ok: true,
            department
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
 *  CREATE EXCEL
=========================================================================*/
const createDepartamentostExcel = async(req, res = response) => {

    try {

        let { pais, ...departamentos } = req.body;

        if (departamentos.departamentos.length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'Lista de departamentos esta vacia, verifique he intene nuevamente'
            });
        }

        let i = 0;
        for (const departamento of departamentos.departamentos) {
            
            const validateDepartamento = await Department.findOne({ code: departamento.code, pais });
            if (!validateDepartamento) {                
                const departmentNew = new Department(departamento);
                departmentNew.pais = pais;
    
                // SAVE
                await departmentNew.save();
                i++;
            }
        }

        res.json({
            ok: true,
            total: i
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
 *  UPDATE DEPARTMETN
=========================================================================*/
const updateDepartment = async(req, res = response) => {

    const depid = req.params.id;

    try {

        // SEARCH
        const departmentDB = await Department.findById(depid);
        if (!departmentDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun departamento con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        const { code, ...campos } = req.body;
        if (departmentDB.code !== code) {
            const validateCode = await Department.findOne({ code });
            if (validateCode) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un departamento con este codigo...'
                });
            }

            campos.code = code.trim();
        }

        // UPDATE
        const departmentUpdate = await Department.findByIdAndUpdate(depid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            department: departmentUpdate
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

};


// EXPORTS
module.exports = {
    getDepartmentsQuery,
    createDepartment,
    updateDepartment,
    getDepartmentId,
    createDepartamentostExcel
};