import { useEffect, useMemo, useState } from 'react'
import {
  APP_NAME,
  CASE_STUDY_STATUSES,
  CLIENT_STATUSES,
  DEFAULT_DELIVERABLES,
  DEFAULT_PACKAGES,
  DOCUMENT_TYPES,
  MESSAGE_TYPES,
  OUTREACH_PLATFORMS,
  OUTREACH_STATUSES,
  PACKAGE_TYPES,
  PIPELINE_STAGES,
  PLATFORMS,
  PRICING_STAGES,
  PROJECT_STATUSES,
  RETAINER_STATUSES,
  RETAINER_TIERS,
  SOURCES,
} from './lib/constants'
import { isSupabaseConfigured, maskedSupabaseUrl, supabase } from './lib/supabase'
import {
  calculateStats,
  completionForProject,
  currentDayLine,
  daysBetween,
  formatDate,
  isThisMonth,
  isThisWeek,
  money,
  moneyExact,
  projectActualProfit,
  projectEstimatedProfit,
  projectLastUpdateDays,
  projectMargin,
  todayISO,
  toNumber,
} from './lib/calculations'
import {
  createRecord,
  deleteRecord,
  fetchWorkspace,
  settingsObject,
  updateRecord,
  uploadFileToDocuments,
  upsertSetting,
} from './lib/store'

const NAV = [
  ['Dashboard', 'dashboard', '⌘'],
  ['Clients', 'clients', '◌'],
  ['Projects', 'projects', '▣'],
  ['Outreach', 'outreach', '✉'],
  ['Retainers', 'retainers', '↻'],
  ['Pricing', 'pricing', '£'],
  ['Processes', 'processes', '☑'],
  ['Case Studies', 'case-studies', '◎'],
  ['Documents', 'documents', '▤'],
  ['Settings', 'settings', '⚙'],
]

const EMPTY_DATA = {
  clients: [],
  projects: [],
  project_deliverables: [],
  project_notes: [],
  retainers: [],
  retainer_updates: [],
  outreach_log: [],
  case_studies: [],
  documents: [],
  processes: [],
  client_notes: [],
  settings: [],
}

function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash || '#/dashboard')
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash || '#/dashboard')
    window.addEventListener('hashchange', onChange)
    if (!window.location.hash) window.location.hash = '#/dashboard'
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const clean = route.replace(/^#\/?/, '') || 'dashboard'
  const parts = clean.split('/').filter(Boolean)
  return { route: parts[0] || 'dashboard', id: parts[1], sub: parts[2], path: clean }
}

function go(path) {
  window.location.hash = `#/${path}`
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(localStorage.getItem('avozea_auth') === 'true')
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [sync, setSync] = useState('Loading workspace…')
  const [error, setError] = useState('')
  const [drawer, setDrawer] = useState(null)
  const route = useHashRoute()

  const settings = useMemo(() => settingsObject(data.settings), [data.settings])
  const stats = useMemo(() => calculateStats(data), [data])

  async function reload() {
    try {
      setError('')
      setLoading(true)
      const workspace = await fetchWorkspace()
      setData(workspace)
      setSync(isSupabaseConfigured ? 'Auto-saved to Supabase' : 'Local demo mode')
    } catch (err) {
      setError(err.message)
      setSync('Sync issue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authenticated) reload()
  }, [authenticated])

  const actions = {
    async create(table, payload) {
      setSync('Saving…')
      const row = await createRecord(table, payload)
      setData((prev) => ({ ...prev, [table]: [row, ...(prev[table] || [])] }))
      setSync(isSupabaseConfigured ? 'Auto-saved to Supabase' : 'Saved locally')
      return row
    },
    async update(table, id, payload) {
      setSync('Saving…')
      const row = await updateRecord(table, id, payload)
      setData((prev) => ({ ...prev, [table]: (prev[table] || []).map((item) => (item.id === id ? row : item)) }))
      setSync(isSupabaseConfigured ? 'Auto-saved to Supabase' : 'Saved locally')
      return row
    },
    async remove(table, id) {
      if (!window.confirm('Delete this record?')) return
      setSync('Saving…')
      await deleteRecord(table, id)
      setData((prev) => ({ ...prev, [table]: (prev[table] || []).filter((item) => item.id !== id) }))
      setSync(isSupabaseConfigured ? 'Auto-saved to Supabase' : 'Saved locally')
    },
    async setting(key, value) {
      setSync('Saving…')
      const row = await upsertSetting(key, value)
      setData((prev) => {
        const exists = prev.settings.some((item) => item.key === key)
        return { ...prev, settings: exists ? prev.settings.map((item) => (item.key === key ? row : item)) : [...prev.settings, row] }
      })
      setSync(isSupabaseConfigured ? 'Auto-saved to Supabase' : 'Saved locally')
      return row
    },
    async createProject(payload) {
      const project = await actions.create('projects', payload)
      const type = String(payload.package_type || '').includes('Growth System') ? 'growth' : 'default'
      const rows = DEFAULT_DELIVERABLES[type].map(([step_name, step_description], index) => ({
        project_id: project.id,
        step_name,
        step_description,
        step_order: index + 1,
        completed: false,
      }))
      for (const row of rows) await actions.create('project_deliverables', row)
      return project
    },
  }

  if (!authenticated) return <LoginScreen onLogin={() => setAuthenticated(true)} />

  return (
    <div className="app-shell">
      <Sidebar route={route.route} sync={sync} owner={settings.owner_name} agency={settings.agency_name} />
      <main className="main-content">
        {!isSupabaseConfigured && <Notice tone="warning" title="Local demo mode">Add your Supabase environment variables in Vercel to make this save to the cloud. Until then it uses this browser's localStorage.</Notice>}
        {error && <Notice tone="danger" title="Connection issue">{error}</Notice>}
        {loading ? <Loading /> : (
          <RouteRenderer route={route} data={data} settings={settings} stats={stats} actions={actions} setDrawer={setDrawer} reload={reload} />
        )}
      </main>
      <DrawerRenderer drawer={drawer} setDrawer={setDrawer} data={data} actions={actions} />
    </div>
  )
}

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const appPassword = import.meta.env.VITE_APP_PASSWORD || 'avenzo'

  function submit(e) {
    e.preventDefault()
    if (password === appPassword) {
      localStorage.setItem('avozea_auth', 'true')
      onLogin()
    } else {
      setError('Wrong password. Check VITE_APP_PASSWORD in Vercel.')
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="logo-mark">A</div>
        <h1>{APP_NAME}</h1>
        <p>Private founder-led control panel for clients, projects, outreach, retainers and agency proof.</p>
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary" type="submit">Enter workspace</button>
        <small>Default local password is <strong>avenzo</strong> until VITE_APP_PASSWORD is set.</small>
      </form>
    </div>
  )
}

function Sidebar({ route, sync, owner, agency }) {
  return (
    <aside className="sidebar">
      <button className="mobile-menu" onClick={() => document.body.classList.toggle('sidebar-open')}>☰</button>
      <div className="brand" onClick={() => go('dashboard')}>
        <div className="brand-mark">A</div>
        <div>
          <strong>{agency || 'Avozea'}</strong>
          <span>Agency Manager</span>
        </div>
      </div>
      <nav>
        {NAV.map(([label, key, icon]) => (
          <button key={key} className={route === key ? 'nav-item active' : 'nav-item'} onClick={() => go(key)}>
            <span>{icon}</span>{label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sync"><span className="dot" /> {sync}</div>
        <strong>{owner || 'Fin Young'} — Owner</strong>
        <span>{agency || 'Avozea'} / Owner</span>
      </div>
    </aside>
  )
}

function RouteRenderer({ route, data, settings, stats, actions, setDrawer, reload }) {
  if (route.route === 'clients' && route.id) return <ClientDetail id={route.id} data={data} actions={actions} setDrawer={setDrawer} />
  if (route.route === 'projects' && route.id) return <ProjectDetail id={route.id} data={data} actions={actions} setDrawer={setDrawer} />
  if (route.route === 'processes' && route.id) return <ProcessDetail id={route.id} data={data} actions={actions} />
  if (route.route === 'case-studies' && route.id) return <CaseStudyDetail id={route.id} data={data} setDrawer={setDrawer} />

  const pages = {
    dashboard: <Dashboard data={data} stats={stats} settings={settings} setDrawer={setDrawer} />,
    clients: <Clients data={data} setDrawer={setDrawer} actions={actions} />,
    projects: <Projects data={data} setDrawer={setDrawer} actions={actions} />,
    outreach: <Outreach data={data} settings={settings} setDrawer={setDrawer} actions={actions} />,
    retainers: <Retainers data={data} stats={stats} setDrawer={setDrawer} actions={actions} />,
    pricing: <Pricing data={data} settings={settings} stats={stats} actions={actions} />,
    processes: <Processes data={data} setDrawer={setDrawer} actions={actions} />,
    'case-studies': <CaseStudies data={data} setDrawer={setDrawer} />,
    documents: <Documents data={data} setDrawer={setDrawer} actions={actions} />,
    settings: <Settings data={data} settings={settings} actions={actions} reload={reload} />,
  }
  return pages[route.route] || pages.dashboard
}

function DrawerRenderer({ drawer, setDrawer, data, actions }) {
  if (!drawer) return null
  const close = () => setDrawer(null)
  const common = { data, actions, close, initial: drawer.initial || {} }
  const map = {
    client: <ClientForm {...common} />,
    project: <ProjectForm {...common} />,
    outreach: <OutreachForm {...common} />,
    retainer: <RetainerForm {...common} />,
    retainerUpdate: <RetainerUpdateForm {...common} />,
    process: <ProcessForm {...common} />,
    caseStudy: <CaseStudyForm {...common} />,
    document: <DocumentForm {...common} />,
  }
  return <SlideOver title={drawer.title} onClose={close}>{map[drawer.type]}</SlideOver>
}

function PageHeader({ eyebrow, title, subtitle, action, secondary }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-actions">{secondary}{action}</div>
    </header>
  )
}

function Dashboard({ data, stats, settings, setDrawer }) {
  const [search, setSearch] = useState('')
  const activeProjects = data.projects
    .filter((project) => ['Idea', 'Outreach Sent', 'Call Booked', 'Proposal Sent', 'Agreed', 'In Build', 'In Review', 'Live'].includes(project.status))
    .sort((a, b) => daysBetween(b.start_date || b.created_at) - daysBetween(a.start_date || a.created_at))
  const filteredProjects = activeProjects.filter((project) => searchMatch(search, [project.project_name, clientName(data, project.client_id), project.status, project.package_type]))
  const stale = activeProjects.find((project) => projectLastUpdateDays(project, data.project_notes) >= 14)
  const maxStageCount = Math.max(1, ...PIPELINE_STAGES.map((stage) => stageCount(data, stage)))
  const retainers = data.retainers.filter((r) => r.status === 'Active').slice(0, 5)

  return (
    <>
      <PageHeader
        eyebrow={currentDayLine()}
        title="Dashboard"
        subtitle="Live agency analytics, active capital, projected profit and client performance."
        secondary={<input className="search" placeholder="Search clients, projects, outreach…" value={search} onChange={(e) => setSearch(e.target.value)} />}
        action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'project', title: '+ New Project' })}>+ New Project</button>}
      />

      <section className="pulse-card">
        <Metric label="MRR — Active retainers" value={money(stats.mrr)} />
        <Metric label="In Pipeline" value={money(stats.pipelineValue)} />
        <Metric label="Capital Deployed" value={money(stats.capitalDeployed)} />
      </section>

      <section className="metric-grid five">
        <MetricCard title="Actual Profit" value={money(stats.actualProfit)} subtitle="Completed paid builds" />
        <MetricCard title="Estimated Total Profit" value={money(stats.estimatedTotalProfit)} subtitle="Realised + projected" />
        <MetricCard title="After Retainer Churn Adjustment" value={money(stats.afterChurnAdjustment)} subtitle="Adjusted for churn" />
        <MetricCard title="Average Days to Close" value={`${stats.averageDaysToClose} days`} subtitle="Build average" />
        <MetricCard title="Total Active Retainers" value={stats.activeRetainersCount} subtitle="Paying monthly clients" />
      </section>

      {stale && <Notice tone="warning" title="Review needed">{stale.project_name} has had no update for {projectLastUpdateDays(stale, data.project_notes)} days — review or update status.</Notice>}

      <div className="split-layout">
        <section className="card">
          <SectionTitle title="Active projects" subtitle="In-progress builds, ordered by urgency." link="View all →" onLink={() => go('projects')} />
          <ProjectsTable projects={filteredProjects} data={data} compact />
        </section>
        <aside className="stack">
          <section className="card">
            <SectionTitle title="Pipeline" subtitle="by stage" />
            <div className="stage-list">
              {PIPELINE_STAGES.map((stage) => {
                const count = stageCount(data, stage)
                return <ProgressRow key={stage} label={stage} value={count} pct={(count / maxStageCount) * 100} />
              })}
            </div>
          </section>
          <section className="card">
            <SectionTitle title="Performance" />
            <div className="mini-grid">
              <Metric label="Total Revenue" value={money(stats.totalRevenue)} small />
              <Metric label="Total Spend" value={money(stats.totalSpend)} small />
              <Metric label="Actual Profit" value={money(stats.actualProfit)} small />
              <Metric label="Realised ROI" value={`${stats.realisedRoi}%`} small />
            </div>
          </section>
          <section className="card">
            <SectionTitle title="Active Retainers" link="View all →" onLink={() => go('retainers')} />
            {retainers.length ? retainers.map((retainer) => (
              <div className="list-row" key={retainer.id}>
                <div><strong>{clientName(data, retainer.client_id)}</strong><span>{retainer.tier}</span></div>
                <strong>{money(retainer.monthly_value)}</strong>
              </div>
            )) : <EmptyState text="No active retainers yet." />}
            {data.retainers.filter((r) => r.status === 'Active').length > 5 && <small>+ {data.retainers.filter((r) => r.status === 'Active').length - 5} more retainer rows</small>}
          </section>
        </aside>
      </div>
    </>
  )
}

function Clients({ data, setDrawer, actions }) {
  const [filters, setFilters] = useState({ status: 'All', niche: 'All', source: 'All', search: '' })
  const niches = unique(data.clients.map((c) => c.niche).filter(Boolean))
  const sources = unique(data.clients.map((c) => c.source).filter(Boolean))
  const rows = data.clients.filter((client) => {
    if (filters.status !== 'All' && client.status !== filters.status) return false
    if (filters.niche !== 'All' && client.niche !== filters.niche) return false
    if (filters.source !== 'All' && client.source !== filters.source) return false
    return searchMatch(filters.search, [client.business_name, client.contact_name, client.niche, client.source, client.status])
  })
  return (
    <>
      <PageHeader title="Clients" subtitle="Your full client and lead database." action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'client', title: '+ New Client' })}>+ New Client</button>} />
      <FilterBar>
        <Select value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={['All', ...CLIENT_STATUSES]} />
        <Select value={filters.niche} onChange={(value) => setFilters({ ...filters, niche: value })} options={['All', ...niches]} />
        <Select value={filters.source} onChange={(value) => setFilters({ ...filters, source: value })} options={['All', ...sources]} />
        <input className="search" placeholder="Search clients…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
      </FilterBar>
      <section className="card">
        <table>
          <thead><tr><th>Business Name</th><th>Contact</th><th>Niche</th><th>Source</th><th>Status</th><th>Date Added</th><th>MRR</th><th>Projects</th><th>Last Activity</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((client) => {
              const relatedProjects = data.projects.filter((project) => project.client_id === client.id)
              const mrr = data.retainers.filter((retainer) => retainer.client_id === client.id && retainer.status === 'Active').reduce((sum, row) => sum + toNumber(row.monthly_value), 0)
              return <tr key={client.id}>
                <td><button className="link" onClick={() => go(`clients/${client.id}`)}>{client.business_name}</button></td>
                <td>{client.contact_name || '—'}</td>
                <td>{client.niche || '—'}</td>
                <td>{client.source || '—'}</td>
                <td><StatusPill value={client.status} /></td>
                <td>{formatDate(client.created_at)}</td>
                <td>{mrr ? money(mrr) : '—'}</td>
                <td>{relatedProjects.length}</td>
                <td>{formatDate(lastClientActivity(client, data))}</td>
                <td><button className="btn btn-secondary tiny" onClick={() => setDrawer({ type: 'client', title: 'Edit Client', initial: client })}>Edit</button> <button className="btn btn-ghost tiny" onClick={() => actions.remove('clients', client.id)}>Delete</button></td>
              </tr>
            })}
          </tbody>
        </table>
        {!rows.length && <EmptyState text="No clients yet. Add your first client to get started." />}
      </section>
    </>
  )
}

function ClientDetail({ id, data, actions, setDrawer }) {
  const [tab, setTab] = useState('overview')
  const [note, setNote] = useState('')
  const client = data.clients.find((row) => row.id === id)
  if (!client) return <NotFound label="client" />
  const projects = data.projects.filter((row) => row.client_id === id)
  const outreach = data.outreach_log.filter((row) => row.client_id === id)
  const documents = data.documents.filter((row) => row.client_id === id)
  const notes = data.client_notes.filter((row) => row.client_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  async function addNote(e) {
    e.preventDefault()
    if (!note.trim()) return
    await actions.create('client_notes', { client_id: id, note_text: note.trim() })
    setNote('')
  }
  return (
    <>
      <PageHeader
        title={client.business_name}
        subtitle={<><StatusPill value={client.status} /> {client.website_url && <a href={client.website_url} target="_blank" rel="noreferrer">{client.website_url}</a>}</>}
        action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'client', title: 'Edit Client', initial: client })}>Edit Client</button>}
      />
      <Tabs active={tab} onChange={setTab} tabs={[['overview', 'Overview'], ['projects', 'Projects'], ['outreach', 'Outreach'], ['documents', 'Documents']]} />
      {tab === 'overview' && <section className="card detail-grid">
        <Info label="Contact" value={client.contact_name} />
        <Info label="Email" value={client.email} />
        <Info label="Phone" value={client.phone} />
        <Info label="Niche" value={client.niche} />
        <Info label="Source" value={client.source} />
        <Info label="Tags" value={(client.tags || []).join(', ')} />
        <div className="span-2"><Info label="Notes" value={client.notes} /></div>
        <form className="timeline-form span-2" onSubmit={addNote}>
          <label>Add internal update</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log a call, website update, client concern or next action…" />
          <button className="btn btn-primary" type="submit">Add note</button>
        </form>
        <Timeline rows={notes.map((row) => ({ text: row.note_text, date: row.created_at }))} />
      </section>}
      {tab === 'projects' && <section className="card"><SectionTitle title="Projects" action={<button className="btn btn-secondary" onClick={() => setDrawer({ type: 'project', title: '+ New Project for Client', initial: { client_id: id } })}>+ New Project for this Client</button>} /><ProjectsTable projects={projects} data={data} /></section>}
      {tab === 'outreach' && <section className="card"><OutreachTable rows={outreach} data={data} actions={actions} setDrawer={setDrawer} /></section>}
      {tab === 'documents' && <section className="card"><SectionTitle title="Documents" action={<button className="btn btn-secondary" onClick={() => setDrawer({ type: 'document', title: '+ Upload Document', initial: { client_id: id } })}>+ Upload</button>} /><DocumentsTable rows={documents} data={data} actions={actions} setDrawer={setDrawer} /></section>}
    </>
  )
}

function Projects({ data, setDrawer, actions }) {
  const [filters, setFilters] = useState({ status: 'All', package_type: 'All', search: '', start: '', end: '' })
  const rows = data.projects.filter((project) => {
    if (filters.status !== 'All' && project.status !== filters.status) return false
    if (filters.package_type !== 'All' && project.package_type !== filters.package_type) return false
    if (filters.start && project.start_date < filters.start) return false
    if (filters.end && project.start_date > filters.end) return false
    return searchMatch(filters.search, [project.project_name, clientName(data, project.client_id), project.package_type, project.status])
  })
  return (
    <>
      <PageHeader title="Projects" subtitle="Every build, tracked from first contact to completion." action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'project', title: '+ New Project' })}>+ New Project</button>} />
      <FilterBar>
        <Select value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={['All', ...PROJECT_STATUSES]} />
        <Select value={filters.package_type} onChange={(value) => setFilters({ ...filters, package_type: value })} options={['All', ...PACKAGE_TYPES]} />
        <input type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} />
        <input type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
        <input className="search" placeholder="Search projects…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
      </FilterBar>
      <section className="card"><ProjectsTable projects={rows} data={data} actions={actions} setDrawer={setDrawer} /></section>
    </>
  )
}

function ProjectsTable({ projects, data, actions, setDrawer, compact = false }) {
  return (
    <>
      <table>
        <thead><tr><th>Project</th><th>Client</th><th>Package</th><th>Status</th><th>Start</th>{!compact && <th>Target Launch</th>}<th>Target Price</th><th>Est. Profit</th><th>{compact ? 'ROI %' : 'Completion'}</th><th>Days Active</th><th>Docs</th>{!compact && <th>Actions</th>}</tr></thead>
        <tbody>
          {projects.map((project) => {
            const completion = completionForProject(project, data.project_deliverables)
            const days = daysBetween(project.start_date || project.created_at)
            const docs = data.documents.filter((doc) => doc.project_id === project.id).length
            return <tr key={project.id} onDoubleClick={() => go(`projects/${project.id}`)}>
              <td><button className="link" onClick={() => go(`projects/${project.id}`)}>{project.project_name}</button></td>
              <td>{project.client_id ? <button className="link muted" onClick={() => go(`clients/${project.client_id}`)}>{clientName(data, project.client_id)}</button> : '—'}</td>
              <td><StatusPill value={project.package_type} /></td>
              <td><StatusPill value={project.status} /></td>
              <td>{formatDate(project.start_date)}</td>
              {!compact && <td>{formatDate(project.target_launch)}</td>}
              <td>{money(project.target_price)}</td>
              <td>{money(projectEstimatedProfit(project))}</td>
              <td>{compact ? `${projectMargin(project)}%` : <Progress value={completion} label={`${completion}%`} />}</td>
              <td><AgeBar days={days} /></td>
              <td>{docs}</td>
              {!compact && <td><button className="btn btn-secondary tiny" onClick={() => setDrawer({ type: 'project', title: 'Edit Project', initial: project })}>Edit</button> {actions && <button className="btn btn-ghost tiny" onClick={() => actions.remove('projects', project.id)}>Delete</button>}</td>}
            </tr>
          })}
        </tbody>
      </table>
      {!projects.length && <EmptyState text="No projects yet. Add your first website build to get started." />}
    </>
  )
}

function ProjectDetail({ id, data, actions, setDrawer }) {
  const project = data.projects.find((row) => row.id === id)
  const [note, setNote] = useState('')
  const [step, setStep] = useState('')
  if (!project) return <NotFound label="project" />
  const deliverables = data.project_deliverables.filter((row) => row.project_id === id).sort((a, b) => a.step_order - b.step_order)
  const notes = data.project_notes.filter((row) => row.project_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const completion = completionForProject(project, data.project_deliverables)
  async function addNote(e) {
    e.preventDefault()
    if (!note.trim()) return
    await actions.create('project_notes', { project_id: id, note_text: note.trim() })
    setNote('')
  }
  async function addStep(e) {
    e.preventDefault()
    if (!step.trim()) return
    await actions.create('project_deliverables', { project_id: id, step_name: step.trim(), step_description: '', step_order: deliverables.length + 1, completed: false })
    setStep('')
  }
  return (
    <>
      <PageHeader
        title={project.project_name}
        subtitle={<>{project.client_id && <button className="link" onClick={() => go(`clients/${project.client_id}`)}>{clientName(data, project.client_id)}</button>} <StatusPill value={project.package_type} /> <StatusPill value={project.status} /> Start: {formatDate(project.start_date)} · Target: {formatDate(project.target_launch)}</>}
        action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'project', title: 'Edit Project', initial: project })}>Edit Project</button>}
        secondary={project.status === 'Completed' ? <button className="btn btn-secondary" onClick={() => setDrawer({ type: 'retainer', title: 'Convert to Retainer', initial: { client_id: project.client_id, project_id: project.id } })}>Convert to Retainer</button> : null}
      />
      <section className="metric-grid six">
        <MetricCard title="Target Price" value={money(project.target_price)} />
        <MetricCard title="Actual Price" value={money(project.actual_price)} />
        <MetricCard title="Estimated Profit" value={money(projectEstimatedProfit(project))} />
        <MetricCard title="Actual Profit" value={money(projectActualProfit(project))} />
        <MetricCard title="Gross Margin" value={`${projectMargin(project)}%`} />
        <MetricCard title="Days Active" value={daysBetween(project.start_date || project.created_at)} />
      </section>
      <div className="split-layout reverse">
        <section className="card">
          <SectionTitle title="Deliverables Checklist" subtitle="Completion derives from the checked steps below." />
          <Progress value={completion} label={`${completion}% complete`} large />
          <div className="checklist">
            {deliverables.map((item) => (
              <label className="check-row" key={item.id}>
                <input type="checkbox" checked={!!item.completed} onChange={(e) => actions.update('project_deliverables', item.id, { completed: e.target.checked, completed_at: e.target.checked ? new Date().toISOString() : null })} />
                <div>
                  <strong>{item.step_name}</strong>
                  <span>{item.step_description}</span>
                </div>
                <button type="button" className="btn btn-ghost tiny" onClick={() => actions.remove('project_deliverables', item.id)}>Delete</button>
              </label>
            ))}
          </div>
          <form className="inline-form" onSubmit={addStep}>
            <input value={step} onChange={(e) => setStep(e.target.value)} placeholder="Add custom step…" />
            <button className="btn btn-secondary" type="submit">Add step</button>
          </form>
        </section>
        <aside className="stack">
          <section className="card">
            <SectionTitle title="Notes / Timeline" />
            <form className="timeline-form" onSubmit={addNote}>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log what changed, what was sent, blockers or next action…" />
              <button className="btn btn-primary" type="submit">Add note</button>
            </form>
            <Timeline rows={notes.map((row) => ({ text: row.note_text, date: row.created_at }))} />
          </section>
          <section className="card">
            <SectionTitle title="Documents" action={<button className="btn btn-secondary" onClick={() => setDrawer({ type: 'document', title: '+ Upload Document', initial: { project_id: id, client_id: project.client_id } })}>+ Upload</button>} />
            <DocumentsTable rows={data.documents.filter((doc) => doc.project_id === id)} data={data} actions={actions} setDrawer={setDrawer} compact />
          </section>
        </aside>
      </div>
    </>
  )
}

function Outreach({ data, settings, setDrawer, actions }) {
  const [filters, setFilters] = useState({ platform: 'All', status: 'All', search: '', start: '', end: '' })
  const rows = data.outreach_log.filter((row) => {
    if (filters.platform !== 'All' && row.platform !== filters.platform) return false
    if (filters.status !== 'All' && row.status !== filters.status) return false
    if (filters.start && row.date < filters.start) return false
    if (filters.end && row.date > filters.end) return false
    return searchMatch(filters.search, [row.business_name, row.contact_name, row.platform, row.message_type, row.status, row.notes])
  })
  const sentWeek = data.outreach_log.filter((row) => isThisWeek(row.date) && ['Sent', 'Replied', 'No Reply', 'Call Booked', 'Converted'].includes(row.status)).length
  const sentMonth = data.outreach_log.filter((row) => isThisMonth(row.date)).length
  const repliesMonth = data.outreach_log.filter((row) => isThisMonth(row.date) && ['Replied', 'Call Booked', 'Converted'].includes(row.status)).length
  const callsMonth = data.outreach_log.filter((row) => isThisMonth(row.date) && row.status === 'Call Booked').length
  const convertedMonth = data.outreach_log.filter((row) => isThisMonth(row.date) && row.status === 'Converted').length
  const target = toNumber(settings.weekly_message_target || 100)
  return (
    <>
      <PageHeader title="Outreach" subtitle="Track every message, audit, and follow-up." action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'outreach', title: '+ Log Outreach' })}>+ Log Outreach</button>} />
      <section className="card progress-banner">
        <div>
          <strong>Messages sent this week: {sentWeek} / {target}</strong>
          <Progress value={Math.min(100, (sentWeek / Math.max(1, target)) * 100)} label={`${Math.round((sentWeek / Math.max(1, target)) * 100)}%`} />
        </div>
        <Metric label="Messages this month" value={sentMonth} small />
        <Metric label="Reply rate" value={`${sentMonth ? Math.round((repliesMonth / sentMonth) * 100) : 0}%`} small />
        <Metric label="Calls booked" value={callsMonth} small />
        <Metric label="Calls to clients" value={`${callsMonth ? Math.round((convertedMonth / callsMonth) * 100) : 0}%`} small />
      </section>
      <FilterBar>
        <Select value={filters.platform} onChange={(value) => setFilters({ ...filters, platform: value })} options={['All', ...OUTREACH_PLATFORMS]} />
        <Select value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={['All', ...OUTREACH_STATUSES]} />
        <input type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} />
        <input type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
        <input className="search" placeholder="Search business…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
      </FilterBar>
      <section className="card"><OutreachTable rows={rows} data={data} actions={actions} setDrawer={setDrawer} /></section>
      <section className="metric-grid six">
        <MetricCard title="Total messages sent" value={data.outreach_log.length} />
        <MetricCard title="Replies received" value={data.outreach_log.filter((r) => ['Replied', 'Call Booked', 'Converted'].includes(r.status)).length} />
        <MetricCard title="Calls booked" value={data.outreach_log.filter((r) => r.status === 'Call Booked').length} />
        <MetricCard title="Clients converted" value={data.outreach_log.filter((r) => r.status === 'Converted').length} />
        <MetricCard title="Best platform" value={bestPerformer(data.outreach_log, 'platform')} />
        <MetricCard title="Best message" value={bestPerformer(data.outreach_log, 'message_type')} />
      </section>
    </>
  )
}

function OutreachTable({ rows, data, actions, setDrawer }) {
  return (
    <>
      <table>
        <thead><tr><th>Date</th><th>Business</th><th>Contact</th><th>Platform</th><th>Message Type</th><th>Status</th><th>Notes</th><th>Linked Client</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
          <td>{formatDate(row.date)}</td><td>{row.client_id ? <button className="link" onClick={() => go(`clients/${row.client_id}`)}>{row.business_name}</button> : row.business_name}</td><td>{row.contact_name || '—'}</td><td><StatusPill value={row.platform} /></td><td><StatusPill value={row.message_type} /></td><td><StatusPill value={row.status} /></td><td className="truncate">{row.notes || '—'}</td><td>{row.client_id ? clientName(data, row.client_id) : '—'}</td><td><button className="btn btn-secondary tiny" onClick={() => setDrawer({ type: 'outreach', title: 'Edit Outreach', initial: row })}>Edit</button> <button className="btn btn-ghost tiny" onClick={() => actions.remove('outreach_log', row.id)}>Delete</button></td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <EmptyState text="No outreach logged yet. Add your first message." />}
    </>
  )
}

function Retainers({ data, stats, setDrawer, actions }) {
  const active = data.retainers.filter((row) => row.status === 'Active')
  const avg = active.length ? stats.mrr / active.length : 0
  return (
    <>
      <PageHeader title="Retainers" subtitle="Your monthly recurring revenue, tracked per client." action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'retainer', title: '+ New Retainer' })}>+ New Retainer</button>} />
      <section className="pulse-card light">
        <Metric label="Total MRR" value={money(stats.mrr)} />
        <Metric label="Active retainers" value={active.length} />
        <Metric label="Average retainer value" value={`${money(avg)}/month`} />
        <Metric label="Projected annual recurring revenue" value={money(stats.mrr * 12)} />
      </section>
      <section className="card">
        <table>
          <thead><tr><th>Client</th><th>Tier</th><th>Monthly Value</th><th>Start Date</th><th>Status</th><th>Last Updated</th><th>Days Since Update</th><th>Linked Project</th><th>Actions</th></tr></thead>
          <tbody>{data.retainers.map((retainer) => {
            const updates = data.retainer_updates.filter((u) => u.retainer_id === retainer.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            const last = updates[0]?.created_at || retainer.updated_at || retainer.created_at
            const days = daysBetween(last)
            return <tr key={retainer.id}>
              <td>{retainer.client_id ? <button className="link" onClick={() => go(`clients/${retainer.client_id}`)}>{clientName(data, retainer.client_id)}</button> : '—'}</td>
              <td><StatusPill value={retainer.tier} /></td>
              <td>{money(retainer.monthly_value)}</td>
              <td>{formatDate(retainer.start_date)}</td>
              <td><StatusPill value={retainer.status} /></td>
              <td>{formatDate(last)}</td>
              <td>{days > 35 && retainer.status === 'Active' ? <StatusPill value={`${days} days`} tone="warning" /> : `${days} days`}</td>
              <td>{retainer.project_id ? <button className="link" onClick={() => go(`projects/${retainer.project_id}`)}>{projectName(data, retainer.project_id)}</button> : '—'}</td>
              <td><button className="btn btn-secondary tiny" onClick={() => setDrawer({ type: 'retainer', title: 'Edit Retainer', initial: retainer })}>Edit</button> <button className="btn btn-secondary tiny" onClick={() => setDrawer({ type: 'retainerUpdate', title: 'Add Monthly Update', initial: { retainer_id: retainer.id } })}>Update</button> <button className="btn btn-ghost tiny" onClick={() => actions.remove('retainers', retainer.id)}>Delete</button></td>
            </tr>
          })}</tbody>
        </table>
        {!data.retainers.length && <EmptyState text="No retainers yet. Convert completed projects into monthly revenue." />}
      </section>
    </>
  )
}

function Pricing({ settings, stats, actions }) {
  const [calc, setCalc] = useState({ price: 750, costs: 75, hours: 20, hourly: 25 })
  const [editing, setEditing] = useState(false)
  const packages = safeJSON(settings.pricing_packages, DEFAULT_PACKAGES)
  const gross = toNumber(calc.price) - toNumber(calc.costs)
  const margin = toNumber(calc.price) ? Math.round((gross / toNumber(calc.price)) * 100) : 0
  const effective = toNumber(calc.hours) ? gross / toNumber(calc.hours) : 0
  const savePackages = (next) => actions.setting('pricing_packages', JSON.stringify(next))
  return (
    <>
      <PageHeader title="Pricing" subtitle="Your service packages, pricing tiers, and margin calculator." action={<button className="btn btn-secondary" onClick={() => setEditing(!editing)}>{editing ? 'Done editing' : 'Edit packages'}</button>} />
      <section className="package-grid">
        {packages.map((pkg, index) => <article className="card package-card" key={pkg.key || index}>
          {editing ? <PackageEditor pkg={pkg} onChange={(next) => savePackages(packages.map((p, i) => (i === index ? next : p)))} /> : <>
            <div className="package-top"><h3>{pkg.title}</h3><strong>{pkg.price}</strong></div>
            <p>{pkg.description}</p>
            <ul>{(pkg.included || []).map((item) => <li key={item}>{item}</li>)}</ul>
            <small>{pkg.note}</small>
          </>}
        </article>)}
      </section>
      <section className="card">
        <SectionTitle title="Pricing Progression" />
        <table><thead><tr><th>Stage</th><th>Description</th><th>Build Price</th><th>Monthly Retainer</th><th>Primary Goal</th></tr></thead><tbody>{PRICING_STAGES.map((row) => <tr key={row.stage} className={settings.current_stage === row.stage ? 'highlight-row' : ''}><td>{row.stage}</td><td>{row.description}</td><td>{row.buildPrice}</td><td>{row.retainer}</td><td>{row.goal}</td></tr>)}</tbody></table>
      </section>
      <div className="split-layout">
        <section className="card">
          <SectionTitle title="Profit Margin Calculator" />
          <div className="form-grid two">
            <Field label="Project price (£)" type="number" value={calc.price} onChange={(v) => setCalc({ ...calc, price: v })} />
            <Field label="Direct costs (£)" type="number" value={calc.costs} onChange={(v) => setCalc({ ...calc, costs: v })} />
            <Field label="Estimated hours" type="number" value={calc.hours} onChange={(v) => setCalc({ ...calc, hours: v })} />
            <Field label="Hourly value target (£/hour)" type="number" value={calc.hourly} onChange={(v) => setCalc({ ...calc, hourly: v })} />
          </div>
          <section className="metric-grid four">
            <MetricCard title="Gross profit" value={money(gross)} />
            <MetricCard title="Gross margin" value={`${margin}%`} />
            <MetricCard title="Effective hourly rate" value={`${moneyExact(effective)}/hr`} />
            <MetricCard title="Target check" value={effective >= toNumber(calc.hourly) ? 'Meets target' : 'Too low'} tone={effective >= toNumber(calc.hourly) ? 'positive' : 'danger'} />
          </section>
        </section>
        <section className="card">
          <SectionTitle title="Revenue Targets" />
          <ProgressRow label="£1,000/month MRR" value={money(stats.mrr)} pct={(stats.mrr / Math.max(1, toNumber(settings.target_mrr_1))) * 100} />
          <ProgressRow label="£5,000/month MRR" value={money(stats.mrr)} pct={(stats.mrr / Math.max(1, toNumber(settings.target_mrr_2))) * 100} />
          <ProgressRow label="Travel fund" value={`${money(settings.travel_fund_saved)} / ${money(settings.travel_fund_goal)}`} pct={(toNumber(settings.travel_fund_saved) / Math.max(1, toNumber(settings.travel_fund_goal))) * 100} />
        </section>
      </div>
    </>
  )
}

function Processes({ data, setDrawer, actions }) {
  return (
    <>
      <PageHeader title="Processes" subtitle="Your agency's standard operating procedures." action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'process', title: '+ New Process' })}>+ New Process</button>} />
      <section className="process-grid">
        {data.processes.map((process) => <article className="card process-card" key={process.id}>
          <h3>{process.title}</h3>
          <p>{process.description}</p>
          <div className="meta-line"><span>{(process.steps || []).length} steps</span><span>{process.estimated_time || '—'}</span></div>
          <button className="btn btn-secondary" onClick={() => go(`processes/${process.id}`)}>View</button>
        </article>)}
      </section>
      {!data.processes.length && <EmptyState text="No processes yet. Add your first SOP." />}
    </>
  )
}

function ProcessDetail({ id, data, actions }) {
  const process = data.processes.find((row) => row.id === id)
  const [form, setForm] = useState(process || {})
  const [step, setStep] = useState({ title: '', description: '' })
  useEffect(() => setForm(process || {}), [process?.id])
  if (!process) return <NotFound label="process" />
  async function saveField(key, value) {
    const next = { ...form, [key]: value }
    setForm(next)
    await actions.update('processes', id, { [key]: value })
  }
  async function updateSteps(steps) {
    const ordered = steps.map((s, i) => ({ ...s, order: i + 1 }))
    setForm({ ...form, steps: ordered })
    await actions.update('processes', id, { steps: ordered })
  }
  return (
    <>
      <PageHeader title={process.title} subtitle="Editable SOP template. Project tick-offs happen inside project detail pages." />
      <section className="card">
        <div className="form-grid two">
          <Field label="Title" value={form.title || ''} onBlur={(value) => saveField('title', value)} onChange={(value) => setForm({ ...form, title: value })} />
          <Field label="Estimated time" value={form.estimated_time || ''} onBlur={(value) => saveField('estimated_time', value)} onChange={(value) => setForm({ ...form, estimated_time: value })} />
          <Field label="Tools used" value={form.tools_used || ''} onBlur={(value) => saveField('tools_used', value)} onChange={(value) => setForm({ ...form, tools_used: value })} />
          <Field label="Description" textarea value={form.description || ''} onBlur={(value) => saveField('description', value)} onChange={(value) => setForm({ ...form, description: value })} />
        </div>
      </section>
      <section className="card">
        <SectionTitle title="Step-by-step checklist" />
        <div className="checklist">
          {(form.steps || []).map((item, index) => <div className="check-row" key={`${item.title}-${index}`}>
            <div><strong>{index + 1}. {item.title}</strong><span>{item.description}</span></div>
            <div className="row-actions"><button className="btn btn-ghost tiny" disabled={index === 0} onClick={() => updateSteps(moveIndex(form.steps, index, index - 1))}>↑</button><button className="btn btn-ghost tiny" disabled={index === form.steps.length - 1} onClick={() => updateSteps(moveIndex(form.steps, index, index + 1))}>↓</button><button className="btn btn-ghost tiny" onClick={() => updateSteps(form.steps.filter((_, i) => i !== index))}>Delete</button></div>
          </div>)}
        </div>
        <form className="form-grid two" onSubmit={(e) => { e.preventDefault(); if (!step.title.trim()) return; updateSteps([...(form.steps || []), { order: (form.steps || []).length + 1, ...step }]); setStep({ title: '', description: '' }) }}>
          <Field label="Step title" value={step.title} onChange={(value) => setStep({ ...step, title: value })} />
          <Field label="Description" value={step.description} onChange={(value) => setStep({ ...step, description: value })} />
          <button className="btn btn-secondary" type="submit">Add step</button>
        </form>
      </section>
    </>
  )
}

function CaseStudies({ data, setDrawer }) {
  const published = data.case_studies.filter((row) => row.status === 'Published').length
  const inProgress = data.case_studies.filter((row) => row.status !== 'Published').length
  const testimonials = data.case_studies.filter((row) => row.testimonial).length
  return (
    <>
      <PageHeader title="Case Studies" subtitle="Track and manage your proof assets and portfolio." action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'caseStudy', title: '+ New Case Study' })}>+ New Case Study</button>} />
      <section className="metric-grid four"><MetricCard title="Total case studies" value={data.case_studies.length} /><MetricCard title="Published" value={published} /><MetricCard title="In progress" value={inProgress} /><MetricCard title="Testimonials collected" value={testimonials} /></section>
      <section className="case-grid">
        {data.case_studies.map((study) => <article className="card case-card" key={study.id}>
          <div className="case-images"><Thumb src={study.before_screenshot_url} label="Before" /><Thumb src={study.after_screenshot_url} label="After" /></div>
          <h3>{clientName(data, study.client_id)}</h3>
          <p>{projectName(data, study.project_id)}</p>
          <StatusPill value={study.status} />
          <blockquote>{study.testimonial ? study.testimonial.slice(0, 80) : 'No testimonial yet.'}</blockquote>
          {study.published_url && <a href={study.published_url} target="_blank" rel="noreferrer">Published URL</a>}
          <div className="row-actions"><button className="btn btn-secondary" onClick={() => go(`case-studies/${study.id}`)}>View</button><button className="btn btn-secondary" onClick={() => setDrawer({ type: 'caseStudy', title: 'Edit Case Study', initial: study })}>Edit</button></div>
        </article>)}
      </section>
      {!data.case_studies.length && <EmptyState text="No case studies yet. Add proof assets from completed beta builds." />}
    </>
  )
}

function CaseStudyDetail({ id, data, setDrawer }) {
  const study = data.case_studies.find((row) => row.id === id)
  if (!study) return <NotFound label="case study" />
  return (
    <>
      <PageHeader title={`${clientName(data, study.client_id)} Case Study`} subtitle={<><StatusPill value={study.status} /> {study.published_url && <a href={study.published_url} target="_blank" rel="noreferrer">Published case study</a>}</>} action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'caseStudy', title: 'Edit Case Study', initial: study })}>Edit</button>} />
      <section className="card case-detail">
        <div className="before-after"><Thumb src={study.before_screenshot_url} label="Before" /><Thumb src={study.after_screenshot_url} label="After" /></div>
        <h3>{projectName(data, study.project_id)}</h3>
        <blockquote>{study.testimonial || 'No testimonial added yet.'}</blockquote>
        <Info label="Results summary" value={study.results_summary} />
        <Info label="Permission confirmed" value={study.permission_confirmed ? 'Yes' : 'No'} />
        <Info label="Notes" value={study.notes} />
      </section>
    </>
  )
}

function Documents({ data, setDrawer, actions }) {
  const [filters, setFilters] = useState({ type: 'All', client: 'All', project: 'All', search: '', start: '', end: '' })
  const rows = data.documents.filter((doc) => {
    if (filters.type !== 'All' && doc.document_type !== filters.type) return false
    if (filters.client !== 'All' && doc.client_id !== filters.client) return false
    if (filters.project !== 'All' && doc.project_id !== filters.project) return false
    if (filters.start && doc.upload_date < filters.start) return false
    if (filters.end && doc.upload_date > filters.end) return false
    return searchMatch(filters.search, [doc.file_name, doc.document_type, doc.notes, clientName(data, doc.client_id), projectName(data, doc.project_id)])
  })
  return (
    <>
      <PageHeader title="Documents" subtitle="All receipts, contracts, briefs, and files in one place." action={<button className="btn btn-primary" onClick={() => setDrawer({ type: 'document', title: '+ Upload Document' })}>+ Upload Document</button>} />
      <FilterBar>
        <Select value={filters.type} onChange={(value) => setFilters({ ...filters, type: value })} options={['All', ...DOCUMENT_TYPES]} />
        <Select value={filters.client} onChange={(value) => setFilters({ ...filters, client: value })} options={['All', ...data.clients.map((c) => ({ label: c.business_name, value: c.id }))]} />
        <Select value={filters.project} onChange={(value) => setFilters({ ...filters, project: value })} options={['All', ...data.projects.map((p) => ({ label: p.project_name, value: p.id }))]} />
        <input type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} />
        <input type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
        <input className="search" placeholder="Search files…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
      </FilterBar>
      <section className="card"><DocumentsTable rows={rows} data={data} actions={actions} setDrawer={setDrawer} /></section>
    </>
  )
}

function DocumentsTable({ rows, data, actions, setDrawer, compact = false }) {
  if (!rows.length) return <EmptyState text="No documents uploaded yet." />
  return <table><thead><tr><th>File name</th><th>Type</th>{!compact && <th>Client</th>}{!compact && <th>Project</th>}<th>Upload date</th><th>Notes</th>{!compact && <th>Actions</th>}</tr></thead><tbody>{rows.map((doc) => <tr key={doc.id}>
    <td>{doc.file_url ? <a href={doc.file_url} target="_blank" rel="noreferrer">{doc.file_name}</a> : doc.file_name}</td><td><StatusPill value={doc.document_type} /></td>{!compact && <td>{clientName(data, doc.client_id)}</td>}{!compact && <td>{projectName(data, doc.project_id)}</td>}<td>{formatDate(doc.upload_date)}</td><td className="truncate">{doc.notes || '—'}</td>{!compact && <td><button className="btn btn-secondary tiny" onClick={() => setDrawer({ type: 'document', title: 'Edit Document', initial: doc })}>Edit metadata</button> <button className="btn btn-ghost tiny" onClick={() => actions.remove('documents', doc.id)}>Delete</button></td>}
  </tr>)}</tbody></table>
}

function Settings({ settings, actions, reload }) {
  const [form, setForm] = useState(settings)
  const [connection, setConnection] = useState('Checking…')
  useEffect(() => setForm(settings), [settings])
  useEffect(() => {
    async function check() {
      if (!isSupabaseConfigured) return setConnection('Not configured')
      const { error } = await supabase.from('settings').select('id').limit(1)
      setConnection(error ? 'Offline' : 'Live')
    }
    check()
  }, [])
  async function save(e) {
    e.preventDefault()
    for (const [key, value] of Object.entries(form)) await actions.setting(key, value)
  }
  return (
    <>
      <PageHeader title="Settings" subtitle="App-wide configuration and connection status." action={<button className="btn btn-secondary" onClick={reload}>Refresh data</button>} />
      <form className="settings-grid" onSubmit={save}>
        <section className="card"><SectionTitle title="Agency Details" /><Field label="Agency name" value={form.agency_name || ''} onChange={(v) => setForm({ ...form, agency_name: v })} /><Field label="Owner name" value={form.owner_name || ''} onChange={(v) => setForm({ ...form, owner_name: v })} /><Field label="Default currency" value="GBP" disabled /></section>
        <section className="card"><SectionTitle title="Outreach Targets" /><Field label="Weekly message target" type="number" value={form.weekly_message_target || 100} onChange={(v) => setForm({ ...form, weekly_message_target: v })} /><Field label="Daily message target" type="number" value={form.daily_message_target || 20} onChange={(v) => setForm({ ...form, daily_message_target: v })} /></section>
        <section className="card"><SectionTitle title="Pricing Stage" /><Select label="Current pricing stage" value={form.current_stage || 'Stage 1'} onChange={(v) => setForm({ ...form, current_stage: v })} options={PRICING_STAGES.map((s) => s.stage)} /></section>
        <section className="card"><SectionTitle title="Revenue Targets" /><Field label="Target 1: MRR (£)" type="number" value={form.target_mrr_1 || 1000} onChange={(v) => setForm({ ...form, target_mrr_1: v })} /><Field label="Target 2: MRR (£)" type="number" value={form.target_mrr_2 || 5000} onChange={(v) => setForm({ ...form, target_mrr_2: v })} /><Field label="Travel fund goal (£)" type="number" value={form.travel_fund_goal || 15000} onChange={(v) => setForm({ ...form, travel_fund_goal: v })} /><Field label="Travel fund saved so far (£)" type="number" value={form.travel_fund_saved || 0} onChange={(v) => setForm({ ...form, travel_fund_saved: v })} /></section>
        <section className="card"><SectionTitle title="App Access" /><p>The password is read from <code>VITE_APP_PASSWORD</code>. Change it in Vercel Environment Variables, then redeploy.</p></section>
        <section className="card"><SectionTitle title="Supabase Connection" /><Info label="VITE_SUPABASE_URL" value={maskedSupabaseUrl} /><Info label="Connection status" value={connection} /></section>
        <section className="card span-2"><SectionTitle title="Package Defaults" /><p>Default deliverable checklists are stored in <code>src/lib/constants.js</code>. New projects pre-populate from those defaults.</p></section>
        <button className="btn btn-primary" type="submit">Save settings</button>
      </form>
    </>
  )
}

function ClientForm({ data, actions, close, initial }) {
  const [form, setForm] = useState({ business_name: '', contact_name: '', email: '', phone: '', website_url: '', niche: '', source: 'Instagram DM', status: 'Lead', notes: '', ...initial, tags: (initial.tags || []).join?.(', ') || initial.tags || '' })
  const editing = Boolean(initial.id)
  async function submit(e) {
    e.preventDefault()
    const payload = { ...form, tags: String(form.tags || '').split(',').map((x) => x.trim()).filter(Boolean) }
    if (editing) await actions.update('clients', initial.id, payload)
    else await actions.create('clients', payload)
    close()
  }
  return <RecordForm onSubmit={submit} submitLabel={editing ? 'Update client' : 'Create client'}>
    <Field required label="Business name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
    <Field label="Contact name" value={form.contact_name || ''} onChange={(v) => setForm({ ...form, contact_name: v })} />
    <Field label="Email" type="email" value={form.email || ''} onChange={(v) => setForm({ ...form, email: v })} />
    <Field label="Phone" value={form.phone || ''} onChange={(v) => setForm({ ...form, phone: v })} />
    <Field label="Current website URL" type="url" value={form.website_url || ''} onChange={(v) => setForm({ ...form, website_url: v })} />
    <Field label="Niche / industry" value={form.niche || ''} onChange={(v) => setForm({ ...form, niche: v })} />
    <Select label="Source" value={form.source || ''} onChange={(v) => setForm({ ...form, source: v })} options={SOURCES} />
    <Select label="Status" value={form.status || ''} onChange={(v) => setForm({ ...form, status: v })} options={CLIENT_STATUSES} />
    <Field label="Tags" value={form.tags || ''} onChange={(v) => setForm({ ...form, tags: v })} placeholder="wedding, photographer, beta" />
    <Field label="Notes" textarea value={form.notes || ''} onChange={(v) => setForm({ ...form, notes: v })} />
  </RecordForm>
}

function ProjectForm({ data, actions, close, initial }) {
  const [form, setForm] = useState({ client_id: '', project_name: '', package_type: 'Beta Build', status: 'Idea', start_date: todayISO(), target_launch: '', target_price: '', actual_price: '', platform: 'Webflow', direct_costs: '', notes: '', ...initial })
  const editing = Boolean(initial.id)
  const selectedClient = data.clients.find((c) => c.id === form.client_id)
  useEffect(() => {
    if (!editing && selectedClient && !form.project_name) setForm((prev) => ({ ...prev, project_name: `${selectedClient.business_name} — ${prev.package_type}` }))
  }, [form.client_id, form.package_type])
  async function submit(e) {
    e.preventDefault()
    if (editing) await actions.update('projects', initial.id, form)
    else await actions.createProject(form)
    close()
  }
  return <RecordForm onSubmit={submit} submitLabel={editing ? 'Update project' : 'Create project'}>
    <Select label="Linked client" value={form.client_id || ''} onChange={(v) => setForm({ ...form, client_id: v })} options={[{ label: 'No client linked', value: '' }, ...data.clients.map((c) => ({ label: c.business_name, value: c.id }))]} />
    <Field required label="Project name" value={form.project_name || ''} onChange={(v) => setForm({ ...form, project_name: v })} />
    <Select label="Package type" value={form.package_type || ''} onChange={(v) => setForm({ ...form, package_type: v })} options={PACKAGE_TYPES} />
    <Select label="Status" value={form.status || ''} onChange={(v) => setForm({ ...form, status: v })} options={PROJECT_STATUSES} />
    <Field label="Start date" type="date" value={form.start_date || ''} onChange={(v) => setForm({ ...form, start_date: v })} />
    <Field label="Target launch date" type="date" value={form.target_launch || ''} onChange={(v) => setForm({ ...form, target_launch: v })} />
    <Field label="Target price (£)" type="number" value={form.target_price || ''} onChange={(v) => setForm({ ...form, target_price: v })} />
    <Field label="Actual price charged (£)" type="number" value={form.actual_price || ''} onChange={(v) => setForm({ ...form, actual_price: v })} />
    <Field label="Direct costs (£)" type="number" value={form.direct_costs || ''} onChange={(v) => setForm({ ...form, direct_costs: v })} />
    <Select label="Platform" value={form.platform || ''} onChange={(v) => setForm({ ...form, platform: v })} options={PLATFORMS} />
    <Field label="Notes / brief" textarea value={form.notes || ''} onChange={(v) => setForm({ ...form, notes: v })} />
  </RecordForm>
}

function OutreachForm({ data, actions, close, initial }) {
  const [form, setForm] = useState({ date: todayISO(), business_name: '', contact_name: '', platform: 'Instagram', message_type: 'Cold DM', status: 'Sent', notes: '', client_id: '', create_client: false, ...initial })
  const editing = Boolean(initial.id)
  async function submit(e) {
    e.preventDefault()
    let clientId = form.client_id
    if (!editing && form.create_client && form.business_name) {
      const client = await actions.create('clients', { business_name: form.business_name, contact_name: form.contact_name, source: form.message_type === 'Loom Audit' ? 'Loom Audit' : form.platform, status: 'Lead' })
      clientId = client.id
    }
    const payload = { ...form, client_id: clientId || null }
    delete payload.create_client
    if (editing) await actions.update('outreach_log', initial.id, payload)
    else await actions.create('outreach_log', payload)
    close()
  }
  return <RecordForm onSubmit={submit} submitLabel={editing ? 'Update outreach' : 'Log outreach'}>
    <Field label="Date" type="date" value={form.date || ''} onChange={(v) => setForm({ ...form, date: v })} />
    <Field required label="Business name" value={form.business_name || ''} onChange={(v) => setForm({ ...form, business_name: v })} />
    <Field label="Contact name" value={form.contact_name || ''} onChange={(v) => setForm({ ...form, contact_name: v })} />
    <Select label="Platform" value={form.platform || ''} onChange={(v) => setForm({ ...form, platform: v })} options={OUTREACH_PLATFORMS} />
    <Select label="Message type" value={form.message_type || ''} onChange={(v) => setForm({ ...form, message_type: v })} options={MESSAGE_TYPES} />
    <Select label="Status" value={form.status || ''} onChange={(v) => setForm({ ...form, status: v })} options={OUTREACH_STATUSES} />
    <Select label="Link to existing client" value={form.client_id || ''} onChange={(v) => setForm({ ...form, client_id: v })} options={[{ label: 'None', value: '' }, ...data.clients.map((c) => ({ label: c.business_name, value: c.id }))]} />
    {!editing && <label className="checkbox-label"><input type="checkbox" checked={!!form.create_client} onChange={(e) => setForm({ ...form, create_client: e.target.checked })} /> Link to new client record</label>}
    <Field label="Notes" textarea value={form.notes || ''} onChange={(v) => setForm({ ...form, notes: v })} />
  </RecordForm>
}

function RetainerForm({ data, actions, close, initial }) {
  const [form, setForm] = useState({ client_id: '', project_id: '', tier: 'Maintain', monthly_value: '', start_date: todayISO(), status: 'Active', notes: '', ...initial })
  const editing = Boolean(initial.id)
  async function submit(e) {
    e.preventDefault()
    if (editing) await actions.update('retainers', initial.id, form)
    else await actions.create('retainers', form)
    close()
  }
  return <RecordForm onSubmit={submit} submitLabel={editing ? 'Update retainer' : 'Create retainer'}>
    <Select label="Linked client" value={form.client_id || ''} onChange={(v) => setForm({ ...form, client_id: v })} options={data.clients.map((c) => ({ label: c.business_name, value: c.id }))} />
    <Select label="Linked project" value={form.project_id || ''} onChange={(v) => setForm({ ...form, project_id: v })} options={[{ label: 'None', value: '' }, ...data.projects.map((p) => ({ label: p.project_name, value: p.id }))]} />
    <Select label="Tier" value={form.tier || ''} onChange={(v) => setForm({ ...form, tier: v })} options={RETAINER_TIERS} />
    <Field required label="Monthly value (£)" type="number" value={form.monthly_value || ''} onChange={(v) => setForm({ ...form, monthly_value: v })} />
    <Field label="Start date" type="date" value={form.start_date || ''} onChange={(v) => setForm({ ...form, start_date: v })} />
    <Select label="Status" value={form.status || ''} onChange={(v) => setForm({ ...form, status: v })} options={RETAINER_STATUSES} />
    <Field label="Notes" textarea value={form.notes || ''} onChange={(v) => setForm({ ...form, notes: v })} />
  </RecordForm>
}

function RetainerUpdateForm({ actions, close, initial }) {
  const [form, setForm] = useState({ retainer_id: initial.retainer_id, month_label: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), update_text: '' })
  async function submit(e) { e.preventDefault(); await actions.create('retainer_updates', form); close() }
  return <RecordForm onSubmit={submit} submitLabel="Add monthly update"><Field label="Month label" value={form.month_label} onChange={(v) => setForm({ ...form, month_label: v })} /><Field required label="Update text" textarea value={form.update_text} onChange={(v) => setForm({ ...form, update_text: v })} /></RecordForm>
}

function ProcessForm({ actions, close, initial }) {
  const [form, setForm] = useState({ title: '', description: '', estimated_time: '', tools_used: '', steps: [], ...initial })
  const editing = Boolean(initial.id)
  async function submit(e) { e.preventDefault(); if (editing) await actions.update('processes', initial.id, form); else await actions.create('processes', form); close() }
  return <RecordForm onSubmit={submit} submitLabel={editing ? 'Update process' : 'Create process'}><Field required label="Title" value={form.title || ''} onChange={(v) => setForm({ ...form, title: v })} /><Field label="Description" textarea value={form.description || ''} onChange={(v) => setForm({ ...form, description: v })} /><Field label="Estimated time" value={form.estimated_time || ''} onChange={(v) => setForm({ ...form, estimated_time: v })} /><Field label="Tools used" value={form.tools_used || ''} onChange={(v) => setForm({ ...form, tools_used: v })} /></RecordForm>
}

function CaseStudyForm({ data, actions, close, initial }) {
  const [form, setForm] = useState({ client_id: '', project_id: '', status: 'In Progress', before_url: '', after_url: '', before_screenshot_url: '', after_screenshot_url: '', testimonial: '', permission_confirmed: false, results_summary: '', published_url: '', notes: '', ...initial })
  const [beforeFile, setBeforeFile] = useState(null)
  const [afterFile, setAfterFile] = useState(null)
  const editing = Boolean(initial.id)
  async function submit(e) {
    e.preventDefault()
    const payload = { ...form }
    if (beforeFile) Object.assign(payload, { before_screenshot_url: (await uploadFileToDocuments(beforeFile)).file_url })
    if (afterFile) Object.assign(payload, { after_screenshot_url: (await uploadFileToDocuments(afterFile)).file_url })
    if (payload.status === 'Published' && !payload.permission_confirmed) return alert('Permission must be confirmed before publishing.')
    if (editing) await actions.update('case_studies', initial.id, payload)
    else await actions.create('case_studies', payload)
    close()
  }
  return <RecordForm onSubmit={submit} submitLabel={editing ? 'Update case study' : 'Create case study'}>
    <Select label="Linked client" value={form.client_id || ''} onChange={(v) => setForm({ ...form, client_id: v })} options={data.clients.map((c) => ({ label: c.business_name, value: c.id }))} />
    <Select label="Linked project" value={form.project_id || ''} onChange={(v) => setForm({ ...form, project_id: v })} options={data.projects.map((p) => ({ label: p.project_name, value: p.id }))} />
    <Select label="Status" value={form.status || ''} onChange={(v) => setForm({ ...form, status: v })} options={CASE_STUDY_STATUSES} />
    <Field label="Before website URL" value={form.before_url || ''} onChange={(v) => setForm({ ...form, before_url: v })} />
    <Field label="After/staging URL" value={form.after_url || ''} onChange={(v) => setForm({ ...form, after_url: v })} />
    <FileField label="Before screenshot" onChange={setBeforeFile} />
    <FileField label="After screenshot" onChange={setAfterFile} />
    <Field label="Testimonial" textarea value={form.testimonial || ''} onChange={(v) => setForm({ ...form, testimonial: v })} />
    <label className="checkbox-label"><input type="checkbox" checked={!!form.permission_confirmed} onChange={(e) => setForm({ ...form, permission_confirmed: e.target.checked })} /> Permission confirmed</label>
    <Field label="Results summary" textarea value={form.results_summary || ''} onChange={(v) => setForm({ ...form, results_summary: v })} />
    <Field label="Published URL" value={form.published_url || ''} onChange={(v) => setForm({ ...form, published_url: v })} />
    <Field label="Notes" textarea value={form.notes || ''} onChange={(v) => setForm({ ...form, notes: v })} />
  </RecordForm>
}

function DocumentForm({ data, actions, close, initial }) {
  const [form, setForm] = useState({ file_name: '', file_url: '', document_type: 'Brief', client_id: '', project_id: '', notes: '', upload_date: todayISO(), ...initial })
  const [file, setFile] = useState(null)
  const editing = Boolean(initial.id)
  async function submit(e) {
    e.preventDefault()
    const payload = { ...form }
    if (file) Object.assign(payload, await uploadFileToDocuments(file))
    if (!payload.file_name && payload.file_url) payload.file_name = payload.file_url
    if (editing) await actions.update('documents', initial.id, payload)
    else await actions.create('documents', payload)
    close()
  }
  return <RecordForm onSubmit={submit} submitLabel={editing ? 'Update document' : 'Save document'}>
    {!editing && <FileField label="File upload" onChange={setFile} />}
    <Field label="Or Loom / external URL" value={form.file_url || ''} onChange={(v) => setForm({ ...form, file_url: v, document_type: v ? 'Loom Video' : form.document_type })} />
    <Field label="File name" value={form.file_name || ''} onChange={(v) => setForm({ ...form, file_name: v })} />
    <Select label="Document type" value={form.document_type || ''} onChange={(v) => setForm({ ...form, document_type: v })} options={DOCUMENT_TYPES} />
    <Select label="Linked client" value={form.client_id || ''} onChange={(v) => setForm({ ...form, client_id: v })} options={[{ label: 'None', value: '' }, ...data.clients.map((c) => ({ label: c.business_name, value: c.id }))]} />
    <Select label="Linked project" value={form.project_id || ''} onChange={(v) => setForm({ ...form, project_id: v })} options={[{ label: 'None', value: '' }, ...data.projects.map((p) => ({ label: p.project_name, value: p.id }))]} />
    <Field label="Upload date" type="date" value={form.upload_date || ''} onChange={(v) => setForm({ ...form, upload_date: v })} />
    <Field label="Notes" textarea value={form.notes || ''} onChange={(v) => setForm({ ...form, notes: v })} />
  </RecordForm>
}

function RecordForm({ children, onSubmit, submitLabel }) { return <form className="drawer-form" onSubmit={onSubmit}>{children}<button className="btn btn-primary" type="submit">{submitLabel}</button></form> }
function Field({ label, value, onChange, onBlur, textarea, type = 'text', required, placeholder, disabled }) {
  const Input = textarea ? 'textarea' : 'input'
  return <label className="field"><span>{label}</span><Input required={required} disabled={disabled} type={textarea ? undefined : type} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange?.(e.target.value)} onBlur={(e) => onBlur?.(e.target.value)} /></label>
}
function Select({ label, value, onChange, options = [] }) { return <label className="field select-field">{label && <span>{label}</span>}<select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>{options.map((opt) => typeof opt === 'string' ? <option key={opt} value={opt}>{opt}</option> : <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label> }
function FileField({ label, onChange }) { return <label className="field"><span>{label}</span><input type="file" onChange={(e) => onChange(e.target.files?.[0] || null)} /></label> }
function SlideOver({ title, onClose, children }) { return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer" onMouseDown={(e) => e.stopPropagation()}><header><h2>{title}</h2><button className="icon-btn" onClick={onClose}>×</button></header>{children}</aside></div> }
function MetricCard({ title, value, subtitle, tone }) { return <article className={`metric-card ${tone || ''}`}><span>{title}</span><strong>{value}</strong>{subtitle && <small>{subtitle}</small>}</article> }
function Metric({ label, value, small }) { return <div className={small ? 'metric small' : 'metric'}><span>{label}</span><strong>{value}</strong></div> }
function StatusPill({ value, tone }) { if (!value) return <span className="pill">—</span>; return <span className={`pill ${tone || statusTone(value)}`}>{value}</span> }
function Progress({ value, label, large }) { const safe = Math.max(0, Math.min(100, Number(value || 0))); return <div className={large ? 'progress large' : 'progress'}><div><span style={{ width: `${safe}%` }} /></div>{label && <small>{label}</small>}</div> }
function ProgressRow({ label, value, pct }) { return <div className="progress-row"><div><strong>{label}</strong><span>{value}</span></div><Progress value={pct} /></div> }
function AgeBar({ days }) { const tone = days > 21 ? 'danger' : days > 10 ? 'warning' : 'positive'; return <div className="age-cell"><span className={`age-line ${tone}`} style={{ width: `${Math.min(100, Math.max(12, days * 4))}%` }} /> <small>{days}d</small></div> }
function SectionTitle({ title, subtitle, link, onLink, action }) { return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><div>{action}{link && <button className="link" onClick={onLink}>{link}</button>}</div></div> }
function FilterBar({ children }) { return <section className="filter-bar">{children}</section> }
function EmptyState({ text }) { return <div className="empty-state">{text}</div> }
function Loading() { return <div className="loading">Loading workspace…</div> }
function Notice({ tone = 'info', title, children }) { return <div className={`notice ${tone}`}><strong>{title}</strong><span>{children}</span></div> }
function Tabs({ tabs, active, onChange }) { return <div className="tabs">{tabs.map(([key, label]) => <button key={key} className={active === key ? 'active' : ''} onClick={() => onChange(key)}>{label}</button>)}</div> }
function Info({ label, value }) { return <div className="info"><span>{label}</span><strong>{value || '—'}</strong></div> }
function Timeline({ rows }) { return <div className="timeline">{rows.length ? rows.map((row, index) => <div className="timeline-item" key={index}><span>{formatDate(row.date)}</span><p>{row.text}</p></div>) : <EmptyState text="No timeline entries yet." />}</div> }
function Thumb({ src, label }) { return <div className="thumb">{src ? <img src={src} alt={label} /> : <span>{label}</span>}</div> }
function NotFound({ label }) { return <Notice tone="danger" title="Not found">This {label} could not be found.</Notice> }

function PackageEditor({ pkg, onChange }) {
  return <div className="package-editor"><Field label="Title" value={pkg.title} onChange={(v) => onChange({ ...pkg, title: v })} /><Field label="Price" value={pkg.price} onChange={(v) => onChange({ ...pkg, price: v })} /><Field label="Description" textarea value={pkg.description} onChange={(v) => onChange({ ...pkg, description: v })} /><Field label="Included, one per line" textarea value={(pkg.included || []).join('\n')} onChange={(v) => onChange({ ...pkg, included: v.split('\n').filter(Boolean) })} /><Field label="Note" value={pkg.note} onChange={(v) => onChange({ ...pkg, note: v })} /></div>
}

function clientName(data, id) { return data.clients.find((row) => row.id === id)?.business_name || '—' }
function projectName(data, id) { return data.projects.find((row) => row.id === id)?.project_name || '—' }
function unique(values) { return [...new Set(values)] }
function searchMatch(search, values) { if (!search) return true; const query = search.toLowerCase(); return values.some((value) => String(value || '').toLowerCase().includes(query)) }
function stageCount(data, stage) { if (stage === 'Retainer Active') return data.retainers.filter((r) => r.status === 'Active').length; if (stage === 'Live') return data.projects.filter((p) => ['Live', 'In Review'].includes(p.status)).length; return data.projects.filter((p) => p.status === stage).length + data.outreach_log.filter((o) => o.status === stage).length }
function statusTone(value) { const v = String(value).toLowerCase(); if (v.includes('active') || v.includes('completed') || v.includes('published') || v.includes('converted') || v.includes('paid') || v.includes('live') || v.includes('grow') || v.includes('scale')) return 'positive'; if (v.includes('cancel') || v.includes('churn') || v.includes('overdue') || v.includes('not interested')) return 'danger'; if (v.includes('paused') || v.includes('proposal') || v.includes('review') || v.includes('collecting') || v.includes('call') || v.includes('build')) return 'warning'; return '' }
function lastClientActivity(client, data) { const dates = [client.updated_at, client.created_at, ...data.client_notes.filter((n) => n.client_id === client.id).map((n) => n.created_at), ...data.project_notes.filter((n) => data.projects.find((p) => p.id === n.project_id)?.client_id === client.id).map((n) => n.created_at), ...data.outreach_log.filter((o) => o.client_id === client.id).map((o) => o.date)]; return dates.filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0] }
function bestPerformer(rows, key) { const grouped = {}; rows.forEach((row) => { const k = row[key] || 'Other'; grouped[k] ||= { total: 0, replies: 0 }; grouped[k].total += 1; if (['Replied', 'Call Booked', 'Converted'].includes(row.status)) grouped[k].replies += 1 }); const ranked = Object.entries(grouped).sort((a, b) => (b[1].replies / Math.max(1, b[1].total)) - (a[1].replies / Math.max(1, a[1].total))); return ranked[0]?.[0] || '—' }
function moveIndex(arr, from, to) { const next = [...arr]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next }
function safeJSON(raw, fallback) { try { return JSON.parse(raw) } catch { return fallback } }
