export type ArtifactType =
  | "code"
  | "document"
  | "image"
  | "data"
  | "file"
  | "directory"
  | "website"
  | "repository";

export interface Artifact {
  id: string;

  name: string;

  type: ArtifactType;

  description?: string;

  createdAt: string;

  mimeType?: string;

  size?: number;

  path?: string;

  url?: string;

  metadata?: Record<string, unknown>;
}