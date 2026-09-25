import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { config } from '../config.js';
import { fileModel } from '../db.js';

export const aiService = {
  isConfigured() {
    return Boolean(config.ai.geminiApiKey || config.ai.openaiApiKey);
  },

  getProviderInfo() {
    if (config.ai.geminiApiKey) {
      return { provider: 'gemini', model: config.ai.geminiModel };
    }
    if (config.ai.openaiApiKey) {
      return { provider: 'openai', model: config.ai.openaiModel };
    }
    return { provider: 'none', model: null };
  },

  /**
   * Performs Grounded RAG Search over the user's vault documents
   */
  async askVault(userId, question) {
    if (!this.isConfigured()) {
      return {
        connected: false,
        answer: null,
        error: "AI Search is not connected. Please add GEMINI_API_KEY (Free tier) or OPENAI_API_KEY to your .env file or server settings.",
        sources: [],
        suggestion: "Standard keyword and document search is available."
      };
    }

    if (!question || !question.trim()) {
      throw new Error("Question cannot be empty");
    }

    // 1. Fetch user's indexed files and text chunks from database
    const allFiles = await fileModel.getAllTextChunksByUser(userId);

    if (allFiles.length === 0) {
      return {
        connected: true,
        answer: "Your vault is currently empty. Upload PDFs, images, documents, or create personal notes first, and I will search through them for you.",
        sources: [],
        isGrounded: true
      };
    }

    // 2. Score and rank candidate documents based on question tokens and semantic relevance
    const relevantDocs = this.rankRelevantDocs(allFiles, question);

    if (relevantDocs.length === 0) {
      return {
        connected: true,
        answer: `I searched across all ${allFiles.length} file(s) in your private vault, but could not find any documents mentioning or related to "${question}".`,
        sources: [],
        isGrounded: true
      };
    }

    // 3. Build the grounded context from top matching documents
    const contextPrompt = this.buildContextPrompt(relevantDocs, question);

    // 4. Query configured LLM (Gemini or OpenAI) with strict anti-hallucination prompt
    const { provider } = this.getProviderInfo();
    let rawAnswer = '';

    if (provider === 'gemini') {
      rawAnswer = await this.queryGemini(contextPrompt);
    } else if (provider === 'openai') {
      rawAnswer = await this.queryOpenAI(contextPrompt);
    }

    // 5. Build cited sources list
    const sources = relevantDocs.map(doc => ({
      id: doc.id,
      originalName: doc.original_name,
      mimeType: doc.mime_type,
      isNote: Boolean(doc.is_note),
      created_at: doc.created_at,
      snippet: doc.extracted_text ? doc.extracted_text.slice(0, 200) + '...' : doc.summary
    }));

    return {
      connected: true,
      answer: rawAnswer,
      sources,
      isGrounded: true,
      aiProvider: provider,
      model: provider === 'gemini' ? config.ai.geminiModel : config.ai.openaiModel
    };
  },

  rankRelevantDocs(docs, query) {
    const queryTokens = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2);

    const scored = docs.map(doc => {
      let score = 0;
      const titleLower = doc.original_name.toLowerCase();
      const textLower = (doc.extracted_text || '').toLowerCase();
      const tagsLower = (doc.tags || '').toLowerCase();
      const summaryLower = (doc.summary || '').toLowerCase();

      for (const token of queryTokens) {
        // Title match has highest weight
        if (titleLower.includes(token)) score += 10;
        // Tags match
        if (tagsLower.includes(token)) score += 8;
        // Text match count
        const occurrences = (textLower.match(new RegExp(token, 'g')) || []).length;
        score += Math.min(occurrences * 2, 20);
        // Summary match
        if (summaryLower.includes(token)) score += 4;
      }

      // If generic question like "all certificates" or "internships"
      return { doc, score };
    });

    // If some docs scored > 0, return top scored ones
    const matches = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
    if (matches.length > 0) {
      return matches.slice(0, 8).map(m => m.doc);
    }

    // If no exact token match but vault is small (<= 10 files), include all files so LLM can reason semantically
    if (docs.length <= 10) {
      return docs;
    }

    return [];
  },

  buildContextPrompt(docs, question) {
    const documentsContext = docs.map((doc, idx) => {
      const typeLabel = doc.is_note ? 'Personal Note' : `File (${doc.mime_type})`;
      const cleanContent = (doc.extracted_text || doc.summary || '[No text content]').slice(0, 3500);
      return `--- DOCUMENT #${idx + 1} ---
File Name: ${doc.original_name}
Type: ${typeLabel}
File ID: ${doc.id}
Tags: ${doc.tags || '[]'}
Content:
${cleanContent}
-----------------------`;
    }).join('\n\n');

    return `You are the user's private, strictly grounded Personal AI Vault Assistant.
Your task is to answer the user's question ONLY using the uploaded documents and notes provided below.

CRITICAL RULES:
1. ONLY use information explicitly stated in the provided documents.
2. DO NOT hallucinate, infer without basis, or use external internet knowledge.
3. If the answer cannot be found in the provided documents, say: "I could not find information about that in your uploaded vault files."
4. ALWAYS cite the exact file name(s) you used to answer the question (e.g., "[Used: Certificate_2024.pdf]").
5. Keep answers concise, clear, and direct.

--- USER'S VAULT DOCUMENTS ---
${documentsContext}
--- END OF DOCUMENTS ---

USER QUESTION: "${question}"

Provide your grounded answer with citations:`;
  },

  async queryGemini(prompt) {
    const genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: config.ai.geminiModel });
    const result = await model.generateContent(prompt);
    return result.response.text();
  },

  async queryOpenAI(prompt) {
    const openai = new OpenAI({ apiKey: config.ai.openaiApiKey });
    const response = await openai.chat.completions.create({
      model: config.ai.openaiModel,
      messages: [
        { role: 'system', content: 'You are a strictly grounded Personal AI Vault Assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });
    return response.choices[0]?.message?.content || 'No response generated.';
  }
};
