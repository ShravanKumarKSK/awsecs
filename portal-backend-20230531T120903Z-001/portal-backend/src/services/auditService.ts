import dotenv from 'dotenv';
import path from 'path';
import { createLogger, format, transports } from 'winston';
dotenv.config();
function getLevelColor(level) {
  switch (level) {
    case 'info':
      return '\x1b[92m'; //green
    case 'warn':
      return '\x1b[93m'; //yellow
    case 'error':
      return '\x1b[91m'; //red
    default:
      return '\x1b[37m'; //white
  }
}

const resetColor = '\x1b[0m';
const serviceColor = '\x1b[93m';

export let baseParams = {
  portalUserId: 0,
  loanApplicationId: 0,
};

export function setBaseParams(params) {
  baseParams = { ...baseParams, ...params };
}

const fileFormatter = format.printf(
  ({
    level,
    serviceType,
    status,
    message,
    timestamp,
    eventType,
    eventParams,
    portalUserId,
    loanApplicationId,
  }) => {
    eventParams = { ...baseParams, ...eventParams };
    portalUserId = eventParams.portalUserId;
    loanApplicationId = eventParams.loanApplicationId;
    const reorderedInfo = {
      portalUserId,
      loanApplicationId,
      timestamp,
      level,
      serviceType,
      eventType,
      eventParams,
      message,
      status,
    };

    return JSON.stringify(reorderedInfo);
  }
);

const consoleFormatter = format.printf(
  ({
    level,
    serviceType,
    status,
    message,
    timestamp,
    eventType,
    eventParams,
  }) => {
    const levelColor = getLevelColor(level);

    return `${timestamp} ${levelColor}[${level}]${resetColor} ${serviceColor}${serviceType}${resetColor}: ${eventType} ${JSON.stringify(
      eventParams
    )} ${message} ${status}`;
  }
);
export const fileTransport = new transports.File({
  filename: `${process.env.INTERNAL_AUDIT_PATH}`,
  format: fileFormatter,
}).setMaxListeners(40);

export const consoleTransport = new transports.Console({
  format: consoleFormatter,
});
export const jsonFormatter = format.combine(
  format.timestamp(),
  format.splat(),
  format.prettyPrint(),
  format.json()
);

export function loggerInstance(service: string) {
  const logger = createLogger({
    level: 'info',
    format: jsonFormatter,
    defaultMeta: {
      portalUserId: '',
      loanApplicationId: '',
      serviceType: path.basename(service, path.extname(service)),
      eventType: '',
      eventParams: { ...baseParams },
      status: '',
      eventTime: Date.now(),
    },
    transports: [consoleTransport, fileTransport],
  });

  return logger;
}
