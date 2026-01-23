import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Shield, User, Lock, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login, isAuthenticated } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate loading delay for realism
    await new Promise((resolve) => setTimeout(resolve, 800))

    const success = login(username, password)
    
    if (!success) {
      setError('Invalid credentials. Try: analyst/analyst123')
    }
    
    // Always reset loading state
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Matrix-style background */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent animate-pulse"></div>
        <div className="absolute top-0 left-2/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent animate-pulse delay-500"></div>
        <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent animate-pulse delay-1000"></div>
      </div>

      {/* Glowing orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pulse-green"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl pulse-green delay-1000"></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg bg-black border-2 border-primary shadow-2xl shadow-primary/50 mb-4">
            <Shield className="w-10 h-10 text-primary terminal-glow" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2 terminal-glow">SOC Dashboard</h1>
          <p className="text-muted-foreground font-mono text-sm">Bilgi Teknolojileri A.Ş. • SOC Operations</p>
        </div>

        {/* Login Form */}
        <div className="glass rounded-lg border border-primary/30 shadow-2xl shadow-primary/10 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 animate-in">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Demo Credentials Info */}
            <div className="terminal-box">
              <p className="text-sm text-primary font-medium mb-2 terminal-glow">[ DEMO CREDENTIALS ]</p>
              <div className="text-xs text-muted-foreground space-y-1 font-mono">
                <p>➜ <span className="text-primary">analyst</span> / <span className="text-muted-foreground">analyst123</span></p>
                <p>➜ <span className="text-primary">admin</span> / <span className="text-muted-foreground">admin123</span></p>
              </div>
            </div>

            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-primary mb-2 font-mono">
                [ USERNAME ]
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/60 border-2 border-primary/30 rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
                  placeholder="Enter username"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary mb-2 font-mono">
                [ PASSWORD ]
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/60 border-2 border-primary/30 rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-black font-bold rounded border-2 border-primary shadow-lg shadow-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-mono terminal-glow"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  [ AUTHENTICATING... ]
                </>
              ) : (
                '[ ACCESS SYSTEM ]'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-primary/20">
            <p className="text-xs text-center text-muted-foreground font-mono">
              ⚠ EDUCATIONAL DEMO ENVIRONMENT ⚠
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground font-mono">
            [  SOC • v2.0 • CYBER-DEFENSE  ]
          </p>
        </div>
      </div>
    </div>
  )
}
