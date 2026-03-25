import { readPlayersDatasetCache, writePlayersDatasetCache } from './playerCache';

/**
 * Purpose: Single API gateway for SportMonks requests and player data normalization.
 * Why: Keeping fetch, retry, normalization, and caching in one module avoids logic drift between pages.
 */

const API_KEY = import.meta.env.VITE_SPORTMONKS_API_KEY;
const RAW_BASE_URL = import.meta.env.VITE_SPORTMONKS_API_BASE_URL || '/api/sportmonks';
const BASE_URL = RAW_BASE_URL.includes('cricket.sportmonks.com') ? '/api/sportmonks' : RAW_BASE_URL;

const REQUEST_TIMEOUT_MS = 120000;
const RETRY_ATTEMPTS = 2;
const CLIENT_ERROR_MIN = 400;
const CLIENT_ERROR_MAX = 499;

const PLAYERS_ENDPOINT = '/players';
const COUNTRIES_ENDPOINT = '/countries';
const POSITIONS_ENDPOINT = '/positions';

const LIST_INCLUDES = 'career';
const DETAIL_INCLUDES = 'country,career,career.season,teams';

let countryMapCache = null;
let positionMapCache = null;
let countryMapPromise = null;
let positionMapPromise = null;

/**
 * Delays execution between retry attempts.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Creates a request signal that combines parent aborts with a hard timeout.
 *
 * @param {AbortSignal | undefined} parentSignal
 * @param {number} timeoutMs
 * @returns {{signal: AbortSignal, clear: () => void}}
 */
function withTimeout(parentSignal, timeoutMs) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'AbortError'));
  }, timeoutMs);

  // Mirrors parent cancellation so component unmounts cancel in-flight retries immediately.
  const abortFromParent = () => {
    controller.abort(parentSignal?.reason);
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      abortFromParent();
    } else {
      parentSignal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timeoutId);
      if (parentSignal) {
        parentSignal.removeEventListener('abort', abortFromParent);
      }
    },
  };
}

/**
 * Fetch wrapper with timeout and retry support.
 * Retries are intentionally skipped for client errors and aborted requests.
 *
 * @param {string} url
 * @param {RequestInit & { signal?: AbortSignal }} [options]
 * @param {number} [attempts]
 * @returns {Promise<any>}
 */
async function fetchWithRetry(url, options = {}, attempts = RETRY_ATTEMPTS) {
  let lastError = null;

  for (let currentAttempt = 1; currentAttempt <= attempts; currentAttempt += 1) {
    const timeoutController = withTimeout(options.signal, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: timeoutController.signal,
      });

      timeoutController.clear();

      if (!response.ok) {
        const errorBody = await response.text();
        const httpError = new Error(
          `API request failed (${response.status}): ${errorBody || response.statusText}`,
        );
        httpError.status = response.status;
        throw httpError;
      }

      return response.json();
    } catch (error) {
      timeoutController.clear();

      if (error?.name === 'AbortError') {
        if (options.signal?.aborted) {
          throw error;
        }

        throw new Error('Request timed out. Please retry.');
      }

      const status = Number(error?.status || 0);
      if (status >= CLIENT_ERROR_MIN && status <= CLIENT_ERROR_MAX) {
        throw error;
      }

      lastError = error;

      if (currentAttempt < attempts) {
        await sleep(500 * currentAttempt);
      }
    }
  }

  throw lastError || new Error('Failed to fetch data from API.');
}

/**
 * Builds a URL with auth token and query parameters.
 *
 * @param {string} path
 * @param {Record<string, string | number | null | undefined>} [query]
 * @returns {string}
 */
function buildUrl(path, query = {}) {
  if (!API_KEY) {
    throw new Error('Missing VITE_SPORTMONKS_API_KEY in .env');
  }

  const targetPath = `${BASE_URL}${path}`;
  const url = BASE_URL.startsWith('http')
    ? new URL(targetPath)
    : new URL(targetPath, window.location.origin);

  url.searchParams.set('api_token', API_KEY);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

/**
 * Safely converts unknown input to a finite number.
 *
 * @param {unknown} value
 * @returns {number | null}
 */
function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Reads a nested value from an object using dot notation.
 *
 * @param {Record<string, any>} source
 * @param {string} path
 * @returns {any}
 */
function getValueAtPath(source, path) {
  return path.split('.').reduce((value, part) => {
    if (value && typeof value === 'object') {
      return value[part];
    }

    return undefined;
  }, source);
}

/**
 * Returns the first non-empty value from a list of candidate paths.
 *
 * @param {Record<string, any>} source
 * @param {string[]} paths
 * @returns {any}
 */
function getFirstValue(source, paths) {
  for (const path of paths) {
    const value = getValueAtPath(source, path);

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

/**
 * Drops placeholder image URLs so UI can use local fallback art.
 *
 * @param {string | null | undefined} imageUrl
 * @returns {string}
 */
function sanitizeImageUrl(imageUrl) {
  if (!imageUrl) {
    return '';
  }

  const value = String(imageUrl).trim();

  if (!value) {
    return '';
  }

  const lowerValue = value.toLowerCase();
  const isSportmonksPlaceholder =
    lowerValue.includes('cdn.sportmonks.com/images/cricket/placeholder') ||
    lowerValue.endsWith('/placeholder.png') ||
    lowerValue.includes('/placeholder.png?');

  return isSportmonksPlaceholder ? '' : value;
}

/**
 * Normalizes tournament labels into stable display groups.
 *
 * @param {string | null | undefined} rawType
 * @returns {string}
 */
function normalizeCareerType(rawType) {
  if (!rawType) {
    return 'Other';
  }

  const text = String(rawType).trim();
  const upperText = text.toUpperCase();

  if (upperText.includes('ODI')) {
    return 'ODI';
  }

  if (upperText.includes('T20')) {
    return 'T20';
  }

  if (upperText.includes('TEST')) {
    return 'Test';
  }

  return text;
}

/**
 * Extracts unique tournament types from career records.
 *
 * @param {any[] | {data?: any[]}} careerData
 * @returns {string[]}
 */
function extractTournamentTypesFromCareer(careerData) {
  const career = Array.isArray(careerData) ? careerData : careerData?.data || [];

  return [
    ...new Set(
      career
        .map((record) => {
          const rawType =
            record.type ||
            record.tournament_type ||
            record.tournament?.type ||
            record.season?.type ||
            record.league?.type;

          return rawType ? String(rawType).trim() : null;
        })
        .filter(Boolean),
    ),
  ];
}

/**
 * Aggregates career records into display-friendly stat cards.
 *
 * @param {any[] | {data?: any[]}} careerData
 * @returns {Array<{type: string, matches: number | null, runs: number | null, wickets: number | null, average: number | null}>}
 */
function extractCareerStats(careerData) {
  const records = Array.isArray(careerData) ? careerData : careerData?.data || [];
  const groupedStats = new Map();

  records.forEach((record) => {
    const statType = normalizeCareerType(
      getFirstValue(record, [
        'type',
        'tournament_type',
        'season.type',
        'season.name',
        'league.code',
        'league.name',
      ]),
    );

    const matches = toNumber(
      getFirstValue(record, ['matches', 'games', 'fixtures', 'played', 'batting.matches', 'bowling.matches']),
    );

    const runs = toNumber(
      getFirstValue(record, ['runs', 'runs_scored', 'batting.runs', 'batting.runs_scored', 'batting.total_runs']),
    );

    const wickets = toNumber(
      getFirstValue(record, ['wickets', 'wickets_taken', 'bowling.wickets', 'bowling.wickets_taken']),
    );

    const average = toNumber(
      getFirstValue(record, ['average', 'avg', 'batting.average', 'batting.avg', 'bowling.average']),
    );

    if (!groupedStats.has(statType)) {
      groupedStats.set(statType, {
        type: statType,
        matches: null,
        runs: null,
        wickets: null,
        average: null,
      });
    }

    const currentStats = groupedStats.get(statType);

    if (matches !== null) {
      currentStats.matches = (currentStats.matches || 0) + matches;
    }

    if (runs !== null) {
      currentStats.runs = (currentStats.runs || 0) + runs;
    }

    if (wickets !== null) {
      currentStats.wickets = (currentStats.wickets || 0) + wickets;
    }

    if (currentStats.average === null && average !== null) {
      currentStats.average = average;
    }
  });

  const preferredOrder = ['ODI', 'T20', 'Test'];

  return [...groupedStats.values()].sort((first, second) => {
    const firstOrder = preferredOrder.indexOf(first.type);
    const secondOrder = preferredOrder.indexOf(second.type);
    const safeFirstOrder = firstOrder === -1 ? Number.MAX_SAFE_INTEGER : firstOrder;
    const safeSecondOrder = secondOrder === -1 ? Number.MAX_SAFE_INTEGER : secondOrder;

    if (safeFirstOrder === safeSecondOrder) {
      return String(first.type).localeCompare(String(second.type));
    }

    return safeFirstOrder - safeSecondOrder;
  });
}

/**
 * Extracts unique team names from nested teams payloads.
 *
 * @param {any[] | {data?: any[]}} teamsData
 * @returns {string[]}
 */
function extractTeamNames(teamsData) {
  const teams = Array.isArray(teamsData) ? teamsData : teamsData?.data || [];

  return [...new Set(teams.map((team) => team?.name).filter(Boolean))];
}

/**
 * Builds a country-id to country-name map used by card and detail views.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<Map<number, string>>}
 */
async function fetchCountryMap(signal) {
  const countryNameById = new Map();

  try {
    const payload = await fetchWithRetry(buildUrl(COUNTRIES_ENDPOINT), { signal });
    const countries = payload?.data || [];

    if (Array.isArray(countries)) {
      countries.forEach((country) => {
        const countryId = Number(country?.id);

        if (Number.isInteger(countryId) && country?.name) {
          countryNameById.set(countryId, country.name);
        }
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Unable to resolve countries list.', error);
    }
  }

  return countryNameById;
}

/**
 * Builds a position-id to position-name map for role display.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<Map<number, string>>}
 */
async function fetchPositionMap(signal) {
  const positionNameById = new Map();

  try {
    const payload = await fetchWithRetry(buildUrl(POSITIONS_ENDPOINT), { signal });
    const positions = payload?.data || [];

    if (Array.isArray(positions)) {
      positions.forEach((position) => {
        const positionId = Number(position?.id);

        if (Number.isInteger(positionId) && position?.name) {
          positionNameById.set(positionId, position.name);
        }
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Unable to resolve positions list.', error);
    }
  }

  return positionNameById;
}

/**
 * Returns a session-cached country map and deduplicates concurrent fetches.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<Map<number, string>>}
 */
async function getCachedCountryMap(signal) {
  if (countryMapCache) {
    return countryMapCache;
  }

  if (countryMapPromise) {
    return countryMapPromise;
  }

  countryMapPromise = fetchCountryMap(signal)
    .then((map) => {
      countryMapCache = map;
      return map;
    })
    .finally(() => {
      countryMapPromise = null;
    });

  return countryMapPromise;
}

/**
 * Returns a session-cached position map and deduplicates concurrent fetches.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<Map<number, string>>}
 */
async function getCachedPositionMap(signal) {
  if (positionMapCache) {
    return positionMapCache;
  }

  if (positionMapPromise) {
    return positionMapPromise;
  }

  positionMapPromise = fetchPositionMap(signal)
    .then((map) => {
      positionMapCache = map;
      return map;
    })
    .finally(() => {
      positionMapPromise = null;
    });

  return positionMapPromise;
}

/**
 * Converts raw API players into the normalized app model.
 *
 * @param {Record<string, any>} [player]
 * @param {{countryById?: Map<number, string>, positionById?: Map<number, string>}} [lookups]
 * @returns {object}
 */
function normalizePlayer(player = {}, lookups = {}) {
  const { countryById = new Map(), positionById = new Map() } = lookups;
  const countryId = Number(player.country_id || player.country?.id || player.country?.data?.id || 0) || null;
  const positionId = Number(player.position_id || player.position?.id || player.position?.data?.id || 0) || null;

  const countryName =
    player.country?.name ||
    player.country?.data?.name ||
    (countryId ? countryById.get(countryId) : '') ||
    player.country_name ||
    player.nationality ||
    'Unknown';

  const positionName =
    player.position?.name ||
    (positionId ? positionById.get(positionId) : '') ||
    player.playing_role ||
    player.role ||
    player.position_name ||
    'Unknown';

  return {
    id: player.id,
    fullName: player.fullname || `${player.firstname || ''} ${player.lastname || ''}`.trim() || 'Unknown Player',
    firstName: player.firstname || '',
    lastName: player.lastname || '',
    imageUrl: sanitizeImageUrl(player.image_path || player.image),
    country: countryName,
    position: positionName,
    dateOfBirth: player.dateofbirth || player.dob || '',
    battingStyle: player.battingstyle || '',
    bowlingStyle: player.bowlingstyle || '',
    gender: player.gender || '',
    updatedAt: player.updated_at || '',
    teamName: player.team?.name || player.team?.data?.name || '',
    teams: extractTeamNames(player.teams),
    tournamentTypes: extractTournamentTypesFromCareer(player.career),
    careerStats: extractCareerStats(player.career),
  };
}

/**
 * Loads and normalizes the players list, with IndexedDB cache fallback.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<object>>}
 */
export async function fetchPlayersDataset(signal) {
  const cachedDataset = await readPlayersDatasetCache();

  if (cachedDataset?.isFresh) {
    return cachedDataset.players;
  }

  try {
    const payload = await fetchWithRetry(
      buildUrl(PLAYERS_ENDPOINT, {
        include: LIST_INCLUDES,
      }),
      { signal },
    );

    const playersChunk = payload?.data || [];

    if (!Array.isArray(playersChunk) || playersChunk.length === 0) {
      return [];
    }

    const [countryById, positionById] = await Promise.all([
      getCachedCountryMap(signal),
      getCachedPositionMap(signal),
    ]);

    const normalizedPlayers = playersChunk
      .map((player) => normalizePlayer(player, { countryById, positionById }))
      .filter((player) => Boolean(player.id));

    await writePlayersDatasetCache(normalizedPlayers);

    return normalizedPlayers;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    // We intentionally fall back to stale cache so the listing still works during temporary API outages.
    if (cachedDataset?.players?.length) {
      if (import.meta.env.DEV) {
        console.warn('Using stale cached players dataset because fresh fetch failed.', error);
      }
      return cachedDataset.players;
    }

    throw error;
  }
}

/**
 * Loads one player with detail includes and normalizes the response.
 *
 * @param {string | number} playerId
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>}
 */
export async function fetchPlayerById(playerId, signal) {
  const url = buildUrl(`${PLAYERS_ENDPOINT}/${playerId}`, {
    include: DETAIL_INCLUDES,
  });

  const payload = await fetchWithRetry(url, { signal });
  const player = payload?.data;

  if (!player) {
    throw new Error('Player not found.');
  }

  const [countryById, positionById] = await Promise.all([
    getCachedCountryMap(signal),
    getCachedPositionMap(signal),
  ]);

  return normalizePlayer(player, { countryById, positionById });
}
