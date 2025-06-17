// Use proxy in development, direct URL in production
const API_BASE_URL = import.meta.env.DEV ? 'https://finetune_engine.deepcite.in/api' : 'https://finetune_engine.deepcite.in/api';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  max_tokens: number;
  cost_per_1k_tokens: number;
  is_available: boolean;
  requires_api_key: boolean;
}

export interface ModelParameters {
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

export interface MultiModelEvaluationRequest {
  local_model_path?: string;
  external_models: string[];
  test_data: any[];
  model_parameters: Record<string, ModelParameters>;
  batch_size: number;
  run_local_first: boolean;
}

export interface MultiModelEvaluationJob {
  job_id: string;
  status: string;
  local_model_path?: string;
  external_models: string[];
  total_models: number;
  completed_models: number;
  failed_models: number;
  model_results: Record<string, ModelEvaluationResult>;
  total_examples: number;
  total_cost: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface ModelEvaluationResult {
  model_id: string;
  model_name: string;
  provider: string;
  status: string;
  results: any[];
  metrics: Record<string, number>;
  total_examples: number;
  completed_examples: number;
  failed_examples: number;
  total_cost: number;
  average_response_time: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface EvaluationProgress {
  job_id: string;
  current_model?: string;
  current_model_progress: number;
  overall_progress: number;
  completed_models: string[];
  failed_models: string[];
  remaining_models: string[];
  estimated_completion_time?: number;
  current_status: string;
}

export interface CostEstimation {
  model_costs: Record<string, number>;
  total_cost: number;
  cost_breakdown: Record<string, any>;
}

export interface ApiKeyValidation {
  provider: string;
  is_valid: boolean;
  error_message?: string;
  available_models: string[];
}

class MultiModelService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Get all available models for evaluation
   */
  async getAvailableModels(): Promise<{ models: ModelInfo[]; providers: string[]; total_available: number }> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/models`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get available models');
    }

    return response.json();
  }

  /**
   * Get configuration for a specific model
   */
  async getModelConfiguration(modelId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/models/${encodeURIComponent(modelId)}/config`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get model configuration');
    }

    return response.json();
  }

  /**
   * Validate API key for a provider
   */
  async validateApiKey(provider: string, apiKey: string): Promise<ApiKeyValidation> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/validate-api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        api_key: apiKey,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to validate API key');
    }

    return response.json();
  }

  /**
   * Set API key for a provider
   */
  async setApiKey(provider: string, apiKey: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/set-api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        api_key: apiKey,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to set API key');
    }
  }

  /**
   * Estimate cost for multi-model evaluation
   */
  async estimateCost(
    models: string[],
    testDataSize: number,
    averageInputTokens: number = 100,
    averageOutputTokens: number = 50
  ): Promise<CostEstimation> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/estimate-cost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        models,
        test_data_size: testDataSize,
        average_input_tokens: averageInputTokens,
        average_output_tokens: averageOutputTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to estimate cost');
    }

    return response.json();
  }

  /**
   * Start multi-model evaluation with test data
   */
  async startEvaluation(request: MultiModelEvaluationRequest): Promise<{ job_id: string; status: string; message: string; total_models: number; estimated_cost: number; estimated_time: number }> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start evaluation');
    }

    return response.json();
  }

  /**
   * Start multi-model evaluation with file upload
   */
  async startEvaluationWithFile(
    file: File,
    externalModels: string[],
    localModelPath?: string,
    modelParameters: Record<string, ModelParameters> = {},
    batchSize: number = 10,
    runLocalFirst: boolean = true
  ): Promise<{ job_id: string; status: string; message: string; total_models: number; estimated_cost: number; estimated_time: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('external_models', JSON.stringify(externalModels));
    if (localModelPath) {
      formData.append('local_model_path', localModelPath);
    }
    formData.append('model_parameters', JSON.stringify(modelParameters));
    formData.append('batch_size', batchSize.toString());
    formData.append('run_local_first', runLocalFirst.toString());

    const response = await fetch(`${this.baseUrl}/multi-evaluate/evaluate-upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start evaluation with file');
    }

    return response.json();
  }

  /**
   * Start multi-model evaluation with base64 file content
   */
  async startEvaluationWithBase64(
    fileContent: string,
    fileType: string,
    externalModels: string[],
    localModelPath?: string,
    modelParameters: Record<string, ModelParameters> = {},
    batchSize: number = 10,
    runLocalFirst: boolean = true
  ): Promise<{ job_id: string; status: string; message: string; total_models: number; estimated_cost: number; estimated_time: number }> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/evaluate-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        local_model_path: localModelPath,
        external_models: externalModels,
        file_content: fileContent,
        file_type: fileType,
        model_parameters: modelParameters,
        batch_size: batchSize,
        run_local_first: runLocalFirst,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start evaluation with base64');
    }

    return response.json();
  }

  /**
   * Get status of a multi-model evaluation job
   */
  async getJobStatus(jobId: string): Promise<MultiModelEvaluationJob> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/jobs/${jobId}/status`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get job status');
    }

    return response.json();
  }

  /**
   * Get detailed progress of a multi-model evaluation job
   */
  async getJobProgress(jobId: string): Promise<EvaluationProgress> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/jobs/${jobId}/progress`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get job progress');
    }

    return response.json();
  }

  /**
   * Get results of a completed multi-model evaluation job
   */
  async getJobResults(jobId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/jobs/${jobId}/results`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get job results');
    }

    return response.json();
  }

  /**
   * List all multi-model evaluation jobs
   */
  async listJobs(): Promise<{ jobs: MultiModelEvaluationJob[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/jobs`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list jobs');
    }

    return response.json();
  }

  /**
   * Cancel a running multi-model evaluation job
   */
  async cancelJob(jobId: string): Promise<{ job_id: string; status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/jobs/${jobId}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to cancel job');
    }

    return response.json();
  }

  /**
   * Delete a multi-model evaluation job
   */
  async deleteJob(jobId: string): Promise<{ job_id: string; status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/jobs/${jobId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete job');
    }

    return response.json();
  }

  /**
   * Export job results in various formats
   */
  async exportResults(
    jobId: string,
    format: 'json' | 'csv' | 'excel' = 'json',
    includeRawResponses: boolean = true,
    includeMetrics: boolean = true,
    includeComparisons: boolean = true
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/multi-evaluate/jobs/${jobId}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_id: jobId,
        format,
        include_raw_responses: includeRawResponses,
        include_metrics: includeMetrics,
        include_comparisons: includeComparisons,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to export results');
    }

    return response.blob();
  }

  /**
   * Download exported results as a file
   */
  async downloadResults(
    jobId: string,
    format: 'json' | 'csv' | 'excel' = 'json',
    filename?: string
  ): Promise<void> {
    try {
      const blob = await this.exportResults(jobId, format);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `multi_model_evaluation_${jobId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Failed to download results: ${error}`);
    }
  }

  /**
   * Poll job status until completion
   */
  async pollJobStatus(
    jobId: string,
    onProgress?: (progress: EvaluationProgress) => void,
    intervalMs: number = 3000
  ): Promise<MultiModelEvaluationJob> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getJobStatus(jobId);
          
          if (onProgress) {
            const progress = await this.getJobProgress(jobId);
            onProgress(progress);
          }

          if (status.status === 'completed') {
            resolve(status);
          } else if (status.status === 'failed') {
            reject(new Error(status.error_message || 'Job failed'));
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
   * Validate test data format
   */
  validateTestData(data: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Test data must be an array');
      return { isValid: false, errors };
    }

    if (data.length === 0) {
      errors.push('Test data cannot be empty');
      return { isValid: false, errors };
    }

    // Check required fields
    const requiredFields = ['instruction', 'output'];

    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i];
      
      if (typeof row !== 'object' || row === null) {
        errors.push(`Row ${i + 1}: Must be an object`);
        continue;
      }

      for (const field of requiredFields) {
        if (!(field in row) || !row[field]) {
          errors.push(`Row ${i + 1}: Missing required field '${field}'`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const multiModelService = new MultiModelService();
export default multiModelService;
