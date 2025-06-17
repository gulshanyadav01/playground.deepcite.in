import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { 
  ArrowRight, 
  Brain, 
  Eye, 
  Settings, 
  Plus, 
  X, 
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { fileService, ColumnConfig, ColumnMapping } from '../../services/fileService';

interface ColumnMappingInterfaceProps {
  fileId: string;
  availableColumns: string[];
  onMappingComplete: (mapping: ColumnMapping) => void;
  onCancel: () => void;
  initialMapping?: ColumnMapping;
}

interface ColumnSuggestion {
  column: string;
  confidence: number;
  reason: string;
}

export const ColumnMappingInterface: React.FC<ColumnMappingInterfaceProps> = ({
  fileId,
  availableColumns,
  onMappingComplete,
  onCancel,
  initialMapping
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>(
    initialMapping || {
      instruction_columns: [],
      instruction_template: '',
      output_columns: [],
      output_template: '',
      ignored_columns: [],
      mapping_name: 'Custom Mapping',
      description: 'User-defined column mapping'
    }
  );

  const [suggestions, setSuggestions] = useState<{
    instruction: ColumnSuggestion[];
    output: ColumnSuggestion[];
  }>({ instruction: [], output: [] });

  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load AI suggestions on mount
  useEffect(() => {
    if (!initialMapping) {
      loadAISuggestions();
    }
  }, [fileId]);

  // Update preview when mapping changes
  useEffect(() => {
    if (mapping.instruction_columns.length > 0 && mapping.output_columns.length > 0) {
      loadPreview();
    }
  }, [mapping]);

  const loadAISuggestions = async () => {
    try {
      setIsLoadingSuggestions(true);
      setError(null);
      
      const result = await fileService.detectColumns(fileId);
      
      // Convert suggestions to our format
      const instructionSuggestions: ColumnSuggestion[] = result.suggested_mapping.instruction_columns.map(col => ({
        column: col.column_name,
        confidence: col.weight || 0,
        reason: `Detected as ${col.role} column`
      }));

      const outputSuggestions: ColumnSuggestion[] = result.suggested_mapping.output_columns.map(col => ({
        column: col.column_name,
        confidence: col.weight || 0,
        reason: `Detected as ${col.role} column`
      }));

      setSuggestions({
        instruction: instructionSuggestions,
        output: outputSuggestions
      });

      // Apply suggestions as initial mapping
      setMapping(result.suggested_mapping);

    } catch (err: any) {
      setError(err.message || 'Failed to load AI suggestions');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const loadPreview = async () => {
    try {
      setIsLoadingPreview(true);
      const result = await fileService.previewMappedData(fileId, mapping, 5);
      setPreviewData(result.preview_data);
    } catch (err: any) {
      console.error('Preview error:', err);
      setPreviewData([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const addColumnToMapping = (column: string, type: 'instruction' | 'output') => {
    const newColumn: ColumnConfig = {
      column_name: column,
      role: 'primary',
      weight: 1.0,
      format_type: 'text'
    };

    if (type === 'instruction') {
      const newColumns = [...mapping.instruction_columns, newColumn];
      const newTemplate = newColumns.map(col => `{${col.column_name}}`).join('\n');
      
      setMapping(prev => ({
        ...prev,
        instruction_columns: newColumns,
        instruction_template: newTemplate
      }));
    } else {
      const newColumns = [...mapping.output_columns, newColumn];
      const newTemplate = newColumns.map(col => `{${col.column_name}}`).join('\n');
      
      setMapping(prev => ({
        ...prev,
        output_columns: newColumns,
        output_template: newTemplate
      }));
    }
  };

  const removeColumnFromMapping = (columnName: string, type: 'instruction' | 'output') => {
    if (type === 'instruction') {
      const newColumns = mapping.instruction_columns.filter(col => col.column_name !== columnName);
      const newTemplate = newColumns.map(col => `{${col.column_name}}`).join('\n');
      
      setMapping(prev => ({
        ...prev,
        instruction_columns: newColumns,
        instruction_template: newTemplate
      }));
    } else {
      const newColumns = mapping.output_columns.filter(col => col.column_name !== columnName);
      const newTemplate = newColumns.map(col => `{${col.column_name}}`).join('\n');
      
      setMapping(prev => ({
        ...prev,
        output_columns: newColumns,
        output_template: newTemplate
      }));
    }
  };

  const updateTemplate = (template: string, type: 'instruction' | 'output') => {
    setMapping(prev => ({
      ...prev,
      [type === 'instruction' ? 'instruction_template' : 'output_template']: template
    }));
  };

  const applySuggestion = (suggestion: ColumnSuggestion, type: 'instruction' | 'output') => {
    addColumnToMapping(suggestion.column, type);
  };

  const handleSaveMapping = async () => {
    try {
      setError(null);
      await fileService.saveColumnMapping(fileId, mapping);
      onMappingComplete(mapping);
    } catch (err: any) {
      setError(err.message || 'Failed to save mapping');
    }
  };

  const getUsedColumns = () => {
    const used = new Set<string>();
    mapping.instruction_columns.forEach(col => used.add(col.column_name));
    mapping.output_columns.forEach(col => used.add(col.column_name));
    return used;
  };

  const getAvailableColumns = () => {
    const used = getUsedColumns();
    return availableColumns.filter(col => !used.has(col));
  };

  const canSave = mapping.instruction_columns.length > 0 && mapping.output_columns.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Map Your Columns
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Tell us which columns contain instructions and which contain responses
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {isLoadingSuggestions ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
              <span className="text-gray-600 dark:text-gray-400">
                AI is analyzing your columns...
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Instruction Columns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2 text-blue-500" />
                Instructions (What AI responds to)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Mapping */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                  Selected Columns:
                </h4>
                {mapping.instruction_columns.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No columns selected
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mapping.instruction_columns.map((col, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded"
                      >
                        <span className="text-sm font-medium">{col.column_name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeColumnFromMapping(col.column_name, 'instruction')}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Suggestions */}
              {suggestions.instruction.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-1 text-yellow-500" />
                    AI Suggestions:
                  </h4>
                  {suggestions.instruction.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium">{suggestion.column}</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applySuggestion(suggestion, 'instruction')}
                        disabled={getUsedColumns().has(suggestion.column)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Columns */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                  Available Columns:
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {getAvailableColumns().map((column) => (
                    <div
                      key={column}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded"
                    >
                      <span className="text-sm">{column}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addColumnToMapping(column, 'instruction')}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Output Columns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                Outputs (AI responses)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Mapping */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                  Selected Columns:
                </h4>
                {mapping.output_columns.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No columns selected
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mapping.output_columns.map((col, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded"
                      >
                        <span className="text-sm font-medium">{col.column_name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeColumnFromMapping(col.column_name, 'output')}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Suggestions */}
              {suggestions.output.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-1 text-yellow-500" />
                    AI Suggestions:
                  </h4>
                  {suggestions.output.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium">{suggestion.column}</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applySuggestion(suggestion, 'output')}
                        disabled={getUsedColumns().has(suggestion.column)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Columns */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                  Available Columns:
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {getAvailableColumns().map((column) => (
                    <div
                      key={column}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded"
                    >
                      <span className="text-sm">{column}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addColumnToMapping(column, 'output')}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advanced Template Editor */}
      <Card>
        <CardHeader>
          <CardTitle 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <div className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Advanced Template Editor
            </div>
            {showAdvanced ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Instruction Template:
                    </label>
                    <textarea
                      value={mapping.instruction_template}
                      onChange={(e) => updateTemplate(e.target.value, 'instruction')}
                      className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Use {column_name} to insert column values"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Use {`{column_name}`} to insert values from your columns
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Output Template:
                    </label>
                    <textarea
                      value={mapping.output_template}
                      onChange={(e) => updateTemplate(e.target.value, 'output')}
                      className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Use {column_name} to insert column values"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Use {`{column_name}`} to insert values from your columns
                    </p>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Live Preview */}
      {canSave && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPreview ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
                <span className="text-gray-600 dark:text-gray-400">Loading preview...</span>
              </div>
            ) : previewData.length > 0 ? (
              <div className="space-y-4">
                {previewData.map((example, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400 mb-2">
                          Instruction:
                        </h4>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm">
                          {example.instruction}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-green-600 dark:text-green-400 mb-2">
                          Expected Output:
                        </h4>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm">
                          {example.output}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No preview available. Please check your column mapping.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSaveMapping}
          disabled={!canSave}
          className="flex items-center"
        >
          Save Mapping
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ColumnMappingInterface;
