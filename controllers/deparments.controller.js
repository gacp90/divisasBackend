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

    let { code } = req.body;

    code = code.trim();

    try {

        const validateDepartment = await Department.findOne({ code });

        if (validateDepartment) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existe un departamento con este numero de codigo'
            });
        }

        const department = new Department(req.body);

        department.code = code;

        // SAVE
        await department.save();

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
            const validateCode = await City.findOne({ code });
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
    getDepartmentId
};