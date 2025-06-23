import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { 
  Upload, 
  Database, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  FileText,
  Target,
  Settings,
  ChevronDown,
  ChevronUp,
  Play,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { 
  fileService, 
  FileUploadResponse, 
  ColumnMapping, 
  ColumnInfo,
  TrainingExample
} from '../services/fileService';
import { predictionService } from '../services/predictionService';

type PredictionMode = 'upload' | 'mapping' | 'predict' | 'results';

interface ModelInfo {
  model_id: string;
  name: string;
  description: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  created_at: string;
  accuracy?: number;
  status: 'ready' | 'loading' | 'error';
}

interface PredictionJob {
  job_id: string;
  model_id: string;
  file_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  total_rows: number;
  processed_rows: number;
  results?: PredictionResult[];
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

interface PredictionResult {
  row_index: number;
  input_data: Record<string, any>;
  prediction: any;
  confidence?: number;
  processing_time_ms?: number;
}

interface PredictionMapping {
  input_columns: Record<string, string>; // maps model input fields to file columns
  preprocessing_options: {
    normalize_text: boolean;
    handle_missing_values: 'skip' | 'default' | 'error';
    default_values: Record<string, any>;
  };
}

export const Prediction: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<PredictionMode>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<FileUploadResponse | null>(null);
  const [columnInfo, setColumnInfo] = useState<Record<string, ColumnInfo>>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  
  // Model selection state
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  
  // Mapping state
  const [predictionMapping, setPredictionMapping] = useState<PredictionMapping>({
    input_columns: {},
    preprocessing_options: {
      normalize_text: true,
      handle_missing_values: 'default',
      default_values: {}
    }
  });
  
  // Prediction state
  const [currentJob, setCurrentJob] = useState<PredictionJob | null>(null);
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);

  useEffect(() => {
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    try {
      setIsLoading(true);
      const models = await predictionService.getAvailableModels();
      setAvailableModels(models);
    } catch (err: any) {
      setError(err.message || 'Failed to load available models');
      // Set empty array on error so UI shows "No Models Available"
      setAvailableModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await fileService.uploadFile(file, file.name);
      
      if (result.success && result.file_id) {
        setUploadedFile(result);
        
        // Get column information
        const columnInfoResult = await fileService.getColumnInfo(result.file_id);
        setColumnInfo(columnInfoResult.column_info);
        setAvailableColumns(columnInfoResult.available_columns);
        
        setCurrentMode('mapping');
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelSelect = (model: ModelInfo) => {
    setSelectedModel(model);
    // Reset mapping when model changes
    setPredictionMapping({
      input_columns: {},
      preprocessing_options: {
        normalize_text: true,
        handle_missing_values: 'default',
        default_values: {}
      }
    });
  };

  const handleColumnMapping = (modelField: string, fileColumn: string) => {
    setPredictionMapping(prev => ({
      ...prev,
      input_columns: {
        ...prev.input_columns,
        [modelField]: fileColumn
      }
    }));
  };

  const handleStartPrediction = async () => {
    if (!uploadedFile || !selectedModel) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const job = await predictionService.startPrediction({
        file_id: uploadedFile.file_id!,
        model_id: selectedModel.model_id,
        mapping: predictionMapping
      });
      
      setCurrentJob(job);
      setCurrentMode('predict');
      
      // Start polling for progress
      pollPredictionProgress(job.job_id);
      
    } catch (err: any) {
      setError(err.message || 'Failed to start prediction');
    } finally {
      setIsLoading(false);
    }
  };

  const pollPredictionProgress = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const updatedJob = await predictionService.getPredictionStatus(jobId);
        setCurrentJob(updatedJob);
        
        if (updatedJob.status === 'completed') {
          // Load results
          const results = await predictionService.getPredictionResults(jobId);
          setPredictionResults(results.results);
          setCurrentMode('results');
          clearInterval(interval);
        } else if (updatedJob.status === 'failed') {
          setError(updatedJob.error_message || 'Prediction failed');
          clearInterval(interval);
        }
      } catch (err: any) {
        console.error('Error polling prediction progress:', err);
        // Continue polling unless it's a critical error
      }
    }, 2000); // Poll every 2 seconds
    
    // Clean up interval after 10 minutes to prevent infinite polling
    setTimeout(() => {
      clearInterval(interval);
    }, 10 * 60 * 1000);
  };

  const simulatePredictionProgress = (job: PredictionJob) => {
    const interval = setInterval(() => {
      setCurrentJob(prev => {
        if (!prev || prev.status === 'completed') {
          clearInterval(interval);
          return prev;
        }
        
        const newProcessed = Math.min(prev.processed_rows + 10, prev.total_rows);
        const newProgress = (newProcessed / prev.total_rows) * 100;
        
        if (newProcessed >= prev.total_rows) {
          // Generate mock results
          const mockResults: PredictionResult[] = Array.from({ length: 5 }, (_, i) => ({
            row_index: i,
            input_data: {
              message: `Sample message ${i + 1}`,
              customer_type: 'premium'
            },
            prediction: {
              category: ['billing', 'technical', 'general'][i % 3],
              confidence: 0.85 + Math.random() * 0.1
            },
            confidence: 0.85 + Math.random() * 0.1,
            processing_time_ms: 50 + Math.random() * 100
          }));
          
          setPredictionResults(mockResults);
          setCurrentMode('results');
          clearInterval(interval);
          
          return {
            ...prev,
            status: 'completed',
            progress: 100,
            processed_rows: prev.total_rows,
            results: mockResults,
            completed_at: new Date().toISOString()
          };
        }
        
        return {
          ...prev,
          progress: newProgress,
          processed_rows: newProcessed
        };
      });
    }, 500);
  };

  const canProceedToMapping = uploadedFile && selectedModel;
  const canStartPrediction = canProceedToMapping && 
    Object.keys(predictionMapping.input_columns).length > 0 &&
    Object.keys(selectedModel?.input_schema || {}).every(field => 
      predictionMapping.input_columns[field]
    );

  const UploadView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Upload Data for Prediction
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upload your data file and select a model to generate predictions
        </p>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Select Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableModels.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Models Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You need to train a model first before making predictions
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableModels.map((model) => (
                <div
                  key={model.model_id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedModel?.model_id === model.model_id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleModelSelect(model)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{model.name}</h4>
                    {model.accuracy && (
                      <span className="text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        {(model.accuracy * 100).toFixed(1)}% acc
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {model.description}
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>Input: {Object.keys(model.input_schema).join(', ')}</div>
                    <div>Output: {Object.keys(model.output_schema).join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload Data File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
              <input
                type="file"
                accept=".csv,.json,.jsonl"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                className="hidden"
                id="prediction-file-upload"
                disabled={isLoading || !selectedModel}
              />
              <label
                htmlFor="prediction-file-upload"
                className={`cursor-pointer flex flex-col items-center ${
                  isLoading || !selectedModel ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {isLoading ? 'Uploading...' : 'Choose file to upload'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {!selectedModel ? 'Select a model first' : 'Supports CSV, JSON, and JSONL files'}
                </span>
              </label>
            </div>
          </div>

          {uploadedFile && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-700 dark:text-green-300">
                  File uploaded successfully: {uploadedFile.metadata?.original_filename}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {canProceedToMapping && (
        <div className="flex justify-end">
          <Button onClick={() => setCurrentMode('mapping')}>
            Next: Map Columns
          </Button>
        </div>
      )}
    </div>
  );

  const MappingView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Map Data Columns
        </h2>
        <Button variant="outline" onClick={() => setCurrentMode('upload')}>
          Back to Upload
        </Button>
      </div>

      {selectedModel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Column Mapping for {selectedModel.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Model Input Requirements:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(selectedModel.input_schema).map(([field, type]) => (
                  <div key={field} className="text-sm">
                    <span className="font-medium">{field}</span>
                    <span className="text-blue-600 dark:text-blue-400 ml-2">({type as string})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(selectedModel.input_schema).map(([field, type]) => (
                <div key={field} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium">
                      Map "{field}" ({type as string})
                    </label>
                    <span className={`text-sm px-2 py-1 rounded ${
                      predictionMapping.input_columns[field] 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {predictionMapping.input_columns[field] ? 'Mapped' : 'Required'}
                    </span>
                  </div>
                  <select
                    value={predictionMapping.input_columns[field] || ''}
                    onChange={(e) => handleColumnMapping(field, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select a column...</option>
                    {availableColumns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                        {columnInfo[column] && ` (${columnInfo[column].data_type})`}
                      </option>
                    ))}
                  </select>
                  {columnInfo[predictionMapping.input_columns[field]] && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Sample values: {columnInfo[predictionMapping.input_columns[field]].sample_values.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canStartPrediction && (
        <div className="flex justify-end">
          <Button onClick={handleStartPrediction}>
            <Play className="h-4 w-4 mr-2" />
            Start Prediction
          </Button>
        </div>
      )}
    </div>
  );

  const PredictView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Generating Predictions
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we process your data...
        </p>
      </div>

      {currentJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Prediction Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Processing {currentJob.processed_rows} of {currentJob.total_rows} rows
              </span>
              <span className="text-sm font-medium">
                {currentJob.progress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentJob.progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Status: {currentJob.status}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const ResultsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Prediction Results
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentMode('upload')}>
            New Prediction
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      {currentJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              Prediction Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {currentJob.total_rows}
                </div>
                <div className="text-sm text-green-800 dark:text-green-200">
                  Rows Processed
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {selectedModel?.name}
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  Model Used
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {currentJob.completed_at && currentJob.created_at ? 
                    Math.round((new Date(currentJob.completed_at).getTime() - new Date(currentJob.created_at).getTime()) / 1000) : 0}s
                </div>
                <div className="text-sm text-purple-800 dark:text-purple-200">
                  Processing Time
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Sample Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {predictionResults.slice(0, 10).map((result, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Input Data:
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
                      {JSON.stringify(result.input_data, null, 2)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Prediction:
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm">
                      {JSON.stringify(result.prediction, null, 2)}
                    </div>
                    {result.confidence && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Confidence: {(result.confidence * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentMode === 'upload' && <UploadView />}
          {currentMode === 'mapping' && <MappingView />}
          {currentMode === 'predict' && <PredictView />}
          {currentMode === 'results' && <ResultsView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Prediction;
