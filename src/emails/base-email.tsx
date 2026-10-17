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

const colors = {
  ink: '#211c16',
  muted: '#6f675d',
  line: '#ebe5dc',
  paper: '#faf8f3',
  primary: '#e2561f',
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
          <Text style={{ fontSize: 18, fontWeight: 700, color: colors.ink, margin: '0 0 24px' }}>
            <span style={{ color: colors.primary }}>●</span> {appName}
          </Text>
          <Section
            style={{
              backgroundColor: '#ffffff',
              border: `1px solid ${colors.line}`,
              borderRadius: 12,
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
                  borderLeft: `3px solid ${colors.primary}`,
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
                  <Text key={d.label} style={{ fontSize: 14, margin: '0 0 6px', color: colors.ink }}>
                    <span style={{ color: colors.muted }}>{d.label}:</span> <strong>{d.value}</strong>
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
                  borderRadius: 8,
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
