import { useState, useEffect } from 'react';
import { PlusCircle, Brain, History, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ModelInfo } from '../components/models/ModelCard';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Mock data - in a real app this would come from an API
const recentModels: ModelInfo[] = [
  {
    id: '1',
    name: 'Mistral-7B-Instruct-v0.1-custom',
    description: 'Fine-tuned Mistral model for customer support responses',
    size: '7B',
    architecture: 'Mistral',
    creationDate: 'Apr 12, 2025',
    isBase: false,
    baseModelId: 'mistral-7b-v0.1'
  },
  {
    id: '2',
    name: 'TinyLlama-1.1B-v0.6-fine-tuned',
    description: 'Code completion assistant based on TinyLlama',
    size: '1.1B',
    architecture: 'TinyLlama',
    creationDate: 'Apr 5, 2025',
    isBase: false,
    baseModelId: 'tinyllama-1.1b'
  },
  {
    id: '3',
    name: 'Phi-2-medical-assistant',
    description: 'Medical domain specialized Phi-2 model',
    size: '2.7B',
    architecture: 'Phi',
    creationDate: 'Mar 28, 2025',
    isBase: false,
    baseModelId: 'phi-2'
  }
];

const statsItems = [
  { title: 'Total Models', value: '12', icon: Brain, color: 'text-primary-500' },
  { title: 'Inferences', value: '4,832', icon: Sparkles, color: 'text-secondary-500' },
  { title: 'Training Hours', value: '72.5', icon: History, color: 'text-success-500' },
  { title: 'Performance Gain', value: '+24%', icon: TrendingUp, color: 'text-warning-500' },
];

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and monitor your fine-tuned models
          </p>
        </div>
        <Link to="/select-model">
          <Button 
            leftIcon={<PlusCircle className="h-4 w-4" />}
            variant="primary"
          >
            Start New Fine-Tuning
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsItems.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card variant="outline" className="hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {item.title}
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {isLoading ? (
                        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                      ) : (
                        item.value
                      )}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-full bg-opacity-10 ${item.color.replace('text', 'bg')}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Recent Models</h2>
          <Link to="/query" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
            View all models →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="h-64">
                <CardHeader>
                  <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-2" />
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                    </div>
                    <div className="flex justify-between">
                      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            recentModels.map((model, index) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link to={`/query?model=${model.id}`}>
                  <Card className="hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300 h-full cursor-pointer">
                    <CardHeader>
                      <CardTitle>{model.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{model.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Size</p>
                          <p className="font-medium">{model.size}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Architecture</p>
                          <p className="font-medium">{model.architecture}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500 dark:text-gray-400">Created</p>
                          <p className="font-medium">{model.creationDate}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button variant="primary" size="sm">Query Model</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-5">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/select-model">
            <Card variant="outline" className="h-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/20">
                    <PlusCircle className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Start New Fine-Tuning</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select a base model to fine-tune</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/query">
            <Card variant="outline" className="h-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-secondary-100 dark:bg-secondary-900/20">
                    <Sparkles className="h-6 w-6 text-secondary-600 dark:text-secondary-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Query Models</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Test and compare your models</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/upload-data">
            <Card variant="outline" className="h-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-success-100 dark:bg-success-900/20">
                    <TrendingUp className="h-6 w-6 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Prepare Training Data</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Upload and format your datasets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}