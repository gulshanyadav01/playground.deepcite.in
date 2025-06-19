import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import ColumnMappingInterface from '../../components/ui/ColumnMappingInterface';
import { useConfigureContext } from './ConfigureContext';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  Download,
  BarChart3,
  Database,
  Search,
  Eye,
  Calendar,
  Tag,
  Plus
} from 'lucide-react';
import { 
  fileService, 
  FileUploadResponse, 
  ColumnMapping, 
  ColumnInfo,
  TrainingExample,
  ProcessedFileResponse
} from '../../services/fileService';
import { 
  datasetService, 
  ProcessedDataset
} from '../../services/datasetService';

type UploadStep = 'select-source' | 'upload' | 'mapping' | 'processing' | 'complete' | 'dataset-selected';
type DataSource = 'upload' | 'dataset';

export const UploadData: React.FC = () => {
  const { state, dispatch, completeCurrentStep } = useConfigureContext();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<UploadStep>('select-source');
  const [dataSource, setDataSource] = useState<DataSource>('upload');
  const [uploadedFile, setUploadedFile] = useState<FileUploadResponse | null>(null);
  const [columnInfo, setColumnInfo] = useState<Record<string, ColumnInfo>>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [savedMapping, setSavedMapping] = useState<ColumnMapping | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedFileResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dataset selection state
  const [datasets, setDatasets] = useState<ProcessedDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<ProcessedDataset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);

  useEffect(() => {
    if (dataSource === 'dataset') {
      loadDatasets();
    }
  }, [dataSource]);

  const loadDatasets = async () => {
    try {
      setIsLoadingDatasets(true);
      setError(null);
      
      const result = await datasetService.listDatasets('created_at', true);
      setDatasets(result.datasets);
    } catch (err: any) {
      setError(err.message || 'Failed to load datasets');
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      
      const result = await fileService.uploadFile(file, file.name);
      
      if (result.success && result.file_id) {
        setUploadedFile(result);
        
        // Get column information
        const columnInfoResult = await fileService.getColumnInfo(result.file_id);
        setColumnInfo(columnInfoResult.column_info);
        setAvailableColumns(columnInfoResult.available_columns);
        
        setCurrentStep('mapping');
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDatasetSelect = (dataset: ProcessedDataset) => {
    setSelectedDataset(dataset);
    setCurrentStep('dataset-selected');
  };

  const handleMappingComplete = async (mapping: ColumnMapping) => {
    try {
      setSavedMapping(mapping);
      setCurrentStep('processing');
      setIsProcessing(true);
      setError(null);
      
      if (!uploadedFile?.file_id) {
        throw new Error('No file uploaded');
      }
      
      // Process the complete file
      const result = await fileService.processCompleteFile(uploadedFile.file_id, mapping);
      setProcessedData(result);
      setCurrentStep('complete');
      
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
      setCurrentStep('mapping');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadData = () => {
    if (processedData) {
      fileService.downloadTrainingData(
        processedData.processed_data,
        `${uploadedFile?.metadata?.display_name || 'training_data'}.json`
      );
    }
  };

  const handleDownloadStats = () => {
    if (processedData) {
      fileService.downloadProcessingStats(
        processedData.processing_stats,
        `${uploadedFile?.metadata?.display_name || 'processing'}_stats.json`
      );
    }
  };

  const handleContinue = () => {
    if (dataSource === 'upload' && uploadedFile?.file_id && savedMapping) {
      // Update context with file information
      dispatch({ type: 'SET_SELECTED_FILE_ID', payload: uploadedFile.file_id });
      completeCurrentStep();
      navigate('/configure/parameters');
    } else if (dataSource === 'dataset' && selectedDataset) {
      // Update context with dataset information
      dispatch({ type: 'SET_SELECTED_FILE_ID', payload: selectedDataset.dataset_id });
      completeCurrentStep();
      navigate('/configure/parameters');
    }
  };

  const handleBack = () => {
    navigate('/configure/model');
  };

  const filteredDatasets = datasets.filter(dataset => {
    const matchesSearch = dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dataset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dataset.source_filename.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const DataSourceSelectionStep = () => {
    const handleUploadClick = () => {
      console.log('Upload card clicked');
      setDataSource('upload');
    };

    const handleDatasetClick = () => {
      console.log('Dataset card clicked');
      setDataSource('dataset');
    };

    const handleContinueClick = () => {
      console.log('Continue button clicked, dataSource:', dataSource);
      if (dataSource === 'upload') {
        setCurrentStep('upload');
      } else {
        setCurrentStep('dataset-selected');
      }
    };

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Choose Data Source
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Select how you want to provide training data for your model
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload New File Option */}
          <div 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 rounded-lg p-6 ${
              dataSource === 'upload' 
                ? 'border-blue-500 bg-blue-50 shadow-lg' 
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={handleUploadClick}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload New File</h3>
              {dataSource === 'upload' && (
                <CheckCircle className="h-5 w-5 text-blue-600 mx-auto mb-2" />
              )}
              <p className="text-gray-600 mb-4">
                Upload a CSV, JSON, or JSONL file and configure column mapping
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Full control over column mapping</li>
                <li>• Support for custom data formats</li>
                <li>• Real-time data validation</li>
              </ul>
            </div>
          </div>

          {/* Select from Dataset Library Option */}
          <div 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 rounded-lg p-6 ${
              dataSource === 'dataset' 
                ? 'border-green-500 bg-green-50 shadow-lg' 
                : 'border-gray-200 hover:border-green-300'
            }`}
            onClick={handleDatasetClick}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Select from Dataset Library</h3>
              {dataSource === 'dataset' && (
                <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-2" />
              )}
              <p className="text-gray-600 mb-4">
                Choose from your previously prepared and validated datasets
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Pre-validated and ready to use</li>
                <li>• Consistent data formatting</li>
                <li>• Faster training setup</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <div className="text-sm text-gray-600">
            Selected: <span className="font-medium text-blue-600">
              {dataSource === 'upload' ? 'Upload New File' : 'Dataset Library'}
            </span>
          </div>
          <Button onClick={handleContinueClick} className="flex items-center">
            Continue with {dataSource === 'upload' ? 'File Upload' : 'Dataset Selection'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

  const DatasetSelectionStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Select Dataset
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Choose a prepared dataset from your library
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('select-source')}
          className="flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload New File Instead
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </CardContent>
      </Card>

      {/* Datasets Grid */}
      {isLoadingDatasets ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading datasets...</span>
        </div>
      ) : filteredDatasets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No datasets found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Create your first dataset in the Data Preparation tab'
              }
            </p>
            <Button
              onClick={() => setCurrentStep('select-source')}
              className="flex items-center mx-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDatasets.map(dataset => (
            <Card 
              key={dataset.dataset_id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedDataset?.dataset_id === dataset.dataset_id 
                  ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : ''
              }`}
              onClick={() => handleDatasetSelect(dataset)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{dataset.name}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {dataset.description || 'No description'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Add preview functionality
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {dataset.total_examples.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Examples</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {dataset.processing_stats.success_rate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Success Rate</div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Source:</span>
                    <span className="font-medium truncate ml-2">{dataset.source_filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <span className="font-medium">{datasetService.formatRelativeTime(dataset.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Usage:</span>
                    <span className={`font-medium ${datasetService.getDatasetStatusColor(dataset)}`}>
                      {dataset.usage_count} times
                    </span>
                  </div>
                </div>
                
                {dataset.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {dataset.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {dataset.tags.length > 2 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{dataset.tags.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedDataset && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800 dark:text-green-200">
              <CheckCircle className="h-5 w-5 mr-2" />
              Dataset Selected: {selectedDataset.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-green-700 dark:text-green-300">Training Examples:</span>
                <div className="text-lg font-bold text-green-800 dark:text-green-200">
                  {selectedDataset.total_examples.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-sm text-green-700 dark:text-green-300">Success Rate:</span>
                <div className="text-lg font-bold text-green-800 dark:text-green-200">
                  {selectedDataset.processing_stats.success_rate.toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-sm text-green-700 dark:text-green-300">File Size:</span>
                <div className="text-lg font-bold text-green-800 dark:text-green-200">
                  {datasetService.formatFileSize(selectedDataset.file_size)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const FileUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          Upload Training Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Upload your CSV, JSON, or JSONL file containing training data
          </p>
          
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
              id="file-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer flex flex-col items-center ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isUploading ? 'Uploading...' : 'Choose file to upload'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Supports CSV, JSON, and JSONL files
              </span>
            </label>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Supported File Formats:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <strong>CSV:</strong> Comma-separated values with column headers</li>
            <li>• <strong>JSON:</strong> Array of objects or single object</li>
            <li>• <strong>JSONL:</strong> JSON Lines format (one JSON object per line)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  const ProcessingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Processing File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Processing your data...
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Applying column mapping and generating training examples
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const CompletionStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            Processing Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {processedData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {processedData.total_examples.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-200">
                    Training Examples
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {processedData.processing_stats.success_rate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    Success Rate
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {processedData.processing_stats.output_types.json_outputs > 0 ? 'Mixed' : 'Text'}
                  </div>
                  <div className="text-sm text-purple-800 dark:text-purple-200">
                    Output Format
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Processing Statistics:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Input Rows:</span>
                    <span className="ml-2 font-medium">
                      {processedData.processing_stats.total_input_rows.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Valid Outputs:</span>
                    <span className="ml-2 font-medium">
                      {processedData.processing_stats.valid_output_rows.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Skipped Rows:</span>
                    <span className="ml-2 font-medium">
                      {processedData.processing_stats.skipped_rows.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Avg Instruction Length:</span>
                    <span className="ml-2 font-medium">
                      {Math.round(processedData.processing_stats.instruction_stats.avg_length)} chars
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleDownloadData}
                  className="flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Training Data
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleDownloadStats}
                  className="flex items-center"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Download Statistics
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sample Data Preview */}
      {processedData && processedData.processed_data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Training Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processedData.processed_data.slice(0, 3).map((example, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400 mb-2">
                        Instruction:
                      </h4>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm">
                        {example.instruction}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-green-600 dark:text-green-400 mb-2">
                        Input:
                      </h4>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm">
                        {typeof example.input === 'string' 
                          ? example.input || '(empty)'
                          : JSON.stringify(example.input, null, 2)
                        }
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-orange-600 dark:text-orange-400 mb-2">
                        Output:
                      </h4>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded text-sm">
                        {typeof example.output === 'string' 
                          ? example.output
                          : JSON.stringify(example.output, null, 2)
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const getProgressSteps = () => {
    if (dataSource === 'dataset') {
      return [
        { step: 'select-source', label: 'Source', icon: Database },
        { step: 'dataset-selected', label: 'Select Dataset', icon: CheckCircle }
      ];
    } else {
      return [
        { step: 'select-source', label: 'Source', icon: Upload },
        { step: 'upload', label: 'Upload', icon: Upload },
        { step: 'mapping', label: 'Map Columns', icon: FileText },
        { step: 'processing', label: 'Process', icon: BarChart3 },
        { step: 'complete', label: 'Complete', icon: CheckCircle }
      ];
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {getProgressSteps().map(({ step, label, icon: Icon }, index) => {
          const steps = getProgressSteps();
          const currentIndex = steps.findIndex(s => s.step === currentStep);
          const isActive = currentStep === step;
          const isCompleted = currentIndex > index;
          
          return (
            <React.Fragment key={step}>
              <div className={`flex items-center space-x-2 ${
                isActive ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-primary-100 dark:bg-primary-900/20' : 
                  isCompleted ? 'bg-green-100 dark:bg-green-900/20' : 
                  'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className={`h-4 w-4 ${
                  isCompleted ? 'text-green-600' : 'text-gray-400'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {currentStep === 'select-source' && <DataSourceSelectionStep />}
        {currentStep === 'dataset-selected' && <DatasetSelectionStep />}
        {currentStep === 'upload' && <FileUploadStep />}
        
        {currentStep === 'mapping' && uploadedFile && (
          <ColumnMappingInterface
            fileId={uploadedFile.file_id!}
            availableColumns={availableColumns}
            columnInfo={columnInfo}
            onMappingComplete={handleMappingComplete}
            onCancel={() => setCurrentStep('upload')}
          />
        )}
        
        {currentStep === 'processing' && <ProcessingStep />}
        {currentStep === 'complete' && <CompletionStep />}
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleBack}
          disabled={isUploading || isProcessing}
        >
          Back
        </Button>
        
        {(currentStep === 'complete' || (currentStep === 'dataset-selected' && selectedDataset)) && (
          <Button 
            onClick={handleContinue}
            className="flex items-center"
          >
            Continue to Training
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default UploadData;
