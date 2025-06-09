import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertTriangle, ArrowRight, Brain, CheckCircle, DownloadCloud, Loader2, BarChart3 } from 'lucide-react';
import { evaluationService } from '../../services/evaluationService';
import { chatApi, Model } from '../../services/chatApi';
import { AnimatedLoader } from '../../components/ui/AnimatedLoader';

export default function TestData() {
  const navigate = useNavigate();
  
  // Model selection state
  const [activeTab, setActiveTab] = useState<'finetuned' | 'huggingface'>('finetuned');
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [huggingFaceModels, setHuggingFaceModels] = useState<Model[]>([]);
  const [searchResults, setSearchResults] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [compareModelId, setCompareModelId] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingHFModels, setIsLoadingHFModels] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [hfModelError, setHFModelError] = useState<string | null>(null);
  
  // Evaluation parameters
  const [batchSize, setBatchSize] = useState(50);
  const [maxTokens, setMaxTokens] = useState(150);
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Get current models list based on active tab
  const currentModels = activeTab === 'finetuned' ? availableModels : huggingFaceModels;
  
  // Get selected model info
  const selectedModel = currentModels.find((m: Model) => m.id === selectedModelId);
  const compareModel = currentModels.find((m: Model) => m.id === compareModelId);

  // Load available models function
  const loadModels = async () => {
    try {
      setIsLoadingModels(true);
      setModelError(null);
      const models = await chatApi.fetchAvailableModels();
      setAvailableModels(models);
      
      // Set default selected models
      if (models.length > 0) {
        setSelectedModelId(models[0].id);
        if (models.length > 1) {
          setCompareModelId(models[1].id);
        }
      }
    } catch (error: any) {
      console.error('Failed to load models:', error);
      setModelError(error.message || 'Failed to load available models. Please try again.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Load Hugging Face models function
  const loadHuggingFaceModels = async () => {
    try {
      setIsLoadingHFModels(true);
      setHFModelError(null);
      const models = await chatApi.fetchHuggingFaceModels();
      setHuggingFaceModels(models);
      
      // Set default selected models if switching to HF tab
      if (activeTab === 'huggingface' && models.length > 0) {
        setSelectedModelId(models[0].id);
        if (models.length > 1) {
          setCompareModelId(models[1].id);
        }
      }
    } catch (error: any) {
      console.error('Failed to load Hugging Face models:', error);
      setHFModelError(error.message || 'Failed to load Hugging Face models. Please try again.');
    } finally {
      setIsLoadingHFModels(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: 'finetuned' | 'huggingface') => {
    setActiveTab(tab);
    setSelectedModelId('');
    setCompareModelId('');
    
    // Load models for the selected tab if not already loaded
    if (tab === 'huggingface' && huggingFaceModels.length === 0) {
      loadHuggingFaceModels();
    }
    
    // Set default selected model for the tab
    const models = tab === 'finetuned' ? availableModels : huggingFaceModels;
    if (models.length > 0) {
      setSelectedModelId(models[0].id);
      if (models.length > 1) {
        setCompareModelId(models[1].id);
      }
    }
  };

  // Handle model selection change
  const handleModelSelection = (modelId: string) => {
    setSelectedModelId(modelId);
  };

  // Handle search for Hugging Face models
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      setSearchError(null);
      const results = await chatApi.searchHuggingFaceModels(searchQuery.trim());
      setSearchResults(results);
      
      // Update the current models list to show search results
      setHuggingFaceModels(results);
      
      // Set default selected model from search results
      if (results.length > 0) {
        setSelectedModelId(results[0].id);
        if (results.length > 1) {
          setCompareModelId(results[1].id);
        }
      } else {
        setSelectedModelId('');
        setCompareModelId('');
      }
    } catch (error: any) {
      console.error('Failed to search Hugging Face models:', error);
      setSearchError(error.message || 'Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
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
                console.log(validation, "data")
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

  // Convert file to base64 (same pattern as training module)
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Convert to base64 and remove data URL prefix
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleStartEvaluation = async () => {
    if (!selectedModel || !file) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Get model path - for HF models use the name directly, for local models use name
      const modelPath = activeTab === 'huggingface' 
        ? selectedModel.name  // Use HF model name directly
        : selectedModel.name; // Use local model name
      
      // Convert file to base64 (same as training module)
      const fileContent = await readFileContent(file);
      const fileType = evaluationService.getFileType(file.name);
      
      if (!fileType) {
        throw new Error('Unsupported file format');
      }
      
      // Start prediction job with base64 content (same pattern as training)
      const response = await evaluationService.startPredictionJobWithBase64(
        modelPath,
        fileContent,
        fileType,
        batchSize
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

  // Load available models on component mount
  useEffect(() => {
    loadModels();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Evaluate Model</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Select a model and upload test data to evaluate its performance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Models</CardTitle>
              <CardDescription>
                Choose which models to evaluate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  Fine-tuned Models
                </button>
                <button
                  onClick={() => handleTabChange('huggingface')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'huggingface'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  🤗 Hugging Face
                </button>
              </div>

              {/* Loading and Error States */}
              {(activeTab === 'finetuned' ? isLoadingModels : isLoadingHFModels) ? (
                <div className="flex items-center justify-center py-8">
                  <AnimatedLoader variant="brain" size="md" text={`Loading ${activeTab === 'finetuned' ? 'fine-tuned' : 'Hugging Face'} models...`} />
                </div>
              ) : (activeTab === 'finetuned' ? modelError : hfModelError) ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="flex items-center">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                    <span className="ml-2 text-sm text-red-600">{activeTab === 'finetuned' ? modelError : hfModelError}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={activeTab === 'finetuned' ? loadModels : loadHuggingFaceModels}
                    disabled={activeTab === 'finetuned' ? isLoadingModels : isLoadingHFModels}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  {/* Search Interface for Hugging Face Tab */}
                  {activeTab === 'huggingface' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        🔍 Search Models
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSearch();
                            }
                          }}
                          placeholder="Search for models (e.g., llama, microsoft, phi)..."
                          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          disabled={isSearching}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSearch}
                          disabled={isSearching || !searchQuery.trim()}
                          className="absolute right-1 top-1 h-6 w-6 p-0"
                        >
                          {isSearching ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowRight className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Search Error */}
                      {searchError && (
                        <div className="mt-2 flex items-center text-sm text-red-600">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          {searchError}
                        </div>
                      )}
                      
                      {/* Search Results Info */}
                      {searchResults.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Found {searchResults.length} verified models for "{searchQuery}"
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Primary Model
                    </label>
                    <select
                      value={selectedModelId}
                      onChange={(e) => handleModelSelection(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={currentModels.length === 0}
                    >
                      {currentModels.length === 0 ? (
                        <option value="">No models available</option>
                      ) : (
                        currentModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                            {activeTab === 'huggingface' && model.family && ` (${model.family})`}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </>
              )}
              
              <div className="flex items-center space-x-3 pt-1">
                <input
                  type="checkbox"
                  id="compareMode"
                  checked={showCompare}
                  onChange={() => setShowCompare(!showCompare)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="compareMode" className="text-sm">
                  Compare with base model
                </label>
              </div>

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
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Small</span>
                      <span>Large</span>
                    </div>
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
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t flex-col space-y-3 items-start">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p className="font-medium mb-1">Selected Model Info</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>Size: <span className="text-gray-700 dark:text-gray-300">{selectedModel?.size || 'N/A'}</span></div>
                  <div>Type: <span className="text-gray-700 dark:text-gray-300">{selectedModel?.isBase ? 'Base' : 'Fine-tuned'}</span></div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<DownloadCloud className="h-4 w-4" />}
                className="w-full"
                disabled
              >
                Download Model
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:col-span-3 h-full flex flex-col">
          <Card className="flex-1 flex flex-col h-full min-h-[600px]">
            <CardHeader className="border-b flex-shrink-0">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5 text-primary-500" />
                <div>
                  <CardTitle>Model Evaluation</CardTitle>
                  <CardDescription>
                    Upload test data to evaluate your selected model
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
                    <li>• Ensure consistent formatting with your training data</li>
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
                  disabled={!selectedModel || !file || isLoading || (validationResult && !validationResult.isValid)}
                  onClick={handleStartEvaluation}
                  isLoading={isLoading}
                  className="px-8"
                >
                  {isLoading ? 'Starting Evaluation...' : 'Start Evaluation'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
