import { api } from './api.js';
import { voiceprintEngine } from './voiceprint.js';

// Application State
const state = {
  currentUser: null,
  files: [],
  stats: null,
  activeFilter: 'all',
  activeView: 'grid', // 'grid' or 'list'
  selectedUploadFiles: [],
  currentPreviewFile: null,
  servicesStatus: null
};

// DOM Element References
const elements = {
  // Views
  authView: document.getElementById('auth-view'),
  mainView: document.getElementById('main-view'),

  // Auth Forms
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  tabLoginBtn: document.getElementById('tab-login-btn'),
  tabRegisterBtn: document.getElementById('tab-register-btn'),
  loginError: document.getElementById('login-error'),
  registerError: document.getElementById('register-error'),

  // Navbar
  globalSearchInput: document.getElementById('global-search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  btnOpenAiModal: document.getElementById('btn-open-ai-modal'),
  btnStatusModal: document.getElementById('btn-status-modal'),
  headerStatusDot: document.getElementById('header-status-dot'),
  navUserName: document.getElementById('nav-user-name'),
  navUserAvatar: document.getElementById('nav-user-avatar'),
  btnLogout: document.getElementById('btn-logout'),

  // Sidebar
  navItems: document.querySelectorAll('.sidebar-nav .nav-item'),
  countAll: document.getElementById('count-all'),
  countPdf: document.getElementById('count-pdf'),
  countImage: document.getElementById('count-image'),
  countDoc: document.getElementById('count-doc'),
  countNote: document.getElementById('count-note'),
  btnOpenUpload: document.getElementById('btn-open-upload'),
  btnOpenNote: document.getElementById('btn-open-note'),
  storageStatusBadge: document.getElementById('storage-status-badge'),
  storageStatusText: document.getElementById('storage-status-text'),
  aiStatusText: document.getElementById('ai-status-text'),
  btnWidgetDetails: document.getElementById('btn-widget-details'),

  // Feed & Controls
  mobileFilterDropdown: document.getElementById('mobile-filter-dropdown'),
  btnMobileUpload: document.getElementById('btn-mobile-upload'),
  btnMobileNote: document.getElementById('btn-mobile-note'),
  btnMobileAi: document.getElementById('btn-mobile-ai'),
  currentViewTitle: document.getElementById('current-view-title'),
  viewItemCount: document.getElementById('view-item-count'),
  btnViewGrid: document.getElementById('btn-view-grid'),
  btnViewList: document.getElementById('btn-view-list'),
  searchResultsInfo: document.getElementById('search-results-info'),
  searchQueryDisplay: document.getElementById('search-query-display'),
  btnResetSearch: document.getElementById('btn-reset-search'),
  vaultItemsContainer: document.getElementById('vault-items-container'),
  vaultEmptyState: document.getElementById('vault-empty-state'),
  btnEmptyUpload: document.getElementById('btn-empty-upload'),
  btnEmptyNote: document.getElementById('btn-empty-note'),

  // Notice Banner
  serviceNoticeBanner: document.getElementById('service-notice-banner'),
  bannerTitle: document.getElementById('banner-title'),
  bannerDesc: document.getElementById('banner-desc'),
  bannerActionBtn: document.getElementById('banner-action-btn'),

  // AI Modal
  aiModal: document.getElementById('ai-modal'),
  btnCloseAiModal: document.getElementById('btn-close-ai-modal'),
  aiConnectionIndicator: document.getElementById('ai-connection-indicator'),
  aiIndicatorText: document.getElementById('ai-indicator-text'),
  aiAskForm: document.getElementById('ai-ask-form'),
  aiQuestionInput: document.getElementById('ai-question-input'),
  aiLoading: document.getElementById('ai-loading'),
  aiAnswerCard: document.getElementById('ai-answer-card'),
  aiModelTag: document.getElementById('ai-model-tag'),
  aiAnswerText: document.getElementById('ai-answer-text'),
  aiSourcesCount: document.getElementById('ai-sources-count'),
  aiSourcesList: document.getElementById('ai-sources-list'),
  aiNotConnectedCard: document.getElementById('ai-not-connected-card'),
  btnOpenStatusFromAi: document.getElementById('btn-open-status-from-ai'),
  suggestionChips: document.querySelectorAll('.suggestion-chips .chip-btn'),

  // Upload Modal
  uploadModal: document.getElementById('upload-modal'),
  btnCloseUploadModal: document.getElementById('btn-close-upload-modal'),
  uploadDropzone: document.getElementById('upload-dropzone'),
  fileInput: document.getElementById('file-input'),
  selectedFilesList: document.getElementById('selected-files-list'),
  selectedFilesCount: document.getElementById('selected-files-count'),
  filesPreviewList: document.getElementById('files-preview-list'),
  btnClearUploadFiles: document.getElementById('btn-clear-upload-files'),
  btnStartUpload: document.getElementById('btn-start-upload'),
  uploadProgressBox: document.getElementById('upload-progress-box'),

  // Note Modal
  noteModal: document.getElementById('note-modal'),
  btnCloseNoteModal: document.getElementById('btn-close-note-modal'),
  noteForm: document.getElementById('note-form'),
  noteTitleInput: document.getElementById('note-title-input'),
  noteTagsInput: document.getElementById('note-tags-input'),
  noteContentInput: document.getElementById('note-content-input'),
  btnCancelNote: document.getElementById('btn-cancel-note'),

  // Credential / Password Modal
  credentialModal: document.getElementById('credential-modal'),
  btnCloseCredentialModal: document.getElementById('btn-close-credential-modal'),
  btnOpenCredential: document.getElementById('btn-open-credential'),
  btnMobileCredential: document.getElementById('btn-mobile-credential'),
  credentialForm: document.getElementById('credential-form'),
  credTitleInput: document.getElementById('cred-title-input'),
  credUsernameInput: document.getElementById('cred-username-input'),
  credPasswordInput: document.getElementById('cred-password-input'),
  btnToggleCredPassword: document.getElementById('btn-toggle-cred-password'),
  credUrlInput: document.getElementById('cred-url-input'),
  credNotesInput: document.getElementById('cred-notes-input'),
  btnCancelCredential: document.getElementById('btn-cancel-credential'),
  countCredential: document.getElementById('count-credential'),

  // Preview Modal
  previewModal: document.getElementById('preview-modal'),
  btnClosePreviewModal: document.getElementById('btn-close-preview-modal'),
  previewTypeIcon: document.getElementById('preview-type-icon'),
  previewFilename: document.getElementById('preview-filename'),
  previewSubmeta: document.getElementById('preview-submeta'),
  btnDownloadFile: document.getElementById('btn-download-file'),
  btnDeleteFile: document.getElementById('btn-delete-file'),
  previewViewerContainer: document.getElementById('preview-viewer-container'),
  previewExtractedText: document.getElementById('preview-extracted-text'),
  previewTagsContainer: document.getElementById('preview-tags-container'),
  previewStorageKey: document.getElementById('preview-storage-key'),

  // Status Modal
  statusModal: document.getElementById('status-modal'),
  btnCloseStatusModal: document.getElementById('btn-close-status-modal'),
  diagStorageBadge: document.getElementById('diag-storage-badge'),
  diagStorageMsg: document.getElementById('diag-storage-msg'),
  diagAiBadge: document.getElementById('diag-ai-badge'),
  diagAiMsg: document.getElementById('diag-ai-msg'),
  phoneAccessUrl: document.getElementById('phone-access-url'),

  // Mobile Bottom Nav
  bottomNavItems: document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item'),
  btnBnavAi: document.getElementById('btn-bnav-ai'),
  btnBnavUpload: document.getElementById('btn-bnav-upload'),
  btnBnavNote: document.getElementById('btn-bnav-note'),
  btnBnavStatus: document.getElementById('btn-bnav-status'),
};

// ================= INITIALIZATION & AUTH =================

async function initApp() {
  setupEventListeners();
  checkPhoneAccessUrl();

  const token = api.getToken();
  if (!token) {
    showAuthView();
    return;
  }

  try {
    const meRes = await api.auth.getMe();
    state.currentUser = meRes.user;
    showMainView();
    await loadFiles();
    await loadStatus();
  } catch (err) {
    console.warn('Session expired or invalid token:', err.message);
    api.auth.logout();
    showAuthView();
  }
}

function showAuthView() {
  elements.authView.style.display = 'flex';
  elements.mainView.style.display = 'none';
}

function showMainView() {
  elements.authView.style.display = 'none';
  elements.mainView.style.display = 'flex';

  if (state.currentUser) {
    elements.navUserName.textContent = state.currentUser.username;
    elements.navUserAvatar.textContent = state.currentUser.username.charAt(0).toUpperCase();
  }
}

function checkPhoneAccessUrl() {
  const host = window.location.hostname;
  const port = window.location.port || '3003';
  if (host === 'localhost' || host === '127.0.0.1') {
    elements.phoneAccessUrl.textContent = `http://<your-laptop-ip>:${port}`;
  } else {
    elements.phoneAccessUrl.textContent = window.location.origin;
  }
}

// ================= EVENT LISTENERS =================

function setupEventListeners() {
  // Auth Tab Toggling
  elements.tabLoginBtn.addEventListener('click', () => {
    elements.tabLoginBtn.classList.add('active');
    elements.tabRegisterBtn.classList.remove('active');
    elements.loginForm.style.display = 'block';
    elements.registerForm.style.display = 'none';
    elements.loginError.style.display = 'none';
  });

  elements.tabRegisterBtn.addEventListener('click', () => {
    elements.tabRegisterBtn.classList.add('active');
    elements.tabLoginBtn.classList.remove('active');
    elements.registerForm.style.display = 'block';
    elements.loginForm.style.display = 'none';
    elements.registerError.style.display = 'none';
  });

  // Login Submit
  elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    elements.loginError.style.display = 'none';

    try {
      const res = await api.auth.login(identifier, password);
      state.currentUser = res.user;
      showMainView();
      await loadFiles();
      await loadStatus();
    } catch (err) {
      elements.loginError.textContent = err.message;
      elements.loginError.style.display = 'block';
    }
  });

  // Register Submit
  elements.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    elements.registerError.style.display = 'none';

    try {
      const res = await api.auth.register(username, email, password);
      state.currentUser = res.user;
      showMainView();
      await loadFiles();
      await loadStatus();
    } catch (err) {
      elements.registerError.textContent = err.message;
      elements.registerError.style.display = 'block';
    }
  });

  // Logout
  elements.btnLogout.addEventListener('click', () => {
    api.auth.logout();
    state.currentUser = null;
    state.files = [];
    showAuthView();
  });

  // Sidebar Filter Navigation
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const filter = item.getAttribute('data-filter');
      setActiveFilter(filter);
    });
  });

  // Mobile Filter Dropdown
  elements.mobileFilterDropdown.addEventListener('change', (e) => {
    setActiveFilter(e.target.value);
  });

  // View Switcher (Grid vs List)
  elements.btnViewGrid.addEventListener('click', () => setViewLayout('grid'));
  elements.btnViewList.addEventListener('click', () => setViewLayout('list'));

  // Live Instant Search
  let searchTimeout = null;
  elements.globalSearchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    elements.searchClearBtn.style.display = val ? 'block' : 'none';

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(val);
    }, 250);
  });

  elements.searchClearBtn.addEventListener('click', () => {
    elements.globalSearchInput.value = '';
    elements.searchClearBtn.style.display = 'none';
    elements.searchResultsInfo.style.display = 'none';
    renderFiles(state.files);
  });

  elements.btnResetSearch.addEventListener('click', () => {
    elements.globalSearchInput.value = '';
    elements.searchClearBtn.style.display = 'none';
    elements.searchResultsInfo.style.display = 'none';
    renderFiles(state.files);
  });

  // Modal Openers
  const openUploadModal = () => {
    resetUploadState();
    elements.uploadModal.style.display = 'flex';
  };
  const openNoteModal = () => {
    elements.noteForm.reset();
    elements.noteModal.style.display = 'flex';
  };
  const openCredentialModal = () => {
    if (elements.credentialForm) elements.credentialForm.reset();
    if (elements.credPasswordInput) elements.credPasswordInput.type = 'password';
    if (elements.btnToggleCredPassword) elements.btnToggleCredPassword.textContent = '👁️';
    if (elements.credentialModal) elements.credentialModal.style.display = 'flex';
  };
  const openAiModal = () => {
    updateAiModalStatus();
    elements.aiModal.style.display = 'flex';
  };
  const openStatusModal = () => {
    loadStatus();
    elements.statusModal.style.display = 'flex';
  };

  elements.btnOpenUpload.addEventListener('click', openUploadModal);
  elements.btnMobileUpload.addEventListener('click', openUploadModal);
  elements.btnEmptyUpload.addEventListener('click', openUploadModal);
  elements.btnBnavUpload.addEventListener('click', openUploadModal);

  elements.btnOpenNote.addEventListener('click', openNoteModal);
  elements.btnMobileNote.addEventListener('click', openNoteModal);
  elements.btnEmptyNote.addEventListener('click', openNoteModal);
  elements.btnBnavNote.addEventListener('click', openNoteModal);

  if (elements.btnOpenCredential) elements.btnOpenCredential.addEventListener('click', openCredentialModal);
  if (elements.btnMobileCredential) elements.btnMobileCredential.addEventListener('click', openCredentialModal);

  elements.btnOpenAiModal.addEventListener('click', openAiModal);
  elements.btnMobileAi.addEventListener('click', openAiModal);
  elements.btnBnavAi.addEventListener('click', openAiModal);

  elements.btnStatusModal.addEventListener('click', openStatusModal);
  elements.btnWidgetDetails.addEventListener('click', openStatusModal);
  elements.btnBnavStatus.addEventListener('click', openStatusModal);
  elements.bannerActionBtn.addEventListener('click', openStatusModal);
  elements.btnOpenStatusFromAi.addEventListener('click', () => {
    elements.aiModal.style.display = 'none';
    openStatusModal();
  });

  // Modal Closers
  elements.btnCloseUploadModal.addEventListener('click', () => elements.uploadModal.style.display = 'none');
  elements.btnCloseNoteModal.addEventListener('click', () => elements.noteModal.style.display = 'none');
  elements.btnCancelNote.addEventListener('click', () => elements.noteModal.style.display = 'none');
  elements.btnCloseAiModal.addEventListener('click', () => elements.aiModal.style.display = 'none');
  elements.btnClosePreviewModal.addEventListener('click', () => elements.previewModal.style.display = 'none');
  elements.btnCloseStatusModal.addEventListener('click', () => elements.statusModal.style.display = 'none');

  // Close modals on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });
  });

  // Upload Dropzone Events
  elements.fileInput.addEventListener('change', (e) => {
    handleSelectedFiles(Array.from(e.target.files));
  });

  elements.uploadDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadDropzone.classList.add('drag-over');
  });

  elements.uploadDropzone.addEventListener('dragleave', () => {
    elements.uploadDropzone.classList.remove('drag-over');
  });

  elements.uploadDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadDropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFiles(Array.from(e.dataTransfer.files));
    }
  });

  elements.btnClearUploadFiles.addEventListener('click', resetUploadState);
  elements.btnStartUpload.addEventListener('click', performUpload);

  // Note Submit
  elements.noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = elements.noteTitleInput.value.trim();
    const content = elements.noteContentInput.value.trim();
    const tagsRaw = elements.noteTagsInput.value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : ['note'];

    try {
      await api.notes.create(title, content, tags);
      elements.noteModal.style.display = 'none';
      await loadFiles();
    } catch (err) {
      alert('Failed to save note: ' + err.message);
    }
  });

  // Credential Modal Closers, Password Toggle & Submit
  if (elements.btnCloseCredentialModal) elements.btnCloseCredentialModal.addEventListener('click', () => elements.credentialModal.style.display = 'none');
  if (elements.btnCancelCredential) elements.btnCancelCredential.addEventListener('click', () => elements.credentialModal.style.display = 'none');

  if (elements.btnToggleCredPassword && elements.credPasswordInput) {
    elements.btnToggleCredPassword.addEventListener('click', () => {
      const isPass = elements.credPasswordInput.type === 'password';
      elements.credPasswordInput.type = isPass ? 'text' : 'password';
      elements.btnToggleCredPassword.textContent = isPass ? '🙈' : '👁️';
    });
  }

  if (elements.credentialForm) {
    elements.credentialForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = elements.credTitleInput.value.trim();
      const username = elements.credUsernameInput.value.trim();
      const password = elements.credPasswordInput.value.trim();
      const url = elements.credUrlInput.value.trim();
      const notes = elements.credNotesInput.value.trim();

      try {
        await api.credentials.create({ title, username, password, url, notes });
        elements.credentialModal.style.display = 'none';
        await loadFiles();
      } catch (err) {
        alert('Failed to save password/credential: ' + err.message);
      }
    });
  }

  // AI Q&A Form
  elements.aiAskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = elements.aiQuestionInput.value.trim();
    if (query) {
      performAiSearch(query);
    }
  });

  // AI Suggestion Chips
  elements.suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      elements.aiQuestionInput.value = q;
      performAiSearch(q);
    });
  });

  // Preview Modal Actions
  elements.btnDownloadFile.addEventListener('click', () => {
    if (state.currentPreviewFile) {
      const url = api.files.getContentUrl(state.currentPreviewFile.id, true);
      window.open(url, '_blank');
    }
  });

  elements.btnDeleteFile.addEventListener('click', async () => {
    if (!state.currentPreviewFile) return;
    const confirmDelete = confirm(`Are you sure you want to permanently delete "${state.currentPreviewFile.original_name}" from your vault and cloud storage?`);
    if (!confirmDelete) return;

    try {
      await api.files.delete(state.currentPreviewFile.id);
      elements.previewModal.style.display = 'none';
      await loadFiles();
    } catch (err) {
      alert('Failed to delete file: ' + err.message);
    }
  });

  // Global unauthorized event
  window.addEventListener('vault:unauthorized', () => {
    showAuthView();
  });
}

// ================= FILE LOADING & RENDERING =================

async function loadFiles() {
  try {
    const res = await api.files.list(state.activeFilter);
    state.files = res.files || [];
    state.stats = res.stats || {};
    updateStatsCounters();
    renderFiles(state.files);
  } catch (err) {
    console.error('Failed to load files:', err);
  }
}

function setActiveFilter(filter) {
  state.activeFilter = filter;

  elements.navItems.forEach(item => {
    if (item.getAttribute('data-filter') === filter) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  elements.mobileFilterDropdown.value = filter;

  const titles = {
    all: 'All Items',
    pdf: 'PDF Documents',
    image: 'Images & OCR Scans',
    doc: 'Word & Text Documents',
    note: 'Personal Notes',
    credential: 'Passwords & Logins'
  };

  elements.currentViewTitle.textContent = titles[filter] || 'All Items';
  loadFiles();
}

function setViewLayout(layout) {
  state.activeView = layout;
  if (layout === 'grid') {
    elements.btnViewGrid.classList.add('active');
    elements.btnViewList.classList.remove('active');
    elements.vaultItemsContainer.className = 'vault-grid';
  } else {
    elements.btnViewList.classList.add('active');
    elements.btnViewGrid.classList.remove('active');
    elements.vaultItemsContainer.className = 'vault-list';
  }
}

function updateStatsCounters() {
  if (!state.stats) return;
  elements.countAll.textContent = state.stats.total_files || 0;
  elements.countPdf.textContent = state.stats.pdf_count || 0;
  elements.countImage.textContent = state.stats.image_count || 0;
  elements.countDoc.textContent = state.stats.doc_count || 0;
  elements.countNote.textContent = state.stats.note_count || 0;
  if (elements.countCredential) elements.countCredential.textContent = state.stats.credential_count || 0;
}

function renderFiles(files) {
  elements.vaultItemsContainer.innerHTML = '';
  elements.viewItemCount.textContent = `${files.length} item${files.length === 1 ? '' : 's'}`;

  if (files.length === 0) {
    elements.vaultItemsContainer.style.display = 'none';
    elements.vaultEmptyState.style.display = 'block';
    return;
  }

  elements.vaultEmptyState.style.display = 'none';
  elements.vaultItemsContainer.style.display = state.activeView === 'grid' ? 'grid' : 'flex';

  files.forEach(file => {
    const card = createFileCard(file);
    elements.vaultItemsContainer.appendChild(card);
  });
}

function createFileCard(file) {
  const card = document.createElement('div');
  card.className = 'vault-card';

  const isPdf = file.mime_type === 'application/pdf';
  const isImage = (file.mime_type || '').startsWith('image/');
  const isNote = Boolean(file.is_note);
  const isCredential = file.mime_type === 'application/x-credential' || file.mime_type === 'message/rfc822';

  let icon = '📄';
  if (isPdf) icon = '📕';
  else if (isImage) icon = '🖼️';
  else if (isNote) icon = '📝';
  else if (isCredential) icon = '🔑';

  let tagsArray = [];
  try {
    tagsArray = typeof file.tags === 'string' ? JSON.parse(file.tags) : (file.tags || []);
  } catch (e) {
    tagsArray = [];
  }

  const snippet = file.text_snippet || file.summary || (isNote ? 'Personal note' : 'Uploaded document');
  const sizeFormatted = formatBytes(file.size_bytes);
  const dateFormatted = new Date(file.created_at || Date.now()).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  const tagsHtml = tagsArray.slice(0, 3).map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('');

  card.innerHTML = `
    <div class="card-top">
      <div class="card-type-icon">${icon}</div>
      <div class="card-actions-hover">
        <span class="badge ${file.storage_provider === 'local-staging' ? 'badge-warning' : 'badge-private'}">
          ${file.storage_provider === 'local-staging' ? 'Staging' : 'Protected'}
        </span>
      </div>
    </div>
    <div class="card-content-mid">
      <h3 class="card-title" title="${escapeHtml(file.original_name)}">${file.name_snippet || escapeHtml(file.original_name)}</h3>
      <p class="card-snippet">${snippet}</p>
    </div>
    ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
    <div class="card-footer">
      <span>${sizeFormatted}</span>
      <span>${dateFormatted}</span>
    </div>
  `;

  card.addEventListener('click', () => openPreviewModal(file));
  return card;
}

// ================= SEARCH IMPLEMENTATION =================

async function performSearch(query) {
  if (!query) {
    elements.searchResultsInfo.style.display = 'none';
    renderFiles(state.files);
    return;
  }

  elements.searchResultsInfo.style.display = 'flex';
  elements.searchQueryDisplay.textContent = query;

  try {
    const res = await api.search.fullText(query);
    renderFiles(res.results || []);
  } catch (err) {
    console.error('Search failed:', err);
  }
}

// ================= AI GROUNDED SEARCH =================

async function performAiSearch(question) {
  elements.aiLoading.style.display = 'block';
  elements.aiAnswerCard.style.display = 'none';
  elements.aiNotConnectedCard.style.display = 'none';

  try {
    const res = await api.search.askAi(question);
    elements.aiLoading.style.display = 'none';

    if (!res.connected) {
      elements.aiNotConnectedCard.style.display = 'block';
      return;
    }

    elements.aiAnswerCard.style.display = 'block';
    elements.aiModelTag.textContent = res.model || (res.aiProvider === 'gemini' ? 'Gemini 1.5 Flash' : 'OpenAI');
    elements.aiAnswerText.innerHTML = renderMarkdown(res.answer);

    // Render Cited Sources
    const sources = res.sources || [];
    elements.aiSourcesCount.textContent = sources.length;
    elements.aiSourcesList.innerHTML = '';

    if (sources.length === 0) {
      elements.aiSourcesList.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">No specific files cited.</p>';
    } else {
      sources.forEach(src => {
        const srcCard = document.createElement('div');
        srcCard.className = 'source-card';
        srcCard.innerHTML = `
          <div class="source-info">
            <strong>${escapeHtml(src.originalName)}</strong>
            <span>${src.isNote ? 'Personal Note' : src.mimeType} • ${src.snippet ? escapeHtml(src.snippet.slice(0, 100)) : ''}</span>
          </div>
          <button type="button" class="btn btn-sm btn-secondary btn-preview-source">Preview</button>
        `;

        srcCard.querySelector('.btn-preview-source').addEventListener('click', async () => {
          elements.aiModal.style.display = 'none';
          try {
            const fileRes = await api.files.get(src.id);
            if (fileRes.file) {
              openPreviewModal(fileRes.file);
            }
          } catch (e) {
            console.error('Failed to preview cited file:', e);
          }
        });

        elements.aiSourcesList.appendChild(srcCard);
      });
    }

  } catch (err) {
    elements.aiLoading.style.display = 'none';
    alert('AI retrieval query error: ' + err.message);
  }
}

function updateAiModalStatus() {
  if (!state.servicesStatus) return;

  const isAi = state.servicesStatus.ai.connected;
  if (isAi) {
    elements.aiConnectionIndicator.style.display = 'inline-flex';
    elements.aiIndicatorText.textContent = `Connected: ${state.servicesStatus.ai.provider} (${state.servicesStatus.ai.model})`;
  } else {
    elements.aiConnectionIndicator.style.display = 'inline-flex';
    elements.aiIndicatorText.textContent = 'AI Key not configured in .env';
  }
}

// ================= FILE UPLOAD LOGIC =================

function handleSelectedFiles(files) {
  state.selectedUploadFiles = files;
  if (files.length === 0) {
    resetUploadState();
    return;
  }

  elements.selectedFilesCount.textContent = files.length;
  elements.filesPreviewList.innerHTML = '';

  files.forEach((file, index) => {
    const row = document.createElement('div');
    row.className = 'selected-file-row';
    row.innerHTML = `
      <span>📄 ${escapeHtml(file.name)}</span>
      <span>${formatBytes(file.size)}</span>
    `;
    elements.filesPreviewList.appendChild(row);
  });

  elements.selectedFilesList.style.display = 'block';
  elements.uploadDropzone.style.display = 'none';
}

function resetUploadState() {
  state.selectedUploadFiles = [];
  elements.fileInput.value = '';
  elements.selectedFilesList.style.display = 'none';
  elements.uploadDropzone.style.display = 'block';
  elements.uploadProgressBox.style.display = 'none';
}

async function performUpload() {
  if (state.selectedUploadFiles.length === 0) return;

  elements.btnStartUpload.disabled = true;
  elements.uploadProgressBox.style.display = 'block';

  try {
    await api.files.upload(state.selectedUploadFiles);
    elements.uploadModal.style.display = 'none';
    resetUploadState();
    await loadFiles();
  } catch (err) {
    alert('Upload error: ' + err.message);
  } finally {
    elements.btnStartUpload.disabled = false;
  }
}

// ================= FILE PREVIEW MODAL =================

async function openPreviewModal(file) {
  state.currentPreviewFile = file;

  elements.previewFilename.textContent = file.original_name;
  elements.previewSubmeta.textContent = `${file.mime_type || 'Unknown'} • ${formatBytes(file.size_bytes)} • Uploaded ${new Date(file.created_at).toLocaleString()}`;
  elements.previewStorageKey.textContent = file.storage_key;

  const isPdf = file.mime_type === 'application/pdf';
  const isImage = (file.mime_type || '').startsWith('image/');
  const isCredential = file.mime_type === 'application/x-credential' || file.mime_type === 'message/rfc822';
  const isText = (file.mime_type || '').startsWith('text/') || (file.mime_type || '').includes('json') || file.is_note || isCredential;

  elements.previewTypeIcon.textContent = isPdf ? '📕' : (isImage ? '🖼️' : (isCredential ? '🔑' : (file.is_note ? '📝' : '📄')));

  // Viewer Content
  elements.previewViewerContainer.innerHTML = '';
  const contentUrl = api.files.getContentUrl(file.id);

  if (isCredential) {
    const raw = file.extracted_text || '';
    const extractLine = (prefix) => {
      const match = raw.match(new RegExp(`\\*\\*${prefix}:\\*\\*\\s*(.+)`, 'i'));
      return match ? match[1].trim() : '';
    };
    const titleMatch = raw.match(/# Credential:\s*(.+)/i) || raw.match(/\*\*Service \/ Heading:\*\*\s*(.+)/i);
    const titleVal = titleMatch ? titleMatch[1].trim() : (file.original_name || '').replace('🔑 ', '');
    const usernameVal = extractLine('Email / Username');
    const passwordVal = extractLine('Password / Secret / URI');
    const urlVal = extractLine('URL / Endpoint');
    
    let notesVal = '';
    const notesIndex = raw.indexOf('**Notes:**');
    if (notesIndex !== -1) {
      const afterNotes = raw.substring(notesIndex + 10);
      notesVal = afterNotes.split('---')[0].trim();
    }

    const credViewer = document.createElement('div');
    credViewer.className = 'credential-detail-card';
    credViewer.innerHTML = `
      <div class="cred-detail-box">
        <div class="cred-field-group">
          <label class="cred-field-label">Heading / Service</label>
          <div class="cred-field-val"><strong>${escapeHtml(titleVal)}</strong></div>
        </div>
        ${usernameVal ? `
        <div class="cred-field-group">
          <label class="cred-field-label">Email / Username</label>
          <div class="cred-copy-row">
            <input type="text" readonly value="${escapeHtml(usernameVal)}" class="form-input cred-input-field" id="copy-user-val">
            <button type="button" class="btn btn-sm btn-secondary" id="btn-copy-username">📋 Copy</button>
          </div>
        </div>` : ''}
        ${passwordVal ? `
        <div class="cred-field-group">
          <label class="cred-field-label">Password / Secret / Database URI</label>
          <div class="cred-copy-row">
            <input type="password" readonly value="${escapeHtml(passwordVal)}" class="form-input cred-input-field" id="copy-pass-val">
            <button type="button" class="btn btn-sm btn-secondary" id="btn-toggle-view-pass" title="Show / Hide">👁️</button>
            <button type="button" class="btn btn-sm btn-primary" id="btn-copy-password">📋 Copy</button>
          </div>
        </div>` : ''}
        ${urlVal ? `
        <div class="cred-field-group">
          <label class="cred-field-label">Website / Database Host</label>
          <div class="cred-field-val">
            <a href="${escapeHtml(urlVal)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary); word-break: break-all;">${escapeHtml(urlVal)} ↗</a>
          </div>
        </div>` : ''}
        ${notesVal ? `
        <div class="cred-field-group">
          <label class="cred-field-label">Notes & Details</label>
          <div class="cred-field-val" style="white-space: pre-wrap; font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(notesVal)}</div>
        </div>` : ''}
      </div>
    `;

    elements.previewViewerContainer.appendChild(credViewer);

    const btnCopyUser = credViewer.querySelector('#btn-copy-username');
    if (btnCopyUser) {
      btnCopyUser.addEventListener('click', () => {
        navigator.clipboard.writeText(usernameVal);
        btnCopyUser.textContent = '✓ Copied!';
        setTimeout(() => btnCopyUser.textContent = '📋 Copy', 2000);
      });
    }

    const btnCopyPass = credViewer.querySelector('#btn-copy-password');
    const inputPass = credViewer.querySelector('#copy-pass-val');
    const btnTogglePass = credViewer.querySelector('#btn-toggle-view-pass');

    if (btnTogglePass && inputPass) {
      btnTogglePass.addEventListener('click', () => {
        if (inputPass.type === 'password') {
          inputPass.type = 'text';
          btnTogglePass.textContent = '🙈';
        } else {
          inputPass.type = 'password';
          btnTogglePass.textContent = '👁️';
        }
      });
    }

    if (btnCopyPass) {
      btnCopyPass.addEventListener('click', () => {
        navigator.clipboard.writeText(passwordVal);
        btnCopyPass.textContent = '✓ Copied!';
        setTimeout(() => btnCopyPass.textContent = '📋 Copy', 2000);
      });
    }
  } else if (isImage) {
    const img = document.createElement('img');
    img.src = contentUrl;
    img.alt = file.original_name;
    elements.previewViewerContainer.appendChild(img);
  } else if (isPdf) {
    const iframe = document.createElement('iframe');
    iframe.src = contentUrl;
    elements.previewViewerContainer.appendChild(iframe);
  } else if (isText) {
    const pre = document.createElement('pre');
    pre.className = 'preview-text-viewer';
    pre.textContent = file.extracted_text || 'Loading document content...';
    elements.previewViewerContainer.appendChild(pre);
  } else {
    elements.previewViewerContainer.innerHTML = `
      <div style="text-align:center; padding: 40px;">
        <div style="font-size: 3rem; margin-bottom: 12px;">📄</div>
        <p style="color:var(--text-secondary);">Direct browser preview not supported for this file type.</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Click Download above to open on your device.</p>
      </div>
    `;
  }

  // Extracted details / OCR text
  elements.previewExtractedText.textContent = file.extracted_text || file.summary || '[No text content extracted]';

  // Tags
  let tagsArray = [];
  try {
    tagsArray = typeof file.tags === 'string' ? JSON.parse(file.tags) : (file.tags || []);
  } catch (e) {
    tagsArray = [];
  }

  elements.previewTagsContainer.innerHTML = '';
  if (tagsArray.length === 0) {
    elements.previewTagsContainer.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">No tags</span>';
  } else {
    tagsArray.forEach(t => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.textContent = `#${t}`;
      elements.previewTagsContainer.appendChild(pill);
    });
  }

  elements.previewModal.style.display = 'flex';
}

// ================= STATUS & SERVICE DIAGNOSTICS =================

async function loadStatus() {
  try {
    const res = await api.status.getStatus();
    state.servicesStatus = res.services;

    const storage = res.services.storage;
    const ai = res.services.ai;

    // Header Status Dot
    if (storage.connected && ai.connected) {
      elements.headerStatusDot.className = 'status-indicator-dot connected';
    } else {
      elements.headerStatusDot.className = 'status-indicator-dot';
    }

    // Sidebar Status Card
    elements.storageStatusBadge.textContent = storage.connected ? 'Connected' : 'Staging Mode';
    elements.storageStatusBadge.className = `status-badge-mini ${storage.connected ? 'connected' : ''}`;
    elements.storageStatusText.textContent = storage.connected ? storage.bucket : 'Local Staging';
    elements.aiStatusText.textContent = ai.connected ? ai.provider : 'Not Connected';

    // Status Modal Diagnostics
    elements.diagStorageBadge.textContent = storage.connected ? 'Connected' : 'Action Needed';
    elements.diagStorageBadge.className = `badge ${storage.connected ? 'badge-success' : 'badge-warning'}`;
    elements.diagStorageMsg.textContent = storage.message;

    elements.diagAiBadge.textContent = ai.connected ? 'Connected' : 'Action Needed';
    elements.diagAiBadge.className = `badge ${ai.connected ? 'badge-success' : 'badge-warning'}`;
    elements.diagAiMsg.textContent = ai.message;

    // Service Notice Banner if anything missing
    if (!storage.connected || !ai.connected) {
      elements.serviceNoticeBanner.style.display = 'flex';
      if (!storage.connected && !ai.connected) {
        elements.bannerTitle.textContent = 'Cloud Storage & AI Keys Needed';
        elements.bannerDesc.textContent = 'Vault is currently running in local staging mode. Add Cloud Storage credentials and Gemini API Key to enable cloud backup & AI search.';
      } else if (!storage.connected) {
        elements.bannerTitle.textContent = 'Cloud Storage Not Connected';
        elements.bannerDesc.textContent = 'Files are temporarily saved in staging. Add S3/R2/Supabase bucket credentials to persist in the cloud.';
      } else {
        elements.bannerTitle.textContent = 'AI Search Not Connected';
        elements.bannerDesc.textContent = 'Standard search is active. Add GEMINI_API_KEY (Free) to unlock AI conversational search.';
      }
    } else {
      elements.serviceNoticeBanner.style.display = 'none';
    }

  } catch (err) {
    console.warn('Could not check service diagnostics:', err);
  }
}

// ================= HELPERS =================

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(md) {
  if (!md) return '';
  let html = escapeHtml(md);
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Code block
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="font-mono">$1</code>');
  // Bullet points
  html = html.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
  // Paragraphs
  html = html.split('\n\n').map(p => {
    if (p.startsWith('<li>') || p.startsWith('<pre>')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}

// ================= VOICE BIOMETRICS & SPEAKER-VERIFIED COMMANDS =================
function setupVoiceAssistant() {
  const modal = document.getElementById('voice-modal');
  const open = document.getElementById('btn-open-voice-modal');
  const close = document.getElementById('btn-close-voice-modal');
  const start = document.getElementById('btn-start-voice');
  const form = document.getElementById('voice-command-form');
  const input = document.getElementById('voice-command-input');
  const stateLabel = document.getElementById('voice-state');
  const transcript = document.getElementById('voice-transcript');
  const result = document.getElementById('voice-result');

  // Voiceprint UI elements
  const vpBadgeIcon = document.getElementById('vp-badge-icon');
  const vpStatusTitle = document.getElementById('vp-status-title');
  const vpStatusSub = document.getElementById('vp-status-sub');
  const btnCalibrate = document.getElementById('btn-calibrate-voice');
  const vpLiveMatch = document.getElementById('vp-live-match');
  const vpMatchText = document.getElementById('vp-match-text');
  const enrollBox = document.getElementById('voice-enroll-box');
  const mainInterface = document.getElementById('voice-main-interface');
  const enrollProgress = document.getElementById('voice-enroll-progress');
  const enrollStatus = document.getElementById('voice-enroll-status');

  // Biometric Fallback Modal elements
  const bioModal = document.getElementById('biometric-modal');
  const btnCloseBio = document.getElementById('btn-close-bio-modal');
  const btnCancelBio = document.getElementById('btn-cancel-bio');
  const btnTriggerHardwareBio = document.getElementById('btn-trigger-hardware-bio');
  const bioScoreVal = document.getElementById('bio-score-val');
  const bioPendingCommand = document.getElementById('bio-pending-command');
  const bioModalStatus = document.getElementById('bio-modal-status');

  let pendingVoiceCommand = null;

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let currentLiveCapture = null;

  // Sync Voiceprint state
  async function syncVoiceprint() {
    try {
      // 1. Try local storage cache
      const cached = localStorage.getItem('vault_owner_voiceprint');
      if (cached) {
        try {
          voiceprintEngine.setEnrolled(JSON.parse(cached));
        } catch (e) {}
      }

      // 2. Fetch from cloud database
      if (api.getToken()) {
        const res = await api.auth.getVoiceprint().catch(() => ({}));
        if (res.voiceprint) {
          voiceprintEngine.setEnrolled(res.voiceprint);
          localStorage.setItem('vault_owner_voiceprint', JSON.stringify(res.voiceprint));
        }
      }

      updateVoiceprintUI();
    } catch (err) {
      console.warn('Voiceprint sync notice:', err.message);
    }
  }

  function updateVoiceprintUI() {
    if (voiceprintEngine.isEnrolled()) {
      if (vpBadgeIcon) vpBadgeIcon.textContent = '🟢';
      if (vpStatusTitle) vpStatusTitle.textContent = `Voiceprint: Verified Owner (${state.currentUser?.username || 'Owner'})`;
      if (vpStatusSub) vpStatusSub.textContent = 'Owner-only protection active (80% match required). Below 80% triggers biometrics.';
      if (btnCalibrate) btnCalibrate.textContent = '🔄 Re-calibrate';
    } else {
      if (vpBadgeIcon) vpBadgeIcon.textContent = '🟡';
      if (vpStatusTitle) vpStatusTitle.textContent = 'Voiceprint: Not Calibrated';
      if (vpStatusSub) vpStatusSub.textContent = 'Calibrate your voice so commands run instantly with ≥80% voice match.';
      if (btnCalibrate) btnCalibrate.textContent = '🎙️ Calibrate';
    }
  }

  // Voice Calibration (Enrollment)
  btnCalibrate?.addEventListener('click', async () => {
    try {
      if (enrollBox) enrollBox.style.display = 'block';
      if (mainInterface) mainInterface.style.display = 'none';
      if (enrollProgress) enrollProgress.style.width = '0%';
      if (enrollStatus) enrollStatus.textContent = 'Analyzing your vocal harmonics & acoustics (Speak for 4 seconds)...';

      const voiceprint = await voiceprintEngine.startCalibration(4500, (pct) => {
        if (enrollProgress) enrollProgress.style.width = `${pct}%`;
      });

      // Save locally and to Neon Database
      localStorage.setItem('vault_owner_voiceprint', JSON.stringify(voiceprint));
      await api.auth.saveVoiceprint(voiceprint).catch(err => console.warn('Could not persist voiceprint to cloud:', err));

      updateVoiceprintUI();
      if (enrollStatus) enrollStatus.textContent = '✅ Voiceprint calibrated successfully!';
      setTimeout(() => {
        if (enrollBox) enrollBox.style.display = 'none';
        if (mainInterface) mainInterface.style.display = 'block';
        if (result) result.textContent = 'Voice locked to you! Only your voice (≥80% match) can execute vault commands now.';
      }, 1000);
    } catch (err) {
      if (enrollStatus) enrollStatus.textContent = '⚠️ ' + err.message;
      setTimeout(() => {
        if (enrollBox) enrollBox.style.display = 'none';
        if (mainInterface) mainInterface.style.display = 'block';
      }, 3000);
    }
  });

  // Prompt Device Biometric Verification Modal when voice match is < 80%
  function promptBiometricFallback(command, score, reasonText) {
    pendingVoiceCommand = command;
    if (bioScoreVal) bioScoreVal.textContent = `${score}%`;
    if (bioPendingCommand) bioPendingCommand.textContent = `"${command}"`;
    if (bioModalStatus) {
      bioModalStatus.className = 'bio-modal-status';
      bioModalStatus.textContent = reasonText || 'Voice recognition was below 80%. Verify with your fingerprint or device PIN to proceed.';
    }
    if (bioModal) bioModal.style.display = 'flex';
  }

  // Execute the verified action (either via >=80% voice match or device biometrics)
  const executeVerifiedCommand = (command, authMethod = 'Voice') => {
    const normalized = command.toLowerCase();

    if (/\b(password|secret|mongo.*uri|connection string)\b/.test(normalized)) {
      result.textContent = 'For your privacy, spoken voice cannot read out raw passwords on speaker. Click on the credential card to reveal or copy.';
      return;
    }
    if (/\b(open|go to)\b.*\b(email|gmail|inbox)\b/.test(normalized)) {
      window.open('https://mail.google.com/', '_blank', 'noopener,noreferrer');
      result.textContent = `✅ [${authMethod} Verified] Opening your email inbox in a new tab.`;
      return;
    }
    if (/\b(find|search|show)\b/.test(normalized)) {
      const searchTerms = command.replace(/^(find|search|show)\s+(my\s+)?/i, '').trim();
      const globalSearch = document.getElementById('global-search-input');
      if (globalSearch && searchTerms) {
        modal.style.display = 'none';
        globalSearch.value = searchTerms;
        globalSearch.dispatchEvent(new Event('input', { bubbles: true }));
        result.textContent = `✅ [${authMethod} Verified] Searching your vault for "${searchTerms}".`;
        return;
      }
    }
    result.textContent = `✅ [${authMethod} Verified] Command executed: "${command}". Try saying "Open my email", "Search mongodb", or "Find my certificates".`;
  };

  // Hardware Biometrics Verification (WebAuthn Platform Authenticator — Fingerprint / Windows Hello / Touch ID / PIN)
  async function triggerPlatformBiometrics() {
    try {
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn / Biometrics is not supported in this browser.');
      }

      if (bioModalStatus) {
        bioModalStatus.className = 'bio-modal-status';
        bioModalStatus.textContent = '👆 Scanning fingerprint / Windows Hello / Touch ID...';
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Personal AI Vault',
            id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
          },
          user: {
            id: userId,
            name: state.currentUser?.email || 'owner@vault.local',
            displayName: state.currentUser?.username || 'Vault Owner'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 60000,
          attestation: 'none'
        }
      });

      if (credential) {
        if (bioModalStatus) {
          bioModalStatus.className = 'bio-modal-status success';
          bioModalStatus.textContent = '✅ Biometric Authentication Succeeded! Proceeding with command...';
        }

        setTimeout(() => {
          if (bioModal) bioModal.style.display = 'none';
          if (pendingVoiceCommand) {
            const cmd = pendingVoiceCommand;
            pendingVoiceCommand = null;
            executeVerifiedCommand(cmd, 'Biometric');
          }
        }, 800);
      }
    } catch (err) {
      console.warn('Biometric challenge notice:', err);
      if (bioModalStatus) {
        bioModalStatus.className = 'bio-modal-status error';
        if (err.name === 'NotAllowedError') {
          bioModalStatus.textContent = '❌ Biometric verification was cancelled. Command blocked.';
        } else {
          bioModalStatus.textContent = `❌ Verification error: ${err.message || 'Sensor unavailable'}`;
        }
      }
    }
  }

  btnTriggerHardwareBio?.addEventListener('click', triggerPlatformBiometrics);
  btnCloseBio?.addEventListener('click', () => {
    if (bioModal) bioModal.style.display = 'none';
    pendingVoiceCommand = null;
  });
  btnCancelBio?.addEventListener('click', () => {
    if (bioModal) bioModal.style.display = 'none';
    pendingVoiceCommand = null;
  });

  const runCommand = (raw, isVoiceInput = false, bioResult = null) => {
    const command = raw.trim();
    transcript.textContent = command || 'Please say or type a command.';
    result.textContent = '';
    if (!command) return;

    // If spoken via voice, enforce 80% voice match threshold
    if (isVoiceInput) {
      if (!voiceprintEngine.isEnrolled()) {
        if (vpLiveMatch) {
          vpLiveMatch.className = 'vp-live-badge mismatch';
          vpLiveMatch.style.display = 'flex';
          if (vpMatchText) vpMatchText.textContent = '⚠️ Voiceprint Not Calibrated (80% match required) — Fallback to Biometrics';
        }
        result.textContent = '⚠️ Voiceprint not calibrated. Please authenticate with device biometrics to proceed.';
        promptBiometricFallback(command, 0, 'Voiceprint has not been calibrated yet. Authenticate via biometrics to proceed.');
        return;
      }

      const score = bioResult ? bioResult.score : 0;
      const isMatch = bioResult && bioResult.verified; // threshold >= 80%

      if (!isMatch) {
        // Below 80% match -> Trigger Biometric Verification Fallback
        if (vpLiveMatch) {
          vpLiveMatch.className = 'vp-live-badge mismatch';
          vpLiveMatch.style.display = 'flex';
          if (vpMatchText) vpMatchText.textContent = `⚠️ Voice Match: ${score}% (Below 80% required) — Biometrics Triggered`;
        }
        result.textContent = `⚠️ Voice match (${score}%) is below the 80% threshold. Biometric verification required.`;
        promptBiometricFallback(command, score, `Acoustic match was ${score}%, which is below the 80% security threshold.`);
        return;
      }

      // Verified Match >= 80%
      if (vpLiveMatch) {
        vpLiveMatch.className = 'vp-live-badge match';
        vpLiveMatch.style.display = 'flex';
        if (vpMatchText) vpMatchText.textContent = `✅ Owner Voice Verified (${score}% Match ≥ 80%)`;
      }
      executeVerifiedCommand(command, 'Voice');
      return;
    }

    // Typed or clicked command
    executeVerifiedCommand(command, 'Direct');
  };

  open?.addEventListener('click', () => {
    modal.style.display = 'flex';
    syncVoiceprint();
    if (vpLiveMatch) vpLiveMatch.style.display = 'none';
    input.focus();
  });

  close?.addEventListener('click', () => {
    modal.style.display = 'none';
    recognition?.abort();
    if (currentLiveCapture) currentLiveCapture.finish();
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    runCommand(input.value, false);
  });

  modal?.querySelectorAll('[data-voice-command]').forEach((button) => button.addEventListener('click', () => {
    input.value = button.dataset.voiceCommand || '';
    runCommand(input.value, false);
  }));

  start?.addEventListener('click', async () => {
    if (!Recognition) {
      result.textContent = 'Voice recognition is not available in this browser. You can still type a command.';
      return;
    }

    try {
      recognition?.abort();
      if (currentLiveCapture) currentLiveCapture.finish();

      // Start live voice biometric capture alongside speech recognition
      currentLiveCapture = await voiceprintEngine.startLiveCapture();

      recognition = new Recognition();
      recognition.lang = navigator.language || 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        start.classList.add('listening');
        stateLabel.textContent = 'Listening & verifying speaker…';
        result.textContent = '';
        if (vpLiveMatch) {
          vpLiveMatch.className = 'vp-live-badge';
          vpLiveMatch.style.display = 'flex';
          if (vpMatchText) vpMatchText.textContent = '🎙️ Listening to acoustic waveform & speaker timbre...';
        }
      };

      recognition.onend = () => {
        start.classList.remove('listening');
        stateLabel.textContent = 'Tap to speak';
      };

      recognition.onerror = (err) => {
        if (currentLiveCapture) currentLiveCapture.finish();
        result.textContent = 'I could not hear that. Please try again or type your command.';
      };

      recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript;
        input.value = spoken;

        // Finish biometric analysis and compute similarity score
        const bioResult = currentLiveCapture ? currentLiveCapture.finish() : { verified: false, score: 0 };
        currentLiveCapture = null;

        runCommand(spoken, true, bioResult);
      };

      recognition.start();
    } catch (err) {
      console.error('Microphone error:', err);
      result.textContent = 'Could not access microphone: ' + err.message;
    }
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

setupVoiceAssistant();

// Boot application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
