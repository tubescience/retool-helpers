// Using CommonJS require instead of ES6 import
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('rollup-plugin-terser').terser;

module.exports = {
  input: 'src/index.js',
  output: [
    {
    file: 'dist/retool-filter-to-sql.umd.js',
    format: 'umd',
    name: 'RetoolTableHelpers',
  },
  {
    file: 'dist/retool-filter-to-sql.cjs',
    format: 'cjs',
    name: 'RetoolTableHelpers',
  }
],
  plugins: [
    resolve(),
    commonjs(),
    terser(), // Optional: Minify the output
  ],
};
