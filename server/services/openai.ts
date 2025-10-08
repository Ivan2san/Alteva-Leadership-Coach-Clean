// server/services/openai.ts
// OpenAI Responses API only. No Assistants/Threads.
// Docs: https://platform.openai.com/docs/api-reference/responses/create
import OpenAI from "openai";
import type { LGP360ReportData } from "@shared/schema";
import mammoth from "mammoth";
import { parse as csvParse } from "csv-parse/sync";
import { createRequire } from "module";

// pdf-parse is CommonJS, use createRequire for proper import
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Resolve API key from env
const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY_ENV_VAR;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set. Add it to your environment.");
}

// Initialise client
const openai = new OpenAI({ apiKey });

// Utility: pick model (must support tools/file_search)
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export interface ChatResponse {
  message: string;
  error?: string;
}

export interface FileProcessingStatus {
  id: string;
  status: "uploading" | "processing" | "completed" | "failed";
  error?: string;
}

type HistoryItem = { sender: "user" | "assistant"; text: string };

export class OpenAIService {
  // Vector store ID (required for KB search)
  private vectorStoreId?: string;

  constructor() {
    this.vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID || undefined;
    if (!this.vectorStoreId && process.env.NODE_ENV !== "production") {
      console.warn(
        "OPENAI_VECTOR_STORE_ID not set. Knowledge base search is disabled."
      );
    }
  }

  /** Creates a vector store (kept for admin/ops). */
  async createVectorStore(name = "leadership_knowledge_base") {
    try {
      const vectorStore = await (openai.beta as any).vectorStores.create({ name });
      console.log("Created vector store:", vectorStore.id);
      return vectorStore;
    } catch (error) {
      console.error("Error creating vector store:", error);
      throw error;
    }
  }

  /** Upload a file to the vector store (kept for admin/ops). */
  async uploadFileToVectorStore(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    try {
      if (!this.vectorStoreId) {
        throw new Error("Vector store not configured. Set OPENAI_VECTOR_STORE_ID.");
      }

      // Node 18+/undici exposes File. If your runtime doesn’t, swap to uploads helpers.
      const file = await openai.files.create({
        file: new (global as any).File([fileBuffer], fileName, { type: mimeType }),
        purpose: "assistants",
      });

      await (openai.beta as any).vectorStores.files.create(this.vectorStoreId, {
        file_id: file.id,
      });

      console.log(`Uploaded ${fileName} to vector store; file id: ${file.id}`);
      return file.id;
    } catch (error) {
      console.error("Error uploading file to vector store:", error);
      throw error;
    }
  }

  /** Check processing status for a vector store file (kept for admin/ops). */
  async getFileProcessingStatus(fileId: string): Promise<FileProcessingStatus> {
    try {
      if (!this.vectorStoreId) {
        throw new Error("Vector store not configured.");
      }

      const file: any = await (openai.beta as any).vectorStores.files.retrieve(
        this.vectorStoreId,
        fileId
      );

      const status: FileProcessingStatus["status"] =
        file.status === "completed"
          ? "completed"
          : file.status === "failed"
          ? "failed"
          : "processing";

      return {
        id: fileId,
        status,
        error: file.last_error?.message,
      };
    } catch (error) {
      console.error("Error checking file status:", error);
      return {
        id: fileId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * ✅ Re-enabled KB search using Responses API + file_search tool.
   * Returns short, source-aware snippets (or null if no store / no hits).
   */
  async searchKnowledgeBase(query: string): Promise<string | null> {
    if (!this.vectorStoreId) return null;

    try {
      // Steer the model to actually use file_search and keep output compact.
      const kbPrompt = `Use the file_search tool to answer the user's query strictly from the knowledge base.
Return up to 4 short bullet points with direct quotes or tight paraphrases and include the source filename.
Format example:
- "quoted snippet…" — filename.ext
If nothing relevant is found, say "No relevant results."`;

      const resp = await openai.responses.create({
        model: MODEL,
        input: `${kbPrompt}\n\nUser query: ${query}`,
        tools: [
          {
            type: "file_search",
            // IMPORTANT: provide the vector store — this satisfies the TS type
            vector_store_ids: [this.vectorStoreId],
          } as any,
        ],
        // Let the model decide, but it's primed to use file_search via the instructions above.
      });

      const r: any = resp as any;
      const text: string =
        r.output_text ??
        r.output?.[0]?.content?.[0]?.text ??
        "";

      const cleaned = (text || "").trim();
      if (!cleaned || /No relevant results/i.test(cleaned)) return null;
      return cleaned;
    } catch (error) {
      console.error("Knowledge base search error:", error);
      return null;
    }
  }

  /** Streaming chat via Responses API. Returns async-iterable event stream. */
  async getStreamingLeadershipResponse(
    userPrompt: string,
    topic: string,
    conversationHistory: HistoryItem[] = [],
    userLGP360Data?: LGP360ReportData
  ) {
    const systemPrompt = `You are a senior leadership coach specialising in the Alteva Growth methodology.
Current focus area: ${topic}

${userLGP360Data ? this.generatePersonalizationContext(userLGP360Data) : ""}`;

    // KB augmentation
    let knowledgeBaseContext = "";
    try {
      const kbResult = await this.searchKnowledgeBase(userPrompt);
      if (kbResult) {
        knowledgeBaseContext = `\n\nRelevant knowledge base information:\n${kbResult}`;
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.log("Knowledge base search failed (ignored):", err);
      }
    }

    // Flatten conversation to a single text prompt
    let conversationText = "";
    for (const msg of conversationHistory) {
      const role = msg.sender === "user" ? "User" : "Assistant";
      conversationText += `${role}: ${msg.text}\n\n`;
    }

    const input = `${systemPrompt}${knowledgeBaseContext}\n\n${conversationText}User: ${userPrompt}`;
    console.log(`Streaming chat prompt length: ${input.length} characters`);

    return openai.responses.stream({
      model: MODEL,
      input,
    });
  }

  /** Non-streaming chat via Responses API. */
  async getLeadershipResponse(
    userPrompt: string,
    topic: string,
    conversationHistory: HistoryItem[] = [],
    userLGP360Data?: LGP360ReportData
  ): Promise<ChatResponse> {
    try {
      const systemPrompt = `# 🧭 Alteva Coaching Companion
(…meta coaching instructions…)
Current focus area: ${topic}

${userLGP360Data ? this.generatePersonalizationContext(userLGP360Data) : ""}`;

      let knowledgeBaseContext = "";
      try {
        const kbResult = await this.searchKnowledgeBase(userPrompt);
        if (kbResult) {
          knowledgeBaseContext = `\n\nRelevant knowledge base information:\n${kbResult}`;
        }
      } catch {
        /* ignore */
      }

      let conversationText = "";
      for (const msg of conversationHistory) {
        const role = msg.sender === "user" ? "User" : "Assistant";
        conversationText += `${role}: ${msg.text}\n\n`;
      }

      const input = `${systemPrompt}${knowledgeBaseContext}\n\n${conversationText}User: ${userPrompt}`;
      const totalPromptLength = input.length;
      console.log(`Chat prompt length: ${totalPromptLength} characters`);

      const response = await openai.responses.create({
        model: MODEL,
        input,
      });

      // Defensive extraction to dodge union types
      const r: any = response as any;
      const aiMessage: string =
        r.output_text ??
        r.output?.[0]?.content?.[0]?.text ??
        "";

      if (!aiMessage || aiMessage.trim() === "") {
        console.error("Empty Responses API result:", {
          hasOutputText: !!r.output_text,
          hasOutput: !!r.output,
          totalPromptLength,
        });
        throw new Error("Empty completion from model.");
      }

      return { message: aiMessage.trim() };
    } catch (error) {
      console.error("Error getting AI response:", error);
      return {
        message:
          "Sorry, I’m having a hiccup processing that. Try again in a moment.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private generatePersonalizationContext(lgp360Data: LGP360ReportData): string {
    if (!lgp360Data.assessment) return "";
    const assessmentSummary = this.extractKeyInsights(lgp360Data.assessment);

    return `
## 👤 USER PERSONALISATION CONTEXT

**Leadership Profile Summary:**
${assessmentSummary}

**🎯 PERSONALISATION INSTRUCTIONS:**
Use this profile to tailor questions, reference style and strengths, and target development areas. Keep it practical and aligned to Alteva methodology.
`;
  }

  private extractKeyInsights(assessment: string): string {
    const maxLength = 1000;
    if (assessment.length <= maxLength) return assessment;

    const sections = assessment.split(/\*\*(.*?)\*\*/);
    let summary = "";

    for (let i = 0; i < sections.length && summary.length < maxLength; i++) {
      const section = sections[i];
      if (
        section &&
        (section.includes("EXECUTIVE OVERVIEW") ||
          section.includes("LEADERSHIP ANALYSIS") ||
          section.includes("DEVELOPMENT FOCUS") ||
          section.includes("strengths") ||
          section.includes("challenges") ||
          section.includes("growth"))
      ) {
        const nextContent = sections[i + 1];
        if (nextContent && summary.length + nextContent.length < maxLength) {
          summary += `**${section}**\n${nextContent.substring(0, 200)}...\n\n`;
        }
      }
    }

    if (!summary) summary = assessment.substring(0, maxLength) + "...";
    return summary;
  }

  /** Parse document content based on MIME type */
  private async parseDocumentContent(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    try {
      if (mimeType === "text/plain") {
        return fileBuffer.toString("utf-8");
      } else if (mimeType === "application/pdf") {
        const pdfData = await pdfParse(fileBuffer);
        return pdfData.text;
      } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return result.value;
      } else if (mimeType === "text/csv" || fileName.endsWith(".csv")) {
        const csvText = fileBuffer.toString("utf-8");
        const records = csvParse(csvText, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        
        let formattedText = "360-Degree Feedback Report\n\n";
        
        if (records.length > 0 && records[0] && typeof records[0] === 'object') {
          const headers = Object.keys(records[0] as Record<string, unknown>);
          formattedText += `Found ${records.length} feedback entries.\n\n`;
          
          records.forEach((record: any, index: number) => {
            formattedText += `Entry ${index + 1}:\n`;
            headers.forEach((header) => {
              if (record[header]) {
                formattedText += `${header}: ${record[header]}\n`;
              }
            });
            formattedText += "\n";
          });
        }
        
        return formattedText;
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error("Error parsing document:", error);
      throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Analyse an uploaded document and return a professional assessment. */
  async analyzeDocumentProfessional(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ originalContent: string; assessment: string }> {
    try {
      // Parse document content using the helper method
      const documentText = await this.parseDocumentContent(fileBuffer, fileName, mimeType);

      const systemInstruction =
        "You are an expert Alteva leadership coach creating professional, executive-level coaching assessments.";
      const assessmentPrompt = `Analyse the following document and create a structured coaching assessment:\n\n${documentText}`;

      const input = `${systemInstruction}\n\n${assessmentPrompt}`;

      const assessmentResponse = await openai.responses.create({
        model: MODEL,
        input,
      });

      const ar: any = assessmentResponse as any;
      const assessment: string =
        ar.output_text ??
        ar.output?.[0]?.content?.[0]?.text ??
        "";

      if (!assessment || assessment.trim() === "") {
        throw new Error("Empty assessment response from Responses API");
      }

      return {
        originalContent: documentText,
        assessment: assessment.trim(),
      };
    } catch (error) {
      console.error("Error analysing document:", error);
      throw new Error("Failed to analyse document with AI");
    }
  }

  /** Analyse 360 document and extract structured insights for onboarding */
  async analyzeDocument360Structured(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{
    originalContent: string;
    assessment: string;
    name?: string;
    role?: string;
    personalValues?: string[];
    growthProfile?: any;
    redZones?: string[];
    greenZones?: string[];
    recommendations?: string[];
  }> {
    try {
      // Parse document content using the helper method
      const documentText = await this.parseDocumentContent(fileBuffer, fileName, mimeType);

      // First, get the professional assessment
      const systemInstruction =
        "You are an expert Alteva leadership coach creating professional, executive-level coaching assessments.";
      const assessmentPrompt = `Analyse the following 360-degree feedback report and create a structured coaching assessment:\n\n${documentText}`;

      const input = `${systemInstruction}\n\n${assessmentPrompt}`;

      const assessmentResponse = await openai.responses.create({
        model: MODEL,
        input,
      });

      const ar: any = assessmentResponse as any;
      const assessment: string =
        ar.output_text ??
        ar.output?.[0]?.content?.[0]?.text ??
        "";

      if (!assessment || assessment.trim() === "") {
        throw new Error("Empty assessment response from Responses API");
      }

      // Now extract structured data using a second AI call
      const extractionPrompt = `Extract key information from this 360 report and return as JSON.

Document:
${documentText}

Assessment:
${assessment}

Extract and return ONLY a JSON object with these fields:
{
  "name": "person's name if mentioned",
  "role": "job title/role if mentioned", 
  "personalValues": ["value1", "value2", "value3"],
  "growthProfile": {
    "leadershipStyle": "description of leadership approach",
    "keyCharacteristics": ["trait1", "trait2"]
  },
  "redZones": ["behavior or area to watch/avoid", "another watch-out"],
  "greenZones": ["strength to leverage", "another strength"],
  "recommendations": ["practical next step 1", "practical next step 2"]
}

Return ONLY the JSON, no explanation.`;

      const extractionResponse = await openai.responses.create({
        model: MODEL,
        input: extractionPrompt,
      });

      const er: any = extractionResponse as any;
      const extractedText: string =
        er.output_text ??
        er.output?.[0]?.content?.[0]?.text ??
        "";

      // Parse the JSON response
      let structuredData: any = {};
      try {
        // Try to extract JSON from the response (handle cases where AI adds explanation)
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredData = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error("Failed to parse structured data JSON:", parseError);
        // Continue with empty structured data if parsing fails
      }

      return {
        originalContent: documentText,
        assessment: assessment.trim(),
        name: structuredData.name || undefined,
        role: structuredData.role || undefined,
        personalValues: structuredData.personalValues || [],
        growthProfile: structuredData.growthProfile || {},
        redZones: structuredData.redZones || [],
        greenZones: structuredData.greenZones || [],
        recommendations: structuredData.recommendations || [],
      };
    } catch (error) {
      console.error("Error analysing document with structured extraction:", error);
      throw new Error("Failed to analyse document with AI");
    }
  }

  /** Topic-specific wrapper: keeps external contract stable. */
  async getTopicSpecificResponse(
    message: string,
    topic: string,
    conversationHistory: HistoryItem[] = [],
    userLGP360Data?: { assessment: any; originalContent?: string }
  ): Promise<{ reply: string }> {
    const response = await this.getLeadershipResponse(
      message,
      topic,
      conversationHistory,
      userLGP360Data as any
    );
    return { reply: response.message };
  }
}

export const openaiService = new OpenAIService();
