import { GoogleDocumentHeading, GoogleDocumentSegment } from "../google/docsService.js";

export interface ChunkOptions {
  chunkSize: number;
  overlap: number;
}

export interface DocumentChunk {
  content: string;
  ordering: number;
  heading?: GoogleDocumentHeading;
}

const DEFAULT_OPTIONS: ChunkOptions = {
  chunkSize: 1200,
  overlap: 200,
};

/**
 * Splits normalised Google Doc segments into overlapping chunks sized for embedding.
 * Headings start a fresh chunk so downstream consumers can anchor context to sections.
 */
export function chunkDocument(
  segments: GoogleDocumentSegment[],
  options?: Partial<ChunkOptions>
): DocumentChunk[] {
  const { chunkSize, overlap } = { ...DEFAULT_OPTIONS, ...options };
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than zero");
  }

  const chunks: DocumentChunk[] = [];
  let buffer: string[] = [];
  let ordering = 0;
  let currentHeading: GoogleDocumentHeading | undefined;

  const pushChunk = () => {
    if (buffer.length === 0) {
      return;
    }
    const content = buffer.join(" ").trim();
    if (!content) {
      buffer = [];
      return;
    }

    chunks.push({ content, ordering: ordering++, heading: currentHeading });

    if (overlap > 0) {
      const overlapText = content.slice(-overlap);
      buffer = overlapText.split(/\s+/).filter(Boolean);
    } else {
      buffer = [];
    }
  };

  for (const segment of segments) {
    const text = segment.text?.trim();
    if (!text) {
      continue;
    }

    if (segment.heading) {
      // Finish the current chunk to avoid mixing different heading contexts.
      pushChunk();
      currentHeading = segment.heading;
      buffer = [];
    }

    const words = text.split(/\s+/).filter(Boolean);
    for (const word of words) {
      buffer.push(word);
      if (buffer.join(" ").length >= chunkSize) {
        pushChunk();
      }
    }
  }

  pushChunk();

  return chunks;
}
