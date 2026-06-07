"use client"

import dynamic from "next/dynamic"

const ExpenseTracker = dynamic(() => import("../expense-tracker"), { ssr: false })

export default function Page() {
  return <ExpenseTracker />
}
