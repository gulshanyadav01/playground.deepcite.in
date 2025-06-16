import { API_BASE_URL, API_BASE_URL_WITH_API } from '../config/api';

export interface FileMetadata {
  file_id: string;
  display_name: string;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  last_used: string | null;
  usage_count: number;
  validation_status: 'valid' | 'invalid' | 'pending';
  validation_details: {
    status: string;
    total_rows: number;
    columns: string[];
    file_type: string;
    sample_data: any[];
    null_counts: Record<string, number>;
    issues: string[];
  };
  tags: string[];
  used_in_sessions: string[];
}

export interface FileUploadResponse {
  success: boolean;
  file_id?: string;
  message: string;
  metadata?: FileMetadata;
}

export interface FileListResponse {
  files: FileMetadata[];
  total: number;
  storage_stats: {
    total_files: number;
    total_size_bytes: number;
    total_size_mb: number;
    type_counts: Record<string, number>;
    status_counts: Record<string, number>;
  };
}

export interface FilePreviewResponse {
  success: boolean;
  file_id: string;
  preview_data: any[];
  total_rows: number;
  showing_rows: number;
}

class FileService {
  private baseUrl = `${API_BASE_URL_WITH_API}/files`;

  /**
   * Upload a file using multipart form data
   */
  async uploadFile(file: File, displayName?: string): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (displayName) {
      formData.append('display_name', displayName);
    }

    const uploadUrl = `${this.baseUrl}/upload`;
    console.log('FileService: Uploading to URL:', uploadUrl);
    console.log('FileService: Base URL:', this.baseUrl);
    console.log('FileService: FormData contents:', {
      file: file.name,
      size: file.size,
      type: file.type,
      displayName
    });

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('FileService: Response status:', response.status);
      console.log('FileService: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorText;
        try {
          const error = await response.json();
          errorText = error.detail || error.message || 'Failed to upload file';
          console.error('FileService: Error response JSON:', error);
        } catch (jsonError) {
          errorText = await response.text();
          console.error('FileService: Error response text:', errorText);
        }
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('FileService: Success response:', result);
      return result;
    } catch (error) {
      console.error('FileService: Network or parsing error:', error);
      throw error;
    }
  }

  /**
   * Upload a file using base64 encoding
   */
  async uploadFileBase64(
    fileContent: string,
    originalFilename: string,
    displayName?: string
  ): Promise<FileUploadResponse> {
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_content: fileContent,
        original_filename: originalFilename,
        display_name: displayName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload file');
    }

    return response.json();
  }

  /**
   * List all uploaded files with optional filtering and sorting
   */
  async listFiles(
    filterBy?: string,
    sortBy: string = 'upload_date',
    sortDesc: boolean = true
  ): Promise<FileListResponse> {
    const params = new URLSearchParams({
      sort_by: sortBy,
      sort_desc: sortDesc.toString(),
    });

    if (filterBy) {
      params.append('filter_by', filterBy);
    }

    const response = await fetch(`${this.baseUrl}?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list files');
    }

    return response.json();
  }

  /**
   * Get detailed information about a specific file
   */
  async getFileInfo(fileId: string): Promise<{ success: boolean; file_info: FileMetadata }> {
    const response = await fetch(`${this.baseUrl}/${fileId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get file info');
    }

    return response.json();
  }

  /**
   * Get preview data for a file
   */
  async getFilePreview(fileId: string, limit: number = 10): Promise<FilePreviewResponse> {
    const response = await fetch(`${this.baseUrl}/${fileId}/preview?limit=${limit}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get file preview');
    }

    return response.json();
  }

  /**
   * Download a file
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${fileId}/download`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to download file');
    }

    return response.blob();
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    fileId: string,
    updates: { display_name?: string; tags?: string[] }
  ): Promise<{ success: boolean; message: string; file_id: string }> {
    const response = await fetch(`${this.baseUrl}/${fileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update file metadata');
    }

    return response.json();
  }

  /**
   * Re-validate a file
   */
  async revalidateFile(fileId: string): Promise<{
    success: boolean;
    message: string;
    file_id: string;
    validation_status: string;
    validation_details: any;
  }> {
    const response = await fetch(`${this.baseUrl}/${fileId}/revalidate`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to revalidate file');
    }

    return response.json();
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<{ success: boolean; message: string; file_id: string }> {
    const response = await fetch(`${this.baseUrl}/${fileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete file');
    }

    return response.json();
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ success: boolean; stats: any }> {
    const response = await fetch(`${this.baseUrl}/stats`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get storage stats');
    }

    return response.json();
  }

  /**
   * Convert file to base64 string
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/json;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format date in human readable format
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  }

  /**
   * Get file type icon
   */
  getFileTypeIcon(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'json':
        return '📄';
      case 'csv':
        return '📊';
      case 'jsonl':
        return '📝';
      default:
        return '📁';
    }
  }

  /**
   * Get validation status color
   */
  getValidationStatusColor(status: string): string {
    switch (status) {
      case 'valid':
        return 'text-green-600';
      case 'invalid':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Get validation status icon
   */
  getValidationStatusIcon(status: string): string {
    switch (status) {
      case 'valid':
        return '✅';
      case 'invalid':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  }
}

export const fileService = new FileService();
export default fileService;
