import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Mail, LogIn, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react'

const Login = () => {
  const navigate = useNavigate()
  const { loginWithCredentials, status, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{email?: string, password?: string}>({})
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // If already authenticated (session persisted), redirect away from login
  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  const validateEmail = (email: string) => {
    if (!email) return 'Please enter your email'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email'
    return null
  }

  const validatePassword = (password: string) => {
    if (!password) return 'Please enter your password'
    if (password.length < 6) return 'Password must be at least 6 characters'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    if (emailError || passwordError) {
      setErrors({ email: emailError ?? undefined, password: passwordError ?? undefined })
      return
    }
    setErrors({})
    try {
      await loginWithCredentials(email, password)
      setBanner({ type: 'success', message: 'Welcome back!' })
      navigate('/')
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Please check your credentials and try again.' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Banner */}
        {banner && (
          <div
            role="status"
            className={`rounded-xl border p-4 text-sm shadow-soft animate-slide-up mb-6 ${
              banner.type === 'error'
                ? 'border-red-200 text-red-700 bg-red-50'
                : banner.type === 'success'
                ? 'border-green-200 text-green-700 bg-green-50'
                : 'border-blue-200 text-blue-700 bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {banner.type === 'error' && <AlertCircle className="h-4 w-4" />}
              {banner.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
              {banner.type === 'info' && <Info className="h-4 w-4" />}
              {banner.message}
            </div>
          </div>
        )}

        {/* Login Card */}
        <Card className="shadow-medium border-0 glass-effect animate-slide-up">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl lg:text-3xl font-bold text-gradient">
                Performance Management
              </CardTitle>
              <p className="text-muted-foreground">Welcome back! Please sign in to continue</p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Work Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 text-base focus:ring-2 focus:ring-primary/20 border-border/50"
                    required
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-base focus:ring-2 focus:ring-primary/20 border-border/50"
                    required
                  />
                </div>
                {errors.password && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password}
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={status === 'loading'}
                className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Secure employee portal • Contact IT for access issues
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login
