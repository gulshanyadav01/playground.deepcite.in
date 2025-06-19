import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import ColumnMappingInterface from '../../components/ui/ColumnMappingInterface';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  Download,
  BarChart3
} from 'lucide-react';
import { 
  fileService, 
  FileUploadResponse, 
  ColumnMapping, 
  ColumnInfo,
  TrainingExample,
  ProcessedFileResponse
} from '../../services/fileService';

interface UploadDataProps {
  onNext: (data: { fileId: string; mapping: ColumnMapping; processedData?: TrainingExample[] }) => void;
  onBack: () => void;
}

type UploadStep = 'upload' | 'mapping' | 'processing' | 'complete';

export const UploadData: React.FC<UploadDataProps> = ({ onNext, onBack }) => {
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [uploadedFile, setUploadedFile] = useState<FileUploadResponse | null>(null);
  const [columnInfo, setColumnInfo] = useState<Record<string, ColumnInfo>>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [savedMapping, setSavedMapping] = useState<ColumnMapping | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedFileResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (uploadedFile?.file_id && savedMapping) {
      onNext({
        fileId: uploadedFile.file_id,
        mapping: savedMapping,
        processedData: processedData?.processed_data
      });
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[
          { step: 'upload', label: 'Upload', icon: Upload },
          { step: 'mapping', label: 'Map Columns', icon: FileText },
          { step: 'processing', label: 'Process', icon: BarChart3 },
          { step: 'complete', label: 'Complete', icon: CheckCircle }
        ].map(({ step, label, icon: Icon }, index) => {
          const isActive = currentStep === step;
          const isCompleted = ['upload', 'mapping', 'processing', 'complete'].indexOf(currentStep) > index;
          
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
              {index < 3 && (
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
          onClick={onBack}
          disabled={isUploading || isProcessing}
        >
          Back
        </Button>
        
        {currentStep === 'complete' && (
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
