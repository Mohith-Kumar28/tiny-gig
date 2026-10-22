import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export type EmailDetail = { label: string; value: string }

export type BaseEmailProps = {
  preview: string
  heading: string
  paragraphs: string[]
  details?: EmailDetail[]
  quote?: string
  cta?: { label: string; href: string }
  footerNote?: string
  appName: string
  appUrl: string
}

/** The app palette, flattened to hex for email clients. */
const colors = {
  ink: '#221c17',
  muted: '#6b625b',
  line: '#e9e4dd',
  paper: '#faf8f5',
  primary: '#e2561f',
  cloth: '#e2561f',
  clothInk: '#fffaf3',
}

export function BaseEmail({
  preview,
  heading,
  paragraphs,
  details,
  quote,
  cta,
  footerNote,
  appName,
  appUrl,
}: BaseEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.paper, fontFamily: 'Helvetica, Arial, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px' }}>
          <Section style={{ backgroundColor: colors.cloth, borderRadius: '6px 6px 0 0', padding: '14px 24px' }}>
            <Text style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: colors.clothInk, margin: 0 }}>{appName}</Text>
          </Section>
          <Section
            style={{
              backgroundColor: '#ffffff',
              border: `1px solid ${colors.line}`,
              borderTop: 'none',
              borderRadius: '0 0 6px 6px',
              padding: '28px 24px',
            }}
          >
            <Heading as="h1" style={{ fontSize: 22, lineHeight: '28px', color: colors.ink, margin: '0 0 16px' }}>
              {heading}
            </Heading>
            {paragraphs.map((p) => (
              <Text key={p} style={{ fontSize: 15, lineHeight: '24px', color: colors.ink, margin: '0 0 12px' }}>
                {p}
              </Text>
            ))}
            {quote ? (
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: '22px',
                  color: colors.ink,
                  backgroundColor: colors.paper,
                  border: `1px solid ${colors.line}`,
                  borderRadius: 4,
                  padding: '10px 14px',
                  margin: '16px 0',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {quote}
              </Text>
            ) : null}
            {details?.length ? (
              <Section style={{ margin: '16px 0' }}>
                {details.map((d) => (
                  <Text key={d.label} style={{ fontSize: 14, margin: 0, padding: '7px 0', color: colors.ink, borderBottom: `1px dashed ${colors.line}` }}>
                    <span style={{ color: colors.muted }}>{d.label}</span>
                    <strong style={{ float: 'right' }}>{d.value}</strong>
                  </Text>
                ))}
              </Section>
            ) : null}
            {cta ? (
              <Button
                href={cta.href}
                style={{
                  backgroundColor: colors.primary,
                  color: '#ffffff',
                  borderRadius: 6,
                  padding: '12px 20px',
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: 'none',
                  marginTop: 8,
                }}
              >
                {cta.label}
              </Button>
            ) : null}
          </Section>
          <Hr style={{ borderColor: colors.line, margin: '24px 0 12px' }} />
          <Text style={{ fontSize: 12, lineHeight: '18px', color: colors.muted, margin: 0 }}>
            {footerNote ?? `You're receiving this because you have an account on ${appName}.`}{' '}
            <a href={appUrl} style={{ color: colors.muted }}>
              {appUrl.replace(/^https?:\/\//, '')}
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
