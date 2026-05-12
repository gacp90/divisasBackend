const axios = require('axios');

const getSourcesQuery = async (req, res) => {
  try {
    const microserviceUrl = `${process.env.SANCTIONS_MICROSERVICE_URL.replace('/sanctions', '')}/sources/query`;
    
    const response = await axios.post(
      microserviceUrl,
      req.body,
      {
        headers: { 'x-api-key': process.env.SANCTIONS_API_KEY }
      }
    );

    return res.json(response.data);
  } catch (error) {
    console.error('Error proxying sources/query:', error.message);
    return res.status(500).json({
      ok: false,
      msg: 'Error inesperado, porfavor intente nuevamente'
    });
  }
};

module.exports = { getSourcesQuery };