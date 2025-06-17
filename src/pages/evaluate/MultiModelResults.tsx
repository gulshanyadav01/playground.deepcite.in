import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Download, FileText, Trophy, Medal, Award, BarChart3, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { multiModelService, MultiEvaluationResult, ModelResult, SelectedModel } from '../../services/multiModelService';
import { AnimatedLoader } from '../../components/ui/AnimatedLoader';

export default function MultiModelResults() {
  const navigate = useNavigate();
  
  const [results, setResults] = useState<MultiEvaluationResult | null>(null);
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([]);
  const [evaluationJobId, setEvaluationJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const evaluationResults = await multiModelService.getEvaluationResults(evaluationJobId);
        setResults(evaluationResults);
      } catch (error: any) {
        console.error('Failed to fetch results:', error);
        setError(error.message || 'Failed to fetch evaluation results');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [evaluationJobId]);

  const handleDownloadJSON = async () => {
    if (!results) return;
    
    setIsDownloading(true);
    try {
      await multiModelService.downloadComparisonResults(results);
    } catch (error: any) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!results) return;
    
    setIsDownloading(true);
    try {
      await multiModelService.downloadComparisonResultsAsCSV(results);
    } catch (error: any) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-gray-500">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 2:
        return 'bg-gray-50 border-gray-200 text-gray-800';
      case 3:
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-white border-gray-200 text-gray-800';
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

  const formatProvider = (type: string) => {
    switch (type) {
      case 'finetuned':
        return 'Local';
      case 'openai':
        return 'OpenAI';
      case 'huggingface':
        return 'HuggingFace';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Multi-Model Evaluation Results</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Loading comparison results...
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <AnimatedLoader variant="brain" size="lg" text="Compiling evaluation results..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Multi-Model Evaluation Results</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Error loading results
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <BarChart3 className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium mb-2">Failed to Load Results</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => navigate('/evaluate/testdata')}>
              Start New Evaluation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!results || !results.model_results || results.model_results.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Multi-Model Evaluation Results</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            No results available
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Results Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The evaluation may still be in progress or may have failed.
            </p>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => navigate('/evaluate/multi-progress')}>
                Check Progress
              </Button>
              <Button onClick={() => navigate('/evaluate/testdata')}>
                Start New Evaluation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort results by accuracy (descending)
  const sortedResults = [...results.model_results].sort((a, b) => b.metrics.accuracy - a.metrics.accuracy);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Multi-Model Evaluation Results</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Comparison of {results.total_models_evaluated} models • Completed {results.completed_at ? new Date(results.completed_at).toLocaleDateString() : 'recently'}
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/evaluate/testdata')}
        >
          New Evaluation
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Best Performer</p>
                <p className="font-medium">{sortedResults[0]?.model_name}</p>
                <p className="text-xs text-gray-500">{(sortedResults[0]?.metrics.accuracy * 100).toFixed(1)}% accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Models Evaluated</p>
                <p className="font-medium">{results.total_models_evaluated}</p>
                <p className="text-xs text-gray-500">Comprehensive comparison</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Accuracy</p>
                <p className="font-medium">
                  {((sortedResults.reduce((sum, r) => sum + r.metrics.accuracy, 0) / sortedResults.length) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Across all models</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Model Performance Comparison</CardTitle>
              <CardDescription>
                Ranked by accuracy • All models evaluated on identical test data
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleDownloadJSON}
                disabled={isDownloading}
              >
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText className="h-4 w-4" />}
                onClick={handleDownloadCSV}
                disabled={isDownloading}
              >
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedResults.map((result: ModelResult, index: number) => (
              <motion.div
                key={result.model_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 border rounded-lg ${getRankColor(index + 1)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(index + 1)}
                    </div>
                    <div>
                      <h4 className="font-medium text-lg">{result.model_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                          {formatProvider(result.model_type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {result.evaluation_time ? `${result.evaluation_time.toFixed(1)}s` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-6 text-right">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
                      <p className="text-lg font-semibold">{(result.metrics.accuracy * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">F1 Score</p>
                      <p className="text-lg font-semibold">{(result.metrics.f1_score * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Precision</p>
                      <p className="text-lg font-semibold">{(result.metrics.precision * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Recall</p>
                      <p className="text-lg font-semibold">{(result.metrics.recall * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
                
                {/* Progress bar showing relative performance */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Performance relative to best model</span>
                    <span>{((result.metrics.accuracy / sortedResults[0].metrics.accuracy) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(result.metrics.accuracy / sortedResults[0].metrics.accuracy) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Analysis</CardTitle>
            <CardDescription>
              Key insights from the evaluation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Accuracy Range</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {(Math.min(...sortedResults.map(r => r.metrics.accuracy)) * 100).toFixed(1)}%
                  </span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full w-full" />
                  </div>
                  <span className="text-sm">
                    {(Math.max(...sortedResults.map(r => r.metrics.accuracy)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Model Types</h4>
                <div className="space-y-1">
                  {Object.entries(
                    sortedResults.reduce((acc, r) => {
                      acc[r.model_type] = (acc[r.model_type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span>{formatModelType(type)}</span>
                      <span className="text-gray-500">{count} model{count > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evaluation Summary</CardTitle>
            <CardDescription>
              Details about this evaluation run
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Total Examples</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {sortedResults[0]?.metrics.total_examples || 'N/A'} test examples
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Evaluation Time</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {sortedResults.reduce((sum, r) => sum + (r.evaluation_time || 0), 0).toFixed(1)} seconds total
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Job ID</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                  {results.job_id}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Completed</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {results.completed_at ? new Date(results.completed_at).toLocaleString() : 'Recently'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
