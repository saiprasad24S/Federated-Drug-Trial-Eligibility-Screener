import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Network, Building2, Shield, Users } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(username, password)
    
    if (!result.success) {
      setError(result.error)
    }
    
    setLoading(false)
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Platform info */}
        <div className="space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Network className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">MedFed</h1>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Federated Learning Platform for Drug Trials
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Collaborate securely across hospitals to advance medical research while preserving patient privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg shadow-sm mb-3">
                <Shield className="h-8 w-8 text-blue-600 mx-auto" />
              </div>
              <h3 className="font-semibold text-gray-800">Privacy First</h3>
              <p className="text-sm text-gray-600">HIPAA compliant with end-to-end encryption</p>
            </div>
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg shadow-sm mb-3">
                <Building2 className="h-8 w-8 text-green-600 mx-auto" />
              </div>
              <h3 className="font-semibold text-gray-800">Multi-Hospital</h3>
              <p className="text-sm text-gray-600">Connect with leading medical institutions</p>
            </div>
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg shadow-sm mb-3">
                <Users className="h-8 w-8 text-purple-600 mx-auto" />
              </div>
              <h3 className="font-semibold text-gray-800">Better Outcomes</h3>
              <p className="text-sm text-gray-600">Improve patient care through collaboration</p>
            </div>
          </div>


        </div>

        {/* Right side - Login form */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Hospital Login</CardTitle>
              <CardDescription>
                Access your hospital's federated learning dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/about" className="text-sm text-blue-600 hover:underline">
                  Learn more about MedFed
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

