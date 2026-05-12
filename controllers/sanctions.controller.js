const axios = require('axios');

const getSanctionsMicroserviceConfig = () => {
  return {
    headers: {
      'x-api-key': process.env.SANCTIONS_API_KEY
    }
  };
};

const checkClient = async (req, res) => {
  try {
    const { document, fullName } = req.body;

    if (!document && !fullName) {
      return res.status(400).json({
        ok: false,
        msg: 'Documento o nombre son requeridos'
      });
    }

    const microserviceUrl = `${process.env.SANCTIONS_MICROSERVICE_URL}/check`;
    
    const response = await axios.post(
      microserviceUrl,
      { document, fullName },
      getSanctionsMicroserviceConfig()
    );

    return res.json(response.data);

  } catch (error) {
    console.error('Error en checkClient contra microservicio:', error.message);
    res.status(500).json({
      ok: false,
      msg: 'Error conectando al servicio global de validación de listas'
    });
  }
};

const getStatus = async (req, res) => {
  try {
    const microserviceUrl = `${process.env.SANCTIONS_MICROSERVICE_URL}/status`;
    
    const response = await axios.get(
      microserviceUrl,
      getSanctionsMicroserviceConfig()
    );

    return res.json(response.data);

  } catch (error) {
    console.error('Error obteniendo estado del microservicio:', error.message);
    res.status(500).json({
      ok: false,
      msg: 'Error obteniendo estado de listas restrictivas'
    });
  }
};

module.exports = {
  checkClient,
  getStatus
};
