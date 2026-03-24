import { memo } from 'react';
import { SORT_FIELDS } from '../utils/playerUtils';

/**
 * Purpose: Centralized filter and sorting controls for the players listing page.
 * Why: Grouping controls keeps URL state changes predictable and easier to maintain.
 */

/**
 * @param {object} props
 * @param {string} props.searchInput
 * @param {(value: string) => void} props.onSearchInputChange
 * @param {(event: React.FormEvent<HTMLFormElement>) => void} props.onSearchSubmit
 * @param {string} props.country
 * @param {(value: string) => void} props.onCountryChange
 * @param {string[]} props.countries
 * @param {string} props.position
 * @param {(value: string) => void} props.onPositionChange
 * @param {string[]} props.positions
 * @param {string} props.tournamentType
 * @param {(value: string) => void} props.onTournamentTypeChange
 * @param {string[]} props.tournamentTypes
 * @param {string} props.sortBy
 * @param {(value: string) => void} props.onSortByChange
 * @param {'asc'|'desc'} props.sortOrder
 * @param {() => void} props.onSortOrderToggle
 * @param {() => void} props.onClearFilters
 * @returns {JSX.Element}
 */
function PlayersControls({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  country,
  onCountryChange,
  countries,
  position,
  onPositionChange,
  positions,
  tournamentType,
  onTournamentTypeChange,
  tournamentTypes,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  onClearFilters,
}) {
  return (
    <section className="controls" aria-label="Players filters and sorting">
      <h2 className="controls-title">Filter Players</h2>

      <form className="search-form" onSubmit={onSearchSubmit}>
        <input
          type="search"
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="Search by last name"
          aria-label="Search players by last name"
        />
        <button type="submit">Search</button>
      </form>

      <div className="filters-grid">
        <label>
          Country
          <select value={country} onChange={(event) => onCountryChange(event.target.value)}>
            <option value="">All</option>
            {countries.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          Position
          <select value={position} onChange={(event) => onPositionChange(event.target.value)}>
            <option value="">All</option>
            {positions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          Career Tournament Type
          <select value={tournamentType} onChange={(event) => onTournamentTypeChange(event.target.value)}>
            <option value="">All</option>
            {tournamentTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sort-row">
        <label>
          Sort By
          <select value={sortBy} onChange={(event) => onSortByChange(event.target.value)}>
            {Object.entries(SORT_FIELDS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="secondary-button" onClick={onSortOrderToggle}>
          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </button>

        <button type="button" className="secondary-button" onClick={onClearFilters}>
          Clear
        </button>
      </div>
    </section>
  );
}

export default memo(PlayersControls);
