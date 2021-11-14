const fastify = require('fastify');
const RandomGoFood = require('./RandomGoFood');

function init() {
    const app = fastify({ logger: { level: 'info' } });

    app.get('/', (req, reply) => reply.send({
        version: '1.0.0',
        url: 'https://gofood.co.id/gofood/web/v1/restaurants',
        path: ['random', 'merchant/:id']
    }));

    app.get('/random', async (req, reply) => {
        const { lat, long } = req.query;

        if (!lat || !long) return reply.code(406).send({ error: 'Provide lat and long in query' });

        const food = new RandomGoFood(lat, long);
        const merchants = await food.fastestMerchants();

        reply.send(merchants);
    });

    app.get('/merchant/:id', async (req, reply) => {
        const { id } = req.params;
        const detail = await RandomGoFood.detailMerchants(id);

        reply.send(detail);
    });

    return app;
}

if (require.main === module) {
    // called directly i.e. "node app"
    init().listen(3001, (err) => {
        if (err) console.error(err);
    });
} else {
    // required as a module => executed on aws lambda
    module.exports = init;
}