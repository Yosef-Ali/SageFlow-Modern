type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    }

    // In development, use console for better debugging
    if (process.env.NODE_ENV === 'development') {
      switch (level) {
        case 'error':
          console.error(`[${timestamp}] ERROR:`, message, context || '')
          break
        case 'warn':
          console.warn(`[${timestamp}] WARN:`, message, context || '')
          break
        case 'debug':
          console.debug(`[${timestamp}] DEBUG:`, message, context || '')
          break
        default:
          console.log(`[${timestamp}] INFO:`, message, context || '')
      }
    } else {
      // In production, you would send to a logging service
      // Examples: Sentry, LogRocket, Datadog, CloudWatch, etc.
      console.log(JSON.stringify(logData))
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context)
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }
}

export const logger = new Logger()
