import { Link, useLocation } from 'react-router-dom';

/**
 * Purpose: Minimal global header for route-level navigation.
 * Why: A small, stable header keeps the interface focused on data-heavy content.
 */
/**
 * Renders the top navigation bar.
 *
 * @returns {JSX.Element}
 */
function AppHeader() {
  const location = useLocation();
  const isPlayersPage = location.pathname === '/';

  return (
    <header className="cb-topbar">
      <div className="cb-topbar-inner">
        <div className="cb-label">Player Directory</div>

        <nav className="cb-nav" aria-label="Primary">
          <Link to="/" className={isPlayersPage ? 'active' : ''}>
            All Players
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default AppHeader;
