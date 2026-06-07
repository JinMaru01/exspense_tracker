import type { Metadata } from "next"
import { AntdRegistry } from "@ant-design/nextjs-registry"
import "./globals.css"

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track and manage your expenses",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}
