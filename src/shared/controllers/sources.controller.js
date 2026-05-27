const SanctionsSource = require('../../services/global/models/sanctionsSource.model');

const getSourcesQuery = async(req, res) => {
    try {
        const { desde, hasta, sort, ...query } = req.body;

        const [sources, total] = await Promise.all([
            SanctionsSource.find(query)
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            SanctionsSource.countDocuments(query)
        ])

        res.json({
            ok: true,
            sources,
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

module.exports = { getSourcesQuery };