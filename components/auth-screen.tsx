"use client"

import { useState } from "react"
import { Button, Card, Typography, Alert } from "antd"
import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider } from "../lib/firebase"

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8, verticalAlign: "middle" }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch {
      setError("Sign-in failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <Card className="w-full shadow-2xl" style={{ maxWidth: 400, borderRadius: 16 }}>
        <div className="text-center py-4">
          <div className="text-6xl mb-4">💰</div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>Expense Tracker</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 15 }}>
            Sign in to sync your data across all devices in real time.
          </Typography.Text>

          <div className="mt-8 mb-4">
            {error && <Alert message={error} type="error" showIcon className="mb-4 text-left" />}
            <Button
              size="large"
              className="w-full"
              style={{ height: 48, fontSize: 15, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={handleSignIn}
              loading={loading}
              icon={!loading ? <GoogleIcon /> : undefined}
            >
              {loading ? "Signing in…" : "Continue with Google"}
            </Button>
          </div>

          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Your data is private. Only you can see it.
          </Typography.Text>
        </div>
      </Card>
    </div>
  )
}
