const STATUS_SUCCESS = 'SUCCESS'
const STATUS_FAILED = 'FAILED'
const STATUS_PROCESSING = 'PROCESSING'

const VALID_STATUSES = new Set([
  STATUS_SUCCESS,
  STATUS_FAILED,
  STATUS_PROCESSING,
])

export function normalizeStatus(value) {
  const normalized = String(value || '').trim().toUpperCase()

  if (normalized === 'COMPLETED') {
    return STATUS_SUCCESS
  }

  if (normalized === 'PENDING') {
    return STATUS_PROCESSING
  }

  if (VALID_STATUSES.has(normalized)) {
    return normalized
  }

  return STATUS_PROCESSING
}

export const STATUS_VALUES = {
  SUCCESS: STATUS_SUCCESS,
  FAILED: STATUS_FAILED,
  PROCESSING: STATUS_PROCESSING,
}
