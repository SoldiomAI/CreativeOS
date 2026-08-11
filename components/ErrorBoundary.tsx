import React from 'react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('CreativeOS crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">😵</div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-gray-400 break-words">
            {this.state.error.message || 'Unexpected error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold hover:opacity-90 transition"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
