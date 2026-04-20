import {
  BLE_BEACON_ROTATION_INTERVAL,
  BLE_COMPANY_ID,
  BLE_SERVICE_UUID,
  HMAC_SECRET_KEY,
  RSSI_IMMEDIATE,
  RSSI_NEAR,
} from "@/constants/BLE";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import {
  startAdvertising as startPeripheralAdvertising,
  stopAdvertising as stopPeripheralAdvertising,
  updateAdvertisingData as updatePeripheralAdvertisingData,
  type AdvertisingDataTypes,
} from "munim-bluetooth-peripheral";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, State } from "react-native-ble-plx";

type AndroidPermission =
  (typeof PermissionsAndroid)["PERMISSIONS"][keyof (typeof PermissionsAndroid)["PERMISSIONS"]];

// Types
export type ProximityLevel = "immediate" | "near" | "far";

export interface BeaconPayload {
  sessionCode: string;
  timestamp: number;
  signature: string;
}

export interface DetectedSession {
  uuid: string;
  sessionCode: string;
  rssi: number;
  distance: ProximityLevel;
  lastSeen: Date;
}

export interface BroadcastConfig {
  sessionCode: string;
  sessionId: string;
}

// BLE Manager instance (singleton)
let bleManager: BleManager | null = null;
let broadcastInterval: ReturnType<typeof setInterval> | null = null;
let isBroadcasting = false;
let lastBroadcastPayload: BeaconPayload | null = null;

const hexToBytes = (hex: string): Uint8Array => {
  const sanitized = hex.trim();
  if (sanitized.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }

  const bytes = new Uint8Array(sanitized.length / 2);
  for (let i = 0; i < sanitized.length; i += 2) {
    bytes[i / 2] = parseInt(sanitized.slice(i, i + 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const base64ToBytes = (data: string): Uint8Array => {
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Fallback using Buffer if available (Metro polyfills Buffer on RN >=0.63)
  const globalBuffer = (globalThis as any)?.Buffer as
    | { from: (input: string, encoding: "base64") => Uint8Array }
    | undefined;
  if (globalBuffer) {
    return Uint8Array.from(globalBuffer.from(data, "base64"));
  }

  throw new Error("No base64 decoder available");
};

const encodeBeaconPayload = (payload: BeaconPayload): Uint8Array => {
  const sessionCodeBytes = new Uint8Array(payload.sessionCode.length);
  for (let i = 0; i < payload.sessionCode.length; i++) {
    sessionCodeBytes[i] = payload.sessionCode.charCodeAt(i);
  }

  const signatureBytes = hexToBytes(payload.signature);
  const buffer = new Uint8Array(
    2 + sessionCodeBytes.length + signatureBytes.length,
  );

  buffer[0] = 1; // payload version
  buffer[1] = sessionCodeBytes.length;
  buffer.set(sessionCodeBytes, 2);

  const offset = 2 + sessionCodeBytes.length;
  buffer.set(signatureBytes, offset);

  return buffer;
};

const buildManufacturerDataHex = (payload: BeaconPayload): string => {
  const payloadHex = bytesToHex(encodeBeaconPayload(payload)).toUpperCase();
  return payloadHex;
};

const createAdvertisingDataFromPayload = (
  payload: BeaconPayload,
): AdvertisingDataTypes => {
  return {
    manufacturerData: buildManufacturerDataHex(payload),
  };
};

const startPeripheralBroadcast = (payload: BeaconPayload): void => {
  const advertisingData = createAdvertisingDataFromPayload(payload);
  console.log("📡 [BLE] Starting broadcast with:", {
    sessionCode: payload.sessionCode,
    serviceUUID: BLE_SERVICE_UUID,
    manufacturerData:
      advertisingData.manufacturerData?.substring(0, 20) + "...",
  });

  startPeripheralAdvertising({
    serviceUUIDs: [BLE_SERVICE_UUID],
    advertisingData,
  });

  lastBroadcastPayload = payload;
};

const updatePeripheralBroadcast = (payload: BeaconPayload): void => {
  updatePeripheralAdvertisingData(createAdvertisingDataFromPayload(payload));
  lastBroadcastPayload = payload;
};

const decodeBeaconPayload = (bytes: Uint8Array): BeaconPayload | null => {
  if (bytes.length < 2 + 2) {
    return null;
  }

  const version = bytes[0];
  if (version !== 1) {
    return null;
  }

  const sessionCodeLength = bytes[1];
  const expectedLength = 2 + sessionCodeLength;
  if (sessionCodeLength <= 0 || expectedLength > bytes.length) {
    return null;
  }

  const sessionCodeChars: string[] = [];
  for (let i = 0; i < sessionCodeLength; i++) {
    sessionCodeChars.push(String.fromCharCode(bytes[2 + i]));
  }

  const signatureOffset = 2 + sessionCodeLength;
  const signatureBytes = bytes.slice(signatureOffset);

  if (signatureBytes.length < 2) {
    return null;
  }

  return {
    sessionCode: sessionCodeChars.join(""),
    timestamp: Date.now(),
    signature: bytesToHex(signatureBytes),
  };
};

/**
 * Get or create BLE Manager instance
 */
export const getBleManager = (): BleManager | null => {
  if (!bleManager) {
    try {
      bleManager = new BleManager();
    } catch (error) {
      console.error(
        "Failed to create BLE Manager. BLE may not be available in this environment:",
        error,
      );
      return null;
    }
  }
  return bleManager;
};

/**
 * Request Bluetooth and Location permissions
 * Platform-specific implementation
 */
export const requestPermissions = async (): Promise<boolean> => {
  try {
    // Request location permissions (required for BLE on both platforms)
    const { status: locationStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (locationStatus !== "granted") {
      console.error("Location permission denied");
      return false;
    }

    // Android-specific Bluetooth permissions
    if (Platform.OS === "android") {
      const apiLevel = Platform.Version;

      // Android 12+ (API 31+) requires new Bluetooth permissions
      if (apiLevel >= 31) {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED,
        );

        if (!allGranted) {
          console.error("Bluetooth permissions denied on Android 12+");
          return false;
        }
      } else {
        // Android 11 and below
        const legacyPermissions: AndroidPermission[] = [
          "android.permission.BLUETOOTH" as AndroidPermission,
          "android.permission.BLUETOOTH_ADMIN" as AndroidPermission,
          PermissionsAndroid.PERMISSIONS
            .ACCESS_FINE_LOCATION as AndroidPermission,
        ];

        const granted =
          await PermissionsAndroid.requestMultiple(legacyPermissions);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED,
        );

        if (!allGranted) {
          console.error("Bluetooth permissions denied on Android");
          return false;
        }
      }
    }

    // Check if Bluetooth is enabled
    const manager = getBleManager();
    if (!manager) {
      console.error("BLE Manager not available");
      return false;
    }
    const state = await manager.state();

    if (state !== State.PoweredOn) {
      console.error("Bluetooth is not powered on:", state);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return false;
  }
};

/**
 * Generate HMAC signature for beacon payload
 */
const generateSignature = async (sessionCode: string): Promise<string> => {
  const data = `${sessionCode}:${HMAC_SECRET_KEY}`;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data,
  );
  return hash.substring(0, 4); // 2 bytes, keeps advertising payload compact
};

/**
 * Generate beacon payload with HMAC signature
 */
export const generateBeaconPayload = async (
  sessionCode: string,
): Promise<BeaconPayload> => {
  const signature = await generateSignature(sessionCode);

  return {
    sessionCode,
    timestamp: Date.now(),
    signature,
  };
};

/**
 * Verify beacon payload signature
 */
export const verifyBeaconPayload = async (
  payload: BeaconPayload,
): Promise<boolean> => {
  const expectedSignature = await generateSignature(payload.sessionCode);
  return payload.signature === expectedSignature;
};

/**
 * Calculate distance category from RSSI value
 */
export const calculateDistance = (rssi: number): ProximityLevel => {
  if (rssi > RSSI_IMMEDIATE) {
    return "immediate";
  } else if (rssi > RSSI_NEAR) {
    return "near";
  } else {
    return "far";
  }
};

/**
 * Parse beacon manufacturer data to extract session code
 * Note: react-native-ble-plx returns manufacturer data as base64 with Company ID as first 2 bytes
 */
const parseManufacturerData = async (
  data: string,
  deviceId?: string,
): Promise<BeaconPayload | null> => {
  try {
    const bytes = base64ToBytes(data);

    // Debug: Log first few bytes of every device's manufacturer data
    const hexPreview = Array.from(bytes.slice(0, 10))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");

    // Manufacturer data format from scanner: [CompanyID Low] [CompanyID High] [Payload...]
    // We need at least 2 bytes for Company ID + our payload
    if (bytes.length < 4) {
      return null;
    }

    // Extract Company ID (little-endian)
    const companyIdLow = bytes[0];
    const companyIdHigh = bytes[1];
    const receivedCompanyId = (companyIdHigh << 8) | companyIdLow;

    // Log Company ID for debugging - only for the first 10 unique devices
    console.log(
      `🔍 [BLE] Device ${deviceId?.slice(-6) || "?"}: CompanyID=0x${receivedCompanyId.toString(16).padStart(4, "0")} (expecting 0x${BLE_COMPANY_ID.toString(16).padStart(4, "0")}) bytes=[${hexPreview}]`,
    );

    let payloadBytes: Uint8Array | null = null;

    if (receivedCompanyId === BLE_COMPANY_ID) {
      payloadBytes = bytes.slice(2);
      console.log(
        "✅ [BLE] Found beacon with expected Company ID:",
        receivedCompanyId.toString(16),
      );
    } else if (receivedCompanyId === 0x0000) {
      // munim-bluetooth-peripheral currently sets Android manufacturer ID to 0x0000.
      // Accept payload after 0x0000 and keep a legacy fallback where payload starts with company ID.
      if (bytes.length >= 6) {
        const embeddedCompanyId = (bytes[3] << 8) | bytes[2];
        if (embeddedCompanyId === BLE_COMPANY_ID) {
          payloadBytes = bytes.slice(4);
          console.log(
            "✅ [BLE] Found legacy beacon payload with embedded Company ID",
          );
        }
      }

      if (!payloadBytes) {
        payloadBytes = bytes.slice(2);
      }
    } else {
      // Not our beacon, silently ignore
      return null;
    }

    // Decode payload
    const payload = decodeBeaconPayload(payloadBytes);
    if (!payload) {
      console.warn(
        "🔍 [BLE] Could not decode beacon payload, payloadBytes length:",
        payloadBytes.length,
      );
      return null;
    }

    const isValid = await verifyBeaconPayload(payload);
    if (!isValid) {
      console.warn(
        "🔍 [BLE] Invalid beacon signature for session:",
        payload.sessionCode,
      );
      return null;
    }

    return payload;
  } catch (error) {
    // Only log actual errors, not parsing failures from other devices
    return null;
  }
};

/**
 * Start BLE beacon broadcasting (Lecturer)
 * Platform-specific implementation
 */
export const startBroadcasting = async (
  config: BroadcastConfig,
): Promise<void> => {
  try {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      throw new Error("Bluetooth or Location permissions not granted");
    }

    const payload = await generateBeaconPayload(config.sessionCode);
    startPeripheralBroadcast(payload);

    if (broadcastInterval) {
      clearInterval(broadcastInterval);
    }

    broadcastInterval = setInterval(() => {
      void (async () => {
        try {
          const refreshedPayload = await generateBeaconPayload(
            config.sessionCode,
          );
          updatePeripheralBroadcast(refreshedPayload);
        } catch (rotationError) {
          console.error("Error refreshing beacon payload:", rotationError);
        }
      })();
    }, BLE_BEACON_ROTATION_INTERVAL);

    isBroadcasting = true;
  } catch (error) {
    console.error("Error starting broadcast:", error);
    await stopBroadcasting();
    throw error;
  }
};

/**
 * Stop BLE beacon broadcasting
 */
export const stopBroadcasting = async (): Promise<void> => {
  try {
    if (broadcastInterval) {
      clearInterval(broadcastInterval);
      broadcastInterval = null;
    }

    isBroadcasting = false;
    lastBroadcastPayload = null;

    try {
      stopPeripheralAdvertising();
    } catch (error) {
      // Some platforms may throw if advertising was not active; ignore
    }
  } catch (error) {
    console.error("Error stopping broadcast:", error);
    throw error;
  }
};

/**
 * Start scanning for BLE beacons (Student)
 * Returns a cleanup function to stop scanning
 */
export const startScanning = (
  onSessionDetected: (session: DetectedSession) => void,
): (() => void) => {
  const manager = getBleManager();
  if (!manager) {
    console.error("BLE Manager not available, cannot start scanning");
    return () => {};
  }

  const detectedSessions = new Map<string, DetectedSession>();
  let isCancelled = false;

  // Permissions are requested by the caller before invoking startScanning.
  Promise.resolve().then(() => {
    if (isCancelled) {
      return;
    }

    // Start scanning for devices with our service UUID
    console.log(
      "🔍 [BLE] Starting scan, looking for Company ID:",
      BLE_COMPANY_ID.toString(16),
    );

    manager.startDeviceScan(
      null, // Scan all devices; we filter by manufacturer data company ID
      { allowDuplicates: true },
      (error, device) => {
        if (isCancelled) {
          return;
        }

        if (error) {
          console.error("🔍 [BLE] Scan error:", error);
          return;
        }

        if (!device) return;

        // Extract manufacturer data
        const manufacturerData = device.manufacturerData;
        if (!manufacturerData) return;

        // Try to parse - will only succeed if Company ID matches
        parseManufacturerData(manufacturerData, device.id).then((payload) => {
          if (isCancelled) {
            return;
          }

          if (!payload) {
            return;
          }

          console.log("✅ [BLE] Valid Attendify beacon detected:", {
            sessionCode: payload.sessionCode,
            rssi: device.rssi,
            deviceId: device.id,
          });

          // Calculate distance from RSSI
          const rssi = device.rssi || -100;
          const distance = calculateDistance(rssi);

          // Create or update detected session
          const session: DetectedSession = {
            uuid: device.id,
            sessionCode: payload.sessionCode,
            rssi,
            distance,
            lastSeen: new Date(),
          };

          // Update map and notify callback
          detectedSessions.set(payload.sessionCode, session);
          onSessionDetected(session);

          // Clean up old sessions (not seen in 5 seconds)
          const now = Date.now();
          for (const [code, sess] of detectedSessions.entries()) {
            if (now - sess.lastSeen.getTime() > 5000) {
              detectedSessions.delete(code);
            }
          }
        });
      },
    );
  });

  // Return cleanup function
  return () => {
    isCancelled = true;
    void manager.stopDeviceScan().catch((error) => {
      console.warn("🔍 [BLE] stopDeviceScan failed:", error);
    });
    detectedSessions.clear();
  };
};

/**
 * Check if Bluetooth is enabled
 */
export const isBluetoothEnabled = async (): Promise<boolean> => {
  try {
    const manager = getBleManager();
    if (!manager) {
      return false;
    }
    const state = await manager.state();
    return state === State.PoweredOn;
  } catch (error) {
    console.error("Error checking Bluetooth state:", error);
    return false;
  }
};

/**
 * Destroy BLE manager instance
 */
export const destroyBleManager = (): void => {
  if (bleManager) {
    try {
      bleManager.destroy();
    } catch (error) {
      console.error("Error destroying BLE manager:", error);
    }
    bleManager = null;
  }
};
