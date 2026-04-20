import {
    DetectedSession,
    isBluetoothEnabled,
    requestPermissions,
    startScanning,
} from "@/lib/ble";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

interface BLEScannerProps {
  onSessionDetected: (sessions: DetectedSession[]) => void;
  isScanning: boolean;
  onScanningStateChange?: (isScanning: boolean) => void;
}

export const BLEScanner: React.FC<BLEScannerProps> = ({
  onSessionDetected,
  isScanning,
  onScanningStateChange,
}) => {
  const [status, setStatus] = useState<
    "idle" | "requesting" | "scanning" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [detectedSessions, setDetectedSessions] = useState<
    Map<string, DetectedSession>
  >(new Map());
  const [showBluetoothDialog, setShowBluetoothDialog] = useState(false);

  // Keep a stable ref to the parent callback so the scanning effect doesn't restart
  const onSessionDetectedRef = useRef(onSessionDetected);
  useEffect(() => {
    onSessionDetectedRef.current = onSessionDetected;
  }, [onSessionDetected]);

  // Notify parent whenever the local sessions map changes (outside state updater)
  useEffect(() => {
    onSessionDetectedRef.current(Array.from(detectedSessions.values()));
  }, [detectedSessions]);

  const handleSessionUpdate = useCallback((session: DetectedSession) => {
    setDetectedSessions((prev) => {
      const updated = new Map(prev);
      updated.set(session.sessionCode, session);
      return updated;
    });
  }, []);

  const requestPermissionsAndStart = async () => {
    try {
      setStatus("requesting");
      setErrorMessage("");

      // Check if Bluetooth is enabled
      const bleEnabled = await isBluetoothEnabled();
      if (!bleEnabled) {
        setShowBluetoothDialog(true);
        return false;
      }

      // Request permissions
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        throw new Error(
          "Bluetooth and Location permissions are required to scan for attendance sessions.",
        );
      }

      return true;
    } catch (error) {
      console.error("Permission error:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to get permissions";

      setStatus("error");
      setErrorMessage(errorMsg);

      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: errorMsg,
      });

      onScanningStateChange?.(false);
      return false;
    }
  };

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const initScanning = async () => {
      if (!isScanning) {
        // Stop scanning
        if (cleanup) {
          cleanup();
          cleanup = null;
        }
        setStatus("idle");
        setDetectedSessions(new Map());
        onSessionDetected([]);
        return;
      }

      // Request permissions first
      const hasPermissions = await requestPermissionsAndStart();
      if (!hasPermissions) {
        return;
      }

      // Start scanning
      setStatus("scanning");
      cleanup = startScanning(handleSessionUpdate);
    };

    initScanning();

    // Cleanup on unmount or when scanning stops
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [
    isScanning,
    handleSessionUpdate,
    onSessionDetected,
    onScanningStateChange,
  ]);

  // Clean up old sessions periodically
  useEffect(() => {
    if (status !== "scanning") return;

    const interval = setInterval(() => {
      const now = Date.now();
      setDetectedSessions((prev) => {
        const updated = new Map(prev);
        let hasChanges = false;

        for (const [code, session] of updated.entries()) {
          // Remove sessions not seen in 5 seconds
          if (now - session.lastSeen.getTime() > 5000) {
            updated.delete(code);
            hasChanges = true;
          }
        }

        if (hasChanges) {
          onSessionDetected(Array.from(updated.values()));
        }

        return updated;
      });
    }, 1500); // Check every 1.5 seconds

    return () => clearInterval(interval);
  }, [status, onSessionDetected]);

  const handleBluetoothCancel = () => {
    setShowBluetoothDialog(false);
    // Don't throw — update UI and notify parent that scanning should stop
    setStatus("idle");
    setErrorMessage("Bluetooth is not enabled.");
    onScanningStateChange?.(false);
    Toast.show({
      type: "error",
      text1: "Bluetooth Disabled",
      text2: "Please enable Bluetooth to scan for attendance sessions.",
    });
  };

  const handleBluetoothOpenSettings = async () => {
    setShowBluetoothDialog(false);
    try {
      await import("react-native").then(({ Linking }) =>
        Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS").catch(() =>
          Linking.openSettings(),
        ),
      );
    } catch (err) {
      console.error("Failed to open settings:", err);
    }
    // If we can't open settings or if Bluetooth remains off, stop scanning
    setStatus("idle");
    setErrorMessage("Bluetooth is not enabled.");
    onScanningStateChange?.(false);
    Toast.show({
      type: "info",
      text1: "Open Settings",
      text2: "Please enable Bluetooth in your device settings and retry.",
    });
  };

  const retryScanning = async () => {
    setStatus("idle");
    setErrorMessage("");
    onScanningStateChange?.(true);
  };

  return (
    <>
      <View className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border-2 border-neutral-200 dark:border-neutral-800">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {status === "requesting" && (
              <>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text className="ml-4 text-neutral-700 dark:text-neutral-300 font-bold tracking-tight">
                  Requesting permissions...
                </Text>
              </>
            )}

            {status === "scanning" && (
              <>
                <ActivityIndicator size="small" color="#10B981" />
                <Text className="ml-4 text-[#047857] dark:text-[#6EE7B7] font-bold tracking-tight">
                  Scanning for sessions...
                </Text>
              </>
            )}

            {status === "error" && (
              <>
                <View className="w-3.5 h-3.5 bg-[#EF4444] rounded-lg border-2 border-[#DC2626]" />
                <Text className="ml-4 text-[#DC2626] dark:text-[#FCA5A5] font-bold tracking-tight">
                  Scanning failed
                </Text>
              </>
            )}

            {status === "idle" && (
              <>
                <View className="w-3.5 h-3.5 bg-neutral-400 rounded-lg border-2 border-neutral-500" />
                <Text className="ml-4 text-neutral-600 dark:text-neutral-400 font-bold tracking-tight">
                  Not scanning
                </Text>
              </>
            )}
          </View>

          {status === "error" && (
            <TouchableOpacity
              onPress={retryScanning}
              className="bg-[#4F46E5] px-4 py-2 rounded-lg border-2 border-[#4338CA] active:scale-95"
            >
              <Text className="text-white text-sm font-bold tracking-tight">
                Retry
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {errorMessage && (
          <View className="mt-3 bg-[#FEE2E2] dark:bg-[#7F1D1D] p-3 rounded-lg border-2 border-[#FECACA] dark:border-[#DC2626]">
            <Text className="text-sm text-[#DC2626] dark:text-[#FCA5A5] font-semibold tracking-tight">
              {errorMessage}
            </Text>
          </View>
        )}

        {status === "scanning" && (
          <View className="mt-3">
            <Text className="text-sm text-neutral-600 dark:text-neutral-400 tracking-tight">
              {detectedSessions.size === 0
                ? "No sessions detected nearby"
                : `Found ${detectedSessions.size} session${detectedSessions.size !== 1 ? "s" : ""}`}
            </Text>
          </View>
        )}
      </View>

      <Modal
        visible={showBluetoothDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBluetoothDialog(false)}
      >
        <View
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        >
          <View
            className="mx-6 bg-white dark:bg-neutral-900 rounded-2xl p-6 border-2 border-neutral-200 dark:border-neutral-800"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.3,
              shadowRadius: 30,
              elevation: 20,
            }}
          >
            <View className="items-center mb-5">
              {/* Icon Container */}
              <View className="w-16 h-16 rounded-xl bg-[#EEF2FF] dark:bg-[#312E81] items-center justify-center mb-4 border-2 border-[#C7D2FE] dark:border-[#4F46E5]">
                <Ionicons name="bluetooth-outline" size={32} color="#4F46E5" />
              </View>

              {/* Title */}
              <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-0 mb-2 tracking-tight text-center">
                Bluetooth is Off
              </Text>

              {/* Description */}
              <Text className="text-center text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed tracking-tight">
                Bluetooth is required to scan for attendance sessions. Would you
                like to open Bluetooth settings?
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleBluetoothCancel}
                className="flex-1 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 active:scale-95"
              >
                <Text className="text-neutral-700 dark:text-neutral-200 font-bold text-center tracking-tight text-sm">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleBluetoothOpenSettings}
                className="flex-1 py-3 rounded-xl bg-[#4F46E5] border-2 border-[#4338CA] active:scale-95"
              >
                <Text className="text-white font-bold text-center tracking-tight text-sm">
                  Open Settings
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
