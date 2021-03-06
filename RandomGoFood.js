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
        res(null);
      });
  });
};

const mapList = (merch) => {
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
}

const mapIntel = (merch) => {
  return {
    id: merch.content.id,
    active: merch.content.active,
    is_open: merch.content.open_status.code,
    name: merch.content.brand.name,
    title: merch.title,
    address: merch.content.address,
    gmap: `https://www.google.com/maps/search/?api=1&query=${merch.content.location}`,
    phone_number: merch.content.phone_number,
    price_level: merch.content.avg_spend_level?.price_level,
    rating: merch.rating?.text,
    tag: merch.content.cuisines.map((c) => c.code).join(',')
  };
}

const goFoodList = async (obj, type) => {
  // obj = { page: 0, lat: '-6.755916003793253', long: '108.51373109736657' }
  const merchants = await goFoodFetch(obj);
  const mapFunc = (type === 'INTEL') ? mapIntel : mapList;
  return merchants.map((merch) => mapFunc(merch));
};

const merchantDetail = async (id) => {
  const merchant = await merchantFetch(id);

  if (!merchant) return {
    data: null,
    error: `No merchant with id:${id}`
  }
  // console.log(merchant);

  return {
    data: {
      id: merchant.restaurant.id,
      name: merchant.restaurant.name,
      phone_number: merchant.restaurant.phone_number,
      address: merchant.restaurant.address,
      location: merchant.restaurant.location,
      link: merchant.restaurant.short_link,
      eta_cooking_minutes: merchant.food_preparation_expected_time,
      menu: merchant.items.map((it) => {
        return {
          name: it.name,
          price: it.price,
          image: it.image,
          weight: it.weight
        };
      })
    },
    error: null
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

const pickNRandom = (arr, n) => {
  let result = new Array(n),
    len = arr.length,
    taken = new Array(len);
  //   if (n > len) throw new RangeError('getRandom: more elements taken than available');
  if (n > len) {
    result = [...arr];
  } else {
    while (n-- && result.length <= len) {
      const x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
    }
  }
  
  return result;
}

const checkType = (tag, type) => {
  let through;
  switch (type) {
    case 'FOOD':
      const listFood = [
        'ANEKA_NASI','FASTFOOD','SOTO_BAKSO_SOP','ANEKA_AYAM_BEBEK','ROTI',
        'CHINESE','KOREAN','JAPANESE','SEAFOOD','BAKMIE','SATE',
        'PIZZA_PASTA','THAI','MIDDLE_EASTERN','BURGER_SANDWICH_STEAK'
      ];
      through = listFood.reduce((pLogic, food) => {
        return pLogic || tag.includes(food);
      }, false);
      break;
    case 'DRINK':
      through = tag.includes('COFFEE_SHOP') || tag.includes('MINUMAN');
      break;
    case 'SNACK':
      through = tag.includes('SNACKS_JAJANAN') || tag.includes('SWEETS_DESSERTS') || tag.includes('MARTABAK');
      break;
    case 'COFFEE':
      through = tag.includes('COFFEE_SHOP');
      break;
    default:
      break;
  }
  return through;
}

class RandomGoFood {
  constructor(lat, long, type = null, nPoint = 4) {
    this.initialPoint = { lat, long };
    this.type = type;
    // random this points to fetch
    this.randomizePoints(nPoint);
  }

  randomizePoints(nPoint) {
    const pointCount = nPoint ? nPoint : 4;
    this.randomPoints = [...Array(pointCount)].map((a) => getRandomPoint(this.initialPoint, (Math.floor(Math.random() * 1.5) + 1))); 
  }

  async fetchMerchants(typeFetch, nPick) {
    const pLists = this.randomPoints.map((point) => {
      return goFoodList(point, typeFetch);
    });
    let lists = (await Promise.all(pLists)).flat();
    if (this.type) {
      lists = lists.filter(merch => {
        return checkType(merch.tag, this.type)
      });
    }
    const pickCount = nPick ? nPick : 20;
    // make it unique
    if (typeFetch === 'INTEL') {
      return pickNRandom([...new Map(lists.map(item => [item['id'], item])).values()], pickCount);
    }

    this.merchants = pickNRandom([...new Map(lists.map(item => [item['id'], item])).values()], pickCount);

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
      .filter((m) => m.price_level && m.price_level > 2)
      .sort((a, b) => b.price_level - a.price_level || a.eta_delivery_minutes - b.eta_delivery_minutes);
  }

  async intelMerchants() {
    // always check
    const merchants = await this.fetchMerchants('INTEL', 50);

    return merchants
      .filter((m) => m.price_level && m.price_level > 2)
      .sort((a, b) => b.price_level - a.price_level);
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
