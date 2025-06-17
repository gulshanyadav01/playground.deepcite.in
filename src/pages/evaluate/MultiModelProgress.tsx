import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/Progress';
import { ArrowRight, AlertTriangle, Clock, CheckCircle, XCircle, Loader2, BarChart3, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import { multiModelService, MultiEvaluationStatus, ModelEvaluationStatus, SelectedModel } from '../../services/multiModelService';
import { AnimatedLoader } from '../../components/ui/AnimatedLoader';

export default function MultiModelProgress() {
  const navigate = useNavigate();
  
  const [jobStatus, setJobStatus] = useState<MultiEvaluationStatus | null>(null);
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([]);
  const [evaluationJobId, setEvaluationJobId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    // Get job info from localStorage
    const jobId = localStorage.getItem('multiEvaluationJobId');
    const modelsData = localStorage.getItem('selectedModels');
    
    if (jobId) {
      setEvaluationJobId(jobId);
    }
    
    if (modelsData) {
      setSelectedModels(JSON.parse(modelsData));
    }
  }, []);

  useEffect(() => {
    if (!evaluationJobId) return;

    let pollingActive = true;

    const startPolling = async () => {
      setIsPolling(true);
      setJobError(null);

      try {
        await multiModelService.pollEvaluationStatus(
          evaluationJobId,
          (status) => {
            if (!pollingActive) return;
            
            setJobStatus(status);
            
            // Calculate estimated time remaining
            if (status.status === 'running') {
              const runningModels = status.model_statuses.filter(m => m.status === 'running');
              const queuedModels = status.model_statuses.filter(m => m.status === 'queued');
              
              if (runningModels.length > 0) {
                const runningModel = runningModels[0];
                if (runningModel.total_rows > 0 && runningModel.completed_rows > 0) {
                  const avgTimePerRow = 2; // Estimate 2 seconds per row
                  const remainingRows = runningModel.total_rows - runningModel.completed_rows;
                  const currentModelTime = remainingRows * avgTimePerRow;
                  const queuedModelsTime = queuedModels.length * runningModel.total_rows * avgTimePerRow;
                  const totalTime = currentModelTime + queuedModelsTime;
                  
                  if (totalTime < 60) {
                    setEstimatedTimeRemaining(`${Math.round(totalTime)} seconds`);
                  } else if (totalTime < 3600) {
                    setEstimatedTimeRemaining(`${Math.round(totalTime / 60)} minutes`);
                  } else {
                    setEstimatedTimeRemaining(`${Math.round(totalTime / 3600)} hours`);
                  }
                }
              }
            }
          },
          3000 // Poll every 3 seconds
        );

        if (!pollingActive) return;

        // Evaluation completed, navigate to results
        navigate('/evaluate/multi-results');

      } catch (error: any) {
        if (!pollingActive) return;
        console.error('Multi-model evaluation failed:', error);
        setJobError(error.message || 'Multi-model evaluation failed');
      } finally {
        if (pollingActive) {
          setIsPolling(false);
        }
      }
    };

    startPolling();

    return () => {
      pollingActive = false;
      setIsPolling(false);
    };
  }, [evaluationJobId, navigate]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatModelType = (type: string) => {
    switch (type) {
      case 'finetuned':
        return 'Fine-tuned';
      case 'openai':
        return 'OpenAI';
      case 'huggingface':
        return 'HuggingFace';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Multi-Model Evaluation Progress</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Tracking evaluation progress for {selectedModels.length} models
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Overall Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary-500" />
                Overall Progress
              </CardTitle>
              <CardDescription>
                {jobStatus ? `${jobStatus.completed_models} of ${jobStatus.total_models} models completed` : 'Loading...'}
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
                ) : jobStatus ? (
                  <>
                    <Progress value={jobStatus.overall_progress} showValue />
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Status: {jobStatus.status}</span>
                      {estimatedTimeRemaining && (
                        <span>Est. time remaining: {estimatedTimeRemaining}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <AnimatedLoader variant="brain" size="md" text="Loading evaluation status..." />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Individual Model Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Model Evaluation Queue</CardTitle>
              <CardDescription>
                Progress for each selected model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobStatus?.model_statuses ? (
                  jobStatus.model_statuses.map((modelStatus: ModelEvaluationStatus, index: number) => (
                    <motion.div
                      key={modelStatus.model_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 border rounded-lg ${getStatusColor(modelStatus.status)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(modelStatus.status)}
                          <div>
                            <h4 className="font-medium">{modelStatus.model_name}</h4>
                            <p className="text-xs opacity-75">
                              {formatModelType(modelStatus.model_type)} • {modelStatus.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{Math.round(modelStatus.progress)}%</p>
                          <p className="text-xs opacity-75">
                            {modelStatus.completed_rows} / {modelStatus.total_rows}
                          </p>
                        </div>
                      </div>
                      
                      <Progress value={modelStatus.progress} className="h-2" />
                      
                      {modelStatus.error_message && (
                        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                          Error: {modelStatus.error_message}
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="space-y-3">
                    {selectedModels.map((model, index) => (
                      <div key={model.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <h4 className="font-medium">{model.name}</h4>
                            <p className="text-xs text-gray-500">
                              {formatModelType(model.type)} • Waiting to start
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Evaluation Info */}
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Details</CardTitle>
              <CardDescription>
                Information about this evaluation run
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Selected Models</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedModels.length} models</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Evaluation Type</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Multi-model comparison</p>
                </div>
                
                {jobStatus && (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-1">Started</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {jobStatus.started_at ? new Date(jobStatus.started_at).toLocaleString() : 'Not started'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-1">Job ID</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                        {jobStatus.job_id}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Process Info */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>
                Understanding the evaluation process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Sequential Processing</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">
                      Models are evaluated one by one to avoid resource conflicts
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Same Test Data</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">
                      All models use identical test data for fair comparison
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Comparative Results</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">
                      Results are compiled into a comparison table with rankings
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Updates */}
          {isPolling && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-green-500" />
                  Live Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Receiving real-time updates every 3 seconds</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
