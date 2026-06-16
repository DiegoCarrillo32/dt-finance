'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function LoginPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const password = fd.get('password') as string

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return setError(error.message)
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <Card>
      <h1 className="font-heading text-2xl text-expresso mb-6">Sign In</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button type="submit" loading={pending} size="lg" className="w-full mt-2">
          Sign In
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        No account?{' '}
        <Link href="/register" className="text-warm-roast font-bold hover:underline">
          Register
        </Link>
      </p>
    </Card>
  )
}
