export const money = (value = 0) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number(value || 0))

export const moneyExact = (value = 0) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(Number(value || 0))

export const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const daysBetween = (from, to = new Date()) => {
  if (!from) return 0
  const start = new Date(from)
  if (Number.isNaN(start.getTime())) return 0
  const end = to instanceof Date ? to : new Date(to)
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)))
}

export const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const currentDayLine = () => {
  const d = new Date()
  return `${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Week ${getISOWeek(d)}`
}

export const getISOWeek = (dateValue = new Date()) => {
  const date = new Date(Date.UTC(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

export const isThisWeek = (value) => {
  if (!value) return false
  const date = new Date(value)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && getISOWeek(date) === getISOWeek(now)
}

export const isThisMonth = (value) => {
  if (!value) return false
  const date = new Date(value)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

export const completionForProject = (project, deliverables) => {
  const rows = deliverables.filter((item) => item.project_id === project.id)
  if (!rows.length) return 0
  return Math.round((rows.filter((item) => item.completed).length / rows.length) * 100)
}

export const projectEstimatedProfit = (project) => toNumber(project.target_price) - toNumber(project.direct_costs)
export const projectActualProfit = (project) => toNumber(project.actual_price || project.target_price) - toNumber(project.direct_costs)
export const projectMargin = (project) => {
  const revenue = toNumber(project.actual_price || project.target_price)
  if (!revenue) return 0
  return Math.round((projectActualProfit(project) / revenue) * 100)
}

export const projectLastUpdateDays = (project, notes) => {
  const projectNotes = notes.filter((note) => note.project_id === project.id)
  if (!projectNotes.length) return daysBetween(project.updated_at || project.created_at || project.start_date)
  const latest = projectNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  return daysBetween(latest.created_at)
}

export const calculateStats = (data) => {
  const activeRetainers = data.retainers.filter((retainer) => retainer.status === 'Active')
  const cancelledRetainers = data.retainers.filter((retainer) => retainer.status === 'Cancelled')
  const pipelineStatuses = ['Idea', 'Outreach Sent', 'Call Booked', 'Proposal Sent', 'Agreed', 'In Build', 'In Review']
  const completedProjects = data.projects.filter((project) => project.status === 'Completed')
  const activeProjects = data.projects.filter((project) => pipelineStatuses.includes(project.status))

  const mrr = activeRetainers.reduce((sum, row) => sum + toNumber(row.monthly_value), 0)
  const pipelineValue = activeProjects.reduce((sum, row) => sum + toNumber(row.target_price), 0)
  const capitalDeployed = activeProjects.reduce((sum, row) => sum + toNumber(row.direct_costs), 0)
  const actualProfit = completedProjects.reduce((sum, row) => sum + projectActualProfit(row), 0)
  const projectedProfit = activeProjects.reduce((sum, row) => sum + projectEstimatedProfit(row), 0)
  const estimatedTotalProfit = actualProfit + projectedProfit
  const churnPenalty = cancelledRetainers.reduce((sum, row) => sum + toNumber(row.monthly_value), 0)
  const averageDaysToClose = completedProjects.length
    ? Math.round(completedProjects.reduce((sum, row) => sum + daysBetween(row.start_date || row.created_at, row.actual_launch || row.updated_at || row.created_at), 0) / completedProjects.length)
    : 0
  const totalSpend = data.projects.reduce((sum, row) => sum + toNumber(row.direct_costs), 0)
  const totalRevenue = data.projects.reduce((sum, row) => sum + toNumber(row.actual_price || (row.status === 'Completed' ? row.target_price : 0)), 0)
  const realisedRoi = totalSpend ? Math.round(((totalRevenue - totalSpend) / totalSpend) * 100) : 0

  return {
    mrr,
    pipelineValue,
    capitalDeployed,
    actualProfit,
    estimatedTotalProfit,
    afterChurnAdjustment: estimatedTotalProfit - churnPenalty,
    averageDaysToClose,
    activeRetainersCount: activeRetainers.length,
    totalSpend,
    totalRevenue,
    realisedRoi,
  }
}
