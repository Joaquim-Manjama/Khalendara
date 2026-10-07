import { useEffect, useRef, useState, type FormEvent } from 'react'
import { authenticate } from './auth'

function Mark() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="5" stroke="currentColor" strokeWidth="1.8"/><path d="M8 3v5m8-5v5M3 11h18m-13 5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('khalendara-theme') === 'dark' ? 'dark' : 'light' }
    catch { return 'light' }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#18181B' : '#FAFAFA')
    try { localStorage.setItem('khalendara-theme', theme) } catch { /* Theme still works when storage is unavailable. */ }
  }, [theme])
  const [visible, setVisible] = useState(false)
  const [notice, setNotice] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [success, setSuccess] = useState(false)
  const feedbackRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (notice) {
      feedbackRef.current?.focus({ preventScroll: true })
      feedbackRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [notice])
  const pending = (feature: string) => { setError(false); setSuccess(false); setNotice(`${feature} is not available yet.`) }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setSuccess(false)
    const form = event.currentTarget
    if (!form.checkValidity()) {
      const invalid = Array.from(form.elements).find((element) => element instanceof HTMLInputElement && !element.validity.valid) as HTMLInputElement | undefined
      setError(true)
      setNotice(invalid?.validity.typeMismatch ? 'Please enter a valid email address.' : `Please enter ${invalid?.name === 'firstName' ? 'your first name' : invalid?.name === 'lastName' ? 'your last name' : invalid?.name === 'email' ? 'your email address' : 'your password'}.`)
      invalid?.focus()
      return
    }
    const fields = new FormData(form)
    const payload: Record<string, string> = {
      email: String(fields.get('email') ?? '').trim(),
      password: String(fields.get('password') ?? ''),
    }
    if (mode === 'register') {
      payload.firstName = String(fields.get('firstName') ?? '').trim()
      payload.lastName = String(fields.get('lastName') ?? '').trim()
      if (!payload.firstName || !payload.lastName) { setError(true); setNotice('Please enter your first and last name.'); return }
    }
    setLoading(true)
    setNotice('')
    setError(false)
    try {
      const user = await authenticate(mode, payload)
      setSuccess(true)
      setNotice(mode === 'login' ? `Successfully signed in. Welcome back, ${user.firstName}!` : `Account created successfully, ${user.firstName}! You can now sign in.`)
      form.reset()
      setVisible(false)
      if (mode === 'register') setMode('login')
    } catch (failure) {
      setError(true)
      setNotice(failure instanceof Error ? failure.message : 'Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }
  return <div className="flex min-h-svh flex-col bg-page text-body">
    <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-7 sm:px-12 lg:px-20">
      <a href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-heading"><span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white"><Mark/></span>Khalendara<span className="text-brand">.</span></a>
      <button type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="flex size-10 items-center justify-center rounded-full border border-border bg-surface text-secondary hover:bg-secondary-surface"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{theme === 'light' ? <path d="M20.5 14.3A9 9 0 0 1 9.7 3.5 9 9 0 1 0 20.5 14.3Z"/> : <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" strokeLinecap="round"/></>}</svg></button>
    </header>
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-12 sm:py-16">
      <div aria-hidden="true" className="absolute inset-x-12 top-[72%] hidden border-t border-border lg:block"/>
      <aside aria-hidden="true" className="pointer-events-none absolute left-[max(4%,calc(50%-570px))] top-[26%] hidden w-60 -rotate-6 lg:block">
        <p className="mb-5 pl-7 text-xs uppercase tracking-[.2em] text-secondary">A little more clarity</p>
        <div className="rounded-2xl border border-brand-border bg-brand-subtle p-5"><div className="mb-5 flex items-center justify-between text-heading"><span className="text-sm font-semibold">October</span><Mark/></div><div className="grid grid-cols-7 gap-2 text-center text-[11px] text-secondary">{['M','T','W','T','F','S','S'].map((d,i)=><span key={i}>{d}</span>)}{Array.from({length:21},(_,i)=><span key={i+7} className={`flex size-5 items-center justify-center ${i===6 ? 'rounded-full bg-brand text-white' : ''}`}>{i+1}</span>)}</div></div>
        <svg className="ml-20 mt-9 text-strong" width="100" height="70" viewBox="0 0 100 70" fill="none"><path d="M4 56c40 9 12-48 38-42 31 7-6 40 23 30 13-4 23-16 30-31m-15 4 16-6-1 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </aside>
      <section aria-labelledby="login-title" className="relative z-10 w-full max-w-[440px] rounded-[28px] border border-border bg-surface px-7 py-10 shadow-[0_20px_70px_-35px_#18181B26] sm:px-10">
        <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl border border-brand-border bg-brand-subtle text-brand"><Mark/></div>
        <div className="text-center"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-brand">Make room for what matters</p><h1 id="login-title" className="text-[30px] font-semibold tracking-[-1px] text-heading">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1><p className="mt-2 text-sm leading-6 text-secondary">A calmer day starts here.<br/>{mode === 'login' ? 'Sign in to your Khalendara account.' : 'Start making space for what matters.'}</p></div>
        <form noValidate onSubmit={submit} aria-busy={loading} aria-describedby={notice ? 'auth-feedback' : undefined} className="mt-8 space-y-5"><fieldset disabled={loading} className="space-y-5 disabled:opacity-70">
          {mode === 'register' && <div className="grid grid-cols-2 gap-3">{[['firstName', 'First name'], ['lastName', 'Last name']].map(([name, label]) => <div key={name}><label htmlFor={name} className="mb-2 block text-xs font-medium text-heading">{label}</label><input id={name} name={name} required maxLength={100} autoComplete={name === 'firstName' ? 'given-name' : 'family-name'} className="field"/></div>)}</div>}
          <div><label htmlFor="email" className="mb-2 block text-xs font-medium text-heading">Email address</label><input id="email" name="email" type="email" required autoComplete="username" placeholder="you@example.com" className="field"/></div>
          <div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-xs font-medium text-heading">Password</label>{mode === 'login' && <button type="button" onClick={()=>pending('Password recovery')} className="text-xs font-medium text-brand hover:text-brand-hover">Forgot password?</button>}</div><div className="relative"><input id="password" name="password" type={visible ? 'text' : 'password'} required autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder="Enter your password" className="field pr-16"/><button type="button" aria-controls="password" aria-pressed={visible} onClick={()=>setVisible(!visible)} className="absolute inset-y-0 right-4 text-xs font-medium text-secondary">{visible ? 'Hide' : 'Show'}</button></div></div>
          
          <button type="submit" className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-hover">{loading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign in' : 'Create account')} <span aria-hidden="true">→</span></button>
        </fieldset>
        {notice && <div id="auth-feedback" ref={feedbackRef} tabIndex={-1} role={error ? 'alert' : 'status'} className={`auth-feedback rounded-xl border p-4 text-sm leading-5 ${error ? 'auth-feedback-error' : success ? 'auth-feedback-success' : 'border-brand-border bg-brand-subtle text-body'}`}><p className="mb-1 flex items-center gap-2 font-semibold">{success && <span aria-hidden="true">✓</span>}{error ? 'Unable to continue' : success ? 'Success' : 'Update'}</p><p>{notice}</p></div>}
        </form>
        <div className="my-6 flex items-center gap-4 text-[11px] text-secondary"><span className="h-px flex-1 bg-border"/>or continue with<span className="h-px flex-1 bg-border"/></div>
        <button type="button" disabled={loading} onClick={()=>pending('Google sign-in')} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border text-sm font-medium text-heading hover:border-strong hover:bg-secondary-surface"><span aria-hidden="true" className="text-lg font-bold">G</span>Google</button>
        <p className="mt-7 text-center text-xs text-secondary">{mode === 'login' ? 'New to Khalendara? ' : 'Already have an account? '}<button type="button" disabled={loading} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setNotice(''); setError(false); setVisible(false) }} className="font-semibold text-brand hover:text-brand-hover">{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
      </section>
      <aside aria-hidden="true" className="pointer-events-none absolute right-[max(4%,calc(50%-565px))] top-[37%] hidden w-56 rotate-6 lg:block"><div className="mb-6 ml-12 flex size-12 items-center justify-center rounded-full border border-brand-border bg-brand-subtle text-xl text-brand">✦</div><div className="rounded-2xl border border-border bg-surface p-5"><div className="mb-4 flex items-center gap-2"><span className="size-2 rounded-full bg-brand"/><span className="text-[11px] font-medium text-secondary">YOUR DAY, YOUR PACE</span></div><p className="text-lg font-semibold leading-6 tracking-tight text-heading">Less juggling.<br/>More living.</p><div className="mt-5 flex items-center gap-3 rounded-lg bg-secondary-surface p-3"><span className="flex size-6 items-center justify-center rounded-full bg-brand-subtle text-brand">✓</span><span className="text-xs">Time for yourself</span></div></div><div className="ml-6 mt-6 size-20 rounded-full border border-brand-border bg-brand-subtle"/></aside>
    </main>
    <footer className="flex flex-wrap justify-center gap-x-5 gap-y-2 px-6 pb-7 text-[11px] text-secondary"><span>© {new Date().getFullYear()} Khalendara</span><span className="h-3 border-l border-strong"/><span>A little space for your everyday.</span></footer>
  </div>
}

