/**
 * Epic Games Store public API — no authentication required.
 * Fetches the current and upcoming free games promotions.
 */

const FREE_GAMES_PROMOTIONS_URL =
  'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions';

/**
 * Query Epic's public API for free game promotions.
 * @param {object} opts
 * @param {string} [opts.locale='en-US']
 * @param {string} [opts.country='US']
 * @returns {Promise<{ current: FreeGame[], upcoming: FreeGame[] }>}
 *
 * @typedef {object} FreeGame
 * @property {string} title
 * @property {string} id
 * @property {string} namespace
 * @property {string} description
 * @property {string|null} productSlug
 * @property {string|null} urlSlug
 * @property {string} startDate
 * @property {string} endDate
 * @property {string|null} imageUrl
 * @property {string} storeUrl
 */
export async function fetchFreeGames({ locale = 'en-US', country = 'US' } = {}) {
  const url = new URL(FREE_GAMES_PROMOTIONS_URL);
  url.searchParams.set('locale', locale);
  url.searchParams.set('country', country);
  url.searchParams.set('allowCountries', country);

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Epic API error: ${resp.status} ${resp.statusText}`);
  }

  const body = await resp.json();
  const elements = body?.data?.Catalog?.searchStore?.elements;
  if (!elements) {
    throw new Error(`Unexpected API response structure: ${JSON.stringify(body).slice(0, 200)}`);
  }

  const now = new Date();
  const current = [];
  const upcoming = [];

  for (const el of elements) {
    const promos = el.promotions;
    if (!promos) continue;

    // Current free games
    for (const group of promos.promotionalOffers || []) {
      for (const offer of group.promotionalOffers || []) {
        if (offer.discountSetting?.discountPercentage !== 0) continue;
        const start = new Date(offer.startDate);
        const end = new Date(offer.endDate);
        if (start <= now && now <= end) {
          current.push(makeGame(el, offer.startDate, offer.endDate));
        }
      }
    }

    // Upcoming free games
    for (const group of promos.upcomingPromotionalOffers || []) {
      for (const offer of group.promotionalOffers || []) {
        if (offer.discountSetting?.discountPercentage !== 0) continue;
        upcoming.push(makeGame(el, offer.startDate, offer.endDate));
      }
    }
  }

  return { current, upcoming };
}

/**
 * Build a FreeGame object from an API element.
 */
function makeGame(el, startDate, endDate) {
  const slug =
    el.catalogNs?.mappings?.find((m) => m.pageType === 'productHome')?.pageSlug ||
    el.productSlug ||
    el.urlSlug ||
    el.id;

  const imageEntry = el.keyImages?.find(
    (img) => img.type === 'OfferImageWide' || img.type === 'Thumbnail'
  );

  return {
    title: el.title,
    id: el.id,
    namespace: el.namespace,
    description: el.description || '',
    productSlug: el.productSlug,
    urlSlug: el.urlSlug,
    startDate,
    endDate,
    imageUrl: imageEntry?.url || null,
    storeUrl: `https://store.epicgames.com/en-US/p/${slug}`,
  };
}
