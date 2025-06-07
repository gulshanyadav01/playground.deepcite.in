import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertTriangle, ArrowRight, Brain } from 'lucide-react';
import { ModelsGrid } from '../../components/models/ModelsGrid';
import { ModelInfo } from '../../components/models/ModelCard';

// Mock data - in a real app this would come from an API
const availableModels: ModelInfo[] = [
  {
    id: 'mistral-7b-v0.1-custom',
    name: 'Mistral-7B-Instruct-v0.1-custom',
    description: 'Fine-tuned Mistral model for customer support responses',
    size: '7B',
    architecture: 'Mistral',
    creationDate: 'Apr 12, 2025',
    isBase: false,
    baseModelId: 'mistral-7b-v0.1'
  },
  {
    id: 'mistral-7b-v0.1',
    name: 'Mistral-7B-v0.1',
    description: 'Base Mistral model',
    size: '7B',
    architecture: 'Mistral',
    isBase: true
  },
  {
    id: 'tinyllama-1.1b-v0.6-fine-tuned',
    name: 'TinyLlama-1.1B-v0.6-fine-tuned',
    description: 'Code completion assistant based on TinyLlama',
    size: '1.1B',
    architecture: 'TinyLlama',
    creationDate: 'Apr 5, 2025',
    isBase: false,
    baseModelId: 'tinyllama-1.1b'
  }
];

export default function TestData() {
  const navigate = useNavigate();
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => setFile(acceptedFiles[0])
  });

  const handleContinue = () => {
    if (!selectedModel || !file) return;
    
    // Store selected model in localStorage for use in metrics page
    localStorage.setItem('evaluationModel', JSON.stringify(selectedModel));
    navigate('/evaluate/metrics');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Test Data</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Select a model and upload test data to evaluate its performance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Model to Evaluate</CardTitle>
              <CardDescription>
                Choose which model you want to evaluate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModelsGrid 
                models={availableModels}
                onSelectModel={setSelectedModel}
                selectedModelId={selectedModel?.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload Test Dataset</CardTitle>
              <CardDescription>
                Upload your test data in CSV or JSON format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  isDragActive 
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10" 
                    : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/20">
                    <Upload className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {isDragActive ? "Drop the file here" : "Drag & drop your file here or click to browse"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      CSV or JSON files, up to 50MB
                    </p>
                  </div>
                </div>
              </div>

              {file && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                variant="primary"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                disabled={!selectedModel || !file}
                onClick={handleContinue}
              >
                Continue to Evaluation
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Guidelines</CardTitle>
              <CardDescription>
                Tips for accurate model evaluation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Test Data Format</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">1</span>
                      </span>
                      <span>Use the same format as training data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">2</span>
                      </span>
                      <span>Include diverse test cases</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">3</span>
                      </span>
                      <span>Aim for at least 100 test examples</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-warning-50 dark:bg-warning-900/20 rounded-md">
                  <h4 className="text-sm font-medium text-warning-800 dark:text-warning-200 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Important Notes
                  </h4>
                  <ul className="mt-2 text-sm text-warning-700 dark:text-warning-300 space-y-2 pl-6 list-disc">
                    <li>Test data should be different from training data</li>
                    <li>Include edge cases and challenging examples</li>
                    <li>Ensure consistent formatting</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}