export interface TrainingConfig {
  // Number of steps to accumulate gradients before update
  gradient_accumulation_steps: number;
  
  // Learning rate warmup steps
  warmup_steps: number;
  
  // LoRA adapter rank for parameter-efficient fine-tuning
  lora_rank: number;
  
  // Quantization method for model compression
  quantization: '4bit' | '8bit' | 'none';
  
  // Interval for logging metrics
  logging_steps: number;
  
  // L2 regularization factor
  weight_decay: number;
  
  // Random seed for reproducibility
  seed: number;
  
  // Experiment tracking platform
  report_to: 'wandb' | 'tensorboard' | 'none';
  
  // Maximum number of training steps
  max_steps: number;
}

// Default configuration values
export const defaultTrainingConfig: TrainingConfig = {
  gradient_accumulation_steps: 4,
  warmup_steps: 100,
  lora_rank: 8,
  quantization: '4bit',
  logging_steps: 10,
  weight_decay: 0.01,
  seed: 42,
  report_to: 'tensorboard',
  max_steps: 1000,
};

// Validate and merge user config with defaults
export function createTrainingConfig(userConfig: Partial<TrainingConfig>): TrainingConfig {
  return {
    ...defaultTrainingConfig,
    ...userConfig,
  };
}