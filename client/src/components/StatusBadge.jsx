import { normalizeStatus, STATUS_VALUES } from '../utils/status'

const STATUS_STYLES = {
  [STATUS_VALUES.SUCCESS]: 'bg-green-100 text-green-700',
  [STATUS_VALUES.FAILED]: 'bg-red-100 text-red-700',
  [STATUS_VALUES.PROCESSING]: 'bg-yellow-100 text-yellow-700',
}

function StatusBadge({ status }) {
  const normalizedStatus = normalizeStatus(status)

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
        STATUS_STYLES[normalizedStatus]
      }`}
    >
      {normalizedStatus}
    </span>
  )
}

export default StatusBadge
