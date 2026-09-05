import React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export function OfflineBanner() {
  const [isVisible, setIsVisible] = React.useState(false);
  const translateY = React.useRef(new Animated.Value(-50)).current;

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected && state.isInternetReachable;
      if (!online) {
        setIsVisible(true);
        showBanner();
      } else {
        hideBanner();
      }
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      const online = state.isConnected && state.isInternetReachable;
      if (!online) {
        setIsVisible(true);
        showBanner();
      }
    });

    return () => unsubscribe();
  }, []);

  const showBanner = () => {
    translateY.setValue(-50);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const hideBanner = () => {
    Animated.timing(translateY, {
      toValue: -50,
      duration: 300,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setIsVisible(false));
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY }] },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>📵</Text>
        <Text style={styles.text}>No internet connection</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});