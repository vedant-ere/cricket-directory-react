import { Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import PlayersPage from './pages/PlayersPage';
import PlayerDetailPage from './pages/PlayerDetailPage';

/**
 * Purpose: Declares top-level routes for the cricket player directory.
 * Why: Keeping route definitions centralized makes navigation behavior easier to audit.
 */
function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ErrorBoundary>
            <PlayersPage />
          </ErrorBoundary>
        }
      />
      <Route
        path="/players/:playerId"
        element={
          <ErrorBoundary>
            <PlayerDetailPage />
          </ErrorBoundary>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
