require('colors');

const getLevelString = (level) => {
  switch (level) {
    case 'error':
      return '[ERROR]'.red;
    case 'warn':
      return '[WARN]'.yellow;
    default:
      return '[INFO]'.cyan;
  }
};

const logMessage = (level, ...args) => {
  console.log(
    new Date().toLocaleString('sv-SE').grey,
    getLevelString(level),
    ...args,
  );
};

module.exports = {
  info: (...args) => logMessage('info', ...args),
  warn: (...args) => logMessage('warn', ...args),
  error: (...args) => logMessage('error', ...args),
};
