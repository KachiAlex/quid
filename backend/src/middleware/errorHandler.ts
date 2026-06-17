import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(err.stack || err.message)

  const statusCode = (err as any).statusCode || 500
  const message = process.env.NODE_ENV === 'production'
    ? statusCode === 500 ? 'Internal server error' : err.message
    : err.message

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}
