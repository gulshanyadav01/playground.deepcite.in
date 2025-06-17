import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Download, 
  RefreshCw, 
  Trophy, 
  Clock, 
  DollarSign,
  Target,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { multiModelService, MultiModelEvaluationJob } from '../../services/multiModelService';

interface EvaluationResultsProps {
  jobId: string;
  onStartNew: () => void;
}

const EvaluationResults: React.FC<EvaluationResultsProps> = ({ jobId, onStartNew }) => {
  const [job, setJob] = useState<MultiModelEvaluationJob | null>(null);
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedExample, setExpandedExample] = useState<number | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('exact_match_accuracy');

  useEffect(() => {
    loadResults();
  }, [jobId]);

  const loadResults = async () => {
    try {
      setIsLoading(true);
      const [jobData, resultsData] = await Promise.all([
        multiModelService.getJobStatus(jobId),
        multiModelService.getJobResults(jobId)
      ]);
      
      setJob(jobData);
      setResults(resultsData);
    } catch (error: any) {
      setError(error.message || 'Failed to load results');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: 'json' | 'csv') => {
    try {
      await multiModelService.downloadResults(jobId, format);
    } catch (error: any) {
      setError(error.message || 'Failed to download results');
    }
  };

  const getRankingByMetric = (metric: string) => {
    if (!job) return [];
    
    return Object.entries(job.model_results)
      .map(([modelId, result]) => ({
        modelId,
        ...result,
        metricValue: result.metrics[metric] || 0
      }))
      .sort((a, b) => b.metricValue - a.metricValue);
  };

  const formatMetricName = (metric: string) => {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getMetricColor = (rank: number, total: number) => {
    if (rank === 0) return 'text-yellow-600'; // Gold
    if (rank === 1) return 'text-gray-500'; // Silver
    if (rank === 2) return 'text-orange-600'; // Bronze
    return 'text-gray-400';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 1) return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    if (rank === 2) return <div className="w-4 h-4 rounded-full bg-orange-400" />;
    return <div className="w-4 h-4 rounded-full bg-gray-300" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-gray-500">Loading evaluation results...</p>
        </div>
      </div>
    );
  }

  if (error || !job || !results) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Evaluation Results</h1>
          <Button onClick={onStartNew}>Start New Evaluation</Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error || 'No results found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ranking = getRankingByMetric(selectedMetric);
  const availableMetrics = Object.keys(job.model_results[Object.keys(job.model_results)[0]]?.metrics || {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evaluation Results</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Comparison completed • Job ID: {jobId}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleDownload('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <Button variant="outline" onClick={() => handleDownload('json')}>
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </Button>
          <Button onClick={onStartNew}>
            Start New Evaluation
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{job.total_models}</div>
                <div className="text-sm text-gray-500">Models Compared</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{job.total_examples}</div>
                <div className="text-sm text-gray-500">Test Examples</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">${job.total_cost.toFixed(4)}</div>
                <div className="text-sm text-gray-500">Total Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {job.started_at && job.completed_at 
                    ? formatTime((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-gray-500">Total Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Ranking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Model Ranking
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Rank by:</span>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
              >
                {availableMetrics.map(metric => (
                  <option key={metric} value={metric}>
                    {formatMetricName(metric)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ranking.map((model, index) => (
              <motion.div
                key={model.modelId}
                layout
                className={`p-4 border rounded-lg ${
                  index === 0 ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' : 
                  index === 1 ? 'border-gray-300 bg-gray-50 dark:bg-gray-900/20' :
                  index === 2 ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20' :
                  'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(index)}
                      <span className="font-bold text-lg">#{index + 1}</span>
                    </div>
                    
                    <div>
                      <div className="font-semibold">{model.model_name}</div>
                      <div className="text-sm text-gray-500">{model.provider}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {(model.metricValue * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatMetricName(selectedMetric)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-medium">
                        {formatTime(model.average_response_time)}
                      </div>
                      <div className="text-sm text-gray-500">Avg Time</div>
                    </div>

                    <div className="text-right">
                      <div className="font-medium">
                        ${model.total_cost.toFixed(4)}
                      </div>
                      <div className="text-sm text-gray-500">Cost</div>
                    </div>

                    <Badge 
                      className={
                        model.status === 'completed' ? 'bg-green-100 text-green-800' :
                        model.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {model.status}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Model</th>
                  {availableMetrics.map(metric => (
                    <th key={metric} className="text-center p-3">
                      {formatMetricName(metric)}
                    </th>
                  ))}
                  <th className="text-center p-3">Avg Response Time</th>
                  <th className="text-center p-3">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(job.model_results).map(([modelId, result]) => (
                  <tr key={modelId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{result.model_name}</div>
                        <div className="text-sm text-gray-500">{result.provider}</div>
                      </div>
                    </td>
                    {availableMetrics.map(metric => (
                      <td key={metric} className="text-center p-3">
                        {((result.metrics[metric] || 0) * 100).toFixed(1)}%
                      </td>
                    ))}
                    <td className="text-center p-3">
                      {formatTime(result.average_response_time)}
                    </td>
                    <td className="text-center p-3">
                      ${result.total_cost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sample Results */}
      {results?.model_results && (Object.values(results.model_results)[0] as any)?.results?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Sample Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.values(results.model_results)[0] as any)?.results?.slice(0, 5).map((example: any, index: number) => (
                <div key={index} className="border rounded-lg">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    onClick={() => setExpandedExample(expandedExample === index ? null : index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium mb-2">Example {index + 1}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {example.instruction}
                        </div>
                      </div>
                      {expandedExample === index ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {expandedExample === index && (
                    <div className="border-t p-4 space-y-4">
                      <div>
                        <div className="font-medium text-sm mb-2">Instruction:</div>
                        <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                          {example.instruction}
                        </div>
                      </div>

                      {example.input && (
                        <div>
                          <div className="font-medium text-sm mb-2">Input:</div>
                          <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                            {example.input}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="font-medium text-sm mb-2">Expected Output:</div>
                        <div className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded">
                          {example.output}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="font-medium text-sm">Model Responses:</div>
                        {Object.entries(results.model_results).map(([modelId, modelResult]: [string, any]) => {
                          const modelResponse = modelResult.results[index];
                          return (
                            <div key={modelId} className="border rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{modelResult.model_name}</span>
                                <span className="text-xs text-gray-500">
                                  {formatTime(modelResponse?.response_time || 0)}
                                </span>
                              </div>
                              <div className="text-sm">
                                {modelResponse?.predict || 'No response'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EvaluationResults;
