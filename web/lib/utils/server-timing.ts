export type ServerTimingEntry = {
  name: string
  durMs: number
  desc?: string
}

const sanitizeToken = (value: string) => value.replace(/[^a-zA-Z0-9_.-]/g, '')

export function buildServerTimingHeader(entries: ServerTimingEntry[]): string {
  return entries
    .filter((e) => Number.isFinite(e.durMs) && e.durMs >= 0)
    .map((e) => {
      const name = sanitizeToken(e.name || 'step')
      const dur = Math.round(e.durMs)
      const desc = e.desc ? `;desc="${String(e.desc).replace(/"/g, "'")}"` : ''
      return `${name};dur=${dur}${desc}`
    })
    .join(', ')
}

