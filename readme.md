# Archieve bot
Deployment Guide

### Description

## Prerequisites
1. Node 8.9
  1. NPM 5.5


## Configuration
Located under `config/default.json` override production settings in `config/production.json`

- **PORT** the port to listen. Set automatically in heroku.
- **VERBOSE_LOGGING** true if enable debug logging. Should be disabled for production.
- **JOB_INTERVAL** the job interval when archiving channels in Slack. Examples: `1m`, `5m`, `1h`.
- **INACTIVITY_PERIOD** the minimal inactive period when archiving channels. Examples `1d`, `10d`.
- **SLACK_TOKEN** the Slack access token.

See example values for all intervals https://www.npmjs.com/package/ms.
Interval values for development mode are short (for easy testing). Default values for production mode are much longer.

## Slack setup
- Create a new team http://slack.com/
- Get a token from https://api.slack.com/custom-integrations/legacy-tokens
- Click 'Create token' for your workspace. Use this value as `SLACK_TOKEN` in deployment sections.
- Important! It must be a token prefixed with `xoxp`, but it won't for bot tokens (prefixed with `xoxb`). The user must have admin access.


## Local Deployment
```bash
npm i
export SLACK_TOKEN=xyz # use `set` instead of `export` for Windows
npm run dev # dev mode with logging
npm start # production mode
```

## Heroku Deployment
```bash
git init
git add .
git commit -m init
heroku create
heroku config:set SLACK_TOKEN=xyz INACTIVITY_PERIOD=10d JOB_INTERVAL=5h
git push heroku master
heroku open # get the url
```

## Running Lint
```bash
npm run lint
```

## Verification

Video http://take.ms/J7oS3  
Change config to fast testing:
```
heroku config:set INACTIVITY_PERIOD=10s  JOB_INTERVAL=3s
```
NOTE: results from Slack API are paginated. Check `JobService`. You can try to change `LIMIT` to 1 to test pagination. These settings shouldn't be configurable.
I am using Slack-SDK, and it also performs retry strategy and concurrency limiting.  

Call manually JOB manually.  
Use postman and invoke `POST http://localhost:3100/start`

