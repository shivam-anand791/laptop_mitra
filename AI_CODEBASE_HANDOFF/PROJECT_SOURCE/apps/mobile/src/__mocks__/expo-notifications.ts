export const addPushTokenListener = jest.fn();
export const getExpoPushTokenAsync = jest.fn();
export const getDevicePushTokenAsync = jest.fn();
export const requestPermissionsAsync = jest.fn();
export const setNotificationHandler = jest.fn();
export const addNotificationResponseReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));
export const addNotificationReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));

