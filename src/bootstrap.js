/* eslint-disable no-magic-numbers */
/**
 * Configure all libraries
 */

import bluebird from 'bluebird';
import decorate from 'decorate-it';
import config from 'config';

global.Promise = bluebird;
require('babel-runtime/core-js/promise').default = bluebird; // eslint-disable-line import/no-commonjs

decorate.configure({
  debug: config.VERBOSE_LOGGING,
});

if (!config.SLACK_TOKEN) {
  throw new Error('SLACK_TOKEN is not set');
}
