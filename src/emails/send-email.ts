import { render } from '@react-email/components'
import { waitUntil } from 'cloudflare:workers'
import { createElement } from 'react'
import { Resend } from 'resend'
import { getDb, schema } from '@/db/client'
import { env } from '@/lib/env'
import { BaseEmail } from './base-email'
import { type EmailTemplateData, type EmailTemplateName, emailTemplates } from './templates'

type SendArgs<T extends EmailTemplateName> = {
  to: string | string[]
  template: T
  data: EmailTemplateData<T>
}

async function renderEmail<T extends EmailTemplateName>(template: T, data: EmailTemplateData<T>) {
  const ctx = { appUrl: env.APP_URL, appName: env.APP_NAME }
  const build = emailTemplates[template] as (d: EmailTemplateData<T>, c: typeof ctx) => ReturnType<
    (typeof emailTemplates)[T]
  >
  const { subject, ...content } = build(data, ctx)
  const element = createElement(BaseEmail, { ...content, ...ctx })
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  return { subject, html, text }
}

/** Renders, sends (or logs in dev when no RESEND_API_KEY) and records an email. */
export async function sendEmail<T extends EmailTemplateName>({ to, template, data }: SendArgs<T>) {
  const recipients = Array.isArray(to) ? to : [to]
  if (!recipients.length) return
  const { subject, html, text } = await renderEmail(template, data)
  const db = getDb()

  if (!env.RESEND_API_KEY) {
    console.log(`[email:${template}] → ${recipients.join(', ')} | ${subject}\n${text.slice(0, 600)}`)
    await db.insert(schema.emailLog).values(
      recipients.map((r) => ({ to: r, template, subject, status: 'logged' as const })),
    )
    return
  }

  const resend = new Resend(env.RESEND_API_KEY)
  const results = await Promise.allSettled(
    recipients.map((r) => resend.emails.send({ from: env.EMAIL_FROM, to: r, subject, html, text })),
  )
  await db.insert(schema.emailLog).values(
    results.map((res, i) => {
      const ok = res.status === 'fulfilled' && !res.value.error
      const error =
        res.status === 'rejected' ? String(res.reason) : res.value.error ? res.value.error.message : null
      return {
        to: recipients[i],
        template,
        subject,
        status: ok ? ('sent' as const) : ('failed' as const),
        providerId: res.status === 'fulfilled' ? (res.value.data?.id ?? null) : null,
        error,
      }
    }),
  )
}

/** Fire-and-forget: keeps the request fast, the Worker finishes sending after the response. */
export function queueEmail<T extends EmailTemplateName>(args: SendArgs<T>) {
  waitUntil(
    sendEmail(args).catch((err) => {
      console.error(`[email:${args.template}] failed`, err)
    }),
  )
}

/** Same email to many recipients, one message each, via Resend's batch API (100 per call). */
export function queueBulkEmail<T extends EmailTemplateName>(args: { to: string[]; template: T; data: EmailTemplateData<T> }) {
  const task = async () => {
    if (!args.to.length) return
    if (!env.RESEND_API_KEY) return sendEmail(args)
    const { subject, html, text } = await renderEmail(args.template, args.data)
    const resend = new Resend(env.RESEND_API_KEY)
    const db = getDb()
    for (let i = 0; i < args.to.length; i += 100) {
      const chunk = args.to.slice(i, i + 100)
      const res = await resend.batch.send(chunk.map((to) => ({ from: env.EMAIL_FROM, to, subject, html, text })))
      await db.insert(schema.emailLog).values(
        chunk.map((to, j) => ({
          to,
          template: args.template,
          subject,
          status: res.error ? ('failed' as const) : ('sent' as const),
          providerId: res.data?.data?.[j]?.id ?? null,
          error: res.error?.message ?? null,
        })),
      )
    }
  }
  waitUntil(task().catch((err) => console.error(`[email:${args.template}] bulk failed`, err)))
}
