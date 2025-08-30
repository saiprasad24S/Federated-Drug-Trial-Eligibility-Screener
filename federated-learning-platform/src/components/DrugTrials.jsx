import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FlaskConical, 
  Plus, 
  Upload, 
  Users, 
  TrendingUp, 
  Calendar,
  FileText,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'

const mockTrials = [
  {
    id: 1,
    drugName: 'Oncology-A',
    indication: 'Lung Cancer',
    phase: 'Phase III',
    status: 'Active',
    patientsEnrolled: 45,
    successRate: 78,
    startDate: '2024-01-15',
    lastUpdate: '2024-07-25'
  },
  {
    id: 2,
    drugName: 'Cardio-B',
    indication: 'Heart Failure',
    phase: 'Phase II',
    status: 'Recruiting',
    patientsEnrolled: 23,
    successRate: 85,
    startDate: '2024-03-10',
    lastUpdate: '2024-07-20'
  },
  {
    id: 3,
    drugName: 'Neuro-C',
    indication: 'Alzheimer\'s Disease',
    phase: 'Phase I',
    status: 'Completed',
    patientsEnrolled: 12,
    successRate: 72,
    startDate: '2023-11-20',
    lastUpdate: '2024-06-30'
  }
]

export default function DrugTrials() {
  const [trials, setTrials] = useState(mockTrials)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedTrial, setSelectedTrial] = useState(null)
  const [newTrial, setNewTrial] = useState({
    drugName: '',
    indication: '',
    phase: '',
    description: ''
  })

  const handleCreateTrial = () => {
    const trial = {
      id: trials.length + 1,
      ...newTrial,
      status: 'Active',
      patientsEnrolled: 0,
      successRate: 0,
      startDate: new Date().toISOString().split('T')[0],
      lastUpdate: new Date().toISOString().split('T')[0]
    }
    setTrials([...trials, trial])
    setNewTrial({ drugName: '', indication: '', phase: '', description: '' })
    setIsCreateDialogOpen(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Recruiting': return 'bg-blue-100 text-blue-800'
      case 'Completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Active': return <Activity className="h-4 w-4" />
      case 'Recruiting': return <Users className="h-4 w-4" />
      case 'Completed': return <CheckCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Drug Trials</h1>
          <p className="text-gray-600">Manage and monitor your clinical trials</p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Medical Report</DialogTitle>
                <DialogDescription>
                  Upload a patient medical report for federated learning analysis
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="trial-select">Select Trial</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a trial" />
                    </SelectTrigger>
                    <SelectContent>
                      {trials.map((trial) => (
                        <SelectItem key={trial.id} value={trial.id.toString()}>
                          {trial.drugName} - {trial.indication}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="report-file">Medical Report</Label>
                  <Input id="report-file" type="file" accept=".pdf,.doc,.docx" />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DOC, DOCX
                  </p>
                </div>
                <div>
                  <Label htmlFor="treatment-outcome">Treatment Outcome</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="successful">Successful</SelectItem>
                      <SelectItem value="partial">Partial Response</SelectItem>
                      <SelectItem value="no-response">No Response</SelectItem>
                      <SelectItem value="adverse">Adverse Reaction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">Upload and Process</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Trial
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Drug Trial</DialogTitle>
                <DialogDescription>
                  Set up a new clinical trial for federated learning
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="drug-name">Drug Name</Label>
                  <Input
                    id="drug-name"
                    placeholder="e.g., Oncology-A"
                    value={newTrial.drugName}
                    onChange={(e) => setNewTrial({...newTrial, drugName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="indication">Indication</Label>
                  <Input
                    id="indication"
                    placeholder="e.g., Lung Cancer"
                    value={newTrial.indication}
                    onChange={(e) => setNewTrial({...newTrial, indication: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="phase">Trial Phase</Label>
                  <Select value={newTrial.phase} onValueChange={(value) => setNewTrial({...newTrial, phase: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Phase I">Phase I</SelectItem>
                      <SelectItem value="Phase II">Phase II</SelectItem>
                      <SelectItem value="Phase III">Phase III</SelectItem>
                      <SelectItem value="Phase IV">Phase IV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the trial..."
                    value={newTrial.description}
                    onChange={(e) => setNewTrial({...newTrial, description: e.target.value})}
                  />
                </div>
                <Button onClick={handleCreateTrial} className="w-full">Create Trial</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Trials Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {trials.map((trial) => (
          <Card key={trial.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FlaskConical className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{trial.drugName}</CardTitle>
                </div>
                <Badge className={getStatusColor(trial.status)}>
                  {getStatusIcon(trial.status)}
                  <span className="ml-1">{trial.status}</span>
                </Badge>
              </div>
              <CardDescription>{trial.indication}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Phase</p>
                    <p className="font-medium">{trial.phase}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Patients</p>
                    <p className="font-medium">{trial.patientsEnrolled}</p>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Success Rate</span>
                    <span>{trial.successRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${trial.successRate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Started {trial.startDate}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <FileText className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Analytics
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Federated Learning Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Federated Learning Insights</CardTitle>
          <CardDescription>
            Cross-hospital collaboration and shared learnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="network" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="network">Network Status</TabsTrigger>
              <TabsTrigger value="insights">Shared Insights</TabsTrigger>
              <TabsTrigger value="privacy">Privacy Metrics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="network" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">47</div>
                  <div className="text-sm text-gray-600">Connected Hospitals</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">156</div>
                  <div className="text-sm text-gray-600">Active Models</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">94.2%</div>
                  <div className="text-sm text-gray-600">Avg. Accuracy</div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Oncology-A Breakthrough</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Network analysis shows 23% improvement in response rates when combined with immunotherapy.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Patient Eligibility Pattern</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Patients with specific genetic markers show 40% higher success rates across the network.
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="privacy" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Data Encryption</span>
                  </div>
                  <p className="text-sm text-gray-600">All patient data encrypted end-to-end</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Differential Privacy</span>
                  </div>
                  <p className="text-sm text-gray-600">ε = 0.1 privacy budget maintained</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

