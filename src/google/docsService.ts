import { JWT } from "google-auth-library";
import { drive_v3, docs_v1, google } from "googleapis";

export interface GoogleDocumentHeading {
  level: number;
  text: string;
  id?: string;
}

export interface GoogleDocumentSegment {
  text: string;
  heading?: GoogleDocumentHeading;
}

export interface GoogleDocumentContent {
  documentId: string;
  title: string;
  revisionId?: string | null;
  version?: string | null;
  modifiedTime?: string | null;
  text: string;
  segments: GoogleDocumentSegment[];
}

export interface GoogleDocumentFetcher {
  fetchDocument(fileId: string): Promise<GoogleDocumentContent>;
}

export class GoogleDocsService implements GoogleDocumentFetcher {
  private readonly docs: docs_v1.Docs;
  private readonly drive: drive_v3.Drive;

  constructor(
    private readonly authClient: JWT,
    private readonly watchFolderId?: string
  ) {
    // Caller must share the watched folder with the service account so Drive/Docs calls succeed.
    this.docs = google.docs({ version: "v1", auth: authClient });
    this.drive = google.drive({ version: "v3", auth: authClient });
  }

  async fetchDocument(fileId: string): Promise<GoogleDocumentContent> {
    await this.authClient.authorize();

    const [docResponse, driveResponse] = await Promise.all([
      this.docs.documents.get({ documentId: fileId }),
      this.drive.files.get({
        fileId,
        fields: "id, name, parents, modifiedTime, version, headRevisionId",
      }),
    ]);

    const driveData = driveResponse.data;
    if (this.watchFolderId) {
      const parents = driveData.parents ?? [];
      if (!parents.includes(this.watchFolderId)) {
        throw new Error(
          `File ${fileId} is not within configured watch folder ${this.watchFolderId}`
        );
      }
    }

    const doc = docResponse.data;
    const segments = extractSegmentsFromBody(doc.body?.content ?? []);
    const text = segments.map((segment) => segment.text).join("\n\n");

    return {
      documentId: doc.documentId ?? fileId,
      title: doc.title ?? driveData.name ?? "Untitled",
      revisionId: doc.revisionId,
      version: driveData.version,
      modifiedTime: driveData.modifiedTime,
      text,
      segments,
    };
  }
}

function extractSegmentsFromBody(
  elements: docs_v1.Schema$StructuralElement[]
): GoogleDocumentSegment[] {
  const segments: GoogleDocumentSegment[] = [];

  for (const element of elements) {
    if (element.paragraph) {
      const segment = segmentFromParagraph(element.paragraph);
      if (segment) {
        segments.push(segment);
      }
      continue;
    }

    if (element.table) {
      for (const tableRow of element.table.tableRows ?? []) {
        const rowCells = tableRow.tableCells ?? [];
        for (const cell of rowCells) {
          segments.push(...extractSegmentsFromBody(cell.content ?? []));
        }
      }
      continue;
    }

    if (element.sectionBreak) {
      segments.push({ text: "" });
    }
  }

  return segments;
}

function segmentFromParagraph(
  paragraph: docs_v1.Schema$Paragraph
): GoogleDocumentSegment | undefined {
  const pieces: string[] = [];
  for (const element of paragraph.elements ?? []) {
    const textRun = element.textRun;
    if (textRun?.content) {
      pieces.push(textRun.content.replace(/\n$/, ""));
    }
  }

  const text = pieces.join("").trim();
  if (!text) {
    return undefined;
  }

  const heading = extractHeading(paragraph.paragraphStyle, text);
  if (heading) {
    return { text, heading };
  }

  return { text };
}

function extractHeading(
  style: docs_v1.Schema$ParagraphStyle | null | undefined,
  text: string
): GoogleDocumentHeading | undefined {
  if (!style?.namedStyleType) {
    return undefined;
  }

  const match = style.namedStyleType.match(/^HEADING_(\d)$/);
  if (!match) {
    return undefined;
  }

  return {
    level: Number.parseInt(match[1] ?? "", 10),
    text,
    id: style.headingId ?? undefined,
  };
}
