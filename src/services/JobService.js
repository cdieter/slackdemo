/**
 * A service for job interactions
 */
import _ from 'lodash';
import decorate from 'decorate-it';
import config from 'config';
import ms from 'ms';
import {WebClient} from '@slack/client';
import logger from '../common/logger';

const slack = new WebClient(config.SLACK_TOKEN);

// timeout when retrying
const RETRY_INTERVAL = '1m';

// max retries so we can avoid infinite loop
const RETRY_MAX = 20;

// limit when queering slack API
// change to `1` to test pagination
const LIMIT = 100;

// following message types are ignored
// see https://api.slack.com/events/message
const ignoreMessages = {
  channel_join: true,
  channel_leave: true,
  group_leave: true,
  group_join: true,
};

// ------------------------------------
// Exports
// ------------------------------------

const JobService = {
  start,
};

decorate(JobService, 'JobService');

export default JobService;

let isRunning = false;
let timeoutId = null;

/**
 * Get minimum time for inactivity (in seconds).
 * @returns {number} the time
 * @private
 */
function _getMinTime() {
  const timestamp = Date.now() - ms(config.INACTIVITY_PERIOD);
  return timestamp / 1000;
}

/**
 * Get all slack rooms.
 * General channel is excluded because cannot be archived.
 * New channels (age less than INACTIVITY_PERIOD) are also excluded.
 * @param {String} type the room type 'channels' or 'groups'
 * @returns {Array}
 * @private
 */
async function _getAllRooms(type) {
  const rooms = [];
  const fetchRequest = async (cursor) => {
    const ret = await slack[type].list({
      limit: LIMIT,
      cursor,
      exclude_archived: true,
    });
    rooms.push(...ret[type]);
    const {next_cursor: nextCursor} = ret.response_metadata || {};
    if (nextCursor) {
      await fetchRequest(nextCursor);
    }
  };
  await fetchRequest();
  const minDate = _getMinTime();
  return rooms
    .filter((item) => !item.is_general && item.created < minDate)
    .map((item) => {
      item._type = type;
      return item;
    });
}

/**
 * Check if the channel/group has any new message
 * @param {Object} room the channel or group object
 * @returns {Boolean} the flag
 * @private
 */
async function _hasAnyMessage(room) {
  const fetchRequest = async (oldest) => {
    const ret = await slack[room._type].history(room.id, {
      count: LIMIT,
      oldest,
    });
    const anyValidMessage = ret.messages.some(
      (item) => !item.subtype || !ignoreMessages[item.subtype],
    );
    if (anyValidMessage) {
      return true;
    }
    if (ret.has_more && ret.messages[0]) {
      // fetch the next page
      return await fetchRequest(ret.messages[0].ts);
    }
    return false;
  };
  return await fetchRequest(_getMinTime());
}

/**
 * Start the job
 */
async function _startInner() {
  const result = await Promise.all(
    ['channels', 'groups'].map(_getAllRooms),
  ).then(_.flatten);
  await Promise.map(result, async (room) => {
    const valid = await _hasAnyMessage(room);
    if (valid) {
      return;
    }
    const sig = `#${room.name} (${room.id})`;
    try {
      await slack[room._type].archive(room.id);
      logger.info('archived channel', sig);
    } catch (e) {
      logger.error('failed to archive', sig, e);
    }
  });
}

/**
 * Start the job and retry if failed
 * @param {Number} retryLeft the number of retries left
 */
async function _startWithRetry(retryLeft = RETRY_MAX) {
  try {
    await _startInner();
  } catch (e) {
    if (retryLeft === 0) {
      throw e;
    }
    logger.error('job failed, trying to retry', e);
    await Promise.delay(ms(RETRY_INTERVAL));
    await _startWithRetry(retryLeft - 1);
  }
}

start.params = [];
start.schema = {};

/**
 * Start the job, and schedule the next job if previous is completed.
 */
function start() {
  if (isRunning) {
    return;
  }
  logger.info('starting job');
  clearTimeout(timeoutId);
  isRunning = true;
  _startWithRetry()
    .catch((e) => {
      logger.error('job failed', e);
    })
    .finally(() => {
      isRunning = false;
      timeoutId = setTimeout(start, ms(config.JOB_INTERVAL));
      logger.info('job finished');
    });
}
