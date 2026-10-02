import { jest, describe, expect, it, beforeEach } from "@jest/globals";
import { FileService } from "@/services/files";
import { ApiRequestHandler } from "@/utils/http";
import type {
  FileUploadResponse,
  FileBulkUploadResponse,
  FileToUpload,
} from "@/models/file";

jest.mock("@/utils/http", () => ({
  ApiRequestHandler: jest.fn(),
}));

describe("FileService", () => {
  const domain = "https://api.example.com";
  const token = "test-token";
  let service: FileService;
  let apiHandler: jest.Mocked<ApiRequestHandler>;

  beforeEach(() => {
    apiHandler = {
      client: {} as any,
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      postMultipart: jest.fn(),
      stream: jest.fn(),
      request: jest.fn(),
      throwIfResponseError: jest.fn(),
    } as unknown as jest.Mocked<ApiRequestHandler>;

    service = new FileService({ apiDomain: domain, token });
    (ApiRequestHandler as jest.Mock).mockImplementation(() => apiHandler);
  });

  describe("constructor", () => {
    it("should initialize with default SSL verification", () => {
      const service = new FileService({ apiDomain: domain, token });
      expect(ApiRequestHandler).toHaveBeenCalledWith({ apiDomain: domain, token });
    });

    it("should initialize with SSL verification disabled", () => {
      const service = new FileService({ apiDomain: domain, token, verifySSL: false });
      expect(ApiRequestHandler).toHaveBeenCalledWith({
        apiDomain: domain,
        token,
        verifySSL: false,
      });
    });
  });

  describe("upload", () => {
    it("should upload a single file successfully", async () => {
      const fileToUpload: FileToUpload = {
        name: "test.png",
        content: Buffer.from("fake-image-data"),
        mimeType: "image/png",
      };

      const mockResponse: FileUploadResponse = {
        file_url: "encoded-file-id-123",
      };

      apiHandler.postMultipart.mockResolvedValue(mockResponse);

      const result = await service.upload(fileToUpload);

      expect(apiHandler.postMultipart).toHaveBeenCalledWith(
        "/v1/files/",
        expect.anything(), // FormData object
      );
      expect(result).toEqual(mockResponse);
      expect(result.file_url).toBe("encoded-file-id-123");
    });

    it("should handle upload errors", async () => {
      const fileToUpload: FileToUpload = {
        name: "test.png",
        content: Buffer.from("fake-image-data"),
        mimeType: "image/png",
      };

      const mockError = new Error("Upload failed");
      apiHandler.postMultipart.mockRejectedValue(mockError);

      await expect(service.upload(fileToUpload)).rejects.toThrow("Upload failed");
    });
  });

  describe("bulkUpload", () => {
    it("should upload multiple files successfully", async () => {
      const filesToUpload: FileToUpload[] = [
        {
          name: "test1.png",
          content: Buffer.from("fake-image-data-1"),
          mimeType: "image/png",
        },
        {
          name: "test2.jpg",
          content: Buffer.from("fake-image-data-2"),
          mimeType: "image/jpeg",
        },
      ];

      const mockResponse: FileBulkUploadResponse = {
        files: [{ file_url: "encoded-file-id-1" }, { file_url: "encoded-file-id-2" }],
      };

      apiHandler.postMultipart.mockResolvedValue(mockResponse);

      const result = await service.bulkUpload(filesToUpload);

      expect(apiHandler.postMultipart).toHaveBeenCalledWith(
        "/v1/files/bulk",
        expect.anything(), // FormData object
      );
      expect(result).toEqual(mockResponse);
      expect(result.files).toHaveLength(2);
      expect(result.files[0].file_url).toBe("encoded-file-id-1");
      expect(result.files[1].file_url).toBe("encoded-file-id-2");
    });

    it("should handle partial upload failures", async () => {
      const filesToUpload: FileToUpload[] = [
        {
          name: "test1.png",
          content: Buffer.from("fake-image-data-1"),
          mimeType: "image/png",
        },
        {
          name: "test2.jpg",
          content: Buffer.from("fake-image-data-2"),
          mimeType: "image/jpeg",
        },
      ];

      const mockResponse: FileBulkUploadResponse = {
        files: [{ file_url: "encoded-file-id-1" }],
        failed_files: {
          "test2.jpg": "File size exceeds maximum",
        },
      };

      apiHandler.postMultipart.mockResolvedValue(mockResponse);

      const result = await service.bulkUpload(filesToUpload);

      expect(result.files).toHaveLength(1);
      expect(result.failed_files).toBeDefined();
      expect(result.failed_files?.["test2.jpg"]).toBe("File size exceeds maximum");
    });

    it("should handle empty file array", async () => {
      const filesToUpload: FileToUpload[] = [];

      const mockResponse: FileBulkUploadResponse = {
        files: [],
      };

      apiHandler.postMultipart.mockResolvedValue(mockResponse);

      const result = await service.bulkUpload(filesToUpload);

      expect(apiHandler.postMultipart).toHaveBeenCalledWith(
        "/v1/files/bulk",
        expect.anything(),
      );
      expect(result.files).toHaveLength(0);
    });

    it("should handle bulk upload errors", async () => {
      const filesToUpload: FileToUpload[] = [
        {
          name: "test.png",
          content: Buffer.from("fake-image-data"),
          mimeType: "image/png",
        },
      ];

      const mockError = new Error("Bulk upload failed");
      apiHandler.postMultipart.mockRejectedValue(mockError);

      await expect(service.bulkUpload(filesToUpload)).rejects.toThrow("Bulk upload failed");
    });
  });

  describe("getFile", () => {
    it("should retrieve a file by URL", async () => {
      const fileUrl = "encoded-file-id-123";
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockBuffer = Buffer.from(mockArrayBuffer);

      apiHandler.get.mockResolvedValue(mockArrayBuffer);

      const result = await service.getFile(fileUrl);

      expect(apiHandler.get).toHaveBeenCalledWith(
        `/v1/files/${fileUrl}`,
        undefined,
        { responseType: "arraybuffer" },
      );
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(mockBuffer.length);
    });

    it("should handle file not found", async () => {
      const fileUrl = "non-existent-file";
      const mockError = new Error("File not found");

      apiHandler.get.mockRejectedValue(mockError);

      await expect(service.getFile(fileUrl)).rejects.toThrow("File not found");
    });

    it("should handle network errors", async () => {
      const fileUrl = "encoded-file-id-123";
      const mockError = new Error("Network error");

      apiHandler.get.mockRejectedValue(mockError);

      await expect(service.getFile(fileUrl)).rejects.toThrow("Network error");
    });
  });
});
