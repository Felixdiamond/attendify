export const BLE_SERVICE_UUID =
  process.env.EXPO_PUBLIC_BLE_SERVICE_UUID ||
  "00000A1C-0000-1000-8000-00805F9B34FB";
export const BLE_COMPANY_ID = parseInt(
  process.env.EXPO_PUBLIC_BLE_COMPANY_ID || "0x0A1C",
  16,
);
export const HMAC_SECRET_KEY =
  process.env.EXPO_PUBLIC_HMAC_SECRET_KEY || "smartattend-hmac-secret-key-2025";

// BLE Configuration
export const BLE_SCAN_INTERVAL = 1000; // 1 second
export const BLE_BEACON_ROTATION_INTERVAL = 30000; // 30 seconds

// RSSI thresholds for distance calculation
export const RSSI_IMMEDIATE = -50; // Very close (< 1m)
export const RSSI_NEAR = -70; // Near (1-5m)
// Anything below -70 is considered "far"

// Default attendance session settings
export const DEFAULT_SESSION_RADIUS = 50; // meters
export const MIN_SESSION_RADIUS = 10; // meters
export const MAX_SESSION_RADIUS = 200; // meters
export const DEFAULT_SESSION_DURATION = 15; // minutes
export const MIN_SESSION_DURATION = 5; // minutes
export const MAX_SESSION_DURATION = 60; // minutes
