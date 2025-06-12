import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HelpCircle, RotateCcw, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';
import { createTrainingConfig } from '../../config/training';
import { useConfigureContext } from './ConfigureContext';
import { StepNavigation } from '../../components/ui/StepProgress';
import { ConfigurationManager } from '../../components/ui/ConfigurationManager';
import { ConfigurationReviewModal } from '../../components/ui/ConfigurationReviewModal';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import trainingSessionService from '../../services/trainingSessionService';

export default function ConfigureParameters() {
  const navigate = useNavigate();
  const { state, dispatch, completeCurrentStep } = useConfigureContext();
  const { parameters, trainingConfig, selectedBaseModel, files, validationStatus, activeModelTab } = state;

  // Local state for UI
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [showLoRAConfig, setShowLoRAConfig] = useState(true);
  const [showQuantizationConfig, setShowQuantizationConfig] = useState(true);
  const [showOptimization, setShowOptimization] = useState(false);
  const [showTrainingStability, setShowTrainingStability] = useState(false);
  const [showMemoryPerformance, setShowMemoryPerformance] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentConfigName, setCurrentConfigName] = useState('Default Settings');

  const handleParameterChange = (field: string, value: string | number) => {
    dispatch({ 
      type: 'SET_PARAMETERS', 
      payload: { [field]: value } 
    });
  };

  const handleTrainingConfigChange = (field: string, value: any) => {
    dispatch({ 
      type: 'SET_TRAINING_CONFIG', 
      payload: { [field]: value } 
    });
  };

  // Helper function to handle number input changes without immediate fallbacks
  const handleNumberInputChange = (field: string, value: string, min: number, max: number, isInteger: boolean = true) => {
    // Allow empty string during editing
    if (value === '') {
      return;
    }
    
    const numValue = isInteger ? parseInt(value) : parseFloat(value);
    
    // Only update if it's a valid number within range
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      handleParameterChange(field, numValue);
    }
  };

  // Helper function for training config number inputs
  const handleTrainingConfigNumberChange = (field: string, value: string, min: number, max: number, isInteger: boolean = true) => {
    // Allow empty string during editing
    if (value === '') {
      return;
    }
    
    const numValue = isInteger ? parseInt(value) : parseFloat(value);
    
    // Only update if it's a valid number within range
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      handleTrainingConfigChange(field, numValue);
    }
  };

  // Helper function to handle input blur (when user finishes editing)
  const handleNumberInputBlur = (field: string, value: string, min: number, defaultValue: number, isInteger: boolean = true) => {
    if (value === '' || isNaN(isInteger ? parseInt(value) : parseFloat(value))) {
      handleParameterChange(field, defaultValue);
    } else {
      const numValue = isInteger ? parseInt(value) : parseFloat(value);
      if (numValue < min) {
        handleParameterChange(field, min);
      }
    }
  };

  // Helper function for training config input blur
  const handleTrainingConfigInputBlur = (field: string, value: string, min: number, defaultValue: number, isInteger: boolean = true) => {
    if (value === '' || isNaN(isInteger ? parseInt(value) : parseFloat(value))) {
      handleTrainingConfigChange(field, defaultValue);
    } else {
      const numValue = isInteger ? parseInt(value) : parseFloat(value);
      if (numValue < min) {
        handleTrainingConfigChange(field, min);
      }
    }
  };

  // Helper function to handle input focus - select all text for easy replacement
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const resetToDefaults = () => {
    dispatch({ 
      type: 'SET_PARAMETERS', 
      payload: {
        epochs: 3,
        learningRate: 0.0002,
        batchSize: 8,
        maxSequenceLength: 2048,
        modelName: '',
        cutoff: 0.8,
        loggingSteps: 10,
      }
    });
    dispatch({ 
      type: 'SET_TRAINING_CONFIG', 
      payload: createTrainingConfig({})
    });
  };

  // Calculate estimated time based on parameters (mock calculation)
  const estimatedTime = () => {
    const baseTime = 15; // minutes
    const epochFactor = parameters.epochs * 1.2;
    const batchFactor = 12 / parameters.batchSize;
    const sequenceFactor = parameters.maxSequenceLength / 256;
    
    return Math.round(baseTime * epochFactor * batchFactor * sequenceFactor);
  };

  // Calculate estimated cost (mock calculation)
  const estimatedCost = () => {
    const baseCost = 0.5; // dollars
    const epochFactor = parameters.epochs;
    const sizeFactor = 1.2;
    
    return (baseCost * epochFactor * sizeFactor).toFixed(2);
  };

  // Handle loading a configuration
  const handleLoadConfig = (config: any) => {
    if (config.basic_parameters) {
      dispatch({ 
        type: 'SET_PARAMETERS', 
        payload: config.basic_parameters 
      });
    }

    if (config.advanced_parameters) {
      dispatch({ 
        type: 'SET_TRAINING_CONFIG', 
        payload: config.advanced_parameters 
      });
    }

    setCurrentConfigName(config.metadata?.name || 'Loaded Configuration');
  };

  // Get current configuration for saving
  const getCurrentConfig = () => {
    return {
      basic_parameters: parameters,
      advanced_parameters: trainingConfig
    };
  };

  const handleStartFineTuning = async () => {
    // Validate model name is not empty
    if (!parameters.modelName || parameters.modelName.trim() === '') {
      toast.error('Please enter a model name before starting fine-tuning.');
      return;
    }

    // Get the file from local storage
    const trainingFile = localStorage.getItem('trainingFile');
    
    if (!trainingFile) {
      toast.error('No training file found. Please upload data first.');
      return;
    }

    if (!selectedBaseModel) {
      toast.error('Please select a base model before starting fine-tuning.');
      return;
    }

    // Parse the stored file data
    const { content, name } = JSON.parse(trainingFile);

    // Create training session before starting the API call
    try {
      // Convert files from the context to File objects for the session
      const sessionFiles = files.map(file => {
        // Create a mock File object with the necessary properties
        const mockFile = new File([content], file.name, { type: 'application/json' });
        Object.defineProperty(mockFile, 'size', { value: file.size, writable: false });
        return mockFile;
      });

      // Create the training session
      const session = trainingSessionService.createSession(
        selectedBaseModel,
        sessionFiles,
        parameters,
        trainingConfig,
        parameters.modelName
      );

      console.log('Created training session:', session);
    } catch (error) {
      console.error('Failed to create training session:', error);
      // Continue with the API call even if session creation fails
    }

    // Get the model identifier based on the type
    const modelIdentifier = activeModelTab === 'huggingface' 
      ? selectedBaseModel.hf_model_id || selectedBaseModel.name
      : selectedBaseModel.name;
    
    // Prepare the request payload
    const payload = {
      file_content: content,
      file_name: name,
      file_type: "json",
      model_name: modelIdentifier,
      max_seq_length: parameters.maxSequenceLength,
      num_train_epochs: parameters.epochs,
      per_device_train_batch_size: parameters.batchSize,
      gradient_accumulation_steps: trainingConfig.gradient_accumulation_steps,
      learning_rate: parameters.learningRate,
      warmup_steps: trainingConfig.warmup_steps,
      save_steps: trainingConfig.save_steps,
      logging_steps: parameters.loggingSteps,
      output_dir: `./results/${parameters.modelName}`,
      
      // LoRA Configuration
      lora_r: trainingConfig.lora_rank,
      lora_alpha: trainingConfig.lora_alpha,
      lora_dropout: trainingConfig.lora_dropout,
      
      // Optimization Parameters
      lr_scheduler_type: trainingConfig.lr_scheduler_type,
      adam_beta1: trainingConfig.adam_beta1,
      adam_beta2: trainingConfig.adam_beta2,
      adam_epsilon: trainingConfig.adam_epsilon,
      max_grad_norm: trainingConfig.max_grad_norm,
      
      // Training Stability
      weight_decay: trainingConfig.weight_decay,
      dropout_rate: trainingConfig.dropout_rate,
      attention_dropout: trainingConfig.attention_dropout,
      label_smoothing_factor: trainingConfig.label_smoothing_factor,
      
      // Memory & Performance
      dataloader_num_workers: trainingConfig.dataloader_num_workers,
      dataloader_pin_memory: trainingConfig.dataloader_pin_memory,
      gradient_checkpointing: trainingConfig.gradient_checkpointing,
      fp16: trainingConfig.fp16,
      bf16: trainingConfig.bf16,
      
      // Quantization
      quantization: trainingConfig.quantization,
      
      // Additional options
      seed: trainingConfig.seed,
      remove_unused_columns: trainingConfig.remove_unused_columns,
      push_to_hub: trainingConfig.push_to_hub,
      hub_model_id: trainingConfig.hub_model_id,
      report_to: trainingConfig.report_to
    };
    
    console.log(payload);
    
    // Show loading toast
    toast.loading('Starting fine-tuning process...');
    
    // Make API call
    try {
      const response = await fetch('https://finetune_engine.deepcite.in/finetune', {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail?.[0]?.msg || 'Fine-tuning request failed');
      }

      const data = await response.json();
      
      // Update session with the backend-returned session ID
      if (data.job_id) {
        console.log('Updating session with backend job_id:', data.job_id);
        trainingSessionService.updateSessionId(data.job_id);
      }
      
      // Update session status to indicate training has started
      trainingSessionService.updateSessionStatus('initializing');
      
      toast.dismiss();
      toast.success('Fine-tuning started successfully!');
      navigate('/progress');
    } catch (error: any) {
      toast.dismiss();
      toast.error('Failed to start fine-tuning: ' + error.message);
      
      // Update session status to failed if API call fails
      trainingSessionService.updateSessionStatus('failed');
    }
  };

  // Handle navigation
  const handlePrevious = () => {
    navigate('/configure/data');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configure Training Parameters</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Set up hyperparameters and advanced settings for your fine-tuning job
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Model Name and Description */}
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
            Model Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="modelName"
            value={parameters.modelName}
            onChange={(e) => handleParameterChange('modelName', e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
              parameters.modelName.trim() === '' 
                ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 focus:ring-red-500' 
                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-primary-500'
            }`}
            placeholder="Enter a name for your fine-tuned model"
            required
          />
          {parameters.modelName.trim() === '' && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Model name is required
            </p>
          )}
        </div>
      </div>
    </CardContent>
          </Card>

          {/* Parameters Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Parameters</span>
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
              
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Basic Parameters Section */}
              <div className="space-y-4">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Basic Parameters</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Configure the core hyperparameters for your fine-tuning job</p>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Epochs */}
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
                      onChange={(e) => handleParameterChange('epochs', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-16">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        step="1"
                        value={parameters.epochs}
                        onChange={(e) => handleNumberInputChange('epochs', e.target.value, 1, 10, true)}
                        onBlur={(e) => handleNumberInputBlur('epochs', e.target.value, 1, 3, true)}
                        onFocus={handleInputFocus}
                        className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
                
                {/* Learning Rate */}
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
                      onChange={(e) => handleParameterChange('learningRate', parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-24">
                      <input
                        type="number"
                        min="0.00001"
                        max="0.001"
                        step="0.00001"
                        value={parameters.learningRate}
                        onChange={(e) => handleNumberInputChange('learningRate', e.target.value, 0.00001, 0.001, false)}
                        onBlur={(e) => handleNumberInputBlur('learningRate', e.target.value, 0.00001, 0.0002, false)}
                        onFocus={handleInputFocus}
                        className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1e-5</span>
                    <span>5e-4</span>
                    <span>1e-3</span>
                  </div>
                </div>
                
                {/* Batch Size */}
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
                      onChange={(e) => handleParameterChange('batchSize', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-16">
                      <input
                        type="number"
                        min="1"
                        max="32"
                        step="1"
                        value={parameters.batchSize}
                        onChange={(e) => handleNumberInputChange('batchSize', e.target.value, 1, 32, true)}
                        onBlur={(e) => handleNumberInputBlur('batchSize', e.target.value, 1, 8, true)}
                        onFocus={handleInputFocus}
                        className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1</span>
                    <span>16</span>
                    <span>32</span>
                  </div>
                </div>
                
                {/* Max Sequence Length */}
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
                      onChange={(e) => handleParameterChange('maxSequenceLength', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-20">
                      <input
                        type="number"
                        min="128"
                        max="2048"
                        step="128"
                        value={parameters.maxSequenceLength}
                        onChange={(e) => handleNumberInputChange('maxSequenceLength', e.target.value, 128, 2048, true)}
                        onBlur={(e) => handleNumberInputBlur('maxSequenceLength', e.target.value, 128, 2048, true)}
                        onFocus={handleInputFocus}
                        className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>128</span>
                    <span>1024</span>
                    <span>2048</span>
                  </div>
                </div>
                
                {/* Logging Steps */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="loggingSteps" className="block text-sm font-medium">
                      Logging Steps
                    </label>
                    <Tooltip content="How often to log training metrics. Lower values provide more frequent updates but may slow training slightly.">
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      id="loggingSteps"
                      min="1"
                      max="100"
                      step="1"
                      value={parameters.loggingSteps}
                      onChange={(e) => handleParameterChange('loggingSteps', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-16">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={parameters.loggingSteps}
                        onChange={(e) => handleNumberInputChange('loggingSteps', e.target.value, 1, 100, true)}
                        onBlur={(e) => handleNumberInputBlur('loggingSteps', e.target.value, 1, 10, true)}
                        onFocus={handleInputFocus}
                        className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
                
                {/* Training/Validation Split */}
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
                      min="0.1"
                      max="0.95"
                      step="0.05"
                      value={parameters.cutoff}
                      onChange={(e) => handleParameterChange('cutoff', parseFloat(e.target.value))}
                      
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="w-20">
                      <input
                        type="number"
                        min="0.5"
                        max="0.95"
                        step="0.05"
                        value={Math.round(parameters.cutoff * 100)}
                        onChange={(e) => handleParameterChange('cutoff', (parseInt(e.target.value) || 50) / 100)}
                        onFocus={handleInputFocus}
                        className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>50%</span>
                    <span>75%</span>
                    <span>95%</span>
                  </div>
                </div>
                </div>
              </div>

              {/* Advanced Parameters Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Advanced Parameters</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Fine-tune optimization, LoRA, memory settings, and monitoring options</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                    leftIcon={showAdvancedParams ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  >
                    {showAdvancedParams ? 'Hide Advanced' : 'Show Advanced'}
                  </Button>
                </div>
                {showAdvancedParams && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >

                  {/* Quantization Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Quantization Configuration</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Configure model quantization for memory optimization</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQuantizationConfig(!showQuantizationConfig)}
                        leftIcon={showQuantizationConfig ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        className="text-xs"
                      >
                        {showQuantizationConfig ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    {showQuantizationConfig && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        {/* Quantization Method */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="quantization" className="block text-sm font-medium">
                              Quantization Method
                            </label>
                            <Tooltip content="Quantization reduces memory usage by using lower precision weights. Choose based on your hardware constraints and accuracy requirements.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <select
                            id="quantization"
                            value={trainingConfig.quantization}
                            onChange={(e) => handleTrainingConfigChange('quantization', e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="4bit">4-bit Quantization (Maximum Memory Savings)</option>
                            <option value="8bit">8-bit Quantization (Balanced Memory/Accuracy)</option>
                            <option value="none">No Quantization (Full Precision)</option>
                          </select>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {trainingConfig.quantization === '4bit' && (
                              <span>🔹 Recommended for limited GPU memory. Minimal accuracy loss with significant memory savings.</span>
                            )}
                            {trainingConfig.quantization === '8bit' && (
                              <span>🔸 Good balance between memory usage and model accuracy. Suitable for most use cases.</span>
                            )}
                            {trainingConfig.quantization === 'none' && (
                              <span>🔶 Full precision training. Requires more GPU memory but maintains maximum accuracy.</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  {/* LoRA Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">LoRA Configuration</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Low-Rank Adaptation parameters for efficient fine-tuning</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLoRAConfig(!showLoRAConfig)}
                        leftIcon={showLoRAConfig ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        className="text-xs"
                      >
                        {showLoRAConfig ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    {showLoRAConfig && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                      >
                        {/* LoRA Rank */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="loraRank" className="block text-sm font-medium">
                              LoRA Rank
                            </label>
                            <Tooltip content="Rank of the low-rank adaptation matrices. Higher values allow more expressiveness but use more memory.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="loraRank"
                              min="1"
                              max="64"
                              step="1"
                              value={trainingConfig.lora_rank}
                              onChange={(e) => handleTrainingConfigChange('lora_rank', parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-16">
                              <input
                                type="number"
                                min="1"
                                max="64"
                                step="1"
                                value={trainingConfig.lora_rank}
                                onChange={(e) => handleTrainingConfigChange('lora_rank', parseInt(e.target.value) || 1)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        

                        {/* LoRA Alpha */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="loraAlpha" className="block text-sm font-medium">
                              LoRA Alpha
                            </label>
                            <Tooltip content="Scaling factor for LoRA. Typically set to 2x the rank value.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="loraAlpha"
                              min="1"
                              max="128"
                              step="1"
                              value={trainingConfig.lora_alpha}
                              onChange={(e) => handleTrainingConfigChange('lora_alpha', parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-16">
                              <input
                                type="number"
                                min="1"
                                max="128"
                                step="1"
                                value={trainingConfig.lora_alpha}
                                onChange={(e) => handleTrainingConfigChange('lora_alpha', parseInt(e.target.value) || 1)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {/* LoRA Dropout */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="loraDropout" className="block text-sm font-medium">
                              LoRA Dropout
                            </label>
                            <Tooltip content="Dropout rate applied to LoRA layers for regularization.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="loraDropout"
                              min="0"
                              max="0.5"
                              step="0.01"
                              value={trainingConfig.lora_dropout}
                              onChange={(e) => handleTrainingConfigChange('lora_dropout', parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-16">
                              <input
                                type="number"
                                min="0"
                                max="0.5"
                                step="0.01"
                                value={trainingConfig.lora_dropout}
                                onChange={(e) => handleTrainingConfigChange('lora_dropout', parseFloat(e.target.value) || 0)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>0</span>
                            <span>0.25</span>
                            <span>0.5</span>
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </div>


                  {/* Optimization Parameters */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Optimization Parameters</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Configure optimizer and learning rate scheduling</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOptimization(!showOptimization)}
                        leftIcon={showOptimization ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        className="text-xs"
                      >
                        {showOptimization ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    {showOptimization && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="lrScheduler" className="block text-sm font-medium">
                              Learning Rate Scheduler
                            </label>
                            <Tooltip content="Learning rate scheduling strategy during training.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <select
                            id="lrScheduler"
                            value={trainingConfig.lr_scheduler_type}
                            onChange={(e) => handleTrainingConfigChange('lr_scheduler_type', e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="linear">Linear</option>
                            <option value="cosine">Cosine</option>
                            <option value="polynomial">Polynomial</option>
                            <option value="constant">Constant</option>
                            <option value="constant_with_warmup">Constant with Warmup</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="warmupSteps" className="block text-sm font-medium">
                              Warmup Steps
                            </label>
                            <Tooltip content="Number of steps to gradually increase learning rate from 0 to target value.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="warmupSteps"
                              min="0"
                              max="1000"
                              step="10"
                              value={trainingConfig.warmup_steps}
                              onChange={(e) => handleTrainingConfigChange('warmup_steps', parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-20">
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                step="10"
                                value={trainingConfig.warmup_steps}
                                onChange={(e) => handleTrainingConfigChange('warmup_steps', parseInt(e.target.value) || 0)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="adamBeta1" className="block text-sm font-medium">
                              Adam Beta1
                            </label>
                            <Tooltip content="Exponential decay rate for first moment estimates in Adam optimizer.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="adamBeta1"
                              min="0.8"
                              max="0.99"
                              step="0.01"
                              value={trainingConfig.adam_beta1}
                              onChange={(e) => handleTrainingConfigChange('adam_beta1', parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-16">
                              <input
                                type="number"
                                min="0.8"
                                max="0.99"
                                step="0.01"
                                value={trainingConfig.adam_beta1}
                                onChange={(e) => handleTrainingConfigChange('adam_beta1', parseFloat(e.target.value) || 0.9)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="adamBeta2" className="block text-sm font-medium">
                              Adam Beta2
                            </label>
                            <Tooltip content="Exponential decay rate for second moment estimates in Adam optimizer.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="adamBeta2"
                              min="0.99"
                              max="0.9999"
                              step="0.0001"
                              value={trainingConfig.adam_beta2}
                              onChange={(e) => handleTrainingConfigChange('adam_beta2', parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-20">
                              <input
                                type="number"
                                min="0.99"
                                max="0.9999"
                                step="0.0001"
                                value={trainingConfig.adam_beta2}
                                onChange={(e) => handleTrainingConfigChange('adam_beta2', parseFloat(e.target.value) || 0.999)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="maxGradNorm" className="block text-sm font-medium">
                              Max Gradient Norm
                            </label>
                            <Tooltip content="Maximum norm for gradient clipping to prevent exploding gradients.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="maxGradNorm"
                              min="0.1"
                              max="10"
                              step="0.1"
                              value={trainingConfig.max_grad_norm}
                              onChange={(e) => handleTrainingConfigChange('max_grad_norm', parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-16">
                              <input
                                type="number"
                                min="0.1"
                                max="10"
                                step="0.1"
                                value={trainingConfig.max_grad_norm}
                                onChange={(e) => handleTrainingConfigChange('max_grad_norm', parseFloat(e.target.value) || 1.0)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="gradAccumSteps" className="block text-sm font-medium">
                              Gradient Accumulation Steps
                            </label>
                            <Tooltip content="Number of steps to accumulate gradients before updating model weights.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="gradAccumSteps"
                              min="1"
                              max="32"
                              step="1"
                              value={trainingConfig.gradient_accumulation_steps}
                              onChange={(e) => handleTrainingConfigChange('gradient_accumulation_steps', parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-16">
                              <input
                                type="number"
                                min="1"
                                max="32"
                                step="1"
                                value={trainingConfig.gradient_accumulation_steps}
                                onChange={(e) => handleTrainingConfigChange('gradient_accumulation_steps', parseInt(e.target.value) || 1)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Training Stability */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Training Stability</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Regularization and stability parameters</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTrainingStability(!showTrainingStability)}
                        leftIcon={showTrainingStability ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        className="text-xs"
                      >
                        {showTrainingStability ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    {showTrainingStability && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="weightDecay" className="block text-sm font-medium">
                              Weight Decay
                            </label>
                            <Tooltip content="L2 regularization parameter to prevent overfitting.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="weightDecay"
                              min="0"
                              max="0.1"
                              step="0.001"
                              value={trainingConfig.weight_decay}
                              onChange={(e) => handleTrainingConfigChange('weight_decay', parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-20">
                              <input
                                type="number"
                                min="0"
                                max="0.1"
                                step="0.001"
                                value={trainingConfig.weight_decay}
                                onChange={(e) => handleTrainingConfigChange('weight_decay', parseFloat(e.target.value) || 0)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="dropoutRate" className="block text-sm font-medium">
                              Dropout Rate
                            </label>
                            <Tooltip content="Probability of randomly setting input units to 0 during training.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="dropoutRate"
                              min="0"
                              max="0.5"
                              step="0.01"
                              value={trainingConfig.dropout_rate}
                              onChange={(e) => handleTrainingConfigChange('dropout_rate', parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-16">
                              <input
                                type="number"
                                min="0"
                                max="0.5"
                                step="0.01"
                                value={trainingConfig.dropout_rate}
                                onChange={(e) => handleTrainingConfigChange('dropout_rate', parseFloat(e.target.value) || 0)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="attentionDropout" className="block text-sm font-medium">
                              Attention Dropout
                            </label>
                            <Tooltip content="Dropout rate specifically applied to attention layers.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="attentionDropout"
                              min="0"
                              max="0.5"
                              step="0.01"
                              value={trainingConfig.attention_dropout}
                              onChange={(e) => handleTrainingConfigChange('attention_dropout', parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-16">
                              <input
                                type="number"
                                min="0"
                                max="0.5"
                                step="0.01"
                                value={trainingConfig.attention_dropout}
                                onChange={(e) => handleTrainingConfigChange('attention_dropout', parseFloat(e.target.value) || 0)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="labelSmoothing" className="block text-sm font-medium">
                              Label Smoothing
                            </label>
                            <Tooltip content="Smooths target labels to prevent overconfident predictions.">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id="labelSmoothing"
                              min="0"
                              max="0.3"
                              step="0.01"
                              value={trainingConfig.label_smoothing_factor}
                              onChange={(e) => handleTrainingConfigChange('label_smoothing_factor', parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-16">
                              <input
                                type="number"
                                min="0"
                                max="0.3"
                                step="0.01"
                                value={trainingConfig.label_smoothing_factor}
                                onChange={(e) => handleTrainingConfigChange('label_smoothing_factor', parseFloat(e.target.value) || 0)}
                                onFocus={handleInputFocus}
                                className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Memory & Performance */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Memory & Performance</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Optimize memory usage and training performance</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMemoryPerformance(!showMemoryPerformance)}
                        leftIcon={showMemoryPerformance ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        className="text-xs"
                      >
                        {showMemoryPerformance ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    {showMemoryPerformance && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label htmlFor="dataloaderWorkers" className="block text-sm font-medium">
                                Dataloader Workers
                              </label>
                              <Tooltip content="Number of parallel workers for data loading.">
                                <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                              </Tooltip>
                            </div>
                            <div className="flex items-center space-x-3">
                              <input
                                type="range"
                                id="dataloaderWorkers"
                                min="0"
                                max="8"
                                step="1"
                                value={trainingConfig.dataloader_num_workers}
                                onChange={(e) => handleTrainingConfigChange('dataloader_num_workers', parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                              />
                              <div className="w-16">
                                <input
                                  type="number"
                                  min="0"
                                  max="8"
                                  step="1"
                                  value={trainingConfig.dataloader_num_workers}
                                  onChange={(e) => handleTrainingConfigChange('dataloader_num_workers', parseInt(e.target.value) || 0)}
                                  onFocus={handleInputFocus}
                                  className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                          </div>

                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="pinMemory"
                                checked={trainingConfig.dataloader_pin_memory}
                                onChange={(e) => handleTrainingConfigChange('dataloader_pin_memory', e.target.checked)}
                                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <div>
                                <label htmlFor="pinMemory" className="block text-sm font-medium">
                                  Pin Memory
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Faster data transfer to GPU
                                </p>
                              </div>
                            </div>
                            <Tooltip content="Pins memory for faster GPU data transfer">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="gradientCheckpointing"
                                checked={trainingConfig.gradient_checkpointing}
                                onChange={(e) => handleTrainingConfigChange('gradient_checkpointing', e.target.checked)}
                                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <div>
                                <label htmlFor="gradientCheckpointing" className="block text-sm font-medium">
                                  Gradient Checkpointing
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Trade compute for memory savings
                                </p>
                              </div>
                            </div>
                            <Tooltip content="Reduces memory usage at the cost of additional computation">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="fp16"
                                checked={trainingConfig.fp16}
                                onChange={(e) => handleTrainingConfigChange('fp16', e.target.checked)}
                                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <div>
                                <label htmlFor="fp16" className="block text-sm font-medium">
                                  FP16 Mixed Precision
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Faster training with half precision
                                </p>
                              </div>
                            </div>
                            <Tooltip content="Uses 16-bit floating point for faster training">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="bf16"
                                checked={trainingConfig.bf16}
                                onChange={(e) => handleTrainingConfigChange('bf16', e.target.checked)}
                                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <div>
                                <label htmlFor="bf16" className="block text-sm font-medium">
                                  BF16 Mixed Precision
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Better numerical stability than FP16
                                </p>
                              </div>
                            </div>
                            <Tooltip content="Brain floating point 16-bit with better numerical stability">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>



          {/* Final Review Button */}
          <div className="flex justify-center py-8 px-6">
            <Button
              variant="primary"
              size="lg"
              className="w-full max-w-md"
              leftIcon={<Settings className="h-5 w-5" />}
              onClick={() => setIsReviewModalOpen(true)}
            >
              Review Configuration
            </Button>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Configuration Management */}
          <ConfigurationManager
            currentConfig={getCurrentConfig()}
            onLoadConfig={handleLoadConfig}
            currentConfigName={currentConfigName}
          />

          {/* Training Summary */}
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
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedBaseModel ? selectedBaseModel.name : 'No model selected'}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Dataset</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {files.length > 0 
                    ? `${files.length} file${files.length > 1 ? 's' : ''} (${(files.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(2)} MB total)`
                    : 'No files uploaded'
                  }
                </p>
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
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Logging Steps</p>
                    <p className="text-gray-700 dark:text-gray-300">{parameters.loggingSteps}</p>
                  </div>
                </div>
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
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <StepNavigation
        currentStep={3}
        totalSteps={3}
        onPrevious={handlePrevious}
        onComplete={() => setIsReviewModalOpen(true)}
        canProceed={true}
        completeLabel="Review & Start Training"
      />

      {/* Configuration Review Modal */}
      <ConfigurationReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onStartTraining={handleStartFineTuning}
        configuration={{
          selectedBaseModel,
          files,
          validationStatus,
          parameters,
          trainingConfig,
          estimatedTime: estimatedTime(),
          estimatedCost: estimatedCost()
        }}
      />
    </div>
  );
}
