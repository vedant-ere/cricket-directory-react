import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import PlayerCard from '../components/PlayerCard';
import PlayersControls from '../components/PlayersControls';
import Pagination from '../components/Pagination';
import { fetchPlayersDataset } from '../services/api';
import useDebouncedValue from '../hooks/useDebouncedValue';
import {
  applyFilters,
  applySorting,
  getUniqueOptions,
  getUniqueTournamentTypes,
  paginatePlayers,
  PLAYERS_PER_PAGE,
} from '../utils/playerUtils';

/**
 * Purpose: Players list route with URL-synced filters, sorting, and pagination.
 * Why: URL state keeps list views shareable and browser-navigation friendly.
 */

const DEFAULTS = {
  page: 1,
  search: '',
  country: '',
  position: '',
  tournamentType: '',
  sortBy: 'firstName',
  sortOrder: 'asc',
};

/**
 * Counts how many user-facing filters are active.
 *
 * @param {{search: string, country: string, position: string, tournamentType: string}} state
 * @returns {number}
 */
function getActiveFilterCount(state) {
  return [state.search, state.country, state.position, state.tournamentType].filter(Boolean).length;
}

/**
 * Hydrates strongly-typed route state from URLSearchParams.
 *
 * @param {URLSearchParams} searchParams
 * @returns {{
 *   page: number,
 *   search: string,
 *   country: string,
 *   position: string,
 *   tournamentType: string,
 *   sortBy: string,
 *   sortOrder: 'asc' | 'desc'
 * }}
 */
function readStateFromParams(searchParams) {
  const pageValue = Number(searchParams.get('page'));
  const page = Number.isNaN(pageValue) || pageValue < 1 ? DEFAULTS.page : pageValue;

  return {
    page,
    search: searchParams.get('search') || DEFAULTS.search,
    country: searchParams.get('country') || DEFAULTS.country,
    position: searchParams.get('position') || DEFAULTS.position,
    tournamentType: searchParams.get('tournamentType') || DEFAULTS.tournamentType,
    sortBy: searchParams.get('sortBy') || DEFAULTS.sortBy,
    sortOrder: searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * Renders the all-players route with filter and pagination state.
 *
 * @returns {JSX.Element}
 */
function PlayersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const state = useMemo(() => readStateFromParams(searchParams), [searchParams]);

  const [searchInput, setSearchInput] = useState(state.search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  useEffect(() => {
    setSearchInput(state.search);
  }, [state.search]);

  useEffect(() => {
    const shouldUpdate = debouncedSearch !== state.search;
    if (!shouldUpdate) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);

    if (debouncedSearch) {
      nextParams.set('search', debouncedSearch);
    } else {
      nextParams.delete('search');
    }

    nextParams.set('page', '1');
    setSearchParams(nextParams);
  }, [debouncedSearch, setSearchParams, searchParams, state.search]);

  useEffect(() => {
    const controller = new AbortController();

    /**
     * Fetches players once for this route and syncs loading/error states.
     *
     * @returns {Promise<void>}
     */
    async function loadPlayers() {
      try {
        setLoading(true);
        setError('');
        const data = await fetchPlayersDataset(controller.signal);
        setPlayers(data);
      } catch (apiError) {
        if (apiError?.name === 'AbortError') {
          return;
        }

        setError(apiError?.message || 'Failed to load players. Please try again.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPlayers();

    return () => {
      // Abort keeps rapid route changes from writing stale responses to state.
      controller.abort();
    };
  }, []);

  const countries = useMemo(() => getUniqueOptions(players, 'country'), [players]);
  const positions = useMemo(() => getUniqueOptions(players, 'position'), [players]);
  const tournamentTypes = useMemo(() => getUniqueTournamentTypes(players), [players]);

  const filteredPlayers = useMemo(
    () =>
      applyFilters(players, {
        search: state.search,
        country: state.country,
        position: state.position,
        tournamentType: state.tournamentType,
      }),
    [players, state.country, state.position, state.search, state.tournamentType],
  );

  const sortedPlayers = useMemo(
    () => applySorting(filteredPlayers, state.sortBy, state.sortOrder),
    [filteredPlayers, state.sortBy, state.sortOrder],
  );

  const totalPages = Math.max(1, Math.ceil(sortedPlayers.length / PLAYERS_PER_PAGE));
  const currentPage = Math.min(state.page, totalPages);

  const paginatedPlayers = useMemo(
    () => paginatePlayers(sortedPlayers, currentPage, PLAYERS_PER_PAGE),
    [sortedPlayers, currentPage],
  );
  const activeFilterCount = getActiveFilterCount(state);

  useEffect(() => {
    if (state.page <= totalPages) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(totalPages));
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, state.page, totalPages]);

  const updateParams = useCallback(
    /**
     * Merges next filter/sort/page state into URL params.
     *
     * @param {Record<string, string | number>} nextState
     * @returns {void}
     */
    (nextState) => {
      const nextParams = new URLSearchParams();

      const merged = {
        ...state,
        ...nextState,
      };

      Object.entries(merged).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          nextParams.set(key, String(value));
        }
      });

      setSearchParams(nextParams);
    },
    [setSearchParams, state],
  );

  const handleSearchSubmit = useCallback(
    /**
     * Commits the current search field into URL state.
     *
     * @param {React.FormEvent<HTMLFormElement>} event
     * @returns {void}
     */
    (event) => {
      event.preventDefault();
      updateParams({ search: searchInput.trim(), page: 1 });
    },
    [searchInput, updateParams],
  );

  const handleClearFilters = useCallback(
    /**
     * Resets all filters while preserving default sort.
     *
     * @returns {void}
     */
    () => {
      setSearchInput('');
      setSearchParams({ page: '1', sortBy: DEFAULTS.sortBy, sortOrder: DEFAULTS.sortOrder });
    },
    [setSearchParams],
  );

  const handleCountryChange = useCallback(
    /**
     * Updates country filter and resets paging.
     *
     * @param {string} country
     * @returns {void}
     */
    (country) => {
      updateParams({ country, page: 1 });
    },
    [updateParams],
  );

  const handlePositionChange = useCallback(
    /**
     * Updates position filter and resets paging.
     *
     * @param {string} position
     * @returns {void}
     */
    (position) => {
      updateParams({ position, page: 1 });
    },
    [updateParams],
  );

  const handleTournamentTypeChange = useCallback(
    /**
     * Updates tournament-type filter and resets paging.
     *
     * @param {string} tournamentType
     * @returns {void}
     */
    (tournamentType) => {
      updateParams({ tournamentType, page: 1 });
    },
    [updateParams],
  );

  const handleSortByChange = useCallback(
    /**
     * Changes selected sort field and resets paging.
     *
     * @param {string} sortBy
     * @returns {void}
     */
    (sortBy) => {
      updateParams({ sortBy, page: 1 });
    },
    [updateParams],
  );

  const handleSortOrderToggle = useCallback(
    /**
     * Flips sort direction between ascending and descending.
     *
     * @returns {void}
     */
    () => {
      updateParams({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 });
    },
    [state.sortOrder, updateParams],
  );

  const handlePageChange = useCallback(
    /**
     * Moves pagination to the chosen page.
     *
     * @param {number} page
     * @returns {void}
     */
    (page) => {
      updateParams({ page });
    },
    [updateParams],
  );

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <header className="page-header">
          <h1>Player Directory</h1>
          <p>Find player profiles with filters, sorting and quick navigation to full details.</p>
        </header>

        <PlayersControls
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearchSubmit={handleSearchSubmit}
          country={state.country}
          onCountryChange={handleCountryChange}
          countries={countries}
          position={state.position}
          onPositionChange={handlePositionChange}
          positions={positions}
          tournamentType={state.tournamentType}
          onTournamentTypeChange={handleTournamentTypeChange}
          tournamentTypes={tournamentTypes}
          sortBy={state.sortBy}
          onSortByChange={handleSortByChange}
          sortOrder={state.sortOrder}
          onSortOrderToggle={handleSortOrderToggle}
          onClearFilters={handleClearFilters}
        />

        <section className="results-meta" aria-live="polite">
          <div className="meta-chip">
            <span>Total Players</span>
            <strong>{players.length}</strong>
          </div>
          <div className="meta-chip">
            <span>Matching</span>
            <strong>{sortedPlayers.length}</strong>
          </div>
          <div className="meta-chip">
            <span>Page</span>
            <strong>
              {currentPage} / {totalPages}
            </strong>
          </div>
          <div className="meta-chip">
            <span>Active Filters</span>
            <strong>{activeFilterCount}</strong>
          </div>
        </section>

        {loading && (
          <section className="players-grid" aria-label="Loading players">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="player-card skeleton-card" />
            ))}
          </section>
        )}
        {!loading && error && <p className="state-text error">{error}</p>}
        {!loading && !error && paginatedPlayers.length === 0 && (
          <p className="state-text">No players found for the selected filters.</p>
        )}

        {!loading && !error && paginatedPlayers.length > 0 && (
          <>
            <section className="players-grid" aria-label="Players list">
              {paginatedPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </section>

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </main>
    </>
  );
}

export default PlayersPage;
