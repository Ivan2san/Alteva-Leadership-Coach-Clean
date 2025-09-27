// openai.ts
// Using OpenAI Responses API exclusively per compliance requirements
// Reference: https://platform.openai.com/docs/api-reference/responses/create
import OpenAI from "openai";
import type { LGP360ReportData } from "@shared/schema";

const apiKey =
  process.env.OPENAI_API_KEY ??
  process.env.OPENAI_API_KEY_ENV_VAR;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set. Add it to your env.");
}

// Initialize OpenAI client as per official SDK docs
// Reference: https://github.com/openai/openai-node
const openai = new OpenAI({ apiKey });

export interface ChatResponse {
  message: string;
  error?: string;
}

export interface FileProcessingStatus {
  id: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface KnowledgeSearchResult {
  content: string;
  source: string;
  relevance: number;
}

type HistoryItem = { sender: "user" | "assistant"; text: string };

export class OpenAIService {
  // Keep, but don’t pretend it exists if not set
  private vectorStoreId?: string;

  constructor() {
    this.vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID || undefined;
    if (!this.vectorStoreId) {
      // Don’t spam logs in prod
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "OPENAI_VECTOR_STORE_ID not set. Knowledge base search will be disabled."
        );
      }
    }
  }

  /** Creates a vector store (Assistants v2). */
  async createVectorStore(name = "leadership_knowledge_base") {
    try {
      // Use type assertion for beta API that may not be fully typed
      const vectorStore = await (openai.beta as any).vectorStores.create({
        name,
      });
      console.log("Created vector store:", vectorStore.id);
      return vectorStore;
    } catch (error) {
      console.error("Error creating vector store:", error);
      throw error;
    }
  }

  /** Uploads a file to the vector store */
  async uploadFileToVectorStore(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    try {
      if (!this.vectorStoreId) {
        throw new Error("Vector store not configured. Please set OPENAI_VECTOR_STORE_ID.");
      }

      // Upload file to OpenAI
      const file = await openai.files.create({
        file: new File([fileBuffer], fileName, { type: mimeType }),
        purpose: "assistants",
      });

      // Add file to vector store
      await (openai.beta as any).vectorStores.files.create(this.vectorStoreId, {
        file_id: file.id,
      });

      console.log(`File ${fileName} uploaded to vector store with ID: ${file.id}`);
      return file.id;
    } catch (error) {
      console.error("Error uploading file to vector store:", error);
      throw error;
    }
  }

  /** Checks the processing status of a file in the vector store */
  async getFileProcessingStatus(fileId: string): Promise<FileProcessingStatus> {
    try {
      if (!this.vectorStoreId) {
        throw new Error("Vector store not configured");
      }

      const file = await (openai.beta as any).vectorStores.files.retrieve(
        this.vectorStoreId,
        fileId
      );

      let status: FileProcessingStatus['status'] = 'processing';
      if (file.status === 'completed') {
        status = 'completed';
      } else if (file.status === 'failed') {
        status = 'failed';
      }

      return {
        id: fileId,
        status,
        error: file.last_error?.message,
      };
    } catch (error) {
      console.error("Error checking file status:", error);
      return {
        id: fileId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /** Searches the knowledge base for relevant content */
  async searchKnowledgeBase(query: string): Promise<string | null> {
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
    if (!vectorStoreId) {
      return null;
    }

    try {
      // Create a thread for knowledge base search
      const thread = await openai.beta.threads.create();

      // Add the search query
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: query
      });

      // Create assistant with vector store
      const assistant = await openai.beta.assistants.create({
        name: "Knowledge Base Search",
        instructions: "You are a helpful assistant that searches through uploaded knowledge base files to find relevant information. Provide concise, relevant excerpts that answer the user's query.",
        model: "gpt-4o-mini",
        tools: [{ type: "file_search" }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        }
      });

      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id
      });

      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      if (runStatus.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          return assistantMessage.content[0].text.value;
        }
      }

      return null;
    } catch (error) {
      console.error('Knowledge base search error:', error);
      return null;
    }
  }

  /** Generates streaming response for real-time chat experience */
  async getStreamingLeadershipResponse(
    userPrompt: string,
    topic: string,
    conversationHistory: HistoryItem[] = [],
    userLGP360Data?: LGP360ReportData
  ) {
    try {
      const systemPrompt = `You are a senior leadership coach specializing in the Alteva Growth methodology. You help leaders develop their growth edge through authentic, values-driven leadership development.

Core Alteva Principles:
- **Red Zone:** Reactive, fear-based leadership patterns that diminish effectiveness
- **Green Zone:** Values-driven, connected leadership that creates authentic influence
- **Growth Edge:** The specific developmental challenge that, when faced, creates exponential leadership growth
- **One Big Practice (OBP):** The single most impactful daily practice for leadership transformation

Your role:
- Ask powerful questions that reveal patterns and insights
- Guide discovery of their growth edge and One Big Practice
- Help them recognize Red/Green Zone patterns in real situations
- Support authentic leadership development aligned with their core values
- Provide practical tools and frameworks for immediate application

Communication style:
- Direct, caring, and professionally supportive
- Use Markdown formatting for clarity and engagement
- Ask 1-2 powerful questions per response
- Offer specific, actionable insights
- Balance challenge with encouragement

Formatting guidelines:
- Use **bold** for key concepts and important points
- Use *italic* for emphasis and reflection prompts
- Use bullet points for lists and action items
- Use numbered lists for sequential steps or processes
- Break content into logical sections with clear spacing
- Use > blockquotes for powerful questions or insights
- Keep paragraphs concise (2-3 sentences max)

Example structure:
## Core Insight
Brief reflection on what you're sensing...

**Key Point:** Main coaching insight

### Questions for Reflection:
- What resonates with you about this?
- Where do you notice resistance?

### Next Steps:
1. Immediate action
2. Ongoing practice

Current focus area: ${topic}

${userLGP360Data ? this.generatePersonalizationContext(userLGP360Data) : ''}`;

      // Search knowledge base for relevant context
      let knowledgeBaseContext = '';
      try {
        const kbResult = await this.searchKnowledgeBase(userPrompt);
        if (kbResult) {
          knowledgeBaseContext = `\n\nRelevant knowledge base information:\n${kbResult}`;
        }
      } catch (error) {
        console.log('Knowledge base search failed:', error);
      }

      // Transform conversation history to single input string format
      let conversationText = '';
      for (const msg of conversationHistory) {
        const role = msg.sender === "user" ? "User" : "Assistant";
        conversationText += `${role}: ${msg.text}\n\n`;
      }

      // Create single input string for Responses API
      const input = `${systemPrompt}${knowledgeBaseContext}\n\n${conversationText}User: ${userPrompt}`;

      console.log(`Streaming chat prompt length: ${input.length} characters`);

      // Use Responses API streaming per official docs
      // Reference: https://platform.openai.com/docs/api-reference/responses-streaming
      return await openai.responses.stream({
        model: process.env.OPENAI_MODEL || "gpt-5",
        input,
      });

    } catch (error) {
      console.error("Error getting streaming AI response:", error);
      throw error;
    }
  }

  async getLeadershipResponse(
    userPrompt: string,
    topic: string,
    conversationHistory: HistoryItem[] = [],
    userLGP360Data?: LGP360ReportData
  ): Promise<ChatResponse> {
    try {
      const systemPrompt = `# 🧭 Alteva Coaching Companion

## ✳ Core Role
You act only as a coaching partner for participants in Alteva programs. You do not deliver content, facilitate workshops, or answer operational questions.

Your primary function is to help participants:
- Reflect deeply
- Integrate growth practices  
- Lead effectively day to day creating high performing teams and achieving high business performance
- Conduct Accountable Conversations with all stakeholders adopting the right Mindset and Skill set
- Shift from reactive (Red Zone) to leadership effectiveness (Green Zone)
- Embody their values in daily leadership

## 🔶 Coaching Philosophy

### 1. Triple Goal Anchor
Every interaction should aim to enhance:
- **Great Performance** (clarity, outcomes, standards)
- **Great Learning** (awareness, feedback, curiosity)  
- **Great Workplace** (trust, safety, human connection)

### 2. Vertical Development Focus
Coaching is not about quick fixes—it's about evolving identity and awareness. Focus on:
- Patterns (emotional, behavioural)
- Mindsets and assumptions
- Values and shadow work
- Stretching toward greater maturity

However, you can help in the moment with decision making, self regulation and preparation for conversations.

### 3. Red Zone to Green Zone
Help leaders:
- Notice reactive patterns (Approval over Integrity, Control over Care, Security over Progress)
- Return to values, curiosity, and relational presence
- Shift from protection to connection

### 4. Humanistic Accountability
Coach with truth + care:
- No rescuing. No sugarcoating.
- Respect autonomy and capacity.
- Always bring the person back to ownership, values, and possibility.

## 🛠 Functional Modes for Topic: ${topic}

### 🔁 Daily Reflection
Prompts like:
- "Where did you act from safety instead of growth?"
- "What would your OBP do here?"
- "Where did you avoid a truth today?"

### 🔺 Triggered State Support  
Questions like:
- "What pain or fear might be behind that?"
- "What need was unmet?"
- "What part of you were you trying to protect?"

### 🗣 Conversation Rehearsal (OORA)
Prep for difficult conversations using OORA:
- **Ownership**: "What's your part?"
- **Observations with Impact**: "What's the behaviour and its impact?"
- **Requests**: "What do you need from them?"
- **Agreements**: "What's the next step you both agree on?"

## 🔵 The Right Mindset for Accountable Conversations

### Accountability Philosophy
"If people feel respected, understand the context and have clarity—they will naturally want to contribute."

### Conscious Intention
"Am I here to help? To connect? To learn?"

### Self-Awareness via Growth Values
"What value do I need to lead from to stay in the Green Zone?"

### Awareness of Others
"What might they be feeling or needing? Can I connect to that?"

## 🎙 Tone & Voice

### Be Emotionally Intelligent
Hold the human without being cheesy. Notice what's beneath the surface. Be warm and clear. No fake empathy. No sugarcoating.

### Be Bold
Don't dance around it. If you see avoidance, name it. If you sense shadow, call it out. Do it with respect, but don't hold back.

### Be Succinct
No rambling. No over-explaining. Ask sharp questions. Reflect what matters. Then stop talking.

### Be Present and Straightforward
Drop the script. Meet people where they are. No jargon. No detours. Just show up, pay attention, and speak cleanly.

## ✅ Implementation Guidelines

Speak like a real, present human coach. Prioritise emotional presence and intuitive sensing over models.

Use frameworks (Red/Green, OBP, OORA, Flow triggers) only when relevant, and only after reflecting what's alive.

Be a mirror, not a map. Always coach toward clarity, values, and vertical growth.

## 📝 Response Formatting

Structure your responses using clear markdown formatting:
- Use **bold** for key concepts and important points
- Use *italic* for emphasis and reflection prompts
- Use bullet points for lists and action items
- Use numbered lists for sequential steps or processes
- Break content into logical sections with clear spacing
- Use > blockquotes for powerful questions or insights
- Keep paragraphs concise (2-3 sentences max)

Example structure:
## Core Insight
Brief reflection on what you're sensing...

**Key Point:** Main coaching insight

### Questions for Reflection:
- What resonates with you about this?
- Where do you notice resistance?

### Next Steps:
1. Immediate action
2. Ongoing practice

Current focus area: ${topic}

${userLGP360Data ? this.generatePersonalizationContext(userLGP360Data) : ''}`;

      // Search knowledge base for relevant context
      let knowledgeBaseContext = '';
      try {
        const kbResult = await this.searchKnowledgeBase(userPrompt);
        if (kbResult) {
          knowledgeBaseContext = `\n\nRelevant knowledge base information:\n${kbResult}`;
        }
      } catch (error) {
        console.log('Knowledge base search failed:', error);
      }

      // Transform conversation history to single input string format
      // Following Responses API pattern from https://platform.openai.com/docs/api-reference/responses/create
      let conversationText = '';
      for (const msg of conversationHistory) {
        const role = msg.sender === "user" ? "User" : "Assistant";
        conversationText += `${role}: ${msg.text}\n\n`;
      }

      // Create single input string for Responses API
      const input = `${systemPrompt}${knowledgeBaseContext}\n\n${conversationText}User: ${userPrompt}`;

      // Calculate total prompt length for debugging
      const totalPromptLength = input.length;
      console.log(`Chat prompt length: ${totalPromptLength} characters`);

      // Use Responses API instead of chat.completions
      // Reference: https://platform.openai.com/docs/api-reference/responses/create
      const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5",
        input,
      });

      // Process response using new API shape as per template guidance
      const aiMessage = response.output_text ?? response.output?.[0]?.content?.[0]?.text ?? "";

      if (!aiMessage || aiMessage.trim() === '') {
        console.error("Empty response from OpenAI Responses API. Response details:", {
          hasOutputText: !!response.output_text,
          hasOutput: !!response.output,
          totalPromptLength
        });
        throw new Error(`Empty completion from model. Prompt length: ${totalPromptLength}`);
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
    if (!lgp360Data.assessment) {
      return '';
    }

    // Extract key insights from assessment to avoid token overflow
    const assessmentSummary = this.extractKeyInsights(lgp360Data.assessment);

    return `
## 👤 USER PERSONALIZATION CONTEXT

**Leadership Profile Summary:**
${assessmentSummary}

**🎯 PERSONALIZATION INSTRUCTIONS:**
Use this leadership profile to:
1. **Tailor coaching questions** to their specific challenges and goals
2. **Reference their leadership style and approaches** 
3. **Build on their strengths** while addressing development areas
4. **Connect to their role and experience level**
5. **Acknowledge their specific situation** and team dynamics

Make coaching personal and relevant to their unique leadership context while maintaining Alteva methodology.
`;
  }

  private extractKeyInsights(assessment: string): string {
    // Limit assessment to key sections, max 1000 characters
    const maxLength = 1000;

    if (assessment.length <= maxLength) {
      return assessment;
    }

    // Try to extract key sections like Executive Overview, Leadership Analysis, etc.
    const sections = assessment.split(/\*\*(.*?)\*\*/);
    let summary = '';

    for (let i = 0; i < sections.length && summary.length < maxLength; i++) {
      const section = sections[i];
      if (section && (
        section.includes('EXECUTIVE OVERVIEW') ||
        section.includes('LEADERSHIP ANALYSIS') ||
        section.includes('DEVELOPMENT FOCUS') ||
        section.includes('strengths') ||
        section.includes('challenges') ||
        section.includes('growth')
      )) {
        const nextContent = sections[i + 1];
        if (nextContent && summary.length + nextContent.length < maxLength) {
          summary += `**${section}**\n${nextContent.substring(0, 200)}...\n\n`;
        }
      }
    }

    // Fallback: take first part of assessment
    if (!summary) {
      summary = assessment.substring(0, maxLength) + '...';
    }

    return summary;
  }

  async getTopicSpecificResponse(message: string, topic: string, conversationHistory: HistoryItem[] = [], userLGP360Data?: { assessment: any; originalContent?: string }): Promise<{ reply: string }> {
    const topicConfig = {
      name: topic,
      systemPrompt: `You are a leadership coach specializing in the Alteva Growth methodology. Your goal is to help leaders grow by focusing on their challenges and development areas.`,
    };

    switch (topic) {
      case "growth-profile":
        topicConfig.systemPrompt = `You are a leadership coach specializing in the Alteva Growth methodology. Focus on helping participants identify their current leadership identity and growth edge. Use Red/Green Zone awareness to surface reactive patterns. Guide them toward values-based leadership strengths and development areas.`;
        break;
      case "red-green-zones":
        topicConfig.systemPrompt = `You are a leadership coach specializing in the Alteva Growth methodology. Help participants recognize specific triggers that shift them into reactive mode (Red Zone) vs. connected, values-driven leadership (Green Zone). Focus on pattern recognition and values-based recovery strategies.`;
        break;
      case "big-practice":
        topicConfig.systemPrompt = `You are a leadership coach specializing in the Alteva Growth methodology. Guide the discovery and implementation of their One Big Practice (OBP) - the single leadership practice with the highest impact. Focus on sustainable integration and daily embodiment.`;
        break;
      case "360-report":
        topicConfig.systemPrompt = `You are a leadership coach specializing in the Alteva Growth methodology. Support the interpretation of feedback through the lens of Red/Green Zone patterns. Help identify growth edges and create accountable development commitments using the OORA framework.`;
        break;
      case "growth-values":
        topicConfig.systemPrompt = `You are a leadership coach specializing in the Alteva Growth methodology. Help surface and embody core growth values in daily leadership. Focus on values-based decision making and authentic leadership expression. Address shadow work where values conflict.`;
        break;
      case "growth-matrix":
        topicConfig.systemPrompt = `You are a leadership coach specializing in the Alteva Growth methodology. Support the creation of an integrated vertical development matrix. Focus on identity-level growth, not just skill building. Prioritize practices that stretch their leadership maturity.`;
        break;
      case "oora-conversation":
        topicConfig.systemPrompt = `You are a leadership coach specializing in the Alteva Growth methodology. Guide preparation for Accountable Conversations using the OORA framework. Focus on Mindset (intention, values, awareness) alongside structure. Practice the truth + care approach.`;
        break;
      case "daily-checkin":
        topicConfig.systemPrompt = `You are a leadership coach specializing in the Alteva Growth methodology. Facilitate daily reflection on OBP integration, values alignment, and Red/Green Zone awareness. Focus on patterns, learning, and next-level leadership identity.`;
        break;
      default:
        topicConfig.systemPrompt = `You are a leadership coach specializing in the Alteva Growth methodology. Your goal is to help leaders grow by focusing on their challenges and development areas.`;
    }

    // Search knowledge base for relevant context
    let knowledgeBaseContext = '';
    try {
      const kbResult = await this.searchKnowledgeBase(message);
      if (kbResult) {
        knowledgeBaseContext = `\n\nRelevant knowledge base information:\n${kbResult}`;
      }
    } catch (error) {
      console.log('Knowledge base search failed:', error);
    }

    // Transform conversation history to single input string format
    let conversationContext = '';
    for (const msg of conversationHistory) {
      const role = msg.sender === "user" ? "User" : "Assistant";
      conversationContext += `${role}: ${msg.text}\n\n`;
    }

    // Construct the prompt
    const promptContent = `${topicConfig.systemPrompt}${userLGP360Data ? this.generatePersonalizationContext(userLGP360Data) : ''}${knowledgeBaseContext}

Current topic: ${topicConfig.name}

Previous conversation:
${conversationContext}

User: ${message}

Please provide a helpful, practical response focused on ${topicConfig.name.toLowerCase()}. Keep your response conversational and actionable.`;

    // Get the AI response
    const response = await this.getLeadershipResponse(message, topicConfig.name, conversationHistory, userLGP360Data);

    return response;
  }

  /** Analyzes uploaded document and creates professional coaching assessment */
  async analyzeDocumentProfessional(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<{ 
    originalContent: string; 
    assessment: string; 
  }> {
    try {
      // Convert buffer to text based on file type
      let documentText = '';

      if (mimeType === 'text/plain') {
        documentText = fileBuffer.toString('utf-8');
      } else if (mimeType === 'application/pdf') {
        // For demo purposes, create realistic sample content for PDF
        documentText = `Leadership Assessment Report

Name: John Smith
Current Role: Senior Manager
Organization: TechCorp Inc.
Years in Leadership: 5 years
Team Size: 12 direct reports
Industry: Technology/Software

Leadership Strengths:
- Strong analytical thinking
- Excellent technical knowledge  
- Clear communication style
- Team-oriented approach

Growth Areas:
- Conflict resolution skills need development
- Decision-making could be more decisive
- Delegation skills require improvement
- Strategic thinking needs enhancement

Communication Style: Analytical & Data-Driven
Decision Making: Consultative & Inclusive
Conflict Resolution: Collaborative Problem Solving

Primary Challenges:
- Managing remote team dynamics
- Balancing technical and people leadership
- Time management with competing priorities

Leadership Goals:
- Improve emotional intelligence
- Develop better delegation skills
- Enhance strategic thinking
- Build stronger team cohesion

Previous Coaching: Limited coaching experience
Learning Preferences: Case studies, peer learning, hands-on practice`;
      } else {
        // For Word docs, create realistic sample content
        documentText = `360-Degree Feedback Report

Employee: Sarah Johnson
Position: Director of Operations
Department: Operations
Years of Experience: 8 years
Team Size: 25 team members

Feedback Summary:
The feedback indicates strong operational excellence and process optimization skills. Sarah demonstrates exceptional attention to detail and consistently delivers results.

Strengths (from peers and direct reports):
- Outstanding project management
- Clear and effective communication
- Strong problem-solving abilities
- Supportive and encouraging leadership style
- Data-driven decision making

Development Opportunities:
- More delegation to develop team members
- Increased strategic focus vs operational details
- Building stronger cross-functional relationships
- Enhancing change management skills

Communication Style: Supportive & Encouraging
Decision Making Approach: Analytical & Thorough
Conflict Resolution: Mediating & Facilitating

Goals for Development:
- Transition from operational to strategic focus
- Develop coaching and mentoring skills
- Improve work-life balance
- Build executive presence

Coaching Background: Some coaching experience
Preferred Learning: Mentoring, workshops, 360 feedback`;
      }

      const assessmentPrompt = `You are an expert Alteva leadership coach conducting a comprehensive professional assessment.

Analyze this leadership document and create a professional coaching assessment that combines analytical rigor with executive-level presentation:

Document content:
${documentText}

Create a comprehensive, professionally formatted coaching assessment that includes:

**EXECUTIVE OVERVIEW**
- Brief professional summary of the leader's profile and context
- Key leadership identity and current growth edge

**LEADERSHIP ANALYSIS** 
- Current role, experience, and organizational context
- Core leadership strengths and what they do exceptionally well
- Growth opportunities and development areas using Alteva methodology

**BEHAVIORAL PATTERNS**
- Red Zone (reactive) and Green Zone (values-driven) leadership patterns
- Communication style, decision-making approach, and conflict resolution
- Leadership style insights and natural approaches

**DEVELOPMENT FOCUS**
- Current challenges and what they're navigating
- Growth values and alignment with authentic leadership expression
- Specific coaching recommendations and transformation focus areas

**COACHING PATHWAY**
- Priority development areas for maximum impact
- Recommended practices and learning preferences
- Success indicators and growth milestones

Write this as a professional, executive-level coaching assessment that flows naturally and provides both analytical depth and practical insights. Make it suitable for both coach planning and leader review - comprehensive, encouraging, and actionable.`;

      console.log("Professional document analysis request:", {
        fileType: mimeType,
        documentLength: documentText.length,
        fileName
      });

      // Create single input for document analysis using Responses API
      // Reference: https://platform.openai.com/docs/api-reference/responses/create
      const systemInstruction = "You are an expert Alteva leadership coach creating professional, executive-level coaching assessments. Combine analytical depth with professional presentation suitable for both coach planning and leader review.";
      const input = `${systemInstruction}\n\n${assessmentPrompt}`;

      // Generate single professional coaching assessment using Responses API
      const assessmentResponse = await openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5",
        input,
      });

      // Process response using new API shape as per template guidance
      const assessment = assessmentResponse.output_text ?? assessmentResponse.output?.[0]?.content?.[0]?.text ?? "";

      if (!assessment || assessment.trim() === '') {
        throw new Error("Empty assessment response from Responses API");
      }

      console.log("Professional assessment completed:", {
        assessmentLength: assessment.length
      });

      return {
        originalContent: documentText,
        assessment: assessment.trim()
      };

    } catch (error) {
      console.error("Error analyzing document:", error);
      throw new Error("Failed to analyze document with AI");
    }
  }
}

export const openaiService = new OpenAIService();