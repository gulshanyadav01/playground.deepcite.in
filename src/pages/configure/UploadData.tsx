import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Upload, FileText, AlertTriangle, Check } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { useConfigureContext } from './ConfigureContext';
import { StepNavigation } from '../../components/ui/StepProgress';

interface FileWithPreview extends File {
  preview?: string;
}

export default function UploadData() {
  const navigate = useNavigate();
  const { state, dispatch, completeCurrentStep } = useConfigureContext();
  const { files, validationStatus, validationMessages } = state;

  const [uploadProgress, setUploadProgress] = useState(0);

  // Data upload functions
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

  const storeFile = async (file: File) => {
    try {
      const content = await readFileContent(file);
      
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        content // This is now base64 encoded
      };
      
      localStorage.setItem('trainingFile', JSON.stringify(fileData));
      dispatch({ type: 'SET_SELECTED_FILE', payload: file });
    } catch (error) {
      console.error('Error reading file:', error);
      dispatch({ 
        type: 'SET_VALIDATION_STATUS', 
        payload: { 
          status: 'invalid', 
          messages: ['Error reading file. Please try again.'] 
        }
      });
    }
  };

  const removeFile = (name: string) => {
    const updatedFiles = files.filter(file => file.name !== name);
    dispatch({ type: 'SET_FILES', payload: updatedFiles });
    
    if (state.selectedFile?.name === name) {
      dispatch({ type: 'SET_SELECTED_FILE', payload: null });
      localStorage.removeItem('trainingFile');
    }
    
    // Reset validation if all files are removed
    if (updatedFiles.length === 0) {
      dispatch({ 
        type: 'SET_VALIDATION_STATUS', 
        payload: { status: 'idle', messages: [] }
      });
    }
  };

  const simulateUpload = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const nextProgress = prev + 5;
        if (nextProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        return nextProgress;
      });
    }, 100);
    
    return () => clearInterval(interval);
  };

  const validateFiles = () => {
    if (files.length === 0) {
      dispatch({ 
        type: 'SET_VALIDATION_STATUS', 
        payload: { 
          status: 'invalid', 
          messages: ['Please upload at least one file'] 
        }
      });
      return;
    }

    dispatch({ 
      type: 'SET_VALIDATION_STATUS', 
      payload: { status: 'validating', messages: [] }
    });
    
    // Simulate validation process
    simulateUpload();
    
    setTimeout(() => {
      // For demo purposes, let's say JSON files are valid, others need warnings
      const hasNonJsonFiles = files.some(file => !file.name.endsWith('.json'));
      
      if (hasNonJsonFiles) {
        dispatch({ 
          type: 'SET_VALIDATION_STATUS', 
          payload: {
            status: 'invalid',
            messages: [
              'Some files may need reformatting to match the required instruction → response format',
              'CSV files should have "instruction" and "response" columns',
              'Text files should have instruction/response pairs separated by delimiters'
            ]
          }
        });
      } else {
        dispatch({ 
          type: 'SET_VALIDATION_STATUS', 
          payload: {
            status: 'valid',
            messages: ['All files validated successfully']
          }
        });
      }
    }, 2000);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
    },
    maxFiles: 5,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: async (acceptedFiles, rejectedFiles) => {
      const updatedFiles = [...files, ...acceptedFiles];
      dispatch({ type: 'SET_FILES', payload: updatedFiles });

      // Store the first accepted file
      if (acceptedFiles.length > 0) {
        await storeFile(acceptedFiles[0]);
      }

      // Reset validation state
      dispatch({ 
        type: 'SET_VALIDATION_STATUS', 
        payload: { status: 'idle', messages: [] }
      });
      
      if (rejectedFiles.length > 0) {
        const errorMessages = rejectedFiles.map(file => {
          if (file.errors[0].code === 'file-too-large') {
            return `${file.file.name} is too large (max 50MB)`;
          }
          if (file.errors[0].code === 'file-invalid-type') {
            return `${file.file.name} has an unsupported file type`;
          }
          return `${file.file.name} could not be uploaded`;
        });
        dispatch({ 
          type: 'SET_VALIDATION_STATUS', 
          payload: { status: 'invalid', messages: errorMessages }
        });
      }
    },
  });

  // Handle navigation
  const handlePrevious = () => {
    navigate('/configure/model');
  };

  const handleNext = () => {
    if (validationStatus === 'valid') {
      completeCurrentStep();
      navigate('/configure/parameters');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Training Data</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Upload your training data files for fine-tuning
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Data Upload</CardTitle>
              <CardDescription>
                We support JSON, CSV, and text files containing instruction-response pairs for fine-tuning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' 
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-primary-100 dark:bg-primary-900/20">
                <Upload className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isDragActive ? 'Drop the files here' : 'Drag & drop files here or click to browse'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  JSON, CSV, or TXT files, up to 50MB each (max 5 files)
                </p>
              </div>
            </div>
          </div>

          {/* Data Format Guidelines */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              📋 Data Format Requirements
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p><strong>JSON:</strong> Array of objects with "instruction" and "response" fields</p>
              <p><strong>CSV:</strong> Columns named "instruction" and "response"</p>
              <p><strong>TXT:</strong> Instruction and response pairs separated by delimiters</p>
            </div>
          </div>

          {/* Uploaded Files List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Uploaded Files ({files.length})</h4>
              <div className="space-y-3">
                {files.map((file) => (
                  <motion.div 
                    key={file.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024).toFixed(2)} KB • {file.type || 'Unknown type'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.name)}
                      className="text-gray-500 hover:text-red-500 transition-colors p-1"
                      aria-label="Remove file"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Progress */}
          {validationStatus === 'validating' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Validating files...</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300 ease-in-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Validation Messages */}
          {validationMessages.length > 0 && validationStatus !== 'validating' && (
            <div className={`p-4 rounded-lg ${
              validationStatus === 'valid' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {validationStatus === 'valid' ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium">
                    {validationStatus === 'valid' ? 'Validation Successful' : 'Validation Warnings'}
                  </h3>
                  <div className="mt-2 text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      {validationMessages.map((message, index) => (
                        <li key={index}>{message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Validate Button */}
          <div className="flex justify-center">
            <Button
              variant="primary"
              onClick={validateFiles}
              disabled={files.length === 0 || validationStatus === 'validating'}
              isLoading={validationStatus === 'validating'}
              className="px-8"
            >
              {validationStatus === 'validating' ? 'Validating...' : 'Validate Files'}
            </Button>
          </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <StepNavigation
            currentStep={2}
            totalSteps={3}
            onPrevious={handlePrevious}
            onNext={handleNext}
            canProceed={validationStatus === 'valid'}
            nextLabel="Next: Configure Training"
          />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Data Upload Guide</CardTitle>
              <CardDescription>
                Tips for preparing your training data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Supported Formats</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">J</span>
                      </span>
                      <div>
                        <p className="font-medium">JSON Files</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Array of instruction-response objects
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">C</span>
                      </span>
                      <div>
                        <p className="font-medium">CSV Files</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Columns: instruction, response
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">T</span>
                      </span>
                      <div>
                        <p className="font-medium">Text Files</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Delimited instruction-response pairs
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    📋 Best Practices
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 pl-4 list-disc">
                    <li>Use diverse, high-quality examples</li>
                    <li>Aim for 100+ training examples</li>
                    <li>Keep instructions clear and specific</li>
                    <li>Ensure consistent formatting</li>
                  </ul>
                </div>

                {files.length > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                      📁 Uploaded Files
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {files.length} file{files.length > 1 ? 's' : ''} uploaded
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Total size: {(files.reduce((total, file) => total + file.size, 0) / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}

                {validationStatus === 'valid' && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                      ✅ Validation Passed
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Your data is ready for training
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
