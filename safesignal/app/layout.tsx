import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TideCloakProvider } from '@tidecloak/nextjs'
import tcConfig from '../tidecloak.json'
import './globals.css'

export const metadata: Metadata = {
  title: 'SafeSignal Escalate',
  description: 'Synthetic near-miss referrals, TideCloak E2EE and quorum-governed reviewer access',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TideCloakProvider config={tcConfig}>{children}</TideCloakProvider>
      </body>
    </html>
  )
}
