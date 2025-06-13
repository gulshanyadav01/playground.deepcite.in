import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Upload, FileText, AlertTriangle, Check, Eye, Trash2, Download, RefreshCw, Search, Filter } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { useConfigureContext } from './ConfigureContext';
import { StepNavigation } from '../../components/ui/StepProgress';
import { fileService, FileMetadata } from '../../services/fileService';

interface FileWithPreview extends File {
  preview?: string;
}

export default function UploadData() {
  const navigate = useNavigate();
  const { state, dispatch, completeCurrentStep } = useConfigureContext();
  const { validationStatus, validationMessages = [] } = state;

  // File management state
  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  
  // Filter and search state
  const [filterBy, setFilterBy] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('upload_date');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Load existing files on component mount
  useEffect(() => {
    loadFiles();
  }, [filterBy, sortBy]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fileService.listFiles(filterBy || undefined, sortBy, true);
      setUploadedFiles(response.files);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
      console.error('Error loading files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      console.log('Starting file upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const next = prev + 10;
          return next >= 90 ? 90 : next;
        });
      }, 200);

      console.log('Calling fileService.uploadFile...');
      const response = await fileService.uploadFile(file);
      console.log('Upload response:', response);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.metadata) {
        console.log('Upload successful, metadata:', response.metadata);
        
        // Add the new file to the list
        setUploadedFiles(prev => [response.metadata!, ...prev]);
        
        // Auto-select the uploaded file if it's valid
        if (response.metadata.validation_status === 'valid') {
          setSelectedFileId(response.metadata.file_id);
          dispatch({ 
            type: 'SET_VALIDATION_STATUS', 
            payload: { 
              status: 'valid', 
              messages: [`File '${response.metadata.display_name}' uploaded and validated successfully`] 
            }
          });
        } else {
          dispatch({ 
            type: 'SET_VALIDATION_STATUS', 
            payload: { 
              status: 'invalid', 
              messages: response.metadata.validation_details.issues || ['File validation failed'] 
            }
          });
        }
      } else {
        console.error('Upload response indicates failure:', response);
        setError(response.message || 'Upload failed - no metadata returned');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      setError(err.message || 'Failed to upload file');
      dispatch({ 
        type: 'SET_VALIDATION_STATUS', 
        payload: { 
          status: 'invalid', 
          messages: [err.message || 'Upload failed'] 
        }
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const selectFile = (fileId: string) => {
    const file = uploadedFiles.find(f => f.file_id === fileId);
    if (file && file.validation_status === 'valid') {
      setSelectedFileId(fileId);
      dispatch({ 
        type: 'SET_VALIDATION_STATUS', 
        payload: { 
          status: 'valid', 
          messages: [`Selected file: ${file.display_name} (${file.validation_details.total_rows} rows)`] 
        }
      });
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      await fileService.deleteFile(fileId);
      setUploadedFiles(prev => prev.filter(f => f.file_id !== fileId));
      
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
        dispatch({ 
          type: 'SET_VALIDATION_STATUS', 
          payload: { status: 'idle', messages: [] }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete file');
    }
  };

  const previewFile = async (fileId: string) => {
    try {
      const response = await fileService.getFilePreview(fileId, 10);
      setPreviewData(response.preview_data);
      setPreviewFileId(fileId);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load file preview');
    }
  };

  const downloadFile = async (fileId: string) => {
    try {
      const blob = await fileService.downloadFile(fileId);
      const file = uploadedFiles.find(f => f.file_id === fileId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file?.original_filename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to download file');
    }
  };

  const revalidateFile = async (fileId: string) => {
    try {
      const response = await fileService.revalidateFile(fileId);
      // Update the file in the list
      setUploadedFiles(prev => prev.map(f => 
        f.file_id === fileId 
          ? { ...f, validation_status: response.validation_status as any, validation_details: response.validation_details }
          : f
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to revalidate file');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/json': ['.json'],
      // 'text/csv': ['.csv'],
      'multipart/form-data': ['.csv'],
      'application/jsonl': ['.jsonl'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: async (acceptedFiles, rejectedFiles) => {
      if (acceptedFiles.length > 0) {
        await uploadFile(acceptedFiles[0]);
      }
      
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
        setError(errorMessages.join(', '));
      }
    },
  });

  // Filter files based on search term
  const filteredFiles = (uploadedFiles || []).filter(file => 
    file.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle navigation
  const handlePrevious = () => {
    navigate('/configure/model');
  };

  const handleNext = () => {
    if (selectedFileId) {
      // Store the selected file ID in context for use in training
      dispatch({ type: 'SET_SELECTED_FILE_ID', payload: selectedFileId });
      completeCurrentStep();
      navigate('/configure/parameters');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Training Data</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Upload your training data files or select from previously uploaded files
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Existing Files Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Training Files ({uploadedFiles.length})</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadFiles}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
              <CardDescription>
                Select an existing file or upload a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">All Files</option>
                    <option value="valid">Valid Only</option>
                    <option value="invalid">Invalid Only</option>
                    <option value="json">JSON Files</option>
                    <option value="csv">CSV Files</option>
                    <option value="jsonl">JSONL Files</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="upload_date">Recent First</option>
                    <option value="name">Name</option>
                    <option value="usage_count">Most Used</option>
                    <option value="file_size">File Size</option>
                  </select>
                </div>
              </div>

              {/* Files Grid */}
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading files...</p>
                </div>
              ) : filteredFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredFiles.map((file) => (
                    <motion.div
                      key={file.file_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedFileId === file.file_id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => selectFile(file.file_id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="text-2xl">
                            {fileService.getFileTypeIcon(file.file_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {file.display_name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {file.original_filename}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>{fileService.formatFileSize(file.file_size)}</span>
                              <span>{file.validation_details.total_rows} rows</span>
                              <span className={fileService.getValidationStatusColor(file.validation_status)}>
                                {fileService.getValidationStatusIcon(file.validation_status)} {file.validation_status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              Uploaded {fileService.formatDate(file.upload_date)}
                            </p>
                            {file.usage_count > 0 && (
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Used {file.usage_count} time{file.usage_count !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              previewFile(file.file_id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file.file_id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {file.validation_status === 'invalid' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                revalidateFile(file.file_id);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file.file_id);
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No files found. Upload your first training file below.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload New File Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload New Training Data</CardTitle>
              <CardDescription>
                Upload JSON, CSV, or JSONL files containing instruction-response pairs
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
                      {isDragActive ? 'Drop the file here' : 'Drag & drop a file here or click to browse'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      JSON, CSV, or JSONL files, up to 50MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Uploading and validating...</span>
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

              {/* Data Format Guidelines */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  📋 Data Format Requirements
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p><strong>JSON:</strong> Array of objects with "instruction" and "output" fields</p>
                  <p><strong>CSV:</strong> Columns named "instruction" and "output"</p>
                  <p><strong>JSONL:</strong> One JSON object per line with instruction/output fields</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Validation Messages */}
          {validationMessages.length > 0 && (
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
                    {validationStatus === 'valid' ? 'File Selected' : 'Validation Issues'}
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

          {/* Navigation */}
          <StepNavigation
            currentStep={2}
            totalSteps={3}
            onPrevious={handlePrevious}
            onNext={handleNext}
            canProceed={!!selectedFileId}
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
                          Columns: instruction, output
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">L</span>
                      </span>
                      <div>
                        <p className="font-medium">JSONL Files</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          One JSON object per line
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

                {selectedFileId && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                      ✅ File Selected
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Ready to proceed with training configuration
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* File Preview Modal */}
      {showPreview && previewFileId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">File Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {previewData.length > 0 && Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {previewData.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value: any, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {typeof value === 'string' && value.length > 100 
                            ? value.substring(0, 100) + '...' 
                            : String(value)
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
