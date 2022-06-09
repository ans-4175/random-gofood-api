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
        // type = 'FOOD', 'DRINK', 'SNACK', 'COFFEE'
        const { lat, long, type } = req.query;
        if (!lat || !long) return res.status(406).json({ error: 'Provide lat and long in query' });

        const food = new RandomGoFood(lat, long, type);
        const merchants = await food.fastestMerchants();

        res.json(merchants);
    })
    .get('/intel', async (req, res) => {
        // type = 'FOOD', 'DRINK', 'SNACK', 'COFFEE'
        const { lat, long, type } = req.query;
        if (!lat || !long) return res.status(406).json({ error: 'Provide lat and long in query' });

        const food = new RandomGoFood(lat, long, type);
        const merchants = await food.intelMerchants();

        res.json(merchants);
    })
    .get('/merchant/:id', async (req, res) => {
        const { id } = req.params;
        const { data, error } = await RandomGoFood.detailMerchants(id);
        
        if (error) return res.status(404).json({ error });
        res.json(data);
    })

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))