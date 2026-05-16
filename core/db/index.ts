import Dexie, { type Table } from 'dexie'

export type KvKey =
  | 'scenarios'
  | 'tags'
  | 'settings'
  | 'activeScenarioId'
  | 'schemaVersion'

export type KvRow = {
  key: KvKey
  value: unknown
}

export const SCHEMA_VERSION = 1

class AppDB extends Dexie {
  kv!: Table<KvRow, KvKey>

  constructor() {
    super('personal-finance-modelling')
    this.version(1).stores({
      kv: 'key',
    })
  }
}

export const db = new AppDB()

export const loadKv = async <T>(key: KvKey): Promise<T | undefined> => {
  const row = await db.kv.get(key)
  return row?.value as T | undefined
}

export const saveKv = async (key: KvKey, value: unknown): Promise<void> => {
  await db.kv.put({ key, value })
}

export const clearAll = async (): Promise<void> => {
  await db.kv.clear()
}
