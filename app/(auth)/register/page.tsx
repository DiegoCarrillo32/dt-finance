'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function RegisterPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const password = fd.get('password') as string

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) return setError(error.message)
      setDone(true)
    })
  }

  if (done) {
    return (
      <Card>
        <h2 className="font-heading text-xl text-expresso mb-2">Check your email</h2>
        <p className="text-sm text-muted-foreground mb-4">
          We sent a confirmation link. Click it to activate your account, then{' '}
          <Link href="/login" className="text-warm-roast font-bold hover:underline">
            sign in
          </Link>
          .
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <h1 className="font-heading text-2xl text-expresso mb-6">Create Account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button type="submit" loading={pending} size="lg" className="w-full mt-2">
          Create Account
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Have an account?{' '}
        <Link href="/login" className="text-warm-roast font-bold hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  )
}
