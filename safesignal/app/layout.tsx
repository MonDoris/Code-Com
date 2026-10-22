import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Be_Vietnam_Pro, Fraunces, JetBrains_Mono } from 'next/font/google'
import { TideCloakProvider } from '@tidecloak/nextjs'
import tcConfig from '../tidecloak.json'
import './globals.css'

const display = Fraunces({ subsets: ['latin', 'vietnamese'], variable: '--font-display', display: 'swap' })
const body = Be_Vietnam_Pro({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin', 'vietnamese'], variable: '--font-mono', display: 'swap' })

// Without a realm in tidecloak.json the provider fetches /adapter.json and logs a 404 error on every
// page. Mount it only once the realm is provisioned; until then the Tide hooks return their defaults.
const configured = Boolean((tcConfig as Record<string, unknown>).realm)

export const metadata: Metadata = {
  title: 'SafeSignal Escalate',
  description: 'Báo cáo sự cố suýt xảy ra (dữ liệu giả lập), mã hóa đầu-cuối với TideCloak và quyền thẩm định do nhóm quản trị phê duyệt',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        {configured ? <TideCloakProvider config={tcConfig}>{children}</TideCloakProvider> : children}
      </body>
    </html>
  )
}
