/**
 * Purpose: Pure data transforms for listing page filters/sorting/pagination.
 * Why: Keeping these operations pure makes UI logic easy to test and reason about.
 */

export const PLAYERS_PER_PAGE = 12;

export const SORT_FIELDS = {
  firstName: 'First Name',
  id: 'ID',
  updatedAt: 'Recently Updated',
};

/**
 * @param {Array<object>} players
 * @param {{search: string, country: string, position: string, tournamentType: string}} filters
 * @returns {Array<object>}
 */
export function applyFilters(players, { search, country, position, tournamentType }) {
  return players.filter((player) => {
    const searchTerm = String(search || '').trim().toLowerCase();

    const matchesSearch = !searchTerm || player.lastName.toLowerCase().includes(searchTerm);
    const matchesCountry = !country || player.country === country;
    const matchesPosition = !position || player.position === position;
    const matchesTournamentType =
      !tournamentType || player.tournamentTypes.some((type) => String(type).toLowerCase() === tournamentType.toLowerCase());

    return matchesSearch && matchesCountry && matchesPosition && matchesTournamentType;
  });
}

/**
 * @param {Array<object>} players
 * @param {string} sortBy
 * @param {'asc' | 'desc'} sortOrder
 * @returns {Array<object>}
 */
export function applySorting(players, sortBy, sortOrder) {
  const sorted = [...players];

  sorted.sort((a, b) => {
    let firstValue;
    let secondValue;

    if (sortBy === 'id') {
      firstValue = Number(a.id || 0);
      secondValue = Number(b.id || 0);
    } else if (sortBy === 'updatedAt') {
      firstValue = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      secondValue = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    } else {
      firstValue = String(a.firstName || '').toLowerCase();
      secondValue = String(b.firstName || '').toLowerCase();
    }

    if (firstValue < secondValue) {
      return sortOrder === 'asc' ? -1 : 1;
    }

    if (firstValue > secondValue) {
      return sortOrder === 'asc' ? 1 : -1;
    }

    return 0;
  });

  return sorted;
}

/**
 * @param {Array<object>} players
 * @param {number} [page=1]
 * @param {number} [limit=PLAYERS_PER_PAGE]
 * @returns {Array<object>}
 */
export function paginatePlayers(players, page = 1, limit = PLAYERS_PER_PAGE) {
  const currentPage = Math.max(1, Number(page) || 1);
  const start = (currentPage - 1) * limit;
  const end = start + limit;

  return players.slice(start, end);
}

/**
 * @param {Array<object>} players
 * @param {string} key
 * @returns {Array<string>}
 */
export function getUniqueOptions(players, key) {
  return [...new Set(players.map((player) => player[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/**
 * @param {Array<{ tournamentTypes?: string[] }>} players
 * @returns {Array<string>}
 */
export function getUniqueTournamentTypes(players) {
  return [...new Set(players.flatMap((player) => player.tournamentTypes || []).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b)),
  );
}
