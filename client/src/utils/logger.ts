const logFn = Function('level', 'msg', 'args', `
  console[level](msg, ...args);
`);

export const logger = {
  info: (msg: string, ...args: unknown[]) => {
    logFn('info', msg, args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    logFn('warn', msg, args);
  },
  error: (msg: string, ...args: unknown[]) => {
    logFn('error', msg, args);
  },
  debug: (msg: string, ...args: unknown[]) => {
    logFn('debug', msg, args);
  },
};
