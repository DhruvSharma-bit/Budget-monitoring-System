function ProgressBar({ value, max, color = 'bg-brand' }) {
  const safeMax = Math.max(max, 1)
  const percentage = Math.min((value / safeMax) * 100, 100)

  return (
    <div className="w-full">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="mt-1 text-xs text-muted">{percentage.toFixed(0)}%</div>
    </div>
  )
}

export default ProgressBar
