/**
 * File upload response for single file
 */
export interface FileUploadResponse {
  file_url: string; // Encoded file identifier
}

/**
 * Bulk file upload response
 */
export interface FileBulkUploadResponse {
  files: Array<{ file_url: string }>;
  failed_files?: Record<string, string>; // filename -> error message
}

/**
 * File to upload
 */
export interface FileToUpload {
  name: string;
  content: Buffer;
  mimeType: string;
}
