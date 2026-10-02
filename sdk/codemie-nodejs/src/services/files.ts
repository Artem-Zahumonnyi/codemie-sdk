import FormData from "form-data";
import type { FileUploadResponse, FileBulkUploadResponse, FileToUpload } from "../models/file";
import type { AuthConfig } from "../models/common";
import { ApiRequestHandler } from "../utils/http";

export class FileService {
  private api: ApiRequestHandler;

  constructor(config: AuthConfig) {
    this.api = new ApiRequestHandler(config);
  }

  /**
   * Upload a single file
   * POST /v1/files/
   */
  async upload(file: FileToUpload): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("file", file.content, {
      filename: file.name,
      contentType: file.mimeType,
    });

    return this.api.postMultipart<FileUploadResponse>("/v1/files/", formData);
  }

  /**
   * Upload multiple files
   * POST /v1/files/bulk
   */
  async bulkUpload(files: FileToUpload[]): Promise<FileBulkUploadResponse> {
    const formData = new FormData();

    for (const file of files) {
      formData.append("files", file.content, {
        filename: file.name,
        contentType: file.mimeType,
      });
    }

    return this.api.postMultipart<FileBulkUploadResponse>("/v1/files/bulk", formData);
  }

  /**
   * Get file by URL/ID
   * GET /v1/files/{file_name}
   */
  async getFile(fileUrl: string): Promise<Buffer> {
    const response = await this.api.get<ArrayBuffer>(`/v1/files/${fileUrl}`, undefined, {
      responseType: "arraybuffer",
    });
    return Buffer.from(response);
  }
}
