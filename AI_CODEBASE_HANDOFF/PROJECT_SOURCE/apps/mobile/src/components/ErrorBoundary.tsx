import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | undefined;
  errorInfo?: ErrorInfo | undefined;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // In development mode, display informative debugging details
      const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
      if (isDev) {
        return (
          <View style={styles.devContainer}>
            <Text style={styles.devHeader}>[Development Mode] Runtime Error</Text>
            <ScrollView style={styles.devScroll}>
              <Text style={styles.devErrorTitle}>{this.state.error?.name || 'Error'}: {this.state.error?.message}</Text>
              {this.state.error?.stack && (
                <Text style={styles.devStack}>{this.state.error.stack}</Text>
              )}
              {this.state.errorInfo?.componentStack && (
                <Text style={styles.devComponentStack}>
                  Component Stack:
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.devRetryBtn} onPress={this.handleRetry}>
              <Text style={styles.devRetryBtnText}>Reload Component Tree</Text>
            </TouchableOpacity>
          </View>
        );
      }

      // In production mode, display friendly customer-facing error screen
      return (
        <View style={styles.prodContainer}>
          <Text style={styles.prodTitle}>Something went wrong</Text>
          <Text style={styles.prodSubtitle}>
            We apologize for the inconvenience. Please try again or reopen the app.
          </Text>
          <TouchableOpacity style={styles.prodRetryBtn} onPress={this.handleRetry}>
            <Text style={styles.prodRetryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  prodContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  prodTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  prodSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    maxWidth: 280,
  },
  prodRetryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  prodRetryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  devContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  devHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 12,
  },
  devScroll: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  devErrorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f87171',
    marginBottom: 8,
  },
  devStack: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#d1d5db',
    marginBottom: 12,
  },
  devComponentStack: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#9ca3af',
  },
  devRetryBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  devRetryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
