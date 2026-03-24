import { Component } from 'react';

/**
 * Purpose: Prevent a full white screen by catching unexpected render-time errors.
 * Why: Route-level isolation lets users recover instead of refreshing the whole app.
 */
class ErrorBoundary extends Component {
  /**
   * Initializes error boundary state.
   *
   * @param {object} props
   */
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
    };
  }

  /**
   * Syncs fallback state when a render error is thrown below this boundary.
   *
   * @param {Error} error
   * @returns {{hasError: boolean, message: string}}
   */
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected UI error.',
    };
  }

  /**
   * Receives the original error for optional diagnostic logging.
   *
   * @param {Error} error
   * @returns {void}
   */
  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      // Development logging stays here so debugging remains easy without noisy production logs.
      console.error('[ErrorBoundary]', error);
    }
  }

  /**
   * Clears error state so the subtree can attempt to render again.
   *
   * @returns {void}
   */
  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  /**
   * Renders either normal children or fallback error UI.
   *
   * @returns {JSX.Element}
   */
  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="page-shell">
        <section className="state-text error" role="alert">
          <p>{this.state.message}</p>
          <button type="button" onClick={this.handleReset}>
            Try again
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
