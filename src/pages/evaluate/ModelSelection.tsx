import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Progress } from '../../components/ui/Progress';
import { 
  CheckCircle, 
  Circle, 
  Settings, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  Key,
  Upload,
  FileText,
  Play,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { multiModelService, ModelInfo, ModelParameters, CostEstimation } from '../../services/multiModelService';

interface ModelSelectionProps {
  onStartEvaluation: (config: EvaluationConfig) => void;
}

interface EvaluationConfig {
  selectedModels: string[];
  localModelPath?: string;
  modelParameters: Record<string, ModelParameters>;
  testData?: any[];
  testFile?: File;
  batchSize: number;
  runLocalFirst: boolean;
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: string;
  onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, provider, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      await multiModelService.validateApiKey(provider, apiKey);
      await multiModelService.setApiKey(provider, apiKey);
      onSave(apiKey);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to validate API key');
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Set {provider} API Key</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={`Enter your ${provider} API key`}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isValidating}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isValidating || !apiKey.trim()}>
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Validating...
                </>
              ) : (
                'Save & Validate'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModelSelection: React.FC<ModelSelectionProps> = ({ onStartEvaluation }) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [localModelPath, setLocalModelPath] = useState<string>('');
  const [modelParameters, setModelParameters] = useState<Record<string, ModelParameters>>({});
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testData, setTestData] = useState<any[] | null>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [runLocalFirst, setRunLocalFirst] = useState(true);
  const [costEstimation, setCostEstimation] = useState<CostEstimation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyModal, setApiKeyModal] = useState<{ isOpen: boolean; provider: string }>({ isOpen: false, provider: '' });
  const [groupBy, setGroupBy] = useState<'provider' | 'none'>('provider');

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (selectedModels.size > 0 && (testData || testFile)) {
      estimateCost();
    }
  }, [selectedModels, testData, testFile]);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const response = await multiModelService.getAvailableModels();
      setModels(response.models);
    } catch (error: any) {
      setError(error.message || 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  const estimateCost = async () => {
    if (selectedModels.size === 0) {
      setCostEstimation(null);
      return;
    }

    try {
      const testDataSize = testData?.length || (testFile ? 100 : 0); // Estimate if file not parsed
      const selectedModelIds = Array.from(selectedModels);
      
      const estimation = await multiModelService.estimateCost(
        selectedModelIds,
        testDataSize,
        100, // Average input tokens
        50   // Average output tokens
      );
      
      setCostEstimation(estimation);
    } catch (error: any) {
      console.error('Failed to estimate cost:', error);
    }
  };

  const handleModelToggle = (modelId: string) => {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId);
      // Remove parameters for deselected model
      const newParams = { ...modelParameters };
      delete newParams[modelId];
      setModelParameters(newParams);
    } else {
      newSelected.add(modelId);
      // Add default parameters for selected model
      setModelParameters(prev => ({
        ...prev,
        [modelId]: {
          temperature: 0.7,
          max_tokens: 150,
          top_p: 1.0,
          frequency_penalty: 0.0,
          presence_penalty: 0.0
        }
      }));
    }
    setSelectedModels(newSelected);
  };

  const handleApiKeySetup = (provider: string) => {
    setApiKeyModal({ isOpen: true, provider });
  };

  const handleApiKeySaved = (apiKey: string) => {
    // Refresh models to update availability
    loadModels();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTestFile(file);
      // Parse file to get test data for cost estimation
      parseTestFile(file);
    }
  };

  const parseTestFile = async (file: File) => {
    try {
      const text = await file.text();
      let data: any[];

      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.jsonl')) {
        data = text.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
      } else if (file.name.endsWith('.csv')) {
        // Simple CSV parsing - in production, use a proper CSV parser
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        data = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',');
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header.trim()] = values[index]?.trim() || '';
          });
          return obj;
        });
      } else {
        throw new Error('Unsupported file format');
      }

      setTestData(data);
    } catch (error: any) {
      console.error('Failed to parse test file:', error);
      setTestData(null);
    }
  };

  const handleStartEvaluation = () => {
    if (selectedModels.size === 0) {
      setError('Please select at least one model');
      return;
    }

    if (!testFile && !testData) {
      setError('Please upload test data');
      return;
    }

    const config: EvaluationConfig = {
      selectedModels: Array.from(selectedModels),
      localModelPath: localModelPath || undefined,
      modelParameters,
      testData: testData || undefined,
      testFile: testFile || undefined,
      batchSize,
      runLocalFirst
    };

    onStartEvaluation(config);
  };

  const groupedModels = groupBy === 'provider' 
    ? models.reduce((acc, model) => {
        if (!acc[model.provider]) {
          acc[model.provider] = [];
        }
        acc[model.provider].push(model);
        return acc;
      }, {} as Record<string, ModelInfo[]>)
    : { 'All Models': models };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-gray-500">Loading available models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Multi-Model Evaluation</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Compare your fine-tuned model against external models like OpenAI, Claude, and more
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Test Data Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Test Data
              </CardTitle>
              <CardDescription>
                Upload your test data file (CSV, JSON, or JSONL format)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept=".csv,.json,.jsonl"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                </div>
                
                {testFile && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      {testFile.name} ({testData?.length || 'Unknown'} examples)
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Local Model */}
          <Card>
            <CardHeader>
              <CardTitle>Your Model (Optional)</CardTitle>
              <CardDescription>
                Specify the path to your fine-tuned model to include in the comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  type="text"
                  value={localModelPath}
                  onChange={(e) => setLocalModelPath(e.target.value)}
                  placeholder="e.g., ./results/my-model or local:./lora_model"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="runLocalFirst"
                    checked={runLocalFirst}
                    onChange={(e) => setRunLocalFirst(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="runLocalFirst" className="text-sm text-gray-700 dark:text-gray-300">
                    Run your model first (recommended)
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* External Models */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>External Models</CardTitle>
                  <CardDescription>
                    Select external models to compare against ({selectedModels.size} selected)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as 'provider' | 'none')}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                  >
                    <option value="provider">Group by Provider</option>
                    <option value="none">Show All</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(groupedModels).map(([groupName, groupModels]) => (
                  <div key={groupName}>
                    {groupBy === 'provider' && (
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 capitalize">
                        {groupName}
                      </h4>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupModels.map((model) => (
                        <motion.div
                          key={model.id}
                          layout
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedModels.has(model.id)
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          } ${!model.is_available ? 'opacity-50' : ''}`}
                          onClick={() => model.is_available && handleModelToggle(model.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {selectedModels.has(model.id) ? (
                                <CheckCircle className="h-5 w-5 text-primary-600 mt-0.5" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400 mt-0.5" />
                              )}
                              
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                  {model.name}
                                </h5>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {model.description}
                                </p>
                                
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {model.provider}
                                  </Badge>
                                  {model.cost_per_1k_tokens > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      ${model.cost_per_1k_tokens}/1K tokens
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {!model.is_available && model.requires_api_key && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApiKeySetup(model.provider);
                                }}
                                className="ml-2"
                              >
                                <Key className="h-3 w-3 mr-1" />
                                Setup
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration & Summary */}
        <div className="space-y-6">
          {/* Evaluation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Batch Size</label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of examples to process at once
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Estimation */}
          {costEstimation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Estimation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Cost:</span>
                    <span className="font-semibold">${costEstimation.total_cost.toFixed(4)}</span>
                  </div>
                  
                  {Object.entries(costEstimation.model_costs).map(([modelId, cost]) => (
                    <div key={modelId} className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 truncate">{modelId}:</span>
                      <span>${cost.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Selected Models:</span>
                  <span className="font-medium">{selectedModels.size}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Test Examples:</span>
                  <span className="font-medium">{testData?.length || (testFile ? 'File uploaded' : 'None')}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Local Model:</span>
                  <span className="font-medium">{localModelPath ? 'Included' : 'Not included'}</span>
                </div>
                
                {costEstimation && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost:</span>
                    <span className="font-medium">${costEstimation.total_cost.toFixed(4)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Start Evaluation */}
          <Button
            onClick={handleStartEvaluation}
            disabled={selectedModels.size === 0 || (!testFile && !testData)}
            className="w-full"
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Evaluation
          </Button>
        </div>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModal.isOpen}
        onClose={() => setApiKeyModal({ isOpen: false, provider: '' })}
        provider={apiKeyModal.provider}
        onSave={handleApiKeySaved}
      />
    </div>
  );
};

export default ModelSelection;
