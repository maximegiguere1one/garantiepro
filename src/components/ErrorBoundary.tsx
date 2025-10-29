import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logError } from '../lib/error-logger';
import { createErrorContext } from '../lib/error-types';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'app' | 'page' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const context = createErrorContext({
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
    });

    logError(error, context);

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo!, this.resetError);
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo!}
          reset={this.resetError}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  reset: () => void;
  level: 'app' | 'page' | 'component';
}

function DefaultErrorFallback({ error, errorInfo, reset, level }: FallbackProps) {
  const isAppLevel = level === 'app';
  const isPageLevel = level === 'page';

  const goHome = () => {
    window.location.href = '/';
  };

  const reload = () => {
    window.location.reload();
  };

  if (isAppLevel) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Une erreur s'est produite</h1>
              <p className="text-slate-600 mt-1">L'application a rencontré un problème inattendu</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-700 mb-2">
              <strong>Message d'erreur:</strong>
            </p>
            <p className="text-sm text-slate-600 font-mono">{error.message}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={reload}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Recharger l'application
            </button>
            <button
              onClick={goHome}
              className="w-full bg-slate-100 text-slate-900 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <details className="cursor-pointer">
              <summary className="text-sm font-medium text-slate-700 hover:text-slate-900">
                Détails techniques
              </summary>
              <div className="mt-3 bg-slate-900 text-slate-100 rounded p-3 text-xs font-mono overflow-auto max-h-64">
                <p className="mb-2">{error.stack}</p>
                {errorInfo?.componentStack && (
                  <>
                    <p className="mt-4 mb-2 text-slate-300">Component Stack:</p>
                    <p>{errorInfo.componentStack}</p>
                  </>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  if (isPageLevel) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Erreur de chargement</h2>
              <p className="text-sm text-slate-600">Cette page n'a pas pu se charger correctement</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">{error.message}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
            <button
              onClick={goHome}
              className="flex-1 bg-slate-100 text-slate-900 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900">Erreur de composant</h3>
          <p className="text-sm text-red-700 mt-1">{error.message}</p>
          <button
            onClick={reset}
            className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
