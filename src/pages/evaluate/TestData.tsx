import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertTriangle, ArrowRight, Brain, CheckCircle, DownloadCloud, Loader2, BarChart3, X, Plus } from 'lucide-react';
import { evaluationService } from '../../services/evaluationService';
import { chatApi, Model } from '../../services/chatApi';
import { AnimatedLoader } from '../../components/ui/AnimatedLoader';
import { multiModelService, SelectedModel, ExternalModel } from '../../services/multiModelService';

export default function TestData() {
  const navigate = useNavigate();
  
  // Model selection state
  const [activeTab, setActiveTab] = useState<'finetuned' | 'external'>('finetuned');
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [externalModels, setExternalModels] = useState<ExternalModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingExternalModels, setIsLoadingExternalModels] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [externalModelError, setExternalModelError] = useState<string | null>(null);
  const [isMultiModelMode, setIsMultiModelMode] = useState(false);
  
  // Evaluation parameters
  const [batchSize, setBatchSize] = useState(50);
  const [maxTokens, setMaxTokens] = useState(150);
  const [temperature, setTemperature] = useState(0.7);
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Get current models list based on active tab
  const currentModels = activeTab === 'finetuned' ? availableModels : externalModels;

  // Load available models function
  const loadModels = async () => {
    try {
      setIsLoadingModels(true);
      setModelError(null);
      const models = await chatApi.fetchAvailableModels();
      setAvailableModels(models);
      
      // Auto-select first model if none selected
      if (models.length > 0 && selectedModels.length === 0) {
        const firstModel: SelectedModel = {
          id: models[0].id,
          name: models[0].name,
          type: 'finetuned',
          size: models[0].size,
          family: models[0].family
        };
        setSelectedModels([firstModel]);
      }
    } catch (error: any) {
      console.error('Failed to load models:', error);
      setModelError(error.message || 'Failed to load available models. Please try again.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Load external models function
  const loadExternalModels = async () => {
    try {
      setIsLoadingExternalModels(true);
      setExternalModelError(null);
      const response = await multiModelService.getExternalModels();
      setExternalModels(response.models);
    } catch (error: any) {
      console.error('Failed to load external models:', error);
      setExternalModelError(error.message || 'Failed to load external models. Please try again.');
    } finally {
      setIsLoadingExternalModels(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: 'finetuned' | 'external') => {
    setActiveTab(tab);
    
    // Load models for the selected tab if not already loaded
    if (tab === 'external' && externalModels.length === 0) {
      loadExternalModels();
    }
  };

  // Handle model selection/deselection
  const handleModelToggle = (model: Model | ExternalModel) => {
    const modelId = model.id;
    const isSelected = selectedModels.some(m => m.id === modelId);
    
    if (isSelected) {
      // Remove model
      setSelectedModels(prev => prev.filter(m => m.id !== modelId));
    } else {
      // Add model
      const selectedModel: SelectedModel = {
        id: model.id,
        name: model.name,
        type: activeTab === 'finetuned' ? 'finetuned' : (model as ExternalModel).type,
        provider: (model as ExternalModel).provider,
        size: model.size,
        family: model.family
      };
      setSelectedModels(prev => [...prev, selectedModel]);
    }
  };

  // Remove selected model
  const removeSelectedModel = (modelId: string) => {
    setSelectedModels(prev => prev.filter(m => m.id !== modelId));
  };

  // File upload handling
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
                  fileType: 'json'
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

  // Convert file to base64
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleStartEvaluation = async () => {
    if (selectedModels.length === 0 || !file) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Convert file to base64
      const fileContent = await readFileContent(file);
      const fileType = multiModelService.getFileType(file.name);
      
      if (!fileType) {
        throw new Error('Unsupported file format');
      }

      if (selectedModels.length === 1) {
        // Single model evaluation - use existing flow
        const model = selectedModels[0];
        const response = await evaluationService.startPredictionJobWithBase64(
          model.name,
          fileContent,
          fileType,
          batchSize
        );

        localStorage.setItem('evaluationJobId', response.job_id);
        localStorage.setItem('evaluationModel', JSON.stringify(model));
        navigate('/evaluate/metrics');
      } else {
        // Multi-model evaluation - use new flow
        const response = await multiModelService.startMultiEvaluation({
          selected_models: selectedModels,
          file_content: fileContent,
          file_type: fileType,
          evaluation_params: {
            batch_size: batchSize,
            max_tokens: maxTokens,
            temperature: temperature
          }
        });

        localStorage.setItem('multiEvaluationJobId', response.job_id);
        localStorage.setItem('selectedModels', JSON.stringify(selectedModels));
        navigate('/evaluate/multi-progress');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to start evaluation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load available models on component mount
  useEffect(() => {
    loadModels();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Evaluate Models</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Select one or more models and upload test data to evaluate their performance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Models</CardTitle>
              <CardDescription>
                Choose which models to evaluate and compare
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Multi-Model Mode Toggle */}
              <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <input
                  type="checkbox"
                  id="multiModelMode"
                  checked={isMultiModelMode}
                  onChange={() => setIsMultiModelMode(!isMultiModelMode)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="multiModelMode" className="text-sm font-medium">
                  🔄 Multi-Model Comparison
                </label>
              </div>

              {isMultiModelMode && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    💡 Select multiple models to compare their performance on the same test data
                  </p>
                </div>
              )}

              {/* Tab Interface */}
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => handleTabChange('finetuned')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'finetuned'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Your Models
                </button>
                <button
                  onClick={() => handleTabChange('external')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'external'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  External Models
                </button>
              </div>

              {/* Loading and Error States */}
              {(activeTab === 'finetuned' ? isLoadingModels : isLoadingExternalModels) ? (
                <div className="flex items-center justify-center py-8">
                  <AnimatedLoader variant="brain" size="md" text={`Loading ${activeTab === 'finetuned' ? 'your' : 'external'} models...`} />
                </div>
              ) : (activeTab === 'finetuned' ? modelError : externalModelError) ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="flex items-center">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                    <span className="ml-2 text-sm text-red-600">{activeTab === 'finetuned' ? modelError : externalModelError}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={activeTab === 'finetuned' ? loadModels : loadExternalModels}
                    disabled={activeTab === 'finetuned' ? isLoadingModels : isLoadingExternalModels}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  {/* Model List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {currentModels.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No models available
                      </div>
                    ) : (
                      currentModels.map((model) => {
                        const isSelected = selectedModels.some(m => m.id === model.id);
                        return (
                          <div
                            key={model.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => {
                              if (isMultiModelMode) {
                                handleModelToggle(model);
                              } else {
                                // Single model mode - replace selection
                                const selectedModel: SelectedModel = {
                                  id: model.id,
                                  name: model.name,
                                  type: activeTab === 'finetuned' ? 'finetuned' : (model as ExternalModel).type,
                                  provider: (model as ExternalModel).provider,
                                  size: model.size,
                                  family: model.family
                                };
                                setSelectedModels([selectedModel]);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{model.name}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs text-gray-500">{model.size}</span>
                                  {activeTab === 'external' && (model as ExternalModel).provider && (
                                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                      {(model as ExternalModel).provider}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isMultiModelMode && (
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                  isSelected 
                                    ? 'border-primary-500 bg-primary-500' 
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {/* Selected Models Preview */}
              {selectedModels.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Selected Models ({selectedModels.length})</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedModels.map((model) => (
                      <div key={model.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{model.name}</p>
                          <p className="text-xs text-gray-500">{model.type} • {model.size}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSelectedModel(model.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evaluation Parameters */}
              <div className="pt-4">
                <h4 className="text-sm font-medium mb-3">Parameters</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="batchSize" className="text-xs font-medium">
                        Batch Size
                      </label>
                      <span className="text-xs">{batchSize}</span>
                    </div>
                    <input
                      type="range"
                      id="batchSize"
                      min="10"
                      max="100"
                      step="10"
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="maxTokens" className="text-xs font-medium">
                        Max Tokens
                      </label>
                      <span className="text-xs">{maxTokens}</span>
                    </div>
                    <input
                      type="range"
                      id="maxTokens"
                      min="50"
                      max="500"
                      step="25"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="temperature" className="text-xs font-medium">
                        Temperature
                      </label>
                      <span className="text-xs">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      id="temperature"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-3 h-full flex flex-col">
          <Card className="flex-1 flex flex-col h-full min-h-[600px]">
            <CardHeader className="border-b flex-shrink-0">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5 text-primary-500" />
                <div>
                  <CardTitle>
                    {selectedModels.length > 1 ? 'Multi-Model Evaluation' : 'Model Evaluation'}
                  </CardTitle>
                  <CardDescription>
                    {selectedModels.length > 1 
                      ? `Compare ${selectedModels.length} models on the same test data`
                      : 'Upload test data to evaluate your selected model'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              <div className="space-y-6">
                {/* File Upload Area */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Upload Test Dataset</h3>
                  <div 
                    {...getRootProps()} 
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                      isDragActive 
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10" 
                        : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 rounded-full bg-primary-100 dark:bg-primary-900/20">
                        <Upload className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium">
                          {isDragActive ? "Drop the file here" : "Drag & drop your test file here or click to browse"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Supports CSV, JSON, and JSONL files up to 50MB
                        </p>
                        <p className="text-xs text-gray-400">
                          Required fields: instruction, output | Optional: input
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Results */}
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

                {/* File Info */}
                {file && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFile(null);
                          setValidationResult(null);
                          setError(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}

                {/* Evaluation Guidelines */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    💡 Evaluation Guidelines
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Test data should be different from training data</li>
                    <li>• Include diverse test cases and edge cases</li>
                    <li>• Aim for at least 100 test examples for reliable metrics</li>
                    {selectedModels.length > 1 && (
                      <li>• All models will be evaluated on the same test data for fair comparison</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t p-6">
              <div className="w-full flex justify-end">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                  disabled={selectedModels.length === 0 || !file || isLoading || (validationResult && !validationResult.isValid)}
                  onClick={handleStartEvaluation}
                  isLoading={isLoading}
                  className="px-8"
                >
                  {isLoading 
                    ? 'Starting Evaluation...' 
                    : selectedModels.length > 1 
                      ? `Start Multi-Model Evaluation (${selectedModels.length} models)`
                      : 'Start Evaluation'
                  }
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
