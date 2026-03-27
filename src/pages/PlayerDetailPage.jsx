import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { fetchPlayerById } from '../services/api';
import playerPlaceholderImage from '../assets/player-placeholder.svg';
import { formatDate, formatStatValue, toTitleCase } from '../utils/formatters';

/**
 * Purpose: Full player profile view with identity and career stats.
 * Why: This route gives a focused, readable deep dive without overloading the listing page.
 */

/**
 * Expands compact gender values from the API to human-readable labels.
 *
 * @param {string | null | undefined} value
 * @returns {string}
 */
function formatGender(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return 'N/A';
  }

  if (normalized === 'm' || normalized === 'male') {
    return 'Male';
  }

  if (normalized === 'f' || normalized === 'female') {
    return 'Female';
  }

  return toTitleCase(normalized);
}

/**
 * Converts style strings to readable cricket phrasing.
 *
 * @param {string | null | undefined} value
 * @param {'batting' | 'bowling'} styleType
 * @returns {string}
 */
function formatPlayerStyle(value, styleType) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return 'N/A';
  }

  if (styleType === 'batting') {
    if (normalized === 'right-hand-bat' || normalized === 'right hand bat') {
      return 'Right Handed Batsman';
    }

    if (normalized === 'left-hand-bat' || normalized === 'left hand bat') {
      return 'Left Handed Batsman';
    }
  }

  return toTitleCase(normalized);
}

/**
 * Renders the player profile route for a specific `playerId`.
 *
 * @returns {JSX.Element}
 */
function PlayerDetailPage() {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const imageSource = player?.imageUrl || playerPlaceholderImage;

  useEffect(() => {
    const controller = new AbortController();

    /**
     * Loads player details and updates route-level loading state.
     *
     * @returns {Promise<void>}
     */
    async function loadPlayer() {
      if (!playerId) {
        setError('Invalid player ID.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await fetchPlayerById(playerId, controller.signal);
        setPlayer(data);
      } catch (apiError) {
        if (apiError?.name === 'AbortError') {
          return;
        }

        setError(apiError?.message || 'Unable to fetch player details.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPlayer();

    return () => {
      // Abort prevents state writes when the user navigates quickly between player pages.
      controller.abort();
    };
  }, [playerId]);

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <header className="detail-header">
          <Link to="/" className="back-link">
            Back to Players
          </Link>
        </header>

        {loading && <p className="state-text">Loading player details...</p>}
        {!loading && error && <p className="state-text error">{error}</p>}

        {!loading && !error && player && (
          <div className="detail-sections">
            <section className="detail-card detail-hero-card">
              <div className="detail-top">
                <img
                  src={imageSource}
                  alt={player.fullName}
                  className="detail-image"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = playerPlaceholderImage;
                  }}
                />

                <div className="detail-summary">
                  <h1>{player.fullName}</h1>
                  <div className="detail-inline">
                    <span>{player.country || 'Unknown'}</span>
                    <span className="role-chip">{player.position || 'Cricketer'}</span>
                  </div>
                  <ul className="detail-facts">
                    <li>{formatDate(player.dateOfBirth)}</li>
                    <li>{formatGender(player.gender)}</li>
                    <li>{formatPlayerStyle(player.battingStyle, 'batting')}</li>
                    <li>{formatPlayerStyle(player.bowlingStyle, 'bowling')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="detail-card">
              <h2>Career Stats</h2>
              {player.careerStats.length > 0 ? (
                player.careerStats.map((stat) => (
                  <div key={stat.type} className="career-block">
                    <h3>{stat.type}</h3>
                    <div className="career-grid">
                      <article className="career-stat">
                        <span>Matches</span>
                        <strong>{formatStatValue(stat.matches)}</strong>
                      </article>
                      <article className="career-stat">
                        <span>Runs</span>
                        <strong>{formatStatValue(stat.runs)}</strong>
                      </article>
                      <article className="career-stat">
                        <span>Wickets</span>
                        <strong>{formatStatValue(stat.wickets)}</strong>
                      </article>
                      <article className="career-stat">
                        <span>Average</span>
                        <strong>{formatStatValue(stat.average)}</strong>
                      </article>
                    </div>
                  </div>
                ))
              ) : (
                <p>No career statistics available.</p>
              )}
            </section>

            <section className="detail-card">
              <h2>Teams</h2>
              {player.teams.length > 0 ? (
                <ul className="team-chips">
                  {player.teams.map((team) => (
                    <li key={team}>{team}</li>
                  ))}
                </ul>
              ) : player.teamName ? (
                <ul className="team-chips">
                  <li>{player.teamName}</li>
                </ul>
              ) : (
                <p>No team information available.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}

export default PlayerDetailPage;
