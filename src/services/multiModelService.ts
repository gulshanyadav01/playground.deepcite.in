// Use proxy in development, direct URL in production
const API_BASE_URL = import.meta.env.DEV ? 'https://finetune_engine.deepcite.in' : 'https://finetune_engine.deepcite.in';

export interface ExternalModel {
  id: string;
  name: string;
  type: 'openai' | 'huggingface' | 'finetuned';
  provider: string;
  description: string;
  size: string;
  isBase: boolean;
  family: string;
  available: boolean;
}

export interface SelectedModel {
  id: string;
  name: string;
  type: 'openai' | 'huggingface' | 'finetuned';
  provider?: string;
  description?: string;
  size?: string;
  family?: string;
}

export interface EvaluationParams {
  batch_size: number;
  max_tokens: number;
  temperature: number;
}

export interface MultiEvaluationRequest {
  selected_models: SelectedModel[];
  file_content: string; // Base64 encoded
  file_type: 'csv' | 'json' | 'jsonl';
  evaluation_params: EvaluationParams;
}

export interface ModelEvaluationStatus {
  model_id: string;
  model_name: string;
  model_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  completed_rows: number;
  total_rows: number;
  error_message?: string;
}

export interface MultiEvaluationStatus {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  overall_progress: number;
  completed_models: number;
  total_models: number;
  model_statuses: ModelEvaluationStatus[];
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface ModelMetrics {
  accuracy: number;
  f1_score: number;
  precision: number;
  recall: number;
  total_examples: number;
}

export interface ModelResult {
  model_id: string;
  model_name: string;
  model_type: string;
  metrics: ModelMetrics;
  evaluation_time?: number;
  results: Array<{
    instruction: string;
    input?: string;
    output: string;
    predict: string;
  }>;
}

export interface MultiEvaluationResult {
  job_id: string;
  status: string;
  model_results: ModelResult[];
  total_models_evaluated: number;
  created_at: string;
  completed_at?: string;
}

export interface MultiEvaluationResponse {
  job_id: string;
  status: string;
  message: string;
  total_models: number;
  estimated_time?: string;
}

export interface ExternalModelsResponse {
  models: ExternalModel[];
  total: number;
  openai_available: boolean;
  huggingface_available: boolean;
}

class MultiModelService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Get available external models
   */
  async getExternalModels(): Promise<ExternalModelsResponse> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/external-models`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch external models');
    }

    return response.json();
  }

  /**
   * Start multi-model evaluation
   */
  async startMultiEvaluation(request: MultiEvaluationRequest): Promise<MultiEvaluationResponse> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start multi-model evaluation');
    }

    return response.json();
  }

  /**
   * Get status of multi-model evaluation
   */
  async getEvaluationStatus(jobId: string): Promise<MultiEvaluationStatus> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/status/${jobId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get evaluation status');
    }

    return response.json();
  }

  /**
   * Get results of completed multi-model evaluation
   */
  async getEvaluationResults(jobId: string): Promise<MultiEvaluationResult> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/results/${jobId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get evaluation results');
    }

    return response.json();
  }

  /**
   * Delete multi-model evaluation job
   */
  async deleteEvaluationJob(jobId: string): Promise<{ job_id: string; status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/jobs/${jobId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete evaluation job');
    }

    return response.json();
  }

  /**
   * List all multi-model evaluation jobs
   */
  async listEvaluationJobs(): Promise<{ jobs: MultiEvaluationStatus[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/jobs`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list evaluation jobs');
    }

    return response.json();
  }

  /**
   * Validate test data
   */
  async validateTestData(
    fileContent: string,
    fileType: 'csv' | 'json' | 'jsonl'
  ): Promise<{
    is_valid: boolean;
    errors: string[];
    total_rows: number;
    sample_data: any[];
  }> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/validate-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_content: fileContent,
        file_type: fileType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to validate test data');
    }

    return response.json();
  }

  /**
   * Poll evaluation status until completion
   */
  async pollEvaluationStatus(
    jobId: string,
    onProgress?: (status: MultiEvaluationStatus) => void,
    intervalMs: number = 3000
  ): Promise<MultiEvaluationStatus> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getEvaluationStatus(jobId);
          
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed') {
            resolve(status);
          } else if (status.status === 'failed') {
            reject(new Error('Multi-model evaluation failed'));
          } else {
            // Continue polling
            setTimeout(poll, intervalMs);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Convert file to base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:text/csv;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get file type from filename
   */
  getFileType(filename: string): 'csv' | 'json' | 'jsonl' | null {
    const extension = filename.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'csv':
        return 'csv';
      case 'json':
        return 'json';
      case 'jsonl':
        return 'jsonl';
      default:
        return null;
    }
  }

  /**
   * Download comparison results as JSON
   */
  async downloadComparisonResults(results: MultiEvaluationResult, filename?: string): Promise<void> {
    try {
      // Create comparison summary
      const comparisonData = {
        job_id: results.job_id,
        evaluation_date: results.completed_at || results.created_at,
        total_models: results.total_models_evaluated,
        model_comparison: results.model_results.map(result => ({
          model_name: result.model_name,
          model_type: result.model_type,
          metrics: result.metrics,
          evaluation_time_seconds: result.evaluation_time
        })).sort((a, b) => b.metrics.accuracy - a.metrics.accuracy), // Sort by accuracy
        detailed_results: results.model_results
      };
      
      const blob = new Blob([JSON.stringify(comparisonData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `multi_model_comparison_${results.job_id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Failed to download comparison results: ${error}`);
    }
  }

  /**
   * Download comparison results as CSV
   */
  async downloadComparisonResultsAsCSV(results: MultiEvaluationResult, filename?: string): Promise<void> {
    try {
      if (results.model_results.length === 0) {
        throw new Error('No results to download');
      }

      // Create CSV headers
      const headers = [
        'Model Name',
        'Model Type',
        'Provider',
        'Accuracy (%)',
        'F1 Score (%)',
        'Precision (%)',
        'Recall (%)',
        'Total Examples',
        'Evaluation Time (s)'
      ];

      // Create CSV rows
      const rows = results.model_results
        .sort((a, b) => b.metrics.accuracy - a.metrics.accuracy) // Sort by accuracy
        .map(result => [
          result.model_name,
          result.model_type,
          result.model_type === 'finetuned' ? 'Local' : result.model_type === 'openai' ? 'OpenAI' : 'HuggingFace',
          (result.metrics.accuracy * 100).toFixed(2),
          (result.metrics.f1_score * 100).toFixed(2),
          (result.metrics.precision * 100).toFixed(2),
          (result.metrics.recall * 100).toFixed(2),
          result.metrics.total_examples.toString(),
          result.evaluation_time?.toFixed(2) || 'N/A'
        ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma or quote
            const escaped = String(cell).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
              ? `"${escaped}"` 
              : escaped;
          }).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `multi_model_comparison_${results.job_id}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Failed to download CSV: ${error}`);
    }
  }
}

// Export singleton instance
export const multiModelService = new MultiModelService();
export default multiModelService;
