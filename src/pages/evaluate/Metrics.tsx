import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/Progress';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { ModelInfo } from '../../components/models/ModelCard';

export default function Metrics() {
  const navigate = useNavigate();
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);

  useEffect(() => {
    const modelData = localStorage.getItem('evaluationModel');
    if (modelData) {
      setSelectedModel(JSON.parse(modelData));
    }
  }, []);

  useEffect(() => {
    // Simulate evaluation process
    const interval = setInterval(() => {
      setEvaluationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setMetrics({
            accuracy: 0.89,
            f1Score: 0.87,
            precision: 0.85,
            recall: 0.88,
            examples: 1000,
            avgLatency: 120,
          });
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

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
                <CardTitle>Evaluating Model</CardTitle>
                <CardDescription>
                  Running inference on test dataset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={evaluationProgress} showValue />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Processing test examples... ({evaluationProgress}% complete)
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card>
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
              </Card>

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

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate('/evaluate/compare')}
                >
                  Compare with Base Model
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        <div>
          <Card>
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
          </Card>
        </div>
      </div>
    </div>
  );
}