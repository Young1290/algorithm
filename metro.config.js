// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
    // relative path to your global.css file
    cssEntryFile: './app/global.css',
    // path where we auto-generate typings
    dtsFile: './uniwind-types.d.ts'
});

