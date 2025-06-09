import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertTriangle, ArrowRight, Brain, CheckCircle } from 'lucide-react';
import { ModelsGrid } from '../../components/models/ModelsGrid';
import { ModelInfo } from '../../components/models/ModelCard';
import { evaluationService } from '../../services/evaluationService';
import { chatApi } from '../../services/chatApi';

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
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/jsonl': ['.jsonl']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const uploadedFile = acceptedFiles[0];
      setFile(uploadedFile);
      setError(null);
      setValidationResult(null);

      // Validate file format
      if (uploadedFile) {
        try {
          const fileType = evaluationService.getFileType(uploadedFile.name);
          if (!fileType) {
            setError('Unsupported file format. Please upload CSV, JSON, or JSONL files.');
            return;
          }

          // For small files, validate the content
          if (uploadedFile.size < 1024 * 1024) { // Less than 1MB
            const text = await uploadedFile.text();
            let data: any[];

            if (fileType === 'csv') {
              // Basic CSV validation - just check if it has headers
              const lines = text.split('\n').filter(line => line.trim());
              if (lines.length < 2) {
                setError('CSV file must have at least a header row and one data row.');
                return;
              }
              setValidationResult({ 
                isValid: true, 
                totalRows: lines.length - 1,
                fileType: 'CSV'
              });
            } else if (fileType === 'json') {
              try {
                data = JSON.parse(text);
                if (!Array.isArray(data)) {
                  data = [data]; // Convert single object to array
                }
                const validation = evaluationService.validateTestData(data);
                setValidationResult({
                  ...validation,
                  totalRows: data.length,
                  fileType: 'JSON'
                });
                if (!validation.isValid) {
                  setError(`Validation errors: ${validation.errors.join(', ')}`);
                }
              } catch (e) {
                setError('Invalid JSON format. Please check your file.');
              }
            } else if (fileType === 'jsonl') {
              try {
                const lines = text.split('\n').filter(line => line.trim());
                data = lines.map(line => JSON.parse(line));
                const validation = evaluationService.validateTestData(data);
                setValidationResult({
                  ...validation,
                  totalRows: data.length,
                  fileType: 'JSONL'
                });
                if (!validation.isValid) {
                  setError(`Validation errors: ${validation.errors.join(', ')}`);
                }
              } catch (e) {
                setError('Invalid JSONL format. Each line must be valid JSON.');
              }
            }
          } else {
            // For large files, just show basic info
            setValidationResult({
              isValid: true,
              totalRows: 'Large file - will validate during upload',
              fileType: fileType.toUpperCase()
            });
          }
        } catch (e) {
          setError('Error validating file. Please try again.');
        }
      }
    }
  });

  const handleStartEvaluation = async () => {
    if (!selectedModel || !file) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Get model path - use the model name for now
      const modelPath = selectedModel.name;
      
      // Start prediction job with file upload
      const response = await evaluationService.startPredictionJobWithFile(
        modelPath,
        file,
        50 // batch size
      );

      // Store job info and navigate to metrics page
      localStorage.setItem('evaluationJobId', response.job_id);
      localStorage.setItem('evaluationModel', JSON.stringify(selectedModel));
      
      navigate('/evaluate/metrics');
    } catch (error: any) {
      setError(error.message || 'Failed to start evaluation. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

              {error && (
                <div className="p-4 bg-error-50 dark:bg-error-900/20 rounded-lg border border-error-200 dark:border-error-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-error-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-error-800 dark:text-error-200">
                        Validation Error
                      </p>
                      <p className="text-sm text-error-700 dark:text-error-300 mt-1">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {validationResult && validationResult.isValid && (
                <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-200 dark:border-success-800">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-success-800 dark:text-success-200">
                        File Validated Successfully
                      </p>
                      <p className="text-sm text-success-700 dark:text-success-300 mt-1">
                        {validationResult.fileType} file with {validationResult.totalRows} rows ready for evaluation
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                disabled={!selectedModel || !file || isLoading}
                onClick={handleStartEvaluation}
              >
                {isLoading ? 'Starting Evaluation...' : 'Start Evaluation'}
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
