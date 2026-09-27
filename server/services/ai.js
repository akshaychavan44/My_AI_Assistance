import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { config } from '../config.js';
import { fileModel } from '../db.js';
import { localExplorer } from './localExplorer.js';

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
   * Performs Grounded RAG Search over the user's vault documents & local laptop files/folders
   */
  async askVault(userId, question) {
    if (!question || !question.trim()) {
      throw new Error("Question cannot be empty");
    }

    // 1. Fetch user's indexed vault files from database
    const allFiles = await fileModel.getAllTextChunksByUser(userId);
    const relevantDocs = this.rankRelevantDocs(allFiles, question);

    // 2. Search local laptop files and folders if relevant or requested
    let localMatches = [];
    const folderListRequest = this.getFolderListLocation(question);

    // Extract candidate search terms for local laptop search
    const cleanSearchTerm = question
      .trim()
      .replace(/[?.,!]+$/, '')
      .replace(/^(where\s+is|find|search|give\s+me|get\s+path\s+of|show\s+me|locate|open)\s+(the\s+)?(folder|file|path|directory)?\s*(for\s+|of\s+|named\s+)?/i, '')
      .replace(/\s+(on\s+my\s+(laptop|pc|computer)|in\s+my\s+(laptop|pc)|in\s+my\s+vault)$/i, '')
      .trim();

    if (folderListRequest) {
      try {
        localMatches = await localExplorer.listFoldersInLocation(folderListRequest, { maxResults: 100, maxDepth: 1 });
      } catch (err) {
        console.warn('Local folder listing in AI error:', err.message);
      }
    } else if (cleanSearchTerm.length >= 2) {
      try {
        const typeFilter = /folder/i.test(question) ? 'folder' : (/file/i.test(question) ? 'file' : 'all');
        localMatches = await localExplorer.searchLocalLaptop(cleanSearchTerm, { type: typeFilter, maxResults: 8 });
      } catch (err) {
        console.warn('Local laptop search in AI error:', err.message);
      }
    }

    // Folder and file discovery remains useful even when an LLM key has not
    // been configured, so return a grounded deterministic answer in that case.
    if (!this.isConfigured()) {
      if (localMatches.length > 0) {
        return this.buildLocalOnlyResult(localMatches, folderListRequest);
      }
      return {
        connected: false,
        answer: null,
        error: "AI Search is not connected. Please add GEMINI_API_KEY (Free tier) or OPENAI_API_KEY to your .env file or server settings.",
        sources: [],
        suggestion: "Local folder and file lookup is available when matching items are found."
      };
    }

    if (relevantDocs.length === 0 && localMatches.length === 0 && allFiles.length === 0) {
      return {
        connected: true,
        answer: "Your vault is currently empty and no matching files were found on your laptop. Upload documents to your vault or specify a folder name on your laptop.",
        sources: [],
        isGrounded: true
      };
    }

    if (relevantDocs.length === 0 && localMatches.length === 0) {
      return {
        connected: true,
        answer: `I searched across your private vault files and local laptop folders, but could not find any matches for "${question}".`,
        sources: [],
        isGrounded: true
      };
    }

    // 3. Build the grounded context from vault documents and local laptop filesystem matches
    const contextPrompt = this.buildContextPrompt(relevantDocs, localMatches, question);

    // 4. Query configured LLM (Gemini or OpenAI) with strict anti-hallucination prompt
    const { provider } = this.getProviderInfo();
    let rawAnswer = '';

    if (provider === 'gemini') {
      rawAnswer = await this.queryGemini(contextPrompt);
    } else if (provider === 'openai') {
      rawAnswer = await this.queryOpenAI(contextPrompt);
    }

    // 5. Build cited sources list (both vault documents and local laptop paths)
    const sources = [
      ...localMatches.map(loc => ({
        id: `local-${loc.name}`,
        originalName: loc.name,
        isLocalLaptop: true,
        type: loc.type,
        path: loc.path,
        mimeType: loc.type === 'folder' ? 'directory' : (loc.extension || 'file'),
        snippet: `Local ${loc.type}: ${loc.path}`
      })),
      ...relevantDocs.map(doc => ({
        id: doc.id,
        originalName: doc.original_name,
        mimeType: doc.mime_type,
        isNote: Boolean(doc.is_note),
        created_at: doc.created_at,
        snippet: doc.extracted_text ? doc.extracted_text.slice(0, 200) + '...' : doc.summary
      }))
    ];

    return {
      connected: true,
      answer: rawAnswer,
      sources,
      isGrounded: true,
      aiProvider: provider,
      model: provider === 'gemini' ? (this.activeGeminiModel || config.ai.geminiModel) : config.ai.openaiModel
    };
  },

  rankRelevantDocs(docs, query) {
    if (!docs || docs.length === 0) return [];
    const queryTokens = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2);

    const scored = docs.map(doc => {
      let score = 0;
      const titleLower = String(doc.original_name || '').toLowerCase();
      const textLower = String(doc.extracted_text || '').toLowerCase();
      // PostgreSQL JSONB values are returned as arrays/objects, while older
      // records may still contain a JSON string. Normalize every form first.
      const tagsLower = this.normalizeTags(doc.tags).toLowerCase();
      const summaryLower = String(doc.summary || '').toLowerCase();

      for (const token of queryTokens) {
        if (titleLower.includes(token)) score += 10;
        if (tagsLower.includes(token)) score += 8;
        const occurrences = (textLower.match(new RegExp(token, 'g')) || []).length;
        score += Math.min(occurrences * 2, 20);
        if (summaryLower.includes(token)) score += 4;
      }

      return { doc, score };
    });

    const matches = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
    if (matches.length > 0) {
      return matches.slice(0, 8).map(m => m.doc);
    }

    if (docs.length <= 10) {
      return docs;
    }

    return [];
  },

  normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.map(tag => String(tag || '')).join(' ');
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) return parsed.map(tag => String(tag || '')).join(' ');
      } catch {
        // Plain-text tags are valid too.
      }
      return tags;
    }
    if (tags && typeof tags === 'object') return Object.values(tags).map(value => String(value || '')).join(' ');
    return '';
  },

  getFolderListLocation(question) {
    const normalized = String(question || '').toLowerCase();
    const requestsFolderList = /\b(all|list|show|give|what)\b[\s\w,]*(?:folders?|directories?)\b|\b(?:folders?|directories?)\b[\s\w,]*\b(all|list)\b/.test(normalized);
    if (!requestsFolderList) return null;
    if (/\bdesktop\b/.test(normalized)) return 'desktop';
    if (/\bdocuments?\b/.test(normalized)) return 'documents';
    if (/\bdownloads?\b/.test(normalized)) return 'downloads';
    if (/\bpictures?\b/.test(normalized)) return 'pictures';
    if (/\bvideos?\b/.test(normalized)) return 'videos';
    if (/\bmusic\b/.test(normalized)) return 'music';
    if (/\b(home|computer|laptop|pc)\b/.test(normalized)) return 'home';
    return null;
  },

  buildLocalOnlyResult(localMatches, folderListLocation) {
    const locationLabel = folderListLocation ? ` in your ${folderListLocation}` : '';
    const paths = localMatches.map(item => `- ${item.name} — ${item.path}`).join('\n');
    return {
      connected: false,
      answer: `I found ${localMatches.length} ${folderListLocation ? 'folder(s)' : 'item(s)'}${locationLabel}:\n${paths}`,
      sources: localMatches.map(loc => ({
        id: `local-${loc.path}`,
        originalName: loc.name,
        isLocalLaptop: true,
        type: loc.type,
        path: loc.path,
        mimeType: loc.type === 'folder' ? 'directory' : (loc.extension || 'file'),
        snippet: `Local ${loc.type}: ${loc.path}`
      })),
      isGrounded: true,
      suggestion: 'Configure an AI provider to ask follow-up questions about these results.'
    };
  },

  buildContextPrompt(vaultDocs, localMatches, question) {
    const documentsContext = vaultDocs.map((doc, idx) => {
      const typeLabel = doc.is_note ? 'Personal Note' : `File (${doc.mime_type})`;
      const cleanContent = (doc.extracted_text || doc.summary || '[No text content]').slice(0, 3500);
      return `--- VAULT DOCUMENT #${idx + 1} ---
File Name: ${doc.original_name}
Type: ${typeLabel}
Content:
${cleanContent}
-----------------------`;
    }).join('\n\n');

    const localContext = localMatches.map((loc, idx) => {
      return `--- LOCAL LAPTOP ITEM #${idx + 1} ---
Name: ${loc.name}
Type: ${loc.type === 'folder' ? 'Directory / Folder' : 'File'}
Absolute Path: ${loc.path}
Extension: ${loc.extension || 'N/A'}
-----------------------`;
    }).join('\n\n');

    return `You are the user's private, strictly grounded Personal AI Assistant connected to both their Vault and their local laptop.
Your task is to answer the user's question accurately using the documents and local laptop items provided below.

CRITICAL RULES:
1. When the user asks for a file or folder path on their laptop, give the exact full absolute path (e.g. \`C:\\Users\\...\`) in a code block.
2. Clearly mention whether each item is a folder or file.
3. If citing vault documents, cite their file names.
4. Keep answers concise, helpful, and direct.

--- LOCAL LAPTOP FILES & FOLDERS FOUND ---
${localContext || '[No local laptop files found]'}
--- END OF LOCAL LAPTOP FILES ---

--- USER'S VAULT DOCUMENTS ---
${documentsContext || '[No vault documents]'}
--- END OF VAULT DOCUMENTS ---

USER QUESTION: "${question}"

Provide your direct answer with paths and details:`;
  },

  async queryGemini(prompt) {
    const genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
    const candidateModels = await this.getGeminiCandidateModels();
    
    let lastError = null;
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        this.activeGeminiModel = modelName;
        return result.response.text();
      } catch (err) {
        lastError = err;
        console.warn(`Gemini generation on model "${modelName}" failed (${err.message}), trying next model...`);
      }
    }

    throw lastError || new Error('All Gemini models failed to generate response');
  },

  async getGeminiCandidateModels() {
    const configured = config.ai.geminiModel.replace(/^models\//, '');
    const priorityList = [configured, 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];
    
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': config.ai.geminiApiKey }
      });
      if (response.ok) {
        const payload = await response.json();
        const models = Array.isArray(payload.models) ? payload.models : [];
        const usableModels = models
          .filter(model => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
          .map(model => String(model.name || '').replace(/^models\//, ''))
          .filter(Boolean);

        const candidates = priorityList.filter(m => usableModels.includes(m));
        if (candidates.length > 0) {
          return [...new Set(candidates)];
        }
        return usableModels.length > 0 ? usableModels.slice(0, 4) : priorityList;
      }
    } catch {
      // If listing fails, use fallback priority list
    }
    return [...new Set(priorityList)];
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
