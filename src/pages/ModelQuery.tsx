import { useState, useRef, useEffect } from 'react';
import { ArrowRight, CornerDownLeft, Copy, CheckCheck, MessageSquare, Scale, Send, DownloadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { motion } from 'framer-motion';
import { chatApi, Model } from '../services/chatApi';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

export default function ModelQuery() {
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [compareModelId, setCompareModelId] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentLoadedModel, setCurrentLoadedModel] = useState<string | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [modelLoadSuccess, setModelLoadSuccess] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(256);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copySuccess, setCopySuccess] = useState<{[key: string]: boolean}>({});
  
  // Get selected model info
  const selectedModel = availableModels.find((m: Model) => m.id === selectedModelId);
  const compareModel = availableModels.find((m: Model) => m.id === compareModelId);
  
  // Load available models function
  const loadModels = async () => {
    try {
      setIsLoadingModels(true);
      setModelError(null);
      setRetryCount(prev => prev + 1);
      const models = await chatApi.fetchAvailableModels();
      setAvailableModels(models);
      
      // Set default selected models
      if (models.length > 0) {
        setSelectedModelId(models[0].id);
        if (models.length > 1) {
          setCompareModelId(models[1].id);
        }
      }
      setRetryCount(0); // Reset retry count on success
    } catch (error: any) {
      console.error('Failed to load models:', error);
      setModelError(error.message || 'Failed to load available models. Please try again.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Retry loading models
  const handleRetryLoadModels = () => {
    loadModels();
  };

  // Load model function
  const loadSelectedModel = async (modelName: string, forceReload: boolean = false) => {
    if (!modelName) return;
    
    // Check if model is already loaded and not forcing reload
    if (modelName === currentLoadedModel && !forceReload) {
      setModelLoadSuccess(true);
      setTimeout(() => setModelLoadSuccess(false), 2000);
      return;
    }
    
    try {
      setIsLoadingModel(true);
      setModelLoadError(null);
      setModelLoadSuccess(false);
      console.log('Loading model:', modelName);
      
      await chatApi.loadModelByName(modelName);
      setCurrentLoadedModel(modelName);
      setModelLoadSuccess(true);
      console.log('Model loaded successfully:', modelName);
      
      // Clear success message after 3 seconds
      setTimeout(() => setModelLoadSuccess(false), 3000);
    } catch (error: any) {
      console.error('Failed to load model:', error);
      setModelLoadError(error.message || 'Failed to load model. Please try again.');
      setCurrentLoadedModel(null);
    } finally {
      setIsLoadingModel(false);
    }
  };

  // Handle model selection change (no auto-loading)
  const handleModelSelection = (modelId: string) => {
    setSelectedModelId(modelId);
    setModelLoadError(null);
    setModelLoadSuccess(false);
  };

  // Handle manual model loading
  const handleLoadModel = () => {
    const selectedModel = availableModels.find(m => m.id === selectedModelId);
    if (selectedModel) {
      loadSelectedModel(selectedModel.name);
    }
  };

  // Handle force reload
  const handleForceReload = () => {
    const selectedModel = availableModels.find(m => m.id === selectedModelId);
    if (selectedModel) {
      loadSelectedModel(selectedModel.name, true);
    }
  };

  // Load available models on component mount
  useEffect(() => {
    loadModels();
  }, []);


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: ChatMessage = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGenerating(true);
    
    // Generate responses for both models
    await generateResponse(selectedModelId, inputValue);
    if (showCompare) {
      await generateResponse(compareModelId, inputValue, 50); // Slight delay for the comparison model
    }
    
    setIsGenerating(false);
  };

  const generateResponse = async (modelId: string, prompt: string, delay = 0) => {
    const model = availableModels.find(m => m.id === modelId);
    if (!model) return;

    // Add delay for comparison model
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Create initial empty message
    const newMessage: ChatMessage = { 
      role: 'assistant', 
      content: '',
      model: model.name
    };
    
    setMessages(prev => [...prev, newMessage]);
    const messageIndex = messages.length + 1; // +1 because we just added user message

    try {
      // Use streaming chat API
      await chatApi.streamChat(
        prompt,
        {
          max_tokens: maxTokens,
          temperature: temperature,
        },
        // onChunk callback - update message content as chunks arrive
        (chunk: string) => {
          setMessages(prev => 
            prev.map((msg, idx) => 
              idx === messageIndex ? { ...msg, content: msg.content + chunk } : msg
            )
          );
        },
        // onComplete callback
        () => {
          console.log('Streaming completed for model:', model.name);
        },
        // onError callback
        (error: Error) => {
          console.error('Streaming error for model:', model.name, error);
          setMessages(prev => 
            prev.map((msg, idx) => 
              idx === messageIndex ? { 
                ...msg, 
                content: msg.content + '\n\n[Error: Failed to get response from model. Please try again.]'
              } : msg
            )
          );
        }
      );
    } catch (error) {
      console.error('Failed to generate response:', error);
      setMessages(prev => 
        prev.map((msg, idx) => 
          idx === messageIndex ? { 
            ...msg, 
            content: '[Error: Failed to connect to the model. Please check your connection and try again.]'
          } : msg
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, messageIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopySuccess({...copySuccess, [messageIndex]: true});
    setTimeout(() => {
      setCopySuccess({...copySuccess, [messageIndex]: false});
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Query Models</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Test and compare your fine-tuned models
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Models</CardTitle>
              <CardDescription>
                Choose which models to query
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingModels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading models...</span>
                </div>
              ) : modelError ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="flex items-center">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                    <span className="ml-2 text-sm text-red-600">{modelError}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryLoadModels}
                    disabled={isLoadingModels}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Primary Model
                    </label>
                    <select
                      value={selectedModelId}
                      onChange={(e) => handleModelSelection(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={availableModels.length === 0 || isLoadingModel}
                    >
                      {availableModels.length === 0 ? (
                        <option value="">No models available</option>
                      ) : (
                        availableModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))
                      )}
                    </select>
                    
                    {/* Load Model Button */}
                    <div className="mt-3">
                      <Button
                        variant={currentLoadedModel === selectedModel?.name ? "outline" : "primary"}
                        size="sm"
                        onClick={handleLoadModel}
                        disabled={!selectedModelId || isLoadingModel}
                        isLoading={isLoadingModel}
                        className="w-full"
                      >
                        {isLoadingModel ? (
                          "Loading Model..."
                        ) : currentLoadedModel === selectedModel?.name ? (
                          "Model Loaded"
                        ) : (
                          "Load Model"
                        )}
                      </Button>
                    </div>

                    {/* Model Status Display */}
                    <div className="mt-2 space-y-1">
                      {isLoadingModel && (
                        <div className="flex items-center text-sm text-blue-600">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading "{selectedModel?.name}"...
                        </div>
                      )}
                      
                      {modelLoadSuccess && !isLoadingModel && (
                        <div className="flex items-center text-sm text-green-600">
                          <CheckCheck className="h-4 w-4 mr-2" />
                          Successfully loaded!
                        </div>
                      )}
                      
                      {currentLoadedModel && !isLoadingModel && !modelLoadSuccess && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-green-600">
                            <CheckCheck className="h-4 w-4 mr-2" />
                            <span>"{currentLoadedModel}" is loaded</span>
                          </div>
                          {currentLoadedModel === selectedModel?.name && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleForceReload}
                              className="text-xs px-2 py-1 h-auto"
                            >
                              Reload
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {!currentLoadedModel && !isLoadingModel && !modelLoadError && selectedModelId && (
                        <div className="flex items-center text-sm text-gray-500">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          No model loaded
                        </div>
                      )}
                      
                      {modelLoadError && (
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-red-600">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {modelLoadError}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLoadModel}
                            className="text-xs"
                          >
                            Retry Loading
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex items-center space-x-3 pt-1">
                <input
                  type="checkbox"
                  id="compareMode"
                  checked={showCompare}
                  onChange={() => setShowCompare(!showCompare)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="compareMode" className="text-sm">
                  Compare with base model
                </label>
              </div>
              
              {showCompare && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="pt-2">
                    <label className="block text-sm font-medium mb-1">
                      Comparison Model
                    </label>
                    <select
                      value={compareModelId}
                      onChange={(e) => setCompareModelId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {availableModels
                        .filter((model) => model.id !== selectedModelId)
                        .map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </motion.div>
              )}

              <div className="pt-4">
                <h4 className="text-sm font-medium mb-3">Parameters</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="temperature" className="text-xs font-medium">
                        Temperature
                      </label>
                      <span className="text-xs">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      id="temperature"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="maxTokens" className="text-xs font-medium">
                        Max Tokens
                      </label>
                      <span className="text-xs">{maxTokens}</span>
                    </div>
                    <input
                      type="range"
                      id="maxTokens"
                      min="32"
                      max="2048"
                      step="32"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                  </div>
                  
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t flex-col space-y-3 items-start">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p className="font-medium mb-1">Selected Model Info</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>Size: <span className="text-gray-700 dark:text-gray-300">{selectedModel?.size}</span></div>
                  <div>Type: <span className="text-gray-700 dark:text-gray-300">{selectedModel?.isBase ? 'Base' : 'Fine-tuned'}</span></div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<DownloadCloud className="h-4 w-4" />}
                className="w-full"
              >
                Download Model
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:col-span-3 h-full flex flex-col">
          <Card className="flex-1 flex flex-col h-full">
            <CardHeader className="border-b">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5 text-primary-500" />
                <div>
                  <CardTitle>Model Chat</CardTitle>
                  <CardDescription>
                    {showCompare ? 'Compare responses from different models' : 'Test your selected model'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-4">
                      <MessageSquare className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="font-medium mb-1">No messages yet</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                      Send a message to start chatting with the selected model
                    </p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-md">
                      <Button
                        variant="outline" 
                        size="sm"
                        className="justify-start text-left"
                        onClick={() => setInputValue("What's the difference between fine-tuning and prompt engineering?")}
                      >
                        Explain fine-tuning vs prompt engineering
                      </Button>
                      <Button
                        variant="outline" 
                        size="sm"
                        className="justify-start text-left"
                        onClick={() => setInputValue("My shipment is delayed. Can you help me?")}
                      >
                        Help with a delayed shipment
                      </Button>
                      <Button
                        variant="outline" 
                        size="sm"
                        className="justify-start text-left"
                        onClick={() => setInputValue("Write a function to check order status")}
                      >
                        Generate a status-checking function
                      </Button>
                      <Button
                        variant="outline" 
                        size="sm"
                        className="justify-start text-left"
                        onClick={() => setInputValue("Summarize the key benefits of small LLMs")}
                      >
                        Summarize small LLM benefits
                      </Button>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div key={index} className="flex flex-col">
                      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                          inline-block rounded-lg px-4 py-2 max-w-[85%] md:max-w-[75%] break-words
                          ${message.role === 'user' 
                            ? 'bg-primary-600 text-white' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}
                        `}>
                          {message.role === 'assistant' && message.model && (
                            <div className="mb-1 flex items-center gap-2">
                              <Badge variant={message.model.includes('fine-tuned') || !message.model.includes('v0.1') ? 'secondary' : 'outline'} size="sm">
                                {message.model}
                              </Badge>
                              <button
                                onClick={() => copyToClipboard(message.content, index)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                aria-label="Copy text"
                              >
                                {copySuccess[index] ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          )}
                          <div className="text-sm whitespace-pre-line">
                            {message.content}
                          </div>
                        </div>
                      </div>

                      {message.role === 'assistant' && showCompare && message.model === compareModel?.name && (
                        <div className="mt-2 flex justify-center">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800/50 rounded-full">
                            <Scale className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Compare the responses above</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
            <CardFooter className="border-t p-4">
              <div className="w-full relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  disabled={isGenerating}
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!inputValue.trim() || isGenerating}
                  isLoading={isGenerating}
                  onClick={handleSendMessage}
                  className="absolute bottom-3 right-3 w-8 h-8 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
