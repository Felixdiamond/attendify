/**
 * Validate Code Screen
 * 
 * Provides information about authentication codes for lecturers and HOCs.
 * Requirements: 2.1, 2.2, 2.3
 */

import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function ValidateCodeScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-8">
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Authentication Codes</Text>
          <Text className="text-base text-gray-600">
            Special codes are required for lecturer and HOC registration
          </Text>
        </View>

        {/* Lecturer Codes */}
        <View className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Text className="text-lg font-bold text-blue-900 mb-2">Lecturer Codes</Text>
          <Text className="text-sm text-gray-700 mb-2">
            Format: <Text className="font-mono font-semibold">LEC-YYYY-XXXX</Text>
          </Text>
          <Text className="text-sm text-gray-700">
            Lecturer authentication codes are provided by your department&apos;s Head of Course (HOC).
            Each code can only be used once.
          </Text>
        </View>

        {/* HOC Codes */}
        <View className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <Text className="text-lg font-bold text-purple-900 mb-2">HOC Codes</Text>
          <Text className="text-sm text-gray-700 mb-2">
            Format: <Text className="font-mono font-semibold">HOC-YYYY-XXXX</Text>
          </Text>
          <Text className="text-sm text-gray-700">
            Head of Course authentication codes are provided by the university administration.
            Each code can only be used once. HOCs must also have a valid LASU student email.
          </Text>
        </View>

        {/* Instructions */}
        <View className="mb-6 p-4 bg-gray-50 rounded-lg">
          <Text className="text-base font-semibold text-gray-900 mb-3">How to get your code:</Text>
          <View className="space-y-2">
            <View className="flex-row mb-2">
              <Text className="text-gray-700 mr-2">1.</Text>
              <Text className="flex-1 text-gray-700">
                Contact your department&apos;s HOC or university administration
              </Text>
            </View>
            <View className="flex-row mb-2">
              <Text className="text-gray-700 mr-2">2.</Text>
              <Text className="flex-1 text-gray-700">
                Verify your identity and role
              </Text>
            </View>
            <View className="flex-row mb-2">
              <Text className="text-gray-700 mr-2">3.</Text>
              <Text className="flex-1 text-gray-700">
                Receive your unique authentication code
              </Text>
            </View>
            <View className="flex-row">
              <Text className="text-gray-700 mr-2">4.</Text>
              <Text className="flex-1 text-gray-700">
                Use the code during registration (one-time use only)
              </Text>
            </View>
          </View>
        </View>

        {/* Important Notes */}
        <View className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <Text className="text-base font-semibold text-yellow-900 mb-2">Important Notes:</Text>
          <Text className="text-sm text-gray-700 mb-1">
            • Each code can only be used once
          </Text>
          <Text className="text-sm text-gray-700 mb-1">
            • Codes are case-sensitive
          </Text>
          <Text className="text-sm text-gray-700 mb-1">
            • Keep your code secure and do not share it
          </Text>
          <Text className="text-sm text-gray-700">
            • Contact administration if your code doesn&apos;t work
          </Text>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          className="bg-blue-500 rounded-lg py-4 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-white text-base font-semibold">Back to Registration</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
