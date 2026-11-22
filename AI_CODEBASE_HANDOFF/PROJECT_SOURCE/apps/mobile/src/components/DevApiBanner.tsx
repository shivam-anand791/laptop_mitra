import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { API_BASE_URL, isTunnelMode } from '../config';

export function DevApiBanner() {
  const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
  const [dataSource, setDataSource] = useState<string>('Live');

  useEffect(() => {
    let mounted = true;
    const checkSource = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health/ready`, { method: 'GET' });
        const dsHeader = res.headers.get('x-data-source');
        if (mounted && dsHeader) {
          setDataSource(dsHeader.toUpperCase());
        }
      } catch {
        if (mounted) setDataSource('Unreachable');
      }
    };
    if (isDev) {
      void checkSource();
    }
    return () => {
      mounted = false;
    };
  }, [isDev]);

  if (!isDev) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text} numberOfLines={1}>
        [DEV] API: {API_BASE_URL} | Source: {dataSource} {isTunnelMode ? '(Tunnel)' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1e293b',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

