import { queryOptions } from '@tanstack/react-query'
import { getMyConsent } from './server/consent'

export const myConsentQuery = () => queryOptions({ queryKey: ['me', 'consent'], queryFn: () => getMyConsent() })
