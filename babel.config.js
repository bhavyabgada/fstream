module.exports = {
  presets: [
    'module:metro-react-native-babel-preset',
    '@babel/preset-typescript'
  ],
  plugins: [
    '@babel/plugin-transform-react-jsx',
    '@babel/plugin-transform-runtime',
    'react-native-reanimated/plugin',
  ],
};
