import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ArrowLeft, ArrowRight, HelpCircle, RotateCcw, Zap } from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';
import { TrainingConfig, createTrainingConfig } from '../config/training';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function ConfigureTuning() {
  const navigate = useNavigate();
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>(() => createTrainingConfig({}));
  const [parameters, setParameters] = useState({
    epochs: 3,
    learningRate: 0.0002,
    batchSize: 8,
    maxSequenceLength: 2048,
    modelName: 'My-Fine-Tuned-Model',
    cutoff: 0.8, // Train/validation split
  });

  const handleChange = (field: string, value: string | number) => {
    setParameters({ ...parameters, [field]: value });
  };

  const handleStartFineTuning = async () => {
    // Get the file from local storage
    const trainingFile = localStorage.getItem('trainingFile');
    
    if (!trainingFile) {
      toast.error('No training file found. Please upload data first.');
      return;
    }
    
    // Parse the stored file data
    const { content, name, type } = JSON.parse(trainingFile);
    
    // Prepare the request payload
    const payload = {
      file_content: content,
      file_name: name,
      file_type: "json",
      model_name: 'unsloth/llama-3-8b-bnb-4bit',
      max_seq_length: parameters.maxSequenceLength,
      num_train_epochs: parameters.epochs,
      per_device_train_batch_size: parameters.batchSize,
      gradient_accumulation_steps: trainingConfig.gradient_accumulation_steps,
      learning_rate: parameters.learningRate,
      max_steps: trainingConfig.max_steps,
      warmup_steps: trainingConfig.warmup_steps,
      save_steps: 25,
      logging_steps: trainingConfig.logging_steps,
      output_dir: './my_results',
      lora_r: trainingConfig.lora_rank,
      lora_alpha: trainingConfig.lora_rank,
      lora_dropout: 0.0
    };
    
    // Show loading toast
    toast.loading('Starting fine-tuning process...');
    
    // Make API call
    fetch('https://finetune_engine.deepcite.in/finetune', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.detail?.[0]?.msg || 'Fine-tuning request failed');
        });
      }
      return response.json();
    })
    .then(data => {
      toast.dismiss();
      toast.success('Fine-tuning started successfully!');
      navigate('/progress');
    })
    .catch(error => {
      toast.dismiss();
      toast.error('Failed to start fine-tuning: ' + error.message);
    });
  };

  const resetToDefaults = () => {
    setParameters({
      epochs: 3,
      learningRate: 0.0002,
      batchSize: 8,
      maxSequenceLength: 512,
      modelName: 'My-Fine-Tuned-Model',
      cutoff: 0.8,
    });
  };

  // Calculate estimated time based on parameters (just a mock calculation)
  const estimatedTime = () => {
    const baseTime = 15; // minutes
    const epochFactor = parameters.epochs * 1.2;
    const batchFactor = 12 / parameters.batchSize;
    const sequenceFactor = parameters.maxSequenceLength / 256;
    
    return Math.round(baseTime * epochFactor * batchFactor * sequenceFactor);
  };

  // Calculate estimated cost (just a mock calculation)
  const estimatedCost = () => {
    const baseCost = 0.5; // dollars
    const epochFactor = parameters.epochs;
    const sizeFactor = 1.2;
    
    return (baseCost * epochFactor * sizeFactor).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configure Fine-Tuning</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Set hyperparameters and options for your fine-tuning job
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Training Parameters</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  onClick={resetToDefaults}
                >
                  Reset to defaults
                </Button>
              </CardTitle>
              <CardDescription>
                Configure how your model will be trained
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="epochs" className="block text-sm font-medium">
                      Number of Epochs
                    </label>
                    <Tooltip content="How many times to iterate through the training data">
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      id="epochs"
                      min="1"
                      max="10"
                      step="1"
                      value={parameters.epochs}
                      onChange={(e) => handleChange('epochs', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-12 text-center">
                      <Badge variant="primary">{parameters.epochs}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="learningRate" className="block text-sm font-medium">
                      Learning Rate
                    </label>
                    <Tooltip content="Controls how quickly the model adapts to new data">
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      id="learningRate"
                      min="0.00001"
                      max="0.001"
                      step="0.00001"
                      value={parameters.learningRate}
                      onChange={(e) => handleChange('learningRate', parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-20 text-center">
                      <Badge variant="primary">{parameters.learningRate.toExponential(4)}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1e-5</span>
                    <span>5e-4</span>
                    <span>1e-3</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="batchSize" className="block text-sm font-medium">
                      Batch Size
                    </label>
                    <Tooltip content="Number of training examples used in one iteration">
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      id="batchSize"
                      min="1"
                      max="32"
                      step="1"
                      value={parameters.batchSize}
                      onChange={(e) => handleChange('batchSize', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-12 text-center">
                      <Badge variant="primary">{parameters.batchSize}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1</span>
                    <span>16</span>
                    <span>32</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="maxSequenceLength" className="block text-sm font-medium">
                      Max Sequence Length
                    </label>
                    <Tooltip content="Maximum length of input text sequences">
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      id="maxSequenceLength"
                      min="128"
                      max="2048"
                      step="128"
                      value={parameters.maxSequenceLength}
                      onChange={(e) => handleChange('maxSequenceLength', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-16 text-center">
                      <Badge variant="primary">{parameters.maxSequenceLength}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>128</span>
                    <span>1024</span>
                    <span>2048</span>
                  </div>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="cutoff" className="block text-sm font-medium">
                      Training/Validation Split
                    </label>
                    <Tooltip content="Percentage of data used for training vs. validation">
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      id="cutoff"
                      min="0.5"
                      max="0.95"
                      step="0.05"
                      value={parameters.cutoff}
                      onChange={(e) => handleChange('cutoff', parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-16 text-center">
                      <Badge variant="primary">{`${Math.round(parameters.cutoff * 100)}%`}</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>50%</span>
                    <span>75%</span>
                    <span>95%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model Name and Description</CardTitle>
              <CardDescription>
                Set how your fine-tuned model will be identified
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="modelName" className="block text-sm font-medium mb-1">
                    Model Name
                  </label>
                  <input
                    type="text"
                    id="modelName"
                    value={parameters.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter a name for your fine-tuned model"
                  />
                </div>
                
                <div>
                  <label htmlFor="modelDescription" className="block text-sm font-medium mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="modelDescription"
                    rows={3}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Add a description of your model's purpose and capabilities"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tags (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      production
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      experimental
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      + Add Tag
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Options</CardTitle>
              <CardDescription>
                Optional configuration for experienced users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="loraRank" className="block text-sm font-medium mb-1">
                    LoRA Rank
                  </label>
                  <input
                    type="number"
                    id="loraRank"
                    value={trainingConfig.lora_rank}
                    onChange={(e) => setTrainingConfig(prev => ({ ...prev, lora_rank: parseInt(e.target.value) }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    min="1"
                    max="64"
                  />
                </div>
                
                <div>
                  <label htmlFor="quantization" className="block text-sm font-medium mb-1">
                    Quantization Method
                  </label>
                  <select
                    id="quantization"
                    value={trainingConfig.quantization}
                    onChange={(e) => setTrainingConfig(prev => ({ ...prev, quantization: e.target.value as '4bit' | '8bit' | 'none' }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="4bit">4-bit Quantization</option>
                    <option value="8bit">8-bit Quantization</option>
                    <option value="none">No Quantization</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="warmupSteps" className="block text-sm font-medium mb-1">
                    Warmup Steps
                  </label>
                  <input
                    type="number"
                    id="warmupSteps"
                    value={trainingConfig.warmup_steps}
                    onChange={(e) => setTrainingConfig(prev => ({ ...prev, warmup_steps: parseInt(e.target.value) }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    min="0"
                  />
                </div>
                
                <div>
                  <label htmlFor="weightDecay" className="block text-sm font-medium mb-1">
                    Weight Decay
                  </label>
                  <input
                    type="number"
                    id="weightDecay"
                    value={trainingConfig.weight_decay}
                    onChange={(e) => setTrainingConfig(prev => ({ ...prev, weight_decay: parseFloat(e.target.value) }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    step="0.001"
                    min="0"
                  />
                </div>
                
                <div>
                  <label htmlFor="gradAccumSteps" className="block text-sm font-medium mb-1">
                    Gradient Accumulation Steps
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="gradAccumSteps"
                      value={trainingConfig.gradient_accumulation_steps}
                      onChange={(e) => setTrainingConfig(prev => ({ ...prev, gradient_accumulation_steps: parseInt(e.target.value) }))}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                      min="1"
                      max="32"
                    />
                    <Tooltip content="Number of steps to accumulate gradients before updating model weights. Useful for training with larger effective batch sizes.">
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="reportTo" className="block text-sm font-medium mb-1">
                    Experiment Tracking
                  </label>
                  <select
                    id="reportTo"
                    value={trainingConfig.report_to}
                    onChange={(e) => setTrainingConfig(prev => ({ ...prev, report_to: e.target.value as 'wandb' | 'tensorboard' | 'none' }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="tensorboard">TensorBoard</option>
                    <option value="wandb">Weights & Biases</option>
                    <option value="none">No Tracking</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Options</CardTitle>
              <CardDescription>
                Optional configuration for experienced users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="lora"
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div>
                      <label htmlFor="lora" className="block text-sm font-medium">
                        Use LoRA Adapter
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Low-Rank Adaptation for more efficient fine-tuning
                      </p>
                    </div>
                  </div>
                  <Tooltip content="LoRA uses less memory and trains faster than full fine-tuning">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                  </Tooltip>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="earlyStopping"
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div>
                      <label htmlFor="earlyStopping" className="block text-sm font-medium">
                        Enable Early Stopping
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Stop training if validation loss doesn't improve
                      </p>
                    </div>
                  </div>
                  <Tooltip content="Prevents overfitting and saves time by stopping when performance plateaus">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                  </Tooltip>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="mixedPrecision"
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      defaultChecked
                    />
                    <div>
                      <label htmlFor="mixedPrecision" className="block text-sm font-medium">
                        Use Mixed Precision
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Reduces memory usage and speeds up training
                      </p>
                    </div>
                  </div>
                  <Tooltip content="Uses a combination of FP16 and FP32 precision for faster and memory-efficient training">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Training Summary</CardTitle>
              <CardDescription>
                Review your configuration before starting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Base Model</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">Mistral-7B-v0.1</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Dataset</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">3 files (2.3 MB total)</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Key Parameters</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Epochs</p>
                    <p className="text-gray-700 dark:text-gray-300">{parameters.epochs}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Batch Size</p>
                    <p className="text-gray-700 dark:text-gray-300">{parameters.batchSize}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Learning Rate</p>
                    <p className="text-gray-700 dark:text-gray-300">{parameters.learningRate.toExponential(4)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Max Sequence</p>
                    <p className="text-gray-700 dark:text-gray-300">{parameters.maxSequenceLength}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Output</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{parameters.modelName}</p>
              </div>
              
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium">Estimated Time</p>
                  <span className="text-sm font-medium">{estimatedTime()} min</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Estimated Cost</p>
                  <span className="text-sm font-medium">${estimatedCost()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center border-t">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                leftIcon={<Zap className="h-4 w-4" />}
                onClick={handleStartFineTuning}
              >
                Start Fine-Tuning
              </Button>
            </CardFooter>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/upload-data')}
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
