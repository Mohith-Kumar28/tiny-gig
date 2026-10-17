import { env } from 'cloudflare:workers'

export { env }

export function appUrl(path = '') {
  return `${env.APP_URL.replace(/\/$/, '')}${path}`
}

export function adminEmails() {
  return env.ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}
