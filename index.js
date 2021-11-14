const express = require('express');
const app = express();
const RandomGoFood = require('./RandomGoFood');
const cors = require('cors')

app.use(express.json({ extended: false}));
app.use(cors());
app
    .get('/', async (req, res) => {
        res.json({
            version: '1.0.0',
            url: 'https://gofood.co.id/gofood/web/v1/restaurants',
            path: ['random', 'merchant/:id']
        });
    })
    .get('/random', async (req, res) => {
        const { lat, long } = req.query;
        if (!lat || !long) return res.status(406).json({ error: 'Provide lat and long in query' });

        const food = new RandomGoFood(lat, long);
        const merchants = await food.fastestMerchants();

        res.json(merchants);
    })
    .get('/merchant/:id', async (req, res) => {
        const { id } = req.params;
        const detail = await RandomGoFood.detailMerchants(id);

        res.json(detail);
    })

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))