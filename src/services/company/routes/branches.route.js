const { Router } = require('express');
const { getBranches } = require('../controllers/branches.controller');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');

const router = Router();

router.use(validarJWT);

router.get('/', getBranches);

module.exports = router;
