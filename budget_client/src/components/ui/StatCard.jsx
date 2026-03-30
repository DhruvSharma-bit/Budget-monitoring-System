function StatCard({ title, value, helper, accent = 'text-brand' }) {
  return (
    <article className="panel p-5">
      <p className="text-sm font-medium text-muted">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      {helper ? <p className="mt-2 text-xs text-muted">{helper}</p> : null}
    </article>
  )
}

export default StatCard
