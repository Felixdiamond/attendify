import React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";

interface PermissionRequestProps {
  type: "bluetooth" | "location" | "both";
  onRequestPermissions: () => void;
  isRequesting?: boolean;
}

export const PermissionRequest: React.FC<PermissionRequestProps> = ({
  type,
  onRequestPermissions,
  isRequesting = false,
}) => {
  const getPermissionInfo = () => {
    switch (type) {
      case "bluetooth":
        return {
          title: "Bluetooth Permission Required",
          description:
            "Attendify uses Bluetooth to detect nearby attendance sessions. This allows you to mark attendance when you are physically present in class.",
          icon: "📡",
        };
      case "location":
        return {
          title: "Location Permission Required",
          description:
            "Attendify uses your location to verify you are within the classroom radius. This prevents proxy attendance and ensures accuracy.",
          icon: "📍",
        };
      case "both":
        return {
          title: "Permissions Required",
          description:
            "Attendify needs Bluetooth and Location permissions to detect attendance sessions and verify your presence in class.",
          icon: "🔐",
        };
    }
  };

  const info = getPermissionInfo();

  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <View
      className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View className="items-center mb-4">
        <Text className="text-4xl mb-2">{info.icon}</Text>
        <Text className="text-xl font-bold text-gray-900 dark:text-white text-center">
          {info.title}
        </Text>
      </View>

      <Text className="text-gray-600 dark:text-gray-300 text-center mb-6 leading-6">
        {info.description}
      </Text>

      <View className="space-y-3">
        <TouchableOpacity
          onPress={onRequestPermissions}
          disabled={isRequesting}
          className="bg-blue-500 py-3 px-6 rounded-lg"
          style={isRequesting ? { opacity: 0.5 } : undefined}
        >
          <Text className="text-white text-center font-semibold text-base">
            {isRequesting ? "Requesting..." : "Grant Permissions"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openSettings}
          className="bg-gray-100 dark:bg-gray-700 py-3 px-6 rounded-lg"
        >
          <Text className="text-gray-700 dark:text-gray-300 text-center font-medium text-base">
            Open Settings
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Text className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {type === "bluetooth" &&
            "Bluetooth is only used during attendance sessions"}
          {type === "location" &&
            "Location is only checked when marking attendance"}
          {type === "both" &&
            "Your data is only used for attendance verification"}
        </Text>
      </View>
    </View>
  );
};

interface PermissionDeniedProps {
  type: "bluetooth" | "location" | "both";
  onRetry?: () => void;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  type,
  onRetry,
}) => {
  const getMessage = () => {
    switch (type) {
      case "bluetooth":
        return "Bluetooth permission is required to scan for attendance sessions. Please enable it in your device settings.";
      case "location":
        return "Location permission is required to verify your presence in class. Please enable it in your device settings.";
      case "both":
        return "Bluetooth and Location permissions are required for attendance marking. Please enable them in your device settings.";
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <View
      className="rounded-lg p-4 border border-red-200 dark:border-red-800"
      style={{ backgroundColor: "#fef2f2" }}
    >
      <View className="flex-row items-start">
        <Text className="text-2xl mr-3">⚠️</Text>
        <View className="flex-1">
          <Text className="text-red-800 dark:text-red-200 font-semibold mb-2">
            Permission Denied
          </Text>
          <Text className="text-red-700 dark:text-red-300 text-sm mb-4">
            {getMessage()}
          </Text>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={openSettings}
              className="bg-red-600 py-2 px-4 rounded-md flex-1"
            >
              <Text className="text-white text-center font-medium text-sm">
                Open Settings
              </Text>
            </TouchableOpacity>
            {onRetry && (
              <TouchableOpacity
                onPress={onRetry}
                className="bg-gray-200 dark:bg-gray-700 py-2 px-4 rounded-md flex-1"
              >
                <Text className="text-gray-700 dark:text-gray-300 text-center font-medium text-sm">
                  Retry
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

interface BluetoothDisabledProps {
  onRetry?: () => void;
}

export const BluetoothDisabled: React.FC<BluetoothDisabledProps> = ({
  onRetry,
}) => {
  const openBluetoothSettings = () => {
    // On Android, this opens Bluetooth settings directly
    // On iOS, this opens general settings
    Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS").catch(() => {
      // Fallback to general settings if Bluetooth settings not available
      Linking.openSettings();
    });
  };

  return (
    <View
      className="rounded-lg p-4 border border-yellow-200 dark:border-yellow-800"
      style={{ backgroundColor: "#fefce8" }}
    >
      <View className="flex-row items-start">
        <Text className="text-2xl mr-3">📡</Text>
        <View className="flex-1">
          <Text className="text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
            Bluetooth is Disabled
          </Text>
          <Text className="text-yellow-700 dark:text-yellow-300 text-sm mb-4">
            Please enable Bluetooth on your device to scan for attendance
            sessions.
          </Text>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={openBluetoothSettings}
              className="bg-yellow-600 py-2 px-4 rounded-md flex-1"
            >
              <Text className="text-white text-center font-medium text-sm">
                Open Bluetooth Settings
              </Text>
            </TouchableOpacity>
            {onRetry && (
              <TouchableOpacity
                onPress={onRetry}
                className="bg-yellow-500 py-2 px-4 rounded-md flex-1"
              >
                <Text className="text-white text-center font-medium text-sm">
                  Check Again
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
