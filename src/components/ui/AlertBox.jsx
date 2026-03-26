const VARIANT_STYLES = {
  danger: 'border-red-200 bg-red-50 text-danger',
  warning: 'border-amber-200 bg-amber-50 text-warning',
  info: 'border-blue-200 bg-blue-50 text-brand',
  success: 'border-green-200 bg-green-50 text-success',
}

function AlertBox({ title, message, variant = 'info' }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${VARIANT_STYLES[variant] || VARIANT_STYLES.info}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  )
}

export default AlertBox
