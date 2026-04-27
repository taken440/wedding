export interface PresignRequest {
  filename: string;
  contentType: string;
  size: number;
}

export interface PresignResponse {
  uploadUrl: string;
  key: string;
  uuid: string;
}

export interface ConfirmRequest {
  uuid: string;
  key: string;
  filename: string;
  uploader: string;
  contentType: string;
  size: number;
}

export interface FileItem {
  uuid: string;
  key: string;
  filename: string;
  uploader: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  viewUrl?: string;
}

export interface AdminFilesResponse {
  files: FileItem[];
  total: number;
}
