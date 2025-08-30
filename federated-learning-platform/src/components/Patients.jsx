import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Activity,
  Calendar,
  FileText,
  Shield,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'

const mockPatients = [
  {
    id: 'P001',
    age: 65,
    gender: 'Male',
    condition: 'Lung Cancer',
    trialDrug: 'Oncology-A',
    enrollmentDate: '2024-01-15',
    status: 'Active',
    response: 'Positive',
    lastVisit: '2024-07-20'
  },
  {
    id: 'P002',
    age: 58,
    gender: 'Female',
    condition: 'Heart Failure',
    trialDrug: 'Cardio-B',
    enrollmentDate: '2024-02-10',
    status: 'Active',
    response: 'Excellent',
    lastVisit: '2024-07-18'
  },
  {
    id: 'P003',
    age: 72,
    gender: 'Male',
    condition: 'Alzheimer\'s',
    trialDrug: 'Neuro-C',
    enrollmentDate: '2023-11-20',
    status: 'Completed',
    response: 'Moderate',
    lastVisit: '2024-06-30'
  },
  {
    id: 'P004',
    age: 45,
    gender: 'Female',
    condition: 'Lung Cancer',
    trialDrug: 'Oncology-A',
    enrollmentDate: '2024-03-05',
    status: 'Active',
    response: 'Positive',
    lastVisit: '2024-07-22'
  }
]

const networkInsights = [
  {
    drug: 'Oncology-A',
    condition: 'Lung Cancer',
    networkPatients: 234,
    eligibleFromHospital: 12,
    successRate: 78,
    avgAge: 62,
    genderDistribution: { male: 60, female: 40 }
  },
  {
    drug: 'Cardio-B',
    condition: 'Heart Failure',
    networkPatients: 189,
    eligibleFromHospital: 8,
    successRate: 85,
    avgAge: 68,
    genderDistribution: { male: 45, female: 55 }
  },
  {
    drug: 'Neuro-C',
    condition: 'Alzheimer\'s Disease',
    networkPatients: 156,
    eligibleFromHospital: 5,
    successRate: 72,
    avgAge: 74,
    genderDistribution: { male: 52, female: 48 }
  }
]

export default function Patients() {
  const [patients, setPatients] = useState(mockPatients)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.condition.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.trialDrug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCondition = !selectedCondition || patient.condition === selectedCondition
    const matchesStatus = !selectedStatus || patient.status === selectedStatus
    
    return matchesSearch && matchesCondition && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Completed': return 'bg-gray-100 text-gray-800'
      case 'Withdrawn': return 'bg-red-100 text-red-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getResponseColor = (response) => {
    switch (response) {
      case 'Excellent': return 'bg-green-100 text-green-800'
      case 'Positive': return 'bg-blue-100 text-blue-800'
      case 'Moderate': return 'bg-yellow-100 text-yellow-800'
      case 'Poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-600">Monitor patient progress and federated insights</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Enroll Patient
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">
              +2 this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.filter(p => p.status === 'Active').length}</div>
            <p className="text-xs text-muted-foreground">
              Currently enrolled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Response</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((patients.filter(p => p.response === 'Positive' || p.response === 'Excellent').length / patients.length) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Response rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Eligible</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25</div>
            <p className="text-xs text-muted-foreground">
              For network trials
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="patients" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="patients">Hospital Patients</TabsTrigger>
          <TabsTrigger value="network">Network Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="patients" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Database</CardTitle>
              <CardDescription>
                Manage and monitor patients in your hospital's clinical trials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by patient ID, condition, or drug..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Conditions</SelectItem>
                    <SelectItem value="Lung Cancer">Lung Cancer</SelectItem>
                    <SelectItem value="Heart Failure">Heart Failure</SelectItem>
                    <SelectItem value="Alzheimer's">Alzheimer's</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Patient Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Demographics</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Trial Drug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.id}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{patient.age}y, {patient.gender}</div>
                          </div>
                        </TableCell>
                        <TableCell>{patient.condition}</TableCell>
                        <TableCell>{patient.trialDrug}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(patient.status)}>
                            {patient.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getResponseColor(patient.response)}>
                            {patient.response}
                          </Badge>
                        </TableCell>
                        <TableCell>{patient.lastVisit}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Federated Network Insights</CardTitle>
              <CardDescription>
                Cross-hospital data sharing and patient eligibility matching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {networkInsights.map((insight, index) => (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{insight.drug}</h3>
                        <p className="text-gray-600">{insight.condition}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {insight.successRate}% Success Rate
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">{insight.networkPatients}</div>
                        <div className="text-sm text-gray-600">Network Patients</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{insight.eligibleFromHospital}</div>
                        <div className="text-sm text-gray-600">Eligible Here</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{insight.avgAge}</div>
                        <div className="text-sm text-gray-600">Avg Age</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {insight.genderDistribution.male}%/{insight.genderDistribution.female}%
                        </div>
                        <div className="text-sm text-gray-600">M/F Distribution</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Shield className="h-4 w-4" />
                        <span>Patient data anonymized and encrypted</span>
                      </div>
                      <Button variant="outline" size="sm">
                        View Eligibility Criteria
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Privacy and Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Privacy & Compliance</CardTitle>
              <CardDescription>
                Ensuring patient privacy in federated learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="font-medium">HIPAA Compliant</div>
                    <div className="text-sm text-gray-600">All data handling certified</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <div>
                    <div className="font-medium">End-to-End Encryption</div>
                    <div className="text-sm text-gray-600">AES-256 encryption</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
                  <div>
                    <div className="font-medium">Differential Privacy</div>
                    <div className="text-sm text-gray-600">ε = 0.1 privacy budget</div>
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

