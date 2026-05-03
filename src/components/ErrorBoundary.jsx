import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Caught by ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#7f1d1d', color: '#fca5a5', borderRadius: '8px' }}>
          <h2>WebGL Context Crash</h2>
          <p>{this.state.error?.toString()}</p>
          <button onClick={() => window.location.reload()}>Reload Engine</button>
        </div>
      );
    }
    return this.props.children;
  }
}
