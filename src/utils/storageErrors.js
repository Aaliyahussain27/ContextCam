/**
 * Status enum returned by storage read operations.
 */
export const STORAGE_STATUS = {
  OK: 'ok',
  EMPTY: 'empty',
  ERROR: 'error',
};

/**
 * Custom error class for storage failures.
 */
export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}
