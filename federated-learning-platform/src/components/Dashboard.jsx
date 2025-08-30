import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Building2, 
  Users, 
  FlaskConical, 
  Network, 
  TrendingUp,
  Shield,
  Database,
  Clock
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

const networkData = [
  { month: 'Jan', models: 12, accuracy: 85 },
  { month: 'Feb', models: 18, accuracy: 87 },
  { month: 'Mar', models: 25, accuracy: 89 },
  { month: 'Apr', models: 32, accuracy: 91 },
  { month: 'May', models: 38, accuracy: 93 },
  { month: 'Jun', models: 45, accuracy: 94 },
]

const trialData = [
  { drug: 'Oncology-A', trials: 15, success: 78 },
  { drug: 'Cardio-B', trials: 12, success: 85 },
  { drug: 'Neuro-C', trials: 8, success: 72 },
  { drug: 'Immuno-D', trials: 20, success: 88 },
]

const hospitalData = [
  { name: 'Mayo Clinic', value: 25, color: '#3B82F6' },
  { name: 'Johns Hopkins', value: 22, color: '#10B981' },
  { name: 'Cleveland Clinic', value: 18, color: '#F59E0B' },
  { name: 'Mass General', value: 15, color: '#EF4444' },
  { name: 'Others', value: 20, color: '#8B5CF6' },
]

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.hospital?.name}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Network Active
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +3 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients Enrolled</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Hospitals</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">
              +2 new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              +1.8% improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Federated Network Performance</CardTitle>
            <CardDescription>Model accuracy and participation over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={networkData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#3B82F6" strokeWidth={2} name="Accuracy %" />
                <Line type="monotone" dataKey="models" stroke="#10B981" strokeWidth={2} name="Active Models" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Drug Trial Success Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Drug Trial Success Rates</CardTitle>
            <CardDescription>Success rates by drug category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="drug" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="success" fill="#3B82F6" name="Success Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hospital Network Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Network Distribution</CardTitle>
            <CardDescription>Participating hospitals by contribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={hospitalData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {hospitalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest federated learning updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New model update received</p>
                  <p className="text-xs text-gray-500">Oncology-A trial - 2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Patient data aggregated</p>
                  <p className="text-xs text-gray-500">Cardio-B trial - 15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New hospital joined network</p>
                  <p className="text-xs text-gray-500">Stanford Medical - 1 hour ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Privacy audit completed</p>
                  <p className="text-xs text-gray-500">All systems secure - 3 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Platform health and security</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Privacy Protection</span>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Data Encryption</span>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Network className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Network Sync</span>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Last Backup</span>
                </div>
                <span className="text-xs text-gray-500">2 hours ago</span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>System Load</span>
                  <span>68%</span>
                </div>
                <Progress value={68} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

