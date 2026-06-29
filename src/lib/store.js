import { DEFAULT_PROCESSES, DEFAULT_SETTINGS, TABLES } from './constants'
import { isSupabaseConfigured, supabase } from './supabase'
import { todayISO } from './calculations'

const LOCAL_KEY = 'avozea_agency_manager_workspace_v1'

const blankWorkspace = () => ({
  clients: [],
  projects: [],
  project_deliverables: [],
  project_notes: [],
  retainers: [],
  retainer_updates: [],
  outreach_log: [],
  case_studies: [],
  documents: [],
  processes: DEFAULT_PROCESSES.map((process, index) => ({
    id: cryptoId(),
    ...process,
    steps: process.steps,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sort_index: index,
  })),
  client_notes: [],
  settings: Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
    id: cryptoId(),
    key,
    value,
    updated_at: new Date().toISOString(),
  })),
})

export function cryptoId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readLocal() {
  const raw = localStorage.getItem(LOCAL_KEY)
  if (!raw) {
    const workspace = blankWorkspace()
    localStorage.setItem(LOCAL_KEY, JSON.stringify(workspace))
    return workspace
  }
  const parsed = JSON.parse(raw)
  const defaults = blankWorkspace()
  return TABLES.reduce((acc, table) => ({ ...acc, [table]: parsed[table] || defaults[table] || [] }), {})
}

function writeLocal(workspace) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(workspace))
}

export function settingsObject(settingsRows = []) {
  const base = { ...DEFAULT_SETTINGS }
  settingsRows.forEach((row) => {
    base[row.key] = row.value
  })
  return base
}

export async function fetchWorkspace() {
  if (!isSupabaseConfigured) return readLocal()

  const result = {}
  for (const table of TABLES) {
    let query = supabase.from(table).select('*')
    if (table === 'settings') query = query.order('key', { ascending: true })
    else query = query.order('created_at', { ascending: false, nullsFirst: false })
    const { data, error } = await query
    if (error) throw new Error(`${table}: ${error.message}`)
    result[table] = data || []
  }

  if (!result.processes?.length) {
    for (const process of DEFAULT_PROCESSES) {
      await supabase.from('processes').insert(process)
    }
    const { data } = await supabase.from('processes').select('*').order('created_at', { ascending: false })
    result.processes = data || []
  }

  if (!result.settings?.length) {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }
    const { data } = await supabase.from('settings').select('*')
    result.settings = data || []
  }

  return result
}

export async function createRecord(table, payload) {
  const now = new Date().toISOString()
  const row = { ...payload, created_at: payload.created_at || now, updated_at: payload.updated_at || now }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from(table).insert(row).select('*').single()
    if (error) throw new Error(error.message)
    return data
  }

  const workspace = readLocal()
  const localRow = { id: cryptoId(), ...row }
  workspace[table] = [localRow, ...(workspace[table] || [])]
  writeLocal(workspace)
  return localRow
}

export async function updateRecord(table, id, payload) {
  const row = { ...payload, updated_at: new Date().toISOString() }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from(table).update(row).eq('id', id).select('*').single()
    if (error) throw new Error(error.message)
    return data
  }

  const workspace = readLocal()
  workspace[table] = (workspace[table] || []).map((item) => (item.id === id ? { ...item, ...row } : item))
  writeLocal(workspace)
  return workspace[table].find((item) => item.id === id)
}

export async function deleteRecord(table, id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw new Error(error.message)
    return true
  }

  const workspace = readLocal()
  workspace[table] = (workspace[table] || []).filter((item) => item.id !== id)
  writeLocal(workspace)
  return true
}

export async function upsertSetting(key, value) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  const workspace = readLocal()
  const existing = workspace.settings.find((row) => row.key === key)
  if (existing) {
    existing.value = String(value)
    existing.updated_at = new Date().toISOString()
  } else {
    workspace.settings.push({ id: cryptoId(), key, value: String(value), updated_at: new Date().toISOString() })
  }
  writeLocal(workspace)
  return workspace.settings.find((row) => row.key === key)
}

export async function uploadFileToDocuments(file) {
  if (!file) return null
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-')}`

  if (isSupabaseConfigured) {
    const { error } = await supabase.storage.from('documents').upload(safeName, file, { upsert: false })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('documents').getPublicUrl(safeName)
    return { file_name: file.name, file_url: data.publicUrl }
  }

  return { file_name: file.name, file_url: URL.createObjectURL(file) }
}

export function normaliseDate(value) {
  return value || todayISO()
}
