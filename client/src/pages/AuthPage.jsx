import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Lock, Mail, ShieldCheck } from 'lucide-react'

function AuthPage({ auth }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isLogin = mode === 'login'

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (isLogin) {
        await auth.login({ email, password })
        toast.success('Login success')
        navigate('/dashboard', { replace: true })
      } else {
        await auth.register({ email, password })
        toast.success('Registration successful. You can now log in.')
        setMode('login')
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Network error. Please try again.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(13,148,136,0.18),transparent_50%),radial-gradient(circle_at_80%_10%,rgba(245,158,11,0.18),transparent_42%)]" />

      <section className="glass-card w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex rounded-2xl bg-teal-700 p-3 text-white shadow-md shadow-teal-700/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Smart Order Portal</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isLogin ? 'Sign in to manage products and orders' : 'Create an account in seconds'}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl border border-stone-200 bg-stone-100 p-1 text-sm">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 font-semibold transition ${
              isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 font-semibold transition ${
              !isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-9"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-9"
                placeholder="Enter password"
              />
            </div>
          </label>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default AuthPage
