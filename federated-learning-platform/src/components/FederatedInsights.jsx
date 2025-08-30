import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { 
  Network, 
  TrendingUp, 
  Shield, 
  Activity,
  Building2,
  Users,
  FlaskConical,
  Brain,
  Globe,
  Lock,
  Zap,
  BarChart3
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

const networkPerformance = [
  { month: 'Jan', accuracy: 85, hospitals: 35, models: 120 },
  { month: 'Feb', accuracy: 87, hospitals: 38, models: 135 },
  { month: 'Mar', accuracy: 89, hospitals: 42, models: 158 },
  { month: 'Apr', accuracy: 91, hospitals: 45, models: 167 },
  { month: 'May', accuracy: 93, hospitals: 47, models: 178 },
  { month: 'Jun', accuracy: 94, hospitals: 47, models: 189 },
]

const drugInsights = [
  { drug: 'Oncology-A', hospitals: 25, patients: 234, accuracy: 94, improvement: 12 },
  { drug: 'Cardio-B', hospitals: 22, patients: 189, accuracy: 91, improvement: 8 },
  { drug: 'Neuro-C', hospitals: 18, patients: 156, accuracy: 87, improvement: 15 },
  { drug: 'Immuno-D', hospitals: 30, patients: 278, accuracy: 96, improvement: 18 },
  { drug: 'Onco-E', hospitals: 15, patients: 123, accuracy: 89, improvement: 10 },
]

const hospitalContributions = [
  { name: 'Mayo Clinic', patients: 45, models: 12, accuracy: 96, color: '#3B82F6' },
  { name: 'Johns Hopkins', patients: 38, models: 10, accuracy: 94, color: '#10B981' },
  { name: 'Cleveland Clinic', patients: 32, models: 8, accuracy: 92, color: '#F59E0B' },
  { name: 'Mass General', patients: 28, models: 7, accuracy: 93, color: '#EF4444' },
  { name: 'Stanford Med', patients: 25, models: 6, accuracy: 91, color: '#8B5CF6' },
  { name: 'Others', patients: 67, models: 18, accuracy: 89, color: '#6B7280' },
]

const privacyMetrics = [
  { metric: 'Data Encryption', value: 100, fullMark: 100 },
  { metric: 'Anonymization', value: 98, fullMark: 100 },
  { metric: 'Access Control', value: 95, fullMark: 100 },
  { metric: 'Audit Trail', value: 97, fullMark: 100 },
  { metric: 'Compliance', value: 99, fullMark: 100 },
  { metric: 'Privacy Budget', value: 92, fullMark: 100 },
]

const recentInsights = [
  {
    id: 1,
    type: 'breakthrough',
    title: 'Oncology-A Combination Therapy',
    description: 'Network analysis reveals 23% improvement when combined with immunotherapy across 15 hospitals.',
    impact: 'High',
    hospitals: 15,
    patients: 89,
    timestamp: '2 hours ago'
  },
  {
    id: 2,
    type: 'pattern',
    title: 'Genetic Marker Correlation',
    description: 'Patients with BRCA1 mutations show 40% higher response rates to Oncology-A treatment.',
    impact: 'Medium',
    hospitals: 12,
    patients: 67,
    timestamp: '5 hours ago'
  },
  {
    id: 3,
    type: 'safety',
    title: 'Cardio-B Dosage Optimization',
    description: 'Lower dosage protocol shows similar efficacy with 60% fewer side effects.',
    impact: 'High',
    hospitals: 8,
    patients: 45,
    timestamp: '1 day ago'
  },
  {
    id: 4,
    type: 'eligibility',
    title: 'Age-Based Treatment Response',
    description: 'Patients under 65 show significantly better response to Neuro-C treatment.',
    impact: 'Medium',
    hospitals: 18,
    patients: 123,
    timestamp: '2 days ago'
  }
]

export default function FederatedInsights() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months')
  const [selectedDrug, setSelectedDrug] = useState('all')

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'High': return 'bg-red-100 text-red-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getInsightIcon = (type) => {
    switch (type) {
      case 'breakthrough': return <Zap className="h-4 w-4 text-yellow-600" />
      case 'pattern': return <Brain className="h-4 w-4 text-purple-600" />
      case 'safety': return <Shield className="h-4 w-4 text-green-600" />
      case 'eligibility': return <Users className="h-4 w-4 text-blue-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Federated Insights</h1>
          <p className="text-gray-600">Network-wide analytics and collaborative learnings</p>
        </div>
        <div className="flex space-x-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Hospitals</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">
              +2 this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">189</div>
            <p className="text-xs text-muted-foreground">
              +12 this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              +1.8% improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Privacy Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">96.8%</div>
            <p className="text-xs text-muted-foreground">
              HIPAA compliant
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Network Performance</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="hospitals">Hospital Network</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance" className="space-y-6">
          {/* Network Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Federated Network Performance</CardTitle>
              <CardDescription>
                Model accuracy and network growth over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={networkPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="accuracy" stroke="#3B82F6" strokeWidth={3} name="Accuracy %" />
                  <Line type="monotone" dataKey="hospitals" stroke="#10B981" strokeWidth={2} name="Hospitals" />
                  <Line type="monotone" dataKey="models" stroke="#F59E0B" strokeWidth={2} name="Models" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Drug Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Drug Trial Performance</CardTitle>
              <CardDescription>
                Success rates and improvements across different drugs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={drugInsights}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="drug" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill="#3B82F6" name="Accuracy %" />
                  <Bar dataKey="improvement" fill="#10B981" name="Improvement %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent AI-Generated Insights</CardTitle>
              <CardDescription>
                Collaborative discoveries from federated learning analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentInsights.map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getInsightIcon(insight.type)}
                        <h3 className="font-semibold text-lg">{insight.title}</h3>
                        <Badge className={getImpactColor(insight.impact)}>
                          {insight.impact} Impact
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">{insight.timestamp}</span>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{insight.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Building2 className="h-4 w-4" />
                          <span>{insight.hospitals} hospitals</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{insight.patients} patients</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="hospitals" className="space-y-6">
          {/* Hospital Network Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Hospital Contributions</CardTitle>
                <CardDescription>
                  Patient and model contributions by hospital
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={hospitalContributions}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="patients"
                    >
                      {hospitalContributions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Contributing Hospitals</CardTitle>
                <CardDescription>
                  Leading hospitals in the federated network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hospitalContributions.slice(0, 5).map((hospital, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: hospital.color }}
                        ></div>
                        <div>
                          <div className="font-medium">{hospital.name}</div>
                          <div className="text-sm text-gray-600">
                            {hospital.patients} patients, {hospital.models} models
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {hospital.accuracy}% accuracy
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="privacy" className="space-y-6">
          {/* Privacy Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Security Metrics</CardTitle>
                <CardDescription>
                  Comprehensive privacy protection assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={privacyMetrics}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Privacy Score"
                      dataKey="value"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>
                  Regulatory and security compliance overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span className="font-medium">HIPAA Compliance</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Certified</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Data Encryption</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">AES-256</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">GDPR Compliance</span>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-orange-600" />
                      <span className="font-medium">Differential Privacy</span>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">ε = 0.1</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Audit Log */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>
                Latest security and privacy audit activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Privacy audit completed successfully</p>
                    <p className="text-xs text-gray-500">All patient data anonymization verified - 2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Encryption keys rotated</p>
                    <p className="text-xs text-gray-500">Scheduled key rotation completed - 6 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Access control updated</p>
                    <p className="text-xs text-gray-500">New hospital permissions configured - 1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

