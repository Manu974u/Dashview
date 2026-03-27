module.exports = {
  dependencies: {
    // ffmpeg-kit-react-native's Maven artifacts (com.arthenica:ffmpeg-kit-*:6.0-2)
    // are not published to any public Maven repository.  Disable Android autolinking
    // so Gradle does not try to resolve the missing AAR.  A JS stub in
    // src/stubs/ffmpeg-kit-react-native.ts provides the TypeScript API shape.
    'ffmpeg-kit-react-native': {
      platforms: {
        android: null,
      },
    },
  },
};
