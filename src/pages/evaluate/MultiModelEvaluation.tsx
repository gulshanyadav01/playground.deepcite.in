import { useState } from 'react';
import ModelSelection from './ModelSelection';
import EvaluationProgress from './EvaluationProgress';
import EvaluationResults from './EvaluationResults';
import { multiModelService } from '../../services/multiModelService';

interface EvaluationConfig {
  selectedModels: string[];
  localModelPath?: string;
  modelParameters: Record<string, any>;
  testData?: any[];
  testFile?: File;
  batchSize: number;
  runLocalFirst: boolean;
}

type EvaluationStep = 'selection' | 'progress' | 'results';

const MultiModelEvaluation: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<EvaluationStep>('selection');
  const [jobId, setJobId] = useState<string | null>(null);
  const [evaluationConfig, setEvaluationConfig] = useState<EvaluationConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartEvaluation = async (config: EvaluationConfig) => {
    try {
      setError(null);
      setEvaluationConfig(config);
      
      let response;
      
      if (config.testFile) {
        // Use file upload
        response = await multiModelService.startEvaluationWithFile(
          config.testFile,
          config.selectedModels,
          config.localModelPath,
          config.modelParameters,
          config.batchSize,
          config.runLocalFirst
        );
      } else if (config.testData) {
        // Use test data directly
        response = await multiModelService.startEvaluation({
          local_model_path: config.localModelPath,
          external_models: config.selectedModels,
          test_data: config.testData,
          model_parameters: config.modelParameters,
          batch_size: config.batchSize,
          run_local_first: config.runLocalFirst
        });
      } else {
        throw new Error('No test data provided');
      }

      setJobId(response.job_id);
      setCurrentStep('progress');
    } catch (error: any) {
      setError(error.message || 'Failed to start evaluation');
    }
  };

  const handleEvaluationComplete = () => {
    setCurrentStep('results');
  };

  const handleBackToSelection = () => {
    setCurrentStep('selection');
    setJobId(null);
    setEvaluationConfig(null);
    setError(null);
  };

  const handleStartNewEvaluation = () => {
    setCurrentStep('selection');
    setJobId(null);
    setEvaluationConfig(null);
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {currentStep === 'selection' && (
        <ModelSelection onStartEvaluation={handleStartEvaluation} />
      )}
      
      {currentStep === 'progress' && jobId && (
        <EvaluationProgress
          jobId={jobId}
          onComplete={handleEvaluationComplete}
          onBack={handleBackToSelection}
        />
      )}
      
      {currentStep === 'results' && jobId && (
        <EvaluationResults
          jobId={jobId}
          onStartNew={handleStartNewEvaluation}
        />
      )}
      
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default MultiModelEvaluation;
