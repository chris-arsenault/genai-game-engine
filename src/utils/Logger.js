/**
 * Logger - debug logging utility with log levels and formatting.
 * Provides structured logging with timestamps and context.
 *
 * @class Logger
 */
export class Logger {
  static LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
  };

  /**
   * Creates a new logger instance.
   * @param {string} context - Logger context name (e.g., 'Engine', 'Renderer')
   * @param {number} level - Minimum log level to display
   */
  constructor(context = 'Global', level = Logger.LogLevel.INFO) {
    this.context = context;
    this.level = level;
    this.logs = []; // Store logs for debugging
    this.maxLogs = 100; // Max stored logs
  }

  /**
   * Sets the logging level.
   * @param {number} level - Log level
   */
  setLevel(level) {
    this.level = level;
  }

  /**
   * Gets timestamp string.
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * Formats log message.
   * @param {string} level - Log level name
   * @param {string} message - Log message
   * @returns {string} Formatted log message
   */
  format(level, message) {
    return `[${this.getTimestamp()}] [${level}] [${this.context}] ${message}`;
  }

  /**
   * Stores log entry.
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  store(level, message) {
    this.logs.push({
      timestamp: Date.now(),
      level,
      context: this.context,
      message,
    });

    // Trim logs if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Logs debug message.
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (this.level <= Logger.LogLevel.DEBUG) {
      const message = args.join(' ');
      console.log(this.format('DEBUG', message));
      this.store('DEBUG', message);
    }
  }

  /**
   * Logs info message.
   * @param {...any} args - Arguments to log
   */
  info(...args) {
    if (this.level <= Logger.LogLevel.INFO) {
      const message = args.join(' ');
      console.log(this.format('INFO', message));
      this.store('INFO', message);
    }
  }

  /**
   * Logs warning message.
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    if (this.level <= Logger.LogLevel.WARN) {
      const message = args.join(' ');
      console.warn(this.format('WARN', message));
      this.store('WARN', message);
    }
  }

  /**
   * Logs error message.
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    if (this.level <= Logger.LogLevel.ERROR) {
      const message = args.join(' ');
      console.error(this.format('ERROR', message));
      this.store('ERROR', message);
    }
  }

  /**
   * Gets stored logs.
   * @returns {Array} Log entries
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Clears stored logs.
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Exports logs as JSON string.
   * @returns {string} JSON string of logs
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global logger instance
export const logger = new Logger('Engine', Logger.LogLevel.INFO);
