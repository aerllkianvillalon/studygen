'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label, PasswordInput } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';

const MIN_PASSWORD = 8;

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit() {
    setError(null);

    if (mode === 'register' && password.length < MIN_PASSWORD) {
      setError(`Passwords need at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setPending(true);
    const supabase = createClient();

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        // With email confirmation on, there is no session yet.
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(
            signInError.message === 'Invalid login credentials'
              ? 'That email and password combination does not match an account.'
              : signInError.message,
          );
          return;
        }
      }

      router.push(params.get('next') ?? '/dashboard');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <Alert tone="success" title="Check your email">
        We sent a confirmation link to {email}. Open it to finish creating your account.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
        {mode === 'register' ? (
          <p className="mt-1.5 text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
        ) : null}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Button onClick={submit} disabled={pending || !email || !password} className="w-full">
        {pending ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
      </Button>
    </div>
  );
}
