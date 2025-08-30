import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Network, 
  Shield, 
  Brain, 
  Users,
  Award,
  Code,
  Database,
  Globe,
  Mail,
  Linkedin,
  Github
} from 'lucide-react'

export default function AboutUs() {
  const features = [
    {
      icon: Shield,
      title: 'Privacy-First Architecture',
      description: 'HIPAA compliant federated learning with differential privacy and end-to-end encryption.'
    },
    {
      icon: Network,
      title: 'Multi-Hospital Collaboration',
      description: 'Seamless data sharing and model training across healthcare institutions worldwide.'
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Advanced machine learning algorithms generate actionable medical insights from collective data.'
    },
    {
      icon: Users,
      title: 'Patient-Centric Design',
      description: 'Improving patient outcomes through collaborative research while maintaining data sovereignty.'
    }
  ]

  const technologies = [
    'React & TypeScript',
    'TensorFlow Federated',
    'Flask & Python',
    'PostgreSQL',
    'Docker & Kubernetes',
    'AWS/Azure Cloud',
    'Differential Privacy',
    'HIPAA Compliance'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="bg-blue-600 p-4 rounded-xl">
                <Network className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-gray-900">MedFed</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Revolutionizing Medical Research Through Federated Learning
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              A cutting-edge platform that enables hospitals to collaborate on drug trials and medical research 
              while maintaining the highest standards of patient privacy and data security.
            </p>
            <div className="flex justify-center space-x-4">
              <Button size="lg">
                <Mail className="h-4 w-4 mr-2" />
                Contact Us
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Platform Features</h2>
            <p className="text-xl text-gray-600">
              Advanced technology stack designed for healthcare collaboration
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="bg-blue-100 p-3 rounded-lg w-fit mx-auto mb-4">
                      <Icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* Developer Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-8 rounded-2xl text-white">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="bg-white p-3 rounded-full">
                    <Code className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Y B Sai Prasad</h3>
                    <p className="text-blue-100">Lead Developer & Project Architect</p>
                  </div>
                </div>
                
                <p className="text-lg mb-6 leading-relaxed">
                  Visionary developer and architect behind MedFed's innovative federated learning platform. 
                  With expertise in AI, healthcare technology, and privacy-preserving systems, Sai Prasad 
                  has created a revolutionary solution for collaborative medical research.
                </p>
                
                <div className="flex space-x-4">
                  <Button variant="secondary" size="sm">
                    <Linkedin className="h-4 w-4 mr-2" />
                    LinkedIn
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Github className="h-4 w-4 mr-2" />
                    GitHub
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Technical Excellence</h3>
                <p className="text-gray-600 mb-6">
                  MedFed represents the pinnacle of modern healthcare technology, combining advanced 
                  machine learning, robust security, and intuitive user experience design.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Technology Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {technologies.map((tech, index) => (
                    <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">HIPAA</div>
                  <div className="text-sm text-gray-600">Compliant</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">47+</div>
                  <div className="text-sm text-gray-600">Hospitals</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">94%</div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-24 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-xl leading-relaxed max-w-4xl mx-auto mb-8">
            To accelerate medical breakthroughs and improve patient outcomes by enabling secure, 
            privacy-preserving collaboration between healthcare institutions worldwide. Through 
            federated learning, we're building a future where medical knowledge is shared 
            responsibly and effectively.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="bg-white bg-opacity-20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Globe className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Global Impact</h3>
              <p className="text-blue-100">
                Connecting hospitals worldwide for collaborative medical research
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-white bg-opacity-20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
              <p className="text-blue-100">
                Maintaining the highest standards of patient data protection
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-white bg-opacity-20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Award className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Innovation</h3>
              <p className="text-blue-100">
                Pioneering the future of collaborative healthcare technology
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Network className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold">MedFed</span>
            </div>
            <p className="text-gray-400 mb-4">
              Federated Learning Platform for Drug Trials
            </p>
            <p className="text-sm text-gray-500">
              Developed by <span className="font-semibold text-blue-400">Y B Sai Prasad</span> • 
              Lead Developer & Project Architect
            </p>
            <p className="text-xs text-gray-600 mt-2">
              © 2024 MedFed Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

