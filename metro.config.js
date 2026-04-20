const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver = {
	...(config.resolver ?? {}),
	extraNodeModules: {
		...(config.resolver?.extraNodeModules ?? {}),
		'react-native-linear-gradient': path.resolve(
			__dirname,
			'node_modules/expo-linear-gradient'
		),
	},
};

module.exports = withNativeWind(config, { input: './app/globals.css' });