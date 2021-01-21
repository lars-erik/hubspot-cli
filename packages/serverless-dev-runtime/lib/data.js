const fs = require('fs-extra');
const { logger } = require('@hubspot/cli-lib/logger');
const { getDotEnvData } = require('./secrets');
const { MOCK_DATA, MAX_SECRETS } = require('./constants');

const getValidatedFunctionData = path => {
  // Allow passing serverless folder path with and without .functions extension
  const splitPath = path.split('.');
  const functionPath =
    splitPath[splitPath.length - 1] === 'functions'
      ? path
      : `${path}.functions`;

  if (!fs.existsSync(functionPath)) {
    logger.error(`The path ${functionPath} does not exist.`);
    return;
  } else {
    const stats = fs.lstatSync(functionPath);
    if (!stats.isDirectory()) {
      logger.error(`${functionPath} is not a valid functions directory.`);
      return;
    }
  }

  const { endpoints = [], environment = {}, secrets = [] } = JSON.parse(
    fs.readFileSync(`${functionPath}/serverless.json`, {
      encoding: 'utf-8',
    })
  );
  const routes = Object.keys(endpoints);

  if (!routes.length) {
    logger.error(`No endpoints found in ${functionPath}/serverless.json.`);
    return;
  }

  if (secrets.length > MAX_SECRETS) {
    logger.warn(
      `This function currently exceeds the limit of ${MAX_SECRETS} secrets. See https://developers.hubspot.com/docs/cms/features/serverless-functions#know-your-limits for more info.`
    );
  }

  return {
    srcPath: functionPath,
    endpoints,
    environment,
    routes,
    secrets,
  };
};

const getHeaders = req => {
  const reqHeaders = req.headers;

  return {
    Accept: reqHeaders.accept,
    'Accept-Encoding': reqHeaders['accept-encoding'],
    'Accept-Language': reqHeaders['accept-language'],
    'Cache-Control': reqHeaders['cache-control'],
    Connection: reqHeaders.connection,
    Cookie: reqHeaders.cookie,
    Host: reqHeaders.host,
    'True-Client-IP': req.ip, // https://stackoverflow.com/a/14631683/3612910
    'upgrade-insecure-requests': reqHeaders['upgrade-insecure-requests'],
    'User-Agent': reqHeaders['user-agent'],
    'X-Forwarded-For':
      req.headers['x-forwarded-for'] || req.connection.remoteAddress, // https://stackoverflow.com/a/14631683/3612910
  };
};

const getFunctionDataContext = async (
  req,
  functionPath,
  allowedSecrets,
  accountId,
  contact
) => {
  const {
    secrets,
    mockData: {
      HUBSPOT_LIMITS_TIME_REMAINING,
      HUBSPOT_LIMITS_EXECUTIONS_REMAINING,
      HUBSPOT_CONTACT_VID,
      HUBSPOT_CONTACT_IS_LOGGED_IN,
      HUBSPOT_CONTACT_LIST_MEMBERSHIPS,
    },
  } = getDotEnvData(functionPath, allowedSecrets);
  const data = {
    secrets,
    params: req.query,
    limits: {
      timeRemaining:
        HUBSPOT_LIMITS_TIME_REMAINING ||
        MOCK_DATA.HUBSPOT_LIMITS_TIME_REMAINING,
      executionsRemaining:
        HUBSPOT_LIMITS_EXECUTIONS_REMAINING ||
        MOCK_DATA.HUBSPOT_LIMITS_EXECUTIONS_REMAINING,
    },
    body: req.body,
    headers: getHeaders(req),
    accountId,
    contact:
      contact === 'true' || contact === true
        ? {
            vid: HUBSPOT_CONTACT_VID || MOCK_DATA.HUBSPOT_CONTACT_VID,
            isLoggedIn:
              HUBSPOT_CONTACT_IS_LOGGED_IN ||
              MOCK_DATA.HUBSPOT_CONTACT_IS_LOGGED_IN,
            listMemberships:
              (HUBSPOT_CONTACT_LIST_MEMBERSHIPS &&
                HUBSPOT_CONTACT_LIST_MEMBERSHIPS.split(',')) ||
              MOCK_DATA.HUBSPOT_CONTACT_LIST_MEMBERSHIPS,
          }
        : null,
  };

  return data;
};

module.exports = {
  getValidatedFunctionData,
  getFunctionDataContext,
};