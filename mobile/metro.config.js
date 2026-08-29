const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// lucide-react-native é distribuído em .mjs — o Metro não resolve essa
// extensão por padrão.
config.resolver.sourceExts.push('mjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
