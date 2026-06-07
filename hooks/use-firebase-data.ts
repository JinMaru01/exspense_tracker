"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  addDoc,
  setDoc,
  deleteDoc,
  type DocumentData,
} from "firebase/firestore"
import { db } from "../lib/firebase"
import type { Expense, Wallet, Subscription } from "../types/expense"
import dayjs from "dayjs"

function toExpense(id: string, data: DocumentData): Expense {
  return {
    ...data,
    id,
    date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
  } as Expense
}

function toSubscription(id: string, data: DocumentData): Subscription {
  return {
    ...data,
    id,
    nextDate: data.nextDate?.toDate ? data.nextDate.toDate() : new Date(data.nextDate),
  } as Subscription
}

export function useFirebaseData(uid: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loaded, setLoaded] = useState(false)

  const walletsRef = useRef<Wallet[]>([])
  const expensesRef = useRef<Expense[]>([])
  useEffect(() => { walletsRef.current = wallets }, [wallets])
  useEffect(() => { expensesRef.current = expenses }, [expenses])

  // Path helpers
  const expCol = useCallback(() => collection(db, `users/${uid}/expenses`), [uid])
  const walCol = useCallback(() => collection(db, `users/${uid}/wallets`), [uid])
  const subCol = useCallback(() => collection(db, `users/${uid}/subscriptions`), [uid])
  const expDoc = useCallback((id: string) => doc(db, `users/${uid}/expenses/${id}`), [uid])
  const walDoc = useCallback((id: string) => doc(db, `users/${uid}/wallets/${id}`), [uid])
  const subDoc = useCallback((id: string) => doc(db, `users/${uid}/subscriptions/${id}`), [uid])

  // Real-time listeners
  useEffect(() => {
    if (!uid) return
    let eLoaded = false
    let wLoaded = false

    const unsubE = onSnapshot(expCol(), (snap) => {
      setExpenses(
        snap.docs
          .map((d) => toExpense(d.id, d.data()))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      )
      eLoaded = true
      if (wLoaded) setLoaded(true)
    })

    const unsubW = onSnapshot(walCol(), (snap) => {
      setWallets(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Wallet))
      wLoaded = true
      if (eLoaded) setLoaded(true)
    })

    const unsubS = onSnapshot(subCol(), (snap) => {
      setSubscriptions(snap.docs.map((d) => toSubscription(d.id, d.data())))
    })

    return () => { unsubE(); unsubW(); unsubS() }
  }, [uid])

  const getWallet = (name: string) => walletsRef.current.find((w) => w.name === name)

  // ── Expense operations ──────────────────────────────────────────────────

  const addExpense = useCallback(async (data: Omit<Expense, "id">): Promise<string | null> => {
    const wallet = getWallet(data.wallet)
    if (!wallet) return "Wallet not found."
    if (wallet.balance < data.amount) {
      return `Insufficient balance in "${wallet.name}". Available: ${
        wallet.currency === "KHR"
          ? `៛${wallet.balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
          : `$${wallet.balance.toFixed(2)}`
      }`
    }
    const batch = writeBatch(db)
    batch.set(doc(expCol()), { ...data, type: "expense" })
    batch.update(walDoc(wallet.id), { balance: wallet.balance - data.amount })
    await batch.commit()
    return null
  }, [uid])

  const importExpenses = useCallback(async (newExpenses: Expense[]) => {
    const batch = writeBatch(db)
    for (const expense of newExpenses) {
      const { id, ...data } = expense
      batch.set(doc(expCol()), data)
    }
    await batch.commit()
  }, [uid])

  const addIncome = useCallback(async (
    walletId: string, amount: number, description: string, category: string, date: Date,
  ) => {
    const wallet = walletsRef.current.find((w) => w.id === walletId)
    if (!wallet) return
    const batch = writeBatch(db)
    batch.set(doc(expCol()), {
      amount, category,
      wallet: wallet.name,
      description: description || "Income",
      date, currency: wallet.currency, type: "income",
    })
    batch.update(walDoc(walletId), { balance: wallet.balance + amount })
    await batch.commit()
  }, [uid])

  const updateExpense = useCallback(async (id: string, data: Omit<Expense, "id">): Promise<string | null> => {
    const original = expensesRef.current.find((e) => e.id === id)
    if (!original) return null

    if (data.type === "expense") {
      const target = getWallet(data.wallet)
      if (!target) return "Wallet not found."
      let available = target.balance
      if (original.type === "expense" && original.wallet === data.wallet) available += original.amount
      else if (original.type === "income" && original.wallet === data.wallet) available -= original.amount
      else if (original.type === "transfer" && original.wallet === data.wallet) available += original.amount
      if (available < data.amount) {
        return `Insufficient balance in "${target.name}". Available: ${
          target.currency === "KHR"
            ? `៛${available.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
            : `$${available.toFixed(2)}`
        }`
      }
    }

    const batch = writeBatch(db)
    batch.update(expDoc(id), { ...data })

    // Delta approach: reverse original + apply new in one pass
    const deltas: Record<string, number> = {}
    if (original.type === "expense") deltas[original.wallet] = (deltas[original.wallet] ?? 0) + original.amount
    if (original.type === "income") deltas[original.wallet] = (deltas[original.wallet] ?? 0) - original.amount
    if (original.type === "transfer") {
      deltas[original.wallet] = (deltas[original.wallet] ?? 0) + original.amount
      if (original.toWallet)
        deltas[original.toWallet] = (deltas[original.toWallet] ?? 0) - (original.convertedAmount ?? original.amount)
    }
    if (data.type === "expense") deltas[data.wallet] = (deltas[data.wallet] ?? 0) - data.amount
    if (data.type === "income") deltas[data.wallet] = (deltas[data.wallet] ?? 0) + data.amount

    for (const [walletName, delta] of Object.entries(deltas)) {
      if (delta !== 0) {
        const w = getWallet(walletName)
        if (w) batch.update(walDoc(w.id), { balance: w.balance + delta })
      }
    }
    await batch.commit()
    return null
  }, [uid])

  const deleteExpense = useCallback(async (id: string) => {
    const expense = expensesRef.current.find((e) => e.id === id)
    const batch = writeBatch(db)
    batch.delete(expDoc(id))
    if (expense) {
      if (expense.type === "expense") {
        const w = getWallet(expense.wallet)
        if (w) batch.update(walDoc(w.id), { balance: w.balance + expense.amount })
      } else if (expense.type === "income") {
        const w = getWallet(expense.wallet)
        if (w) batch.update(walDoc(w.id), { balance: w.balance - expense.amount })
      } else if (expense.type === "transfer") {
        const from = getWallet(expense.wallet)
        const to = expense.toWallet ? getWallet(expense.toWallet) : null
        if (from) batch.update(walDoc(from.id), { balance: from.balance + expense.amount })
        if (to) batch.update(walDoc(to.id), { balance: to.balance - (expense.convertedAmount ?? expense.amount) })
      }
    }
    await batch.commit()
  }, [uid])

  // ── Wallet operations ───────────────────────────────────────────────────

  const addWallet = useCallback(async (data: Omit<Wallet, "id">) => {
    await addDoc(walCol(), data)
  }, [uid])

  const updateWallet = useCallback(async (id: string, data: Omit<Wallet, "id">) => {
    const old = walletsRef.current.find((w) => w.id === id)
    await setDoc(walDoc(id), data)
    if (old && old.name !== data.name) {
      const batch = writeBatch(db)
      expensesRef.current
        .filter((e) => e.wallet === old.name || e.toWallet === old.name)
        .forEach((e) => {
          const updates: Partial<Expense> = {}
          if (e.wallet === old.name) updates.wallet = data.name
          if (e.toWallet === old.name) updates.toWallet = data.name
          batch.update(expDoc(e.id), updates)
        })
      await batch.commit()
    }
  }, [uid])

  const deleteWallet = useCallback(async (id: string) => {
    await deleteDoc(walDoc(id))
  }, [uid])

  const adjustWalletBalance = useCallback(async (
    walletId: string, amount: number, type: "add" | "subtract", reason: string,
  ) => {
    const wallet = walletsRef.current.find((w) => w.id === walletId)
    if (!wallet) return
    const newBalance = type === "add" ? wallet.balance + amount : wallet.balance - amount
    const batch = writeBatch(db)
    batch.update(walDoc(walletId), { balance: newBalance })
    if (reason) {
      batch.set(doc(expCol()), {
        amount, category: type === "add" ? "Income/Deposit" : "Fees/Withdrawal",
        wallet: wallet.name, description: reason,
        date: new Date(), currency: wallet.currency,
        type: type === "subtract" ? "expense" : "income",
      })
    }
    await batch.commit()
  }, [uid])

  const handleWalletTransfer = useCallback(async (
    fromWalletId: string, toWalletId: string, amount: number, convertedAmount: number, note: string,
  ) => {
    const fromWallet = walletsRef.current.find((w) => w.id === fromWalletId)
    const toWallet = walletsRef.current.find((w) => w.id === toWalletId)
    if (!fromWallet || !toWallet) return
    const batch = writeBatch(db)
    batch.update(walDoc(fromWalletId), { balance: fromWallet.balance - amount })
    batch.update(walDoc(toWalletId), { balance: toWallet.balance + convertedAmount })
    batch.set(doc(expCol()), {
      amount, category: "Transfer",
      wallet: fromWallet.name, toWallet: toWallet.name, convertedAmount,
      description: note || `Transfer to ${toWallet.name}${
        fromWallet.currency !== toWallet.currency ? ` (${convertedAmount.toFixed(2)} ${toWallet.currency})` : ""
      }`,
      date: new Date(), currency: fromWallet.currency, type: "transfer",
    })
    await batch.commit()
  }, [uid])

  // ── Subscription operations ─────────────────────────────────────────────

  const addSubscription = useCallback(async (data: Omit<Subscription, "id">) => {
    await addDoc(subCol(), data)
  }, [uid])

  const updateSubscription = useCallback(async (id: string, data: Omit<Subscription, "id">) => {
    await setDoc(subDoc(id), data)
  }, [uid])

  const deleteSubscription = useCallback(async (id: string) => {
    await deleteDoc(subDoc(id))
  }, [uid])

  const chargeSubscription = useCallback(async (id: string): Promise<string | null> => {
    const sub = subscriptions.find((s) => s.id === id)
    if (!sub) return "Subscription not found."
    const wallet = walletsRef.current.find((w) => w.name === sub.wallet)
    if (!wallet) return `Wallet "${sub.wallet}" not found.`
    if (wallet.balance < sub.amount) return `Insufficient balance in "${wallet.name}".`

    const nextDate = dayjs(sub.nextDate)
    const advancedDate = sub.cycle === "weekly"
      ? nextDate.add(1, "week")
      : sub.cycle === "monthly"
        ? nextDate.add(1, "month")
        : nextDate.add(1, "year")

    const batch = writeBatch(db)
    batch.set(doc(expCol()), {
      amount: sub.amount, category: sub.category,
      wallet: sub.wallet, description: sub.name,
      date: new Date(), currency: sub.currency, type: "expense",
    })
    batch.update(walDoc(wallet.id), { balance: wallet.balance - sub.amount })
    batch.update(subDoc(id), { nextDate: advancedDate.toDate() })
    await batch.commit()
    return null
  }, [uid, subscriptions])

  // ── Clear all data ──────────────────────────────────────────────────────

  const clearAllData = useCallback(async () => {
    const batch = writeBatch(db)
    for (const e of expensesRef.current) batch.delete(expDoc(e.id))
    for (const w of walletsRef.current) batch.delete(walDoc(w.id))
    await batch.commit()
  }, [uid])

  // ── localStorage migration ──────────────────────────────────────────────

  const hasLocalStorageData = useCallback((): boolean => {
    if (typeof window === "undefined") return false
    try {
      const e = localStorage.getItem("expenses")
      const w = localStorage.getItem("wallets")
      return (!!e && JSON.parse(e).length > 0) || (!!w && JSON.parse(w).length > 0)
    } catch { return false }
  }, [])

  const migrateFromLocalStorage = useCallback(async () => {
    const batch = writeBatch(db)
    try {
      const walletRaw = localStorage.getItem("wallets")
      if (walletRaw) {
        const ws: Wallet[] = JSON.parse(walletRaw)
        for (const w of ws) {
          const { id, ...data } = w
          batch.set(doc(walCol()), data)
        }
      }
      const expenseRaw = localStorage.getItem("expenses")
      if (expenseRaw) {
        const es: Expense[] = JSON.parse(expenseRaw, (key, value) => {
          if (key === "date" && typeof value === "string") return new Date(value)
          return value
        })
        for (const e of es) {
          const { id, ...data } = e
          batch.set(doc(expCol()), data)
        }
      }
      await batch.commit()
      localStorage.removeItem("expenses")
      localStorage.removeItem("wallets")
    } catch (err) {
      console.error("Migration failed:", err)
      throw err
    }
  }, [uid])

  return {
    expenses, wallets, subscriptions, loaded,
    addExpense, importExpenses, addIncome, updateExpense, deleteExpense,
    addWallet, updateWallet, deleteWallet, adjustWalletBalance, handleWalletTransfer,
    addSubscription, updateSubscription, deleteSubscription, chargeSubscription,
    clearAllData, hasLocalStorageData, migrateFromLocalStorage,
  }
}
