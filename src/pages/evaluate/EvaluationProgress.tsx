import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/Progress';
import { Badge } from '../../components/ui/Badge';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Play,
  Pause,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { multiModelService, EvaluationProgress as ProgressData, MultiModelEvaluationJob } from '../../services/multiModelService';

interface EvaluationProgressProps {
  jobId: string;
  onComplete: () => void;
  onBack: () => void;
}

const EvaluationProgress: React.FC<EvaluationProgressProps> = ({ jobId, onComplete, onBack }) => {
  const [job, setJob] = useState<MultiModelEvaluationJob | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const pollProgress = async () => {
      try {
        const [jobStatus, progressData] = await Promise.all([
          multiModelService.getJobStatus(jobId),
          multiModelService.getJobProgress(jobId)
        ]);

        setJob(jobStatus);
        setProgress(progressData);
        setIsLoading(false);

        if (jobStatus.status === 'completed') {
          clearInterval(intervalId);
          setTimeout(() => onComplete(), 1000); // Small delay to show completion
        } else if (jobStatus.status === 'failed') {
          clearInterval(intervalId);
          setError(jobStatus.error_message || 'Evaluation failed');
        }
      } catch (error: any) {
        setError(error.message || 'Failed to get progress');
        setIsLoading(false);
      }
    };

    // Initial load
    pollProgress();

    // Poll every 3 seconds
    intervalId = setInterval(pollProgress, 3000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId, onComplete]);

  const handleCancel = async () => {
    try {
      await multiModelService.cancelJob(jobId);
      onBack();
    } catch (error: any) {
      setError(error.message || 'Failed to cancel job');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-gray-500">Loading evaluation progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Selection
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Evaluation Error</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-red-800 mb-2">Evaluation Failed</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job || !progress) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No evaluation data found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Selection
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Multi-Model Evaluation</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Job ID: {jobId}
            </p>
          </div>
        </div>

        {job.status === 'running' && (
          <Button variant="outline" onClick={handleCancel}>
            Cancel Evaluation
          </Button>
        )}
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(job.status)}
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {progress.completed_models.length} of {job.total_models} models completed
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progress.overall_progress * 100)}%
              </span>
            </div>
            
            <Progress value={progress.overall_progress * 100} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">{progress.completed_models.length}</div>
                <div className="text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">{progress.failed_models.length}</div>
                <div className="text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">{progress.remaining_models.length}</div>
                <div className="text-gray-500">Remaining</div>
              </div>
            </div>

            {progress.current_model && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="font-medium">Currently evaluating: {progress.current_model}</span>
                </div>
                <Progress value={progress.current_model_progress * 100} className="h-1" />
              </div>
            )}

            {progress.estimated_completion_time && (
              <div className="text-sm text-gray-500">
                Estimated completion: {formatTime(progress.estimated_completion_time)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Model Status */}
      <Card>
        <CardHeader>
          <CardTitle>Model Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(job.model_results).map(([modelId, result]) => (
              <motion.div
                key={modelId}
                layout
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <div className="font-medium">{result.model_name}</div>
                    <div className="text-sm text-gray-500">{result.provider}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {result.status === 'running' && (
                    <div className="text-sm text-gray-500">
                      {result.completed_examples} / {result.total_examples} examples
                    </div>
                  )}
                  
                  {result.status === 'completed' && (
                    <div className="text-sm text-gray-500">
                      {result.completed_examples} examples completed
                    </div>
                  )}

                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{job.total_examples}</div>
              <div className="text-sm text-gray-500">Test Examples</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${job.total_cost.toFixed(4)}</div>
              <div className="text-sm text-gray-500">Total Cost</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {job.started_at && job.completed_at 
                  ? formatTime((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                  : job.started_at 
                    ? formatTime((Date.now() - new Date(job.started_at).getTime()) / 1000)
                    : '0s'
                }
              </div>
              <div className="text-sm text-gray-500">
                {job.status === 'completed' ? 'Total Time' : 'Elapsed Time'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EvaluationProgress;
