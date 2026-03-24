import { memo } from 'react';
import { Link } from 'react-router-dom';
import playerPlaceholderImage from '../assets/player-placeholder.svg';
import { formatDate } from '../utils/formatters';

/**
 * Purpose: Compact card representation for a player in the list view.
 * Why: Keeping cards lean improves scanability and keeps list rendering fast.
 */

/**
 * @param {{ player: {
 *   id: number|string,
 *   fullName: string,
 *   imageUrl?: string,
 *   country?: string,
 *   position?: string,
 *   dateOfBirth?: string
 * } }} props
 * @returns {JSX.Element}
 */
function PlayerCard({ player }) {
  const imageSource = player.imageUrl || playerPlaceholderImage;

  return (
    <article className="player-card">
      <Link className="player-link" to={`/players/${player.id}`}>
        <div className="player-card-media">
          <img
            src={imageSource}
            alt={player.fullName}
            className="player-image"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = playerPlaceholderImage;
            }}
          />
        </div>

        <div className="player-content">
          <h2 className="card-name">{player.fullName}</h2>

          <div className="meta-grid">
            <p>
              <strong>Country</strong>
              <span>{player.country || 'Unknown'}</span>
            </p>
            <p>
              <strong>Role</strong>
              <span>{player.position || 'Cricketer'}</span>
            </p>
            <p className="meta-wide">
              <strong>Date of Birth</strong>
              <span>{formatDate(player.dateOfBirth)}</span>
            </p>
          </div>

          <span className="view-more">View details</span>
        </div>
      </Link>
    </article>
  );
}

export default memo(PlayerCard);
