export const toDateInput = (iso: string | undefined): string => {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export const fromDateInput = (yyyymmdd: string): string | undefined => {
  if (!yyyymmdd) return undefined
  return new Date(`${yyyymmdd}T00:00:00.000Z`).toISOString()
}

export const requireDateInput = (yyyymmdd: string): string =>
  fromDateInput(yyyymmdd) ?? new Date().toISOString()
