import { vi } from 'vitest'

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NODE_ENV = 'test'

// Mock logger
vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock database
vi.mock('../db', () => ({
  pool: {
    query: vi.fn().mockImplementation(() => Promise.resolve({ rows: [] })),
    connect: vi.fn(),
    end: vi.fn(),
  },
  testConnection: vi.fn().mockResolvedValue(true),
}))
