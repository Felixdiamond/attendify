# BLE Components Usage Guide

## Overview

This directory contains all BLE-related components for the Attendify attendance system.

## Components

### 1. BLEBeaconBroadcaster (Lecturer)

Broadcasts BLE beacon for attendance sessions.

```tsx
import { BLEBeaconBroadcaster } from "@/components/ble";

<BLEBeaconBroadcaster
  sessionCode="ABC123"
  sessionId="uuid-here"
  isActive={true}
  onError={(error) => console.error(error)}
/>;
```

### 2. BLEScanner (Student)

Scans for nearby BLE beacons.

```tsx
import { BLEScanner } from "@/components/ble";

<BLEScanner
  isScanning={true}
  onSessionDetected={(sessions) => {
    console.log("Detected sessions:", sessions);
  }}
  onScanningStateChange={(isScanning) => {
    console.log("Scanning state:", isScanning);
  }}
/>;
```

### 3. ProximityIndicator

Shows proximity level with color-coded badges.

```tsx
import { ProximityIndicator, ProximityBadge } from '@/components/ble';

// Full indicator with label
<ProximityIndicator
  distance="near"
  rssi={-65}
  size="medium"
  showLabel={true}
  showRSSI={true}
/>

// Simple badge
<ProximityBadge distance="immediate" />
```

### 4. Permission Components

UI components for requesting and handling permissions.

```tsx
import {
  PermissionRequest,
  PermissionDenied,
  BluetoothDisabled
} from '@/components/ble';

// Request permissions
<PermissionRequest
  type="both"
  onRequestPermissions={handleRequest}
  isRequesting={false}
/>

// Show when denied
<PermissionDenied
  type="bluetooth"
  onRetry={handleRetry}
/>

// Show when Bluetooth is off
<BluetoothDisabled onRetry={handleRetry} />
```

## BLE Service Functions

### Core Functions

```typescript
import {
  requestPermissions,
  startBroadcasting,
  stopBroadcasting,
  startScanning,
  calculateDistance,
  isBluetoothEnabled,
} from "@/lib/ble";

// Request permissions
const hasPermissions = await requestPermissions();

// Start broadcasting (lecturer)
await startBroadcasting({
  sessionCode: "ABC123",
  sessionId: "uuid-here",
});

// Stop broadcasting
await stopBroadcasting();

// Start scanning (student)
const cleanup = startScanning((session) => {
  console.log("Detected:", session);
});

// Stop scanning
cleanup();

// Calculate distance from RSSI
const distance = calculateDistance(-65); // 'immediate' | 'near' | 'far'

// Check Bluetooth status
const isEnabled = await isBluetoothEnabled();
```

## Platform Notes

### iOS

- Uses CoreLocation iBeacon API for broadcasting
- Requires native module for full implementation
- Background scanning supported with proper permissions

### Android

- Uses BLE Advertising API via `react-native-ble-advertiser`
- Requires Android 5.0+ (API 21+)
- Android 12+ requires new Bluetooth permissions
- Advertising payload rotates every 30 seconds and is HMAC signed

## Permissions Required

### iOS (Info.plist)

- NSBluetoothAlwaysUsageDescription
- NSLocationWhenInUseUsageDescription

### Android (AndroidManifest.xml)

- BLUETOOTH
- BLUETOOTH_ADMIN
- BLUETOOTH_SCAN (Android 12+)
- BLUETOOTH_ADVERTISE (Android 12+)
- BLUETOOTH_CONNECT (Android 12+)
- ACCESS_FINE_LOCATION

## Important Notes

1. **Development Builds Required**: BLE functionality requires Expo development builds, NOT Expo Go
2. **Physical Devices**: BLE must be tested on physical devices, not simulators
3. **Battery Usage**: BLE scanning can drain battery; stop scanning when not needed
4. **Range**: Typical BLE range is 30-50 meters in open space, less indoors
5. **RSSI Accuracy**: RSSI values can fluctuate; use averaging for better accuracy
6. **Custom Native Module**: Broadcasting depends on `react-native-ble-advertiser`, so keep your Expo dev client or native builds up to date after installing native dependencies.
