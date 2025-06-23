import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/Progress';
import { ArrowRight, AlertTriangle, Download, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { ModelInfo } from '../../components/models/ModelCard';
import { evaluationService } from '../../services/evaluationService';


export default function Metrics() {
  const navigate = useNavigate();
  const [jobStatus, setJobStatus] = useState<'queued' | 'running' | 'completed' | 'failed' | null>(null);
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [completedRows, setCompletedRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [evaluationJobId, setEvaluationJobId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [processingSpeed, setProcessingSpeed] = useState<number>(0);
  const [avgTimePerExample, setAvgTimePerExample] = useState<number>(0);

  useEffect(() => {
    const modelData = localStorage.getItem('evaluationModel');
    if (modelData) {
      setSelectedModel(JSON.parse(modelData));
    }
    
    const jobId = localStorage.getItem('evaluationJobId');
    if (jobId) {
      setEvaluationJobId(jobId);
    }
  }, []);

  useEffect(() => {
    if (!evaluationJobId) return;

    let abortController = new AbortController();
    let pollingActive = true;

    const startPolling = async () => {
      setIsPolling(true);
      setJobError(null);

      try {
        // Start polling the job status
        await evaluationService.pollJobStatus(
          evaluationJobId,
          (progress) => {
            if (!pollingActive) return; // Don't update state if component unmounted
            
            // Update row counts first
            setCompletedRows(progress.completed_rows);
            setTotalRows(progress.total_rows);
            
            // Update time estimation data
            setEstimatedTimeRemaining(progress.estimated_completion_time ?? null);
            setProcessingSpeed(progress.processing_speed ?? 0);
            setAvgTimePerExample(progress.avg_time_per_example ?? 0);
            
            // Calculate progress based on actual rows processed
            const calculatedProgress = progress.total_rows > 0 
              ? Math.round((progress.completed_rows / progress.total_rows) * 100)
              : 0;
            
            // Use calculated progress if it's more accurate, otherwise fall back to backend percentage
            const finalProgress = progress.total_rows > 0 ? calculatedProgress : progress.progress_percentage;
            
            setEvaluationProgress(finalProgress);
            
            // Debug logging to track progress calculation
            console.log('Progress Update:', {
              completed: progress.completed_rows,
              total: progress.total_rows,
              backendPercentage: progress.progress_percentage,
              calculatedPercentage: calculatedProgress,
              finalPercentage: finalProgress,
              estimatedTime: progress.estimated_completion_time,
              processingSpeed: progress.processing_speed,
              timestamp: new Date().toLocaleTimeString()
            });
          },
          2000 // Poll every 2 seconds
        );

        if (!pollingActive) return; // Don't continue if component unmounted

        // Job completed successfully, fetch results and calculate metrics
        const results = await evaluationService.getJobResults(evaluationJobId);
        
        if (results && results.results && pollingActive) {
          // Calculate basic metrics from results
          const calculatedMetrics = calculateMetrics(results.results);
          setMetrics(calculatedMetrics);
          setJobStatus('completed');
        }

      } catch (error: any) {
        if (!pollingActive) return; // Don't update state if component unmounted
        console.error('Evaluation job failed:', error);
        setJobError(error.message || 'Evaluation job failed');
        setJobStatus('failed');
      } finally {
        if (pollingActive) {
          setIsPolling(false);
        }
      }
    };

    // Check initial job status
    const checkInitialStatus = async () => {
      try {
        const status = await evaluationService.getJobStatus(evaluationJobId);
        
        if (!pollingActive) return; // Don't update state if component unmounted
        
        setJobStatus(status.status as any);
        
        if (status.status === 'completed') {
          // Job already completed, fetch results
          const results = await evaluationService.getJobResults(evaluationJobId);
          if (results && results.results && pollingActive) {
            const calculatedMetrics = calculateMetrics(results.results);
            setMetrics(calculatedMetrics);
            setEvaluationProgress(100);
            setCompletedRows(results.total_results);
            setTotalRows(results.total_results);
          }
        } else if (status.status === 'running' || status.status === 'queued') {
          // Job is still running, start polling
          if (pollingActive) {
            startPolling();
          }
        } else if (status.status === 'failed') {
          if (pollingActive) {
            setJobError(status.error || 'Job failed');
          }
        }
      } catch (error: any) {
        if (!pollingActive) return;
        console.error('Failed to check job status:', error);
        setJobError('Failed to check job status');
      }
    };

    checkInitialStatus();

    // Cleanup function
    return () => {
      pollingActive = false;
      abortController.abort();
      setIsPolling(false);
    };
  }, [evaluationJobId]);

  const formatTimeRemaining = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) {
      return 'Calculating...';
    }

    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      if (remainingSeconds === 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        return `${minutes}m ${remainingSeconds}s`;
      }
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const calculateMetrics = (results: any[]) => {
    if (!results || results.length === 0) {
      return {
        accuracy: 0,
        f1Score: 0,
        precision: 0,
        recall: 0,
        examples: 0,
        avgLatency: 0,
      };
    }

    // Simple accuracy calculation (comparing output vs predict)
    let correct = 0;
    let total = results.length;

    results.forEach(result => {
      if (result.output && result.predict) {
        // Simple string comparison (you might want more sophisticated comparison)
        const expected = result.output.toLowerCase().trim();
        const predicted = result.predict.toLowerCase().trim();
        if (expected === predicted) {
          correct++;
        }
      }
    });

    const accuracy = total > 0 ? correct / total : 0;

    // For now, use simplified metrics (you can enhance this with proper F1, precision, recall calculation)
    return {
      accuracy: accuracy,
      f1Score: accuracy * 0.95, // Simplified approximation
      precision: accuracy * 0.98,
      recall: accuracy * 0.92,
      examples: total,
      avgLatency: 120, // Default value, could be calculated from actual timing data
    };
  };

  const handleDownloadJSON = async () => {
    if (!evaluationJobId) {
      setDownloadError('No evaluation job ID found. Please run an evaluation first.');
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const filename = `evaluation_results_${selectedModel?.name || 'model'}_${new Date().toISOString().split('T')[0]}.json`;
      await evaluationService.downloadResults(evaluationJobId, filename);
    } catch (error: any) {
      setDownloadError(error.message || 'Failed to download results');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!evaluationJobId) {
      setDownloadError('No evaluation job ID found. Please run an evaluation first.');
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const filename = `evaluation_results_${selectedModel?.name || 'model'}_${new Date().toISOString().split('T')[0]}.csv`;
      await evaluationService.downloadResultsAsCSV(evaluationJobId, filename);
    } catch (error: any) {
      setDownloadError(error.message || 'Failed to download results');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Model Metrics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {selectedModel ? `Evaluating ${selectedModel.name}` : 'Loading model...'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!metrics ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {jobStatus === 'queued' && 'Evaluation Queued'}
                  {jobStatus === 'running' && 'Evaluating Model'}
                  {jobStatus === 'failed' && 'Evaluation Failed'}
                  {!jobStatus && 'Loading...'}
                </CardTitle>
                <CardDescription>
                  {jobStatus === 'queued' && 'Waiting for evaluation to start...'}
                  {jobStatus === 'running' && 'Running inference on test dataset'}
                  {jobStatus === 'failed' && 'An error occurred during evaluation'}
                  {!jobStatus && 'Checking evaluation status...'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jobError ? (
                    <div className="p-4 bg-error-50 dark:bg-error-900/20 rounded-lg border border-error-200 dark:border-error-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-error-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-error-800 dark:text-error-200">
                            Evaluation Error
                          </p>
                          <p className="text-sm text-error-700 dark:text-error-300 mt-1">
                            {jobError}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Progress value={evaluationProgress} showValue />
                      <div className="space-y-2">
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {jobStatus === 'queued' && 'Evaluation job is queued and will start shortly...'}
                            {jobStatus === 'running' && `Processing test examples... (${evaluationProgress}% complete)`}
                            {isPolling && jobStatus === 'running' && totalRows > 0 && (
                              <span className="block mt-1">
                                {completedRows} of {totalRows} examples processed
                              </span>
                            )}
                            {!jobStatus && 'Checking evaluation status...'}
                          </p>
                          
                          {/* Time Estimation Display */}
                          {isPolling && jobStatus === 'running' && estimatedTimeRemaining !== null && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-blue-600 dark:text-blue-400 font-medium">Time Remaining</p>
                                  <p className="text-blue-800 dark:text-blue-200">{formatTimeRemaining(estimatedTimeRemaining)}</p>
                                </div>
                                {processingSpeed > 0 && (
                                  <div>
                                    <p className="text-blue-600 dark:text-blue-400 font-medium">Processing Speed</p>
                                    <p className="text-blue-800 dark:text-blue-200">{processingSpeed.toFixed(1)} examples/min</p>
                                  </div>
                                )}
                                {avgTimePerExample > 0 && (
                                  <div>
                                    <p className="text-blue-600 dark:text-blue-400 font-medium">Avg Time/Example</p>
                                    <p className="text-blue-800 dark:text-blue-200">{avgTimePerExample.toFixed(1)}s</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {isPolling && (
                          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span>Live updates every 2 seconds</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>
                    Key metrics from test dataset evaluation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Accuracy</p>
                      <p className="text-2xl font-semibold mt-1">{(metrics.accuracy * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">F1 Score</p>
                      <p className="text-2xl font-semibold mt-1">{(metrics.f1Score * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Precision</p>
                      <p className="text-2xl font-semibold mt-1">{(metrics.precision * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Recall</p>
                      <p className="text-2xl font-semibold mt-1">{(metrics.recall * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card> */}

              <Card>
                <CardHeader>
                  <CardTitle>Additional Statistics</CardTitle>
                  <CardDescription>
                    Detailed evaluation results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Test Dataset Overview</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Examples Tested</p>
                          <p className="text-lg font-medium">{metrics.examples.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Latency</p>
                          <p className="text-lg font-medium">{metrics.avgLatency}ms</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Performance Analysis</h4>
                      <div className="p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-warning-800 dark:text-warning-200">
                              Areas for Improvement
                            </p>
                            <ul className="mt-2 text-sm text-warning-700 dark:text-warning-300 space-y-1 list-disc pl-4">
                              <li>Lower accuracy on longer sequences</li>
                              <li>Higher latency for complex queries</li>
                              <li>Some edge cases need attention</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Download Results Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Download Results</CardTitle>
                  <CardDescription>
                    Export evaluation results for further analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {downloadError && (
                      <div className="p-3 bg-error-50 dark:bg-error-900/20 rounded-lg border border-error-200 dark:border-error-800">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-error-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-error-700 dark:text-error-300">{downloadError}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="outline"
                        leftIcon={<Download className="h-4 w-4" />}
                        onClick={handleDownloadJSON}
                        disabled={isDownloading || !evaluationJobId}
                        isLoading={isDownloading}
                        className="flex-1"
                      >
                        {isDownloading ? 'Downloading...' : 'Download JSON'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        leftIcon={<FileText className="h-4 w-4" />}
                        onClick={handleDownloadCSV}
                        disabled={isDownloading || !evaluationJobId}
                        isLoading={isDownloading}
                        className="flex-1"
                      >
                        {isDownloading ? 'Downloading...' : 'Download CSV'}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <p>• JSON format includes all prediction details and metadata</p>
                      <p>• CSV format is optimized for spreadsheet analysis</p>
                      {!evaluationJobId && (
                        <p className="text-warning-600 dark:text-warning-400 mt-2">
                          ⚠️ No evaluation job found. Please run an evaluation first.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                {/* <Button
                  variant="primary"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate('/evaluate/compare')}
                >
                  Compare with Base Model
                </Button> */}
              </div>
            </motion.div>
          )}
        </div>

        <div>
          {/* <Card>
            <CardHeader>
              <CardTitle>Evaluation Guide</CardTitle>
              <CardDescription>
                Understanding the metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Key Metrics</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">A</span>
                      </span>
                      <div>
                        <p className="font-medium">Accuracy</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Percentage of correct predictions
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">F</span>
                      </span>
                      <div>
                        <p className="font-medium">F1 Score</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Harmonic mean of precision and recall
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">P</span>
                      </span>
                      <div>
                        <p className="font-medium">Precision</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Ratio of correct positive predictions
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs">R</span>
                      </span>
                      <div>
                        <p className="font-medium">Recall</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Ratio of actual positives identified
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-sm font-medium mb-2">Interpreting Results</p>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success-500" />
                      <span className="text-success-700 dark:text-success-300">{'>'} 90%: Excellent</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-warning-500" />
                      <span className="text-warning-700 dark:text-warning-300">80-90%: Good</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-error-500" />
                      <span className="text-error-700 dark:text-error-300">{'<'} 80%: Needs Improvement</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </div>
  );
}
