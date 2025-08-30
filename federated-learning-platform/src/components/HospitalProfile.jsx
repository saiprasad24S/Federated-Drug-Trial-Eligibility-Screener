import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  FlaskConical, 
  Award,
  Calendar,
  Activity,
  Settings,
  Shield,
  Network
} from 'lucide-react'

export default function HospitalProfile() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    name: 'Mayo Clinic',
    address: '200 First St SW, Rochester, MN 55905',
    phone: '+1 (507) 284-2511',
    email: 'research@mayo.edu',
    website: 'https://www.mayoclinic.org',
    description: 'Leading academic medical center with extensive research capabilities in oncology, cardiology, and neurology.',
    specialties: ['Oncology', 'Cardiology', 'Neurology', 'Immunology'],
    established: '1889',
    beds: '1,265',
    staff: '4,500'
  })

  const hospitalStats = {
    activeTrials: 24,
    patientsEnrolled: 1247,
    networkRank: 3,
    collaborations: 15,
    publicationsThisYear: 89,
    successRate: 87
  }

  const recentActivity = [
    {
      type: 'trial',
      title: 'New Oncology-A trial started',
      description: 'Phase III trial for lung cancer treatment',
      timestamp: '2 hours ago',
      icon: FlaskConical
    },
    {
      type: 'collaboration',
      title: 'Joined multi-center study',
      description: 'Cardio-B efficacy study with 8 hospitals',
      timestamp: '1 day ago',
      icon: Network
    },
    {
      type: 'publication',
      title: 'Research paper published',
      description: 'Federated learning in clinical trials - Nature Medicine',
      timestamp: '3 days ago',
      icon: Award
    },
    {
      type: 'patient',
      title: 'Patient milestone reached',
      description: '1000th patient enrolled in federated trials',
      timestamp: '1 week ago',
      icon: Users
    }
  ]

  const networkMetrics = {
    dataShared: '2,847',
    modelsContributed: '23',
    insightsReceived: '156',
    privacyScore: '98.5%',
    collaboratingHospitals: '15',
    avgResponseTime: '2.3s'
  }

  const handleSave = () => {
    // Save profile data
    setIsEditing(false)
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'trial': return FlaskConical
      case 'collaboration': return Network
      case 'publication': return Award
      case 'patient': return Users
      default: return Activity
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hospital Profile</h1>
          <p className="text-gray-600">Manage your hospital's information and network settings</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="network">Network Status</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Hospital Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Hospital Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Hospital Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={profileData.address}
                          onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={profileData.description}
                          onChange={(e) => setProfileData({...profileData, description: e.target.value})}
                        />
                      </div>
                      <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold">{profileData.name}</h3>
                        <p className="text-gray-600">{profileData.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{profileData.address}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{profileData.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{profileData.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Established {profileData.established}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Specialties</h4>
                        <div className="flex flex-wrap gap-2">
                          {profileData.specialties.map((specialty, index) => (
                            <Badge key={index} variant="outline">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{profileData.beds}</div>
                          <div className="text-sm text-gray-600">Hospital Beds</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{profileData.staff}</div>
                          <div className="text-sm text-gray-600">Medical Staff</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Hospital Stats */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Hospital Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Trials</span>
                      <span className="font-semibold">{hospitalStats.activeTrials}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Patients Enrolled</span>
                      <span className="font-semibold">{hospitalStats.patientsEnrolled}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Network Rank</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        #{hospitalStats.networkRank}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Collaborations</span>
                      <span className="font-semibold">{hospitalStats.collaborations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Publications (2024)</span>
                      <span className="font-semibold">{hospitalStats.publicationsThisYear}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="font-semibold text-green-600">{hospitalStats.successRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="network" className="space-y-6">
          {/* Network Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Contribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{networkMetrics.dataShared}</div>
                    <div className="text-sm text-gray-600">Data Points Shared</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{networkMetrics.modelsContributed}</div>
                    <div className="text-sm text-gray-600">Models Contributed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Network Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{networkMetrics.insightsReceived}</div>
                    <div className="text-sm text-gray-600">Insights Received</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{networkMetrics.collaboratingHospitals}</div>
                    <div className="text-sm text-gray-600">Collaborating Hospitals</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{networkMetrics.privacyScore}</div>
                    <div className="text-sm text-gray-600">Privacy Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{networkMetrics.avgResponseTime}</div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Network Status */}
          <Card>
            <CardHeader>
              <CardTitle>Network Connection Status</CardTitle>
              <CardDescription>
                Your hospital's connectivity and participation in the federated network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Network Connection</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">Data Sync</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Model Training</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Running</Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Privacy Protection</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Network className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Federated Learning</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Real-time Updates</span>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">Enabled</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest activities and updates from your hospital
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon
                  return (
                    <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{activity.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-2">{activity.timestamp}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Settings</CardTitle>
              <CardDescription>
                Configure your hospital's participation in the federated network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Data Sharing Preferences</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Share Treatment Outcomes</div>
                        <div className="text-sm text-gray-600">Allow sharing of anonymized treatment results</div>
                      </div>
                      <Button variant="outline" size="sm">Enabled</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Participate in Model Training</div>
                        <div className="text-sm text-gray-600">Contribute to federated model improvements</div>
                      </div>
                      <Button variant="outline" size="sm">Enabled</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Receive Network Insights</div>
                        <div className="text-sm text-gray-600">Get AI-generated insights from network data</div>
                      </div>
                      <Button variant="outline" size="sm">Enabled</Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Privacy Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Differential Privacy</div>
                        <div className="text-sm text-gray-600">Privacy budget: ε = 0.1</div>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Data Retention</div>
                        <div className="text-sm text-gray-600">Automatically delete data after 7 years</div>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
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

