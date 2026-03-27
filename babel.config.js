module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          'ffmpeg-kit-react-native': './src/stubs/ffmpeg-kit-react-native',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
