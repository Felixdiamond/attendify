import { isBluetoothEnabled, requestPermissions, startBroadcasting, stopBroadcasting } from '@/lib/ble';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

interface BLEBeaconBroadcasterProps {
  sessionCode: string;
  sessionId: string;
  isActive: boolean;
  onError?: (error: Error) => void;
}

export const BLEBeaconBroadcaster: React.FC<BLEBeaconBroadcasterProps> = ({
  sessionCode,
  sessionId,
  isActive,
  onError,
}) => {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'broadcasting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const initBroadcasting = async () => {
      if (!isActive) {
        // Stop broadcasting if session is no longer active
        try {
          await stopBroadcasting();
          if (isMounted) {
            setStatus('idle');
          }
        } catch (error) {
          console.error('Error stopping broadcast:', error);
        }
        return;
      }

      try {
        setStatus('requesting');

        // Check if Bluetooth is enabled
        const bleEnabled = await isBluetoothEnabled();
        if (!bleEnabled) {
          const err = new Error('Bluetooth is not enabled. Please enable Bluetooth and try again.');
          console.error(err);
          if (isMounted) {
            setStatus('error');
            setErrorMessage(err.message);
          }
          Alert.alert('Bluetooth Disabled', err.message, [{ text: 'OK' }]);
          if (onError) onError(err);
          return;
        }

        // Request permissions
        const hasPermissions = await requestPermissions();
        if (!hasPermissions) {
          const err = new Error('Bluetooth and Location permissions are required to broadcast attendance sessions.');
          console.error(err);
          if (isMounted) {
            setStatus('error');
            setErrorMessage(err.message);
          }
          Alert.alert('Permissions Required', err.message, [{ text: 'OK' }]);
          if (onError) onError(err);
          return;
        }

        // Start broadcasting
        await startBroadcasting({ sessionCode, sessionId });
        
        if (isMounted) {
          setStatus('broadcasting');
          setErrorMessage('');
        }
      } catch (error) {
        console.error('Broadcasting error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to start broadcasting';
        
        if (isMounted) {
          setStatus('error');
          setErrorMessage(errorMsg);
        }

        // Show alert to user
        Alert.alert(
          'Broadcasting Error',
          errorMsg,
          [{ text: 'OK' }]
        );

        // Notify parent component
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    };

    initBroadcasting();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      stopBroadcasting().catch(console.error);
    };
  }, [isActive, sessionCode, sessionId, onError]);

  return (
    <View 
      className="rounded-lg p-4 border border-blue-200 dark:border-blue-800"
      style={{ backgroundColor: '#eff6ff' }}
    >
      <View className="flex-row items-center">
        {status === 'requesting' && (
          <>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text className="ml-3 text-blue-700 dark:text-blue-300 font-medium">
              Requesting permissions...
            </Text>
          </>
        )}

        {status === 'broadcasting' && (
          <>
            <View className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <Text className="ml-3 text-green-700 dark:text-green-300 font-medium">
              Broadcasting beacon
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View className="w-3 h-3 bg-red-500 rounded-full" />
            <Text className="ml-3 text-red-700 dark:text-red-300 font-medium">
              Broadcasting failed
            </Text>
          </>
        )}

        {status === 'idle' && (
          <>
            <View className="w-3 h-3 bg-gray-400 rounded-full" />
            <Text className="ml-3 text-gray-600 dark:text-gray-400 font-medium">
              Not broadcasting
            </Text>
          </>
        )}
      </View>

      {errorMessage && (
        <Text className="mt-2 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </Text>
      )}

      {status === 'broadcasting' && (
        <Text className="mt-2 text-xs text-blue-600 dark:text-blue-400">
          Students within range can now mark attendance
        </Text>
      )}
    </View>
  );
};
