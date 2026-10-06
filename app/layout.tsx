import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AntdRegistry } from "@ant-design/nextjs-registry"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track and manage your expenses",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}
