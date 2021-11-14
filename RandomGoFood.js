const axios = require('axios');
const { default: turfDestination } = require('@turf/destination');
const { point: turfPoint } = require('@turf/helpers');
const { v4: uuidv4 } = require('uuid');

const GOFOOD_URL = 'https://gofood.co.id/gofood/web/v1/restaurants';

const goFoodFetch = (obj) => {
  const { lat, long, page = 0 } = obj;

  const config = {
    method: 'get',
    url: GOFOOD_URL,
    params: {
      page: page,
      collection: 'NEAR_ME',
      search_id: uuidv4(),
      date: new Date().getTime()
    },
    headers: {
      'x-location': `${lat}, ${long}`
    }
  };

  return new Promise((res) => {
    axios(config)
      .then(function (response) {
        res(response.data.data.cards);
      })
      .catch(function (error) {
        res([]);
      });
  });
};

const merchantFetch = (id) => {
  const config = {
    method: 'get',
    url: `${GOFOOD_URL}/${id}/profile`,
    params: {
      date: new Date().getTime()
    }
  };

  return new Promise((res) => {
    axios(config)
      .then(function (response) {
        res(response.data);
      })
      .catch(function (error) {
        res([]);
      });
  });
};

const goFoodList = async (obj) => {
  // obj = { page: 0, lat: '-6.755916003793253', long: '108.51373109736657' }
  const merchants = await goFoodFetch(obj);
  return merchants.map((merch) => {
    return {
      id: merch.content.id,
      active: merch.content.active,
      is_open: merch.content.open_status.code,
      address: merch.content.address,
      phone_number: merch.content.phone_number,
      price_level: merch.content.avg_spend_level?.price_level,
      rating: merch.rating?.text,
      title: merch.title,
      name: merch.content.brand.name,
      tag: merch.content.cuisines.map((c) => c.code).join(','),
      distance_km: merch.content.delivery_status.distance,
      location: merch.content.location,
      eta_delivery_minutes: merch.content.delivery_status.eta?.minutes,
      eta_cooking_minutes: merch.content.food_preparation_expected_time
    };
  });
};

const merchantDetail = async (id) => {
  const merchant = await merchantFetch(id);

  return {
    id: merchant.restaurant.id,
    name: merchant.restaurant.name,
    phone_number: merchant.restaurant.phone_number,
    address: merchant.restaurant.address,
    location: merchant.restaurant.location,
    link: merchant.restaurant.short_link,
    menu: merchant.items.map((it) => {
      return {
        name: it.name,
        price: it.price,
        image: it.image,
        weight: it.weight
      };
    })
  };
};

const getRandomPoint = (location, distance = 1) => {
  // long, lat
  const point = turfPoint([location.long, location.lat]);
  const randomBearing = Math.floor(Math.random() * 360) - 180; // -180, 180
  const options = { units: 'kilometers' };

  const destination = turfDestination(point, distance, randomBearing, options);
  return {
    lat: destination.geometry.coordinates[1],
    long: destination.geometry.coordinates[0]
  };
};

class RandomGoFood {
  constructor(lat, long) {
    this.initialPoint = { lat, long };
    this.randomPoints = [...Array(3)].map((a) => getRandomPoint({ lat, long }));
  }

  async fetchMerchants() {
    const pLists = this.randomPoints.map((point) => {
      return goFoodList(point);
    });
    const lists = (await Promise.all(pLists)).flat();
    this.merchants = [...new Set(lists)];

    return this.merchants;
  }

  async fastestMerchants() {
    // always check
    if (typeof this.merchants === 'undefined') await this.fetchMerchants();

    return this.merchants
      .filter((m) => m.eta_delivery_minutes)
      .sort((a, b) => a.eta_delivery_minutes - b.eta_delivery_minutes);
  }

  async cheapMerchants() {
    // always check
    if (typeof this.merchants === 'undefined') await this.fetchMerchants();

    return this.merchants
      .filter((m) => m.price_level)
      .sort((a, b) => a.price_level - b.price_level || a.eta_delivery_minutes - b.eta_delivery_minutes);
  }

  async priceyMerchants() {
    // always check
    if (typeof this.merchants === 'undefined') await this.fetchMerchants();

    return this.merchants
      .filter((m) => m.price_level)
      .sort((a, b) => b.price_level - a.price_level || a.eta_delivery_minutes - b.eta_delivery_minutes);
  }

  static async detailMerchants(id) {
    try {
      const detail = await merchantDetail(id);
      return detail;
    } catch (error) {
      throw new Error(error);
    }
  }
}

module.exports = RandomGoFood;
