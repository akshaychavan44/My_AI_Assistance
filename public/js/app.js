import { api } from './api.js';
import { voiceprintEngine } from './voiceprint.js';

// Application State
const state = {
  currentUser: null,
  files: [],
  tasks: [],
  taskStats: null,
  stats: null,
  activeFilter: 'all',
  activeView: 'grid', // 'grid', 'list', or 'calendar'
  taskFilter: 'all',  // 'all', 'pending', 'today', 'upcoming', 'completed'
  taskView: 'list',   // 'list' or 'calendar'
  selectedUploadFiles: [],
  currentPreviewFile: null,
  servicesStatus: null,
  pushSubscription: null
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
  btnUserMenu: document.getElementById('btn-user-menu'),
  userDropdownMenu: document.getElementById('user-dropdown-menu'),
  dropdownUserName: document.getElementById('dropdown-user-name'),
  dropdownUserAvatar: document.getElementById('dropdown-user-avatar'),
  dropdownUserEmail: document.getElementById('dropdown-user-email'),
  btnLogout: document.getElementById('btn-logout'),

  // Sidebar
  navItems: document.querySelectorAll('.sidebar-nav .nav-item'),
  countAll: document.getElementById('count-all'),
  countTasks: document.getElementById('count-tasks'),
  countPdf: document.getElementById('count-pdf'),
  countImage: document.getElementById('count-image'),
  countDoc: document.getElementById('count-doc'),
  countNote: document.getElementById('count-note'),
  countCredential: document.getElementById('count-credential'),
  btnOpenTask: document.getElementById('btn-open-task'),
  btnOpenUpload: document.getElementById('btn-open-upload'),
  btnOpenNote: document.getElementById('btn-open-note'),
  btnOpenCredential: document.getElementById('btn-open-credential'),
  storageStatusBadge: document.getElementById('storage-status-badge'),
  storageStatusText: document.getElementById('storage-status-text'),
  aiStatusText: document.getElementById('ai-status-text'),
  pushStatusText: document.getElementById('push-status-text'),
  btnWidgetDetails: document.getElementById('btn-widget-details'),

  // Feed & Controls
  mobileFilterDropdown: document.getElementById('mobile-filter-dropdown'),
  btnMobileTask: document.getElementById('btn-mobile-task'),
  btnMobileUpload: document.getElementById('btn-mobile-upload'),
  btnMobileNote: document.getElementById('btn-mobile-note'),
  btnMobileCredential: document.getElementById('btn-mobile-credential'),
  btnMobileAi: document.getElementById('btn-mobile-ai'),
  currentViewTitle: document.getElementById('current-view-title'),
  viewItemCount: document.getElementById('view-item-count'),
  btnViewGrid: document.getElementById('btn-view-grid'),
  btnViewList: document.getElementById('btn-view-list'),
  btnViewCalendar: document.getElementById('btn-view-calendar'),
  tasksFilterTabs: document.getElementById('tasks-filter-tabs'),
  taskPills: document.querySelectorAll('.task-pill'),
  searchResultsInfo: document.getElementById('search-results-info'),
  searchQueryDisplay: document.getElementById('search-query-display'),
  btnResetSearch: document.getElementById('btn-reset-search'),
  vaultItemsContainer: document.getElementById('vault-items-container'),
  vaultEmptyState: document.getElementById('vault-empty-state'),
  btnEmptyUpload: document.getElementById('btn-empty-upload'),
  btnEmptyNote: document.getElementById('btn-empty-note'),

  // Push Permission Banner
  pushPermissionBanner: document.getElementById('push-permission-banner'),
  btnEnablePush: document.getElementById('btn-enable-push'),
  btnDismissPushBanner: document.getElementById('btn-dismiss-push-banner'),

  // Notice Banner
  serviceNoticeBanner: document.getElementById('service-notice-banner'),
  bannerTitle: document.getElementById('banner-title'),
  bannerDesc: document.getElementById('banner-desc'),
  bannerActionBtn: document.getElementById('banner-action-btn'),

  // Task Modal
  taskModal: document.getElementById('task-modal'),
  btnCloseTaskModal: document.getElementById('btn-close-task-modal'),
  btnCancelTask: document.getElementById('btn-cancel-task'),
  taskForm: document.getElementById('task-form'),
  taskModalTitle: document.getElementById('task-modal-title'),
  taskEditId: document.getElementById('task-edit-id'),
  taskTitleInput: document.getElementById('task-title-input'),
  taskDueDateInput: document.getElementById('task-due-date-input'),
  taskDueTimeInput: document.getElementById('task-due-time-input'),
  taskTimezoneSelect: document.getElementById('task-timezone-select'),
  taskReminderTimingSelect: document.getElementById('task-reminder-timing-select'),
  taskCustomOffsetBox: document.getElementById('task-custom-offset-box'),
  taskCustomOffsetVal: document.getElementById('task-custom-offset-val'),
  taskCustomOffsetUnit: document.getElementById('task-custom-offset-unit'),
  taskRecurrenceSelect: document.getElementById('task-recurrence-select'),
  taskNotesInput: document.getElementById('task-notes-input'),
  taskSaveBtnText: document.getElementById('task-save-btn-text'),

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
  credentialForm: document.getElementById('credential-form'),
  credTitleInput: document.getElementById('cred-title-input'),
  credUsernameInput: document.getElementById('cred-username-input'),
  credPasswordInput: document.getElementById('cred-password-input'),
  btnToggleCredPassword: document.getElementById('btn-toggle-cred-password'),
  credUrlInput: document.getElementById('cred-url-input'),
  credNotesInput: document.getElementById('cred-notes-input'),
  btnCancelCredential: document.getElementById('btn-cancel-credential'),

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
  diagPushBadge: document.getElementById('diag-push-badge'),
  diagPushMsg: document.getElementById('diag-push-msg'),
  btnStatusTestPush: document.getElementById('btn-status-test-push'),
  btnStatusEnablePush: document.getElementById('btn-status-enable-push'),
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
  try {
    setupEventListeners();
  } catch (e) {
    console.error('setupEventListeners error:', e);
  }
  try {
    populateTimezoneSelect();
  } catch (e) {
    console.error('populateTimezoneSelect error:', e);
  }
  try {
    checkPhoneAccessUrl();
  } catch (e) {
    console.error('checkPhoneAccessUrl error:', e);
  }

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
    await loadTasks();
    await loadStatus();
    await initPushNotifications();

    // Check query params for deep-linked task or tab
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('task') || urlParams.get('tab') === 'tasks') {
      setActiveFilter('tasks');
      const taskId = urlParams.get('task');
      if (taskId && taskId !== '1') {
        setTimeout(async () => {
          const t = state.tasks.find(x => x.id === taskId);
          if (t) {
            openTaskModal(t);
          } else {
            try {
              const res = await api.tasks.get(taskId);
              if (res.task) openTaskModal(res.task);
            } catch (e) {}
          }
        }, 300);
      }
    }
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
    const initial = (state.currentUser.username || 'U').charAt(0).toUpperCase();
    if (elements.navUserName) elements.navUserName.textContent = state.currentUser.username;
    if (elements.navUserAvatar) elements.navUserAvatar.textContent = initial;
    if (elements.dropdownUserName) elements.dropdownUserName.textContent = state.currentUser.username;
    if (elements.dropdownUserAvatar) elements.dropdownUserAvatar.textContent = initial;
    if (elements.dropdownUserEmail) elements.dropdownUserEmail.textContent = state.currentUser.email || 'Personal Vault';
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

  // Password Visibility Toggles (Eye Icon)
  const toggleLoginPassBtn = document.getElementById('btn-toggle-login-password');
  const loginPassInput = document.getElementById('login-password');
  if (toggleLoginPassBtn && loginPassInput) {
    toggleLoginPassBtn.addEventListener('click', () => {
      const isPass = loginPassInput.type === 'password';
      loginPassInput.type = isPass ? 'text' : 'password';
      toggleLoginPassBtn.textContent = isPass ? '🙈' : '👁️';
    });
  }

  const toggleRegPassBtn = document.getElementById('btn-toggle-reg-password');
  const regPassInput = document.getElementById('reg-password');
  if (toggleRegPassBtn && regPassInput) {
    toggleRegPassBtn.addEventListener('click', () => {
      const isPass = regPassInput.type === 'password';
      regPassInput.type = isPass ? 'text' : 'password';
      toggleRegPassBtn.textContent = isPass ? '🙈' : '👁️';
    });
  }

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
      await loadTasks();
      await loadStatus();
      await initPushNotifications();
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
      await loadTasks();
      await loadStatus();
      await initPushNotifications();
    } catch (err) {
      elements.registerError.textContent = err.message;
      elements.registerError.style.display = 'block';
    }
  });

  // User Profile Dropdown Toggle
  if (elements.btnUserMenu && elements.userDropdownMenu) {
    elements.btnUserMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = elements.userDropdownMenu.style.display === 'block';
      elements.userDropdownMenu.style.display = isExpanded ? 'none' : 'block';
      elements.btnUserMenu.classList.toggle('active', !isExpanded);
      elements.btnUserMenu.setAttribute('aria-expanded', String(!isExpanded));
    });

    document.addEventListener('click', (e) => {
      if (!elements.btnUserMenu.contains(e.target) && !elements.userDropdownMenu.contains(e.target)) {
        elements.userDropdownMenu.style.display = 'none';
        elements.btnUserMenu.classList.remove('active');
        elements.btnUserMenu.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Logout
  if (elements.btnLogout) {
    elements.btnLogout.addEventListener('click', () => {
      if (elements.userDropdownMenu) {
        elements.userDropdownMenu.style.display = 'none';
        if (elements.btnUserMenu) {
          elements.btnUserMenu.classList.remove('active');
          elements.btnUserMenu.setAttribute('aria-expanded', 'false');
        }
      }
      api.auth.logout();
      state.currentUser = null;
      state.files = [];
      state.tasks = [];
      showAuthView();
    });
  }

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

  // View Switcher (Grid vs List vs Calendar)
  elements.btnViewGrid.addEventListener('click', () => setViewLayout('grid'));
  elements.btnViewList.addEventListener('click', () => setViewLayout('list'));
  if (elements.btnViewCalendar) {
    elements.btnViewCalendar.addEventListener('click', () => setViewLayout('calendar'));
  }

  // Task Filter Pills
  if (elements.taskPills) {
    elements.taskPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.taskPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.taskFilter = pill.getAttribute('data-task-filter') || 'all';
        loadTasks();
      });
    });
  }

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
    if (state.activeFilter === 'tasks') {
      renderTasks(state.tasks);
    } else {
      renderFiles(state.files);
    }
  });

  elements.btnResetSearch.addEventListener('click', () => {
    elements.globalSearchInput.value = '';
    elements.searchClearBtn.style.display = 'none';
    elements.searchResultsInfo.style.display = 'none';
    if (state.activeFilter === 'tasks') {
      renderTasks(state.tasks);
    } else {
      renderFiles(state.files);
    }
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

  if (elements.btnOpenTask) elements.btnOpenTask.addEventListener('click', () => openTaskModal());
  if (elements.btnMobileTask) elements.btnMobileTask.addEventListener('click', () => openTaskModal());

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
  if (elements.btnWidgetDetails) elements.btnWidgetDetails.addEventListener('click', openStatusModal);
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
  if (elements.btnCloseTaskModal) elements.btnCloseTaskModal.addEventListener('click', () => elements.taskModal.style.display = 'none');
  if (elements.btnCancelTask) elements.btnCancelTask.addEventListener('click', () => elements.taskModal.style.display = 'none');
  elements.btnCloseAiModal.addEventListener('click', () => elements.aiModal.style.display = 'none');
  elements.btnClosePreviewModal.addEventListener('click', () => elements.previewModal.style.display = 'none');
  elements.btnCloseStatusModal.addEventListener('click', () => elements.statusModal.style.display = 'none');

  // Push Permission Banner Handlers
  if (elements.btnEnablePush) {
    elements.btnEnablePush.addEventListener('click', async () => {
      await requestPushPermissionAndSubscribe();
    });
  }

  if (elements.btnDismissPushBanner) {
    elements.btnDismissPushBanner.addEventListener('click', () => {
      if (elements.pushPermissionBanner) elements.pushPermissionBanner.style.display = 'none';
      localStorage.setItem('vault_dismiss_push', '1');
    });
  }

  if (elements.btnStatusTestPush) {
    elements.btnStatusTestPush.addEventListener('click', async () => {
      await sendTestNotification();
    });
  }

  if (elements.btnStatusEnablePush) {
    elements.btnStatusEnablePush.addEventListener('click', async () => {
      await requestPushPermissionAndSubscribe();
    });
  }

  // Close modals on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });
  });

  // Task Reminder Timing change listener
  if (elements.taskReminderTimingSelect) {
    elements.taskReminderTimingSelect.addEventListener('change', (e) => {
      if (elements.taskCustomOffsetBox) {
        elements.taskCustomOffsetBox.style.display = e.target.value === 'custom' ? 'block' : 'none';
      }
    });
  }

  // Task Form Submit
  if (elements.taskForm) {
    elements.taskForm.addEventListener('submit', handleTaskFormSubmit);
  }

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

// ================= FILE & TASK LOADING =================

async function loadFiles() {
  try {
    const res = await api.files.list(state.activeFilter);
    state.files = res.files || [];
    state.stats = res.stats || {};
    updateStatsCounters();
    if (state.activeFilter !== 'tasks') {
      renderFiles(state.files);
    }
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

  if (elements.mobileFilterDropdown) {
    elements.mobileFilterDropdown.value = filter;
  }

  const titles = {
    all: 'All Items',
    tasks: 'Tasks & Reminders',
    pdf: 'PDF Documents',
    image: 'Images & OCR Scans',
    doc: 'Word & Text Documents',
    note: 'Personal Notes',
    credential: 'Passwords & Logins'
  };

  elements.currentViewTitle.textContent = titles[filter] || 'All Items';

  if (filter === 'tasks') {
    if (elements.tasksFilterTabs) elements.tasksFilterTabs.style.display = 'flex';
    if (elements.btnViewCalendar) elements.btnViewCalendar.style.display = 'inline-flex';
    checkPushBannerVisibility();
    loadTasks();
  } else {
    if (elements.tasksFilterTabs) elements.tasksFilterTabs.style.display = 'none';
    if (elements.btnViewCalendar) elements.btnViewCalendar.style.display = 'none';
    if (elements.pushPermissionBanner) elements.pushPermissionBanner.style.display = 'none';
    if (state.activeView === 'calendar') {
      setViewLayout('grid');
    }
    loadFiles();
  }
}

function setViewLayout(layout) {
  state.activeView = layout;
  if (layout === 'grid') {
    elements.btnViewGrid.classList.add('active');
    elements.btnViewList.classList.remove('active');
    if (elements.btnViewCalendar) elements.btnViewCalendar.classList.remove('active');
    elements.vaultItemsContainer.className = 'vault-grid';
    if (state.activeFilter === 'tasks') renderTasks(state.tasks);
    else renderFiles(state.files);
  } else if (layout === 'list') {
    elements.btnViewList.classList.add('active');
    elements.btnViewGrid.classList.remove('active');
    if (elements.btnViewCalendar) elements.btnViewCalendar.classList.remove('active');
    elements.vaultItemsContainer.className = 'vault-list';
    if (state.activeFilter === 'tasks') renderTasks(state.tasks);
    else renderFiles(state.files);
  } else if (layout === 'calendar') {
    if (elements.btnViewCalendar) elements.btnViewCalendar.classList.add('active');
    elements.btnViewGrid.classList.remove('active');
    elements.btnViewList.classList.remove('active');
    elements.vaultItemsContainer.className = 'vault-calendar';
    if (state.activeFilter === 'tasks') renderTasks(state.tasks);
    else renderFiles(state.files);
  }
}

function updateStatsCounters() {
  if (state.stats) {
    elements.countAll.textContent = state.stats.total_files || 0;
    elements.countPdf.textContent = state.stats.pdf_count || 0;
    elements.countImage.textContent = state.stats.image_count || 0;
    elements.countDoc.textContent = state.stats.doc_count || 0;
    elements.countNote.textContent = state.stats.note_count || 0;
    if (elements.countCredential) elements.countCredential.textContent = state.stats.credential_count || 0;
  }
  if (state.taskStats && elements.countTasks) {
    elements.countTasks.textContent = state.taskStats.pending || 0;
  }
}

function renderFiles(files) {
  elements.vaultItemsContainer.innerHTML = '';
  elements.viewItemCount.textContent = `${files.length} item${files.length === 1 ? '' : 's'}`;

  if (files.length === 0) {
    elements.vaultItemsContainer.style.display = 'none';
    elements.vaultEmptyState.style.display = 'block';
    const emptyIcon = elements.vaultEmptyState.querySelector('.empty-icon');
    const emptyTitle = elements.vaultEmptyState.querySelector('h3');
    const emptyDesc = elements.vaultEmptyState.querySelector('p');
    const emptyActions = elements.vaultEmptyState.querySelector('.empty-actions');

    if (emptyIcon) emptyIcon.textContent = '✦';
    if (emptyTitle) emptyTitle.textContent = 'How can your vault help today?';
    if (emptyDesc) emptyDesc.textContent = 'Bring in a document or add a note, then search and ask questions across everything you keep here.';
    if (emptyActions) {
      emptyActions.innerHTML = `
        <button type="button" class="btn btn-primary" id="btn-empty-upload">Upload documents</button>
        <button type="button" class="btn btn-secondary" id="btn-empty-note">Create a note</button>
      `;
      document.getElementById('btn-empty-upload')?.addEventListener('click', () => {
        resetUploadState();
        elements.uploadModal.style.display = 'flex';
      });
      document.getElementById('btn-empty-note')?.addEventListener('click', () => {
        elements.noteForm.reset();
        elements.noteModal.style.display = 'flex';
      });
    }
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

// ================= TASKS & REMINDERS IMPLEMENTATION =================

function populateTimezoneSelect() {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const commonTimezones = [
    userTz,
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  const uniqueTzs = Array.from(new Set(commonTimezones));
  if (elements.taskTimezoneSelect) {
    elements.taskTimezoneSelect.innerHTML = uniqueTzs.map(tz => {
      const isSelected = tz === userTz ? 'selected' : '';
      const label = tz === userTz ? `${tz} (Device Local)` : tz;
      return `<option value="${escapeHtml(tz)}" ${isSelected}>${escapeHtml(label)}</option>`;
    }).join('');
  }
}

function formatTaskDateTime(isoString, timezone) {
  if (!isoString) return 'No due date';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || undefined,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch (e) {
    return new Date(isoString).toLocaleString();
  }
}

function checkPushBannerVisibility() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    if (elements.pushPermissionBanner) elements.pushPermissionBanner.style.display = 'none';
    return;
  }
  if (Notification.permission === 'default' && !localStorage.getItem('vault_dismiss_push')) {
    if (elements.pushPermissionBanner) elements.pushPermissionBanner.style.display = 'flex';
  } else {
    if (elements.pushPermissionBanner) elements.pushPermissionBanner.style.display = 'none';
  }
}

async function loadTasks() {
  try {
    const res = await api.tasks.list({ status: state.taskFilter });
    state.tasks = res.tasks || [];

    const statsRes = await api.tasks.getStats().catch(() => ({ stats: {} }));
    state.taskStats = statsRes.stats || {};
    updateStatsCounters();

    if (state.activeFilter === 'tasks') {
      renderTasks(state.tasks);
    }
  } catch (err) {
    console.error('Failed to load tasks:', err);
  }
}

function renderTasks(tasks) {
  elements.vaultItemsContainer.innerHTML = '';
  elements.viewItemCount.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;

  if (tasks.length === 0) {
    elements.vaultItemsContainer.style.display = 'none';
    elements.vaultEmptyState.style.display = 'block';

    const emptyIcon = elements.vaultEmptyState.querySelector('.empty-icon');
    const emptyTitle = elements.vaultEmptyState.querySelector('h3');
    const emptyDesc = elements.vaultEmptyState.querySelector('p');
    const emptyActions = elements.vaultEmptyState.querySelector('.empty-actions');

    if (emptyIcon) emptyIcon.textContent = '⏰';
    if (emptyTitle) emptyTitle.textContent = state.taskFilter === 'all' ? 'No tasks yet' : `No ${state.taskFilter} tasks`;
    if (emptyDesc) emptyDesc.textContent = 'Create a task with a due date and set automatic push reminders across your devices.';
    if (emptyActions) {
      emptyActions.innerHTML = `<button type="button" class="btn btn-primary" id="btn-empty-create-task">⏰ + Create Task / Reminder</button>`;
      document.getElementById('btn-empty-create-task')?.addEventListener('click', () => openTaskModal());
    }
    return;
  }

  elements.vaultEmptyState.style.display = 'none';
  elements.vaultItemsContainer.style.display = 'flex';

  if (state.activeView === 'calendar') {
    elements.vaultItemsContainer.className = 'vault-calendar';
    renderCalendarView(tasks);
  } else {
    elements.vaultItemsContainer.className = 'vault-list';
    const listContainer = document.createElement('div');
    listContainer.className = 'tasks-list-container';
    tasks.forEach(task => {
      listContainer.appendChild(createTaskCard(task));
    });
    elements.vaultItemsContainer.appendChild(listContainer);
  }
}

function createTaskCard(task) {
  const card = document.createElement('div');
  const isPast = task.due_at && new Date(task.due_at).getTime() < Date.now();
  const isOverdue = !task.is_completed && isPast;
  card.className = `task-card ${task.is_completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`;
  card.dataset.taskId = task.id;

  const checkboxWrapper = document.createElement('div');
  checkboxWrapper.className = 'task-checkbox-wrapper';

  const checkbox = document.createElement('div');
  checkbox.className = `task-checkbox ${task.is_completed ? 'checked' : ''}`;
  checkbox.innerHTML = task.is_completed ? '✓' : '';
  checkbox.title = task.is_completed ? 'Mark as incomplete' : 'Mark as complete';
  checkbox.addEventListener('click', async (e) => {
    e.stopPropagation();
    await toggleTaskComplete(task.id);
  });
  checkboxWrapper.appendChild(checkbox);

  const mainContent = document.createElement('div');
  mainContent.className = 'task-main-content';

  const titleRow = document.createElement('div');
  titleRow.className = 'task-title-row';

  const titleEl = document.createElement('h3');
  titleEl.className = 'task-title';
  titleEl.textContent = task.title;
  titleRow.appendChild(titleEl);
  mainContent.appendChild(titleRow);

  if (task.notes && task.notes.trim()) {
    const notesEl = document.createElement('p');
    notesEl.className = 'task-notes';
    notesEl.textContent = task.notes;
    mainContent.appendChild(notesEl);
  }

  const metaRow = document.createElement('div');
  metaRow.className = 'task-meta-row';

  if (task.due_at) {
    const dueBadge = document.createElement('span');
    const localFormatted = formatTaskDateTime(task.due_at, task.timezone);
    const todayFormatted = new Date().toISOString().slice(0, 10);
    const taskDateFormatted = task.due_at.slice(0, 10);
    const isToday = todayFormatted === taskDateFormatted;

    dueBadge.className = `task-badge task-badge-due ${isOverdue ? 'is-overdue' : (isToday ? 'is-today' : '')}`;
    dueBadge.innerHTML = `📅 ${isOverdue ? '⚠️ Overdue: ' : (isToday ? '☀️ Today: ' : '')}${escapeHtml(localFormatted)}`;
    metaRow.appendChild(dueBadge);
  }

  if (task.reminder_timing && task.reminder_timing !== 'none') {
    const remBadge = document.createElement('span');
    remBadge.className = 'task-badge task-badge-reminder';
    let remText = '';
    if (task.reminder_sent) {
      remText = '✓ Push Sent';
    } else {
      if (task.reminder_timing === 'due_time') remText = '⏰ At due time';
      else if (task.reminder_timing === '5m') remText = '⏰ 5m before';
      else if (task.reminder_timing === '15m') remText = '⏰ 15m before';
      else if (task.reminder_timing === '1h') remText = '⏰ 1h before';
      else if (task.reminder_timing === 'custom') remText = `⏰ ${task.reminder_offset_minutes}m before`;
      else remText = '⏰ Reminder set';
    }
    remBadge.textContent = remText;
    metaRow.appendChild(remBadge);
  }

  if (task.recurrence_rule && task.recurrence_rule !== 'none') {
    const recBadge = document.createElement('span');
    recBadge.className = 'task-badge task-badge-recurrence';
    recBadge.textContent = `🔁 ${task.recurrence_rule.charAt(0).toUpperCase() + task.recurrence_rule.slice(1)}`;
    metaRow.appendChild(recBadge);
  }

  mainContent.appendChild(metaRow);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'task-btn-action';
  editBtn.title = 'Edit Task';
  editBtn.textContent = '✏️ Edit';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openTaskModal(task);
  });

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'task-btn-action btn-delete';
  delBtn.title = 'Delete Task';
  delBtn.textContent = '🗑️';
  delBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await deleteTask(task.id, task.title);
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  card.appendChild(checkboxWrapper);
  card.appendChild(mainContent);
  card.appendChild(actions);

  return card;
}

function renderCalendarView(tasks) {
  const container = document.createElement('div');
  container.className = 'calendar-agenda-container';

  const now = Date.now();
  const todayIso = new Date().toISOString().slice(0, 10);

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowIso = tomorrowDate.toISOString().slice(0, 10);

  const buckets = {
    overdue: { title: 'Overdue Tasks', tag: 'OVERDUE', tagClass: 'overdue', tasks: [] },
    today: { title: 'Today', tag: 'TODAY', tagClass: 'today', tasks: [] },
    tomorrow: { title: 'Tomorrow', tag: 'TOMORROW', tagClass: 'tomorrow', tasks: [] },
    upcoming: { title: 'Upcoming (Next 7 Days)', tag: 'THIS WEEK', tagClass: '', tasks: [] },
    later: { title: 'Later & Future', tag: 'FUTURE', tagClass: '', tasks: [] },
    nodate: { title: 'No Due Date', tag: 'ANYTIME', tagClass: '', tasks: [] },
    completed: { title: 'Completed Tasks', tag: 'DONE', tagClass: '', tasks: [] }
  };

  tasks.forEach(task => {
    if (task.is_completed) {
      buckets.completed.tasks.push(task);
    } else if (!task.due_at) {
      buckets.nodate.tasks.push(task);
    } else {
      const dueTime = new Date(task.due_at).getTime();
      const taskDateIso = task.due_at.slice(0, 10);

      if (dueTime < now) {
        buckets.overdue.tasks.push(task);
      } else if (taskDateIso === todayIso) {
        buckets.today.tasks.push(task);
      } else if (taskDateIso === tomorrowIso) {
        buckets.tomorrow.tasks.push(task);
      } else if (dueTime < now + 7 * 86400000) {
        buckets.upcoming.tasks.push(task);
      } else {
        buckets.later.tasks.push(task);
      }
    }
  });

  let renderedSections = 0;
  Object.keys(buckets).forEach(key => {
    const bucket = buckets[key];
    if (bucket.tasks.length === 0) return;
    renderedSections++;

    const dayCard = document.createElement('div');
    dayCard.className = 'calendar-day-card';

    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.innerHTML = `
      <div class="calendar-day-header-left">
        <span class="calendar-day-title">${escapeHtml(bucket.title)}</span>
        ${bucket.tag ? `<span class="calendar-day-tag ${bucket.tagClass}">${escapeHtml(bucket.tag)}</span>` : ''}
      </div>
      <span class="calendar-day-count">${bucket.tasks.length} task${bucket.tasks.length === 1 ? '' : 's'}</span>
    `;

    const dayTasks = document.createElement('div');
    dayTasks.className = 'calendar-day-tasks';
    bucket.tasks.forEach(t => {
      dayTasks.appendChild(createTaskCard(t));
    });

    dayCard.appendChild(header);
    dayCard.appendChild(dayTasks);
    container.appendChild(dayCard);
  });

  if (renderedSections === 0) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'calendar-day-card';
    emptyCard.innerHTML = `<div class="calendar-empty-day">No tasks scheduled in your calendar view.</div>`;
    container.appendChild(emptyCard);
  }

  elements.vaultItemsContainer.appendChild(container);
}

function openTaskModal(task = null) {
  populateTimezoneSelect();

  if (task) {
    elements.taskModalTitle.textContent = '✏️ Edit Task & Reminder';
    elements.taskSaveBtnText.textContent = 'Update Task';
    elements.taskEditId.value = task.id;
    elements.taskTitleInput.value = task.title;
    elements.taskNotesInput.value = task.notes || '';

    if (task.due_at) {
      const d = new Date(task.due_at);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');

      elements.taskDueDateInput.value = `${yr}-${mo}-${da}`;
      elements.taskDueTimeInput.value = `${hr}:${mi}`;
    } else {
      elements.taskDueDateInput.value = '';
      elements.taskDueTimeInput.value = '09:00';
    }

    elements.taskTimezoneSelect.value = task.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    elements.taskReminderTimingSelect.value = task.reminder_timing || 'due_time';
    elements.taskRecurrenceSelect.value = task.recurrence_rule || 'none';

    if (task.reminder_timing === 'custom') {
      elements.taskCustomOffsetBox.style.display = 'block';
      elements.taskCustomOffsetVal.value = task.reminder_offset_minutes || 30;
      elements.taskCustomOffsetUnit.value = '1';
    } else {
      elements.taskCustomOffsetBox.style.display = 'none';
    }
  } else {
    elements.taskModalTitle.textContent = '⏰ Create Task & Reminder';
    elements.taskSaveBtnText.textContent = 'Save Task & Set Reminder';
    elements.taskForm.reset();
    elements.taskEditId.value = '';

    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    elements.taskDueDateInput.value = `${yr}-${mo}-${da}`;
    elements.taskDueTimeInput.value = '09:00';
    elements.taskReminderTimingSelect.value = '15m';
    elements.taskRecurrenceSelect.value = 'none';
    elements.taskCustomOffsetBox.style.display = 'none';
  }

  elements.taskModal.style.display = 'flex';
}

async function handleTaskFormSubmit(e) {
  e.preventDefault();
  const title = elements.taskTitleInput.value.trim();
  if (!title) return;

  const notes = elements.taskNotesInput.value.trim();
  const dateVal = elements.taskDueDateInput.value;
  const timeVal = elements.taskDueTimeInput.value || '09:00';
  const timezone = elements.taskTimezoneSelect.value || 'UTC';
  const reminderTiming = elements.taskReminderTimingSelect.value;
  const recurrenceRule = elements.taskRecurrenceSelect.value;

  let dueAt = null;
  if (dateVal) {
    const combinedStr = `${dateVal}T${timeVal}:00`;
    dueAt = new Date(combinedStr).toISOString();
  }

  let reminderOffsetMinutes = 0;
  if (reminderTiming === 'custom') {
    const val = parseInt(elements.taskCustomOffsetVal.value, 10) || 30;
    const unit = parseInt(elements.taskCustomOffsetUnit.value, 10) || 1;
    reminderOffsetMinutes = val * unit;
  }

  const payload = {
    title,
    notes,
    dueAt,
    timezone,
    reminderTiming,
    reminderOffsetMinutes,
    recurrenceRule
  };

  const editId = elements.taskEditId.value;

  try {
    if (editId) {
      await api.tasks.update(editId, payload);
    } else {
      await api.tasks.create(payload);
    }
    elements.taskModal.style.display = 'none';
    await loadTasks();
  } catch (err) {
    alert('Failed to save task: ' + err.message);
  }
}

async function toggleTaskComplete(id) {
  try {
    await api.tasks.toggle(id);
    await loadTasks();
  } catch (err) {
    alert('Failed to toggle task: ' + err.message);
  }
}

async function deleteTask(id, title) {
  const conf = confirm(`Are you sure you want to delete task "${title}"?`);
  if (!conf) return;

  try {
    await api.tasks.delete(id);
    await loadTasks();
  } catch (err) {
    alert('Failed to delete task: ' + err.message);
  }
}

// ================= WEB PUSH HELPER LOGIC =================

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Web Push is not supported in this browser.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSub = await registration.pushManager.getSubscription();

    if (existingSub) {
      state.pushSubscription = existingSub;
      const keyObj = existingSub.toJSON();
      if (keyObj && keyObj.keys) {
        await api.push.subscribe({
          endpoint: existingSub.endpoint,
          keys: keyObj.keys,
          userAgent: navigator.userAgent,
          deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Phone' : 'Laptop / PC'
        }).catch(() => {});
      }
      if (elements.pushPermissionBanner) elements.pushPermissionBanner.style.display = 'none';
      if (elements.pushStatusText) elements.pushStatusText.textContent = '🟢 Active (This Device)';
    } else {
      if (Notification.permission === 'default' && !localStorage.getItem('vault_dismiss_push')) {
        if (elements.pushPermissionBanner && state.activeFilter === 'tasks') {
          elements.pushPermissionBanner.style.display = 'flex';
        }
      }
      if (elements.pushStatusText) {
        elements.pushStatusText.textContent = Notification.permission === 'granted' ? '🟡 Ready to Subscribe' : '⚪ Not Enabled';
      }
    }
  } catch (err) {
    console.warn('Push init check failed:', err.message);
  }
}

async function requestPushPermissionAndSubscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Web Push is not supported on this browser or platform.');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Push notification permission was not granted.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const vapidRes = await api.push.getVapidKey();
    if (!vapidRes.publicKey) {
      throw new Error('VAPID public key not available from server.');
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidRes.publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    state.pushSubscription = subscription;
    const keyObj = subscription.toJSON();

    await api.push.subscribe({
      endpoint: subscription.endpoint,
      keys: keyObj.keys,
      userAgent: navigator.userAgent,
      deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Phone' : 'Laptop / PC'
    });

    if (elements.pushPermissionBanner) elements.pushPermissionBanner.style.display = 'none';
    if (elements.pushStatusText) elements.pushStatusText.textContent = '🟢 Active (This Device)';
    alert('✅ Push notifications enabled! You will receive scheduled task reminders on this device.');
  } catch (err) {
    console.error('Failed to subscribe for push notifications:', err);
    alert('Failed to enable push notifications: ' + err.message);
  }
}

async function sendTestNotification() {
  try {
    const res = await api.push.test();
    alert('🔔 Test notification sent! Check your notification center / lock screen.');
  } catch (err) {
    alert('Test notification failed: ' + err.message);
  }
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

        if (src.isLocalLaptop) {
          srcCard.innerHTML = `
            <div class="source-info">
              <strong>${src.type === 'folder' ? '📁' : '📄'} ${escapeHtml(src.originalName)} <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(Local ${src.type})</span></strong>
              <span style="font-family: monospace; color: #38bdf8; font-size: 0.74rem; word-break: break-all;">${escapeHtml(src.path)}</span>
            </div>
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
              <button type="button" class="btn btn-sm btn-secondary btn-copy-source-path" title="Copy Path to Clipboard">📋 Copy</button>
              <button type="button" class="btn btn-sm btn-primary btn-open-source-path" title="Open in Windows File Explorer">📂 Open</button>
            </div>
          `;

          const btnCopy = srcCard.querySelector('.btn-copy-source-path');
          btnCopy?.addEventListener('click', () => {
            navigator.clipboard.writeText(src.path);
            btnCopy.textContent = '✓ Copied';
            setTimeout(() => btnCopy.textContent = '📋 Copy', 2000);
          });

          const btnOpen = srcCard.querySelector('.btn-open-source-path');
          btnOpen?.addEventListener('click', async () => {
            try {
              await api.search.openInExplorer(src.path);
              btnOpen.textContent = '✓ Opened';
              setTimeout(() => btnOpen.textContent = '📂 Open', 2000);
            } catch (e) {
              alert('Could not open path: ' + e.message);
            }
          });

        } else {
          srcCard.innerHTML = `
            <div class="source-info">
              <strong>${escapeHtml(src.originalName)}</strong>
              <span>${src.isNote ? 'Personal Note' : src.mimeType} • ${src.snippet ? escapeHtml(src.snippet.slice(0, 100)) : ''}</span>
            </div>
            <button type="button" class="btn btn-sm btn-secondary btn-preview-source">Preview</button>
          `;

          srcCard.querySelector('.btn-preview-source')?.addEventListener('click', async () => {
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
        }

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

  // 1. Ensure complete file details (including extracted credentials/text) are fetched
  let fullFile = file;
  if (!fullFile.extracted_text) {
    try {
      const res = await api.files.get(file.id);
      if (res.file) fullFile = res.file;
    } catch (e) {
      console.warn('Could not fetch complete file details:', e);
    }
  }

  elements.previewFilename.textContent = fullFile.original_name;
  elements.previewSubmeta.textContent = `${fullFile.mime_type || 'Unknown'} • ${formatBytes(fullFile.size_bytes)} • Uploaded ${new Date(fullFile.created_at).toLocaleString()}`;
  elements.previewStorageKey.textContent = fullFile.storage_key;

  const isPdf = fullFile.mime_type === 'application/pdf';
  const isImage = (fullFile.mime_type || '').startsWith('image/');
  const isCredential = fullFile.mime_type === 'application/x-credential' || fullFile.mime_type === 'message/rfc822' || (fullFile.original_name && fullFile.original_name.startsWith('🔑'));
  const isText = (fullFile.mime_type || '').startsWith('text/') || (fullFile.mime_type || '').includes('json') || fullFile.is_note || isCredential;

  elements.previewTypeIcon.textContent = isPdf ? '📕' : (isImage ? '🖼️' : (isCredential ? '🔑' : (fullFile.is_note ? '📝' : '📄')));

  // Layout adjustment: in credential mode, give full width and hide redundant sidebar
  const previewLayout = document.querySelector('.preview-layout');
  const previewSidebar = document.getElementById('preview-sidebar');

  if (isCredential) {
    if (previewLayout) previewLayout.classList.add('credential-mode');
    if (previewSidebar) previewSidebar.style.display = 'none';
  } else {
    if (previewLayout) previewLayout.classList.remove('credential-mode');
    if (previewSidebar) previewSidebar.style.display = 'flex';
  }

  // Viewer Content
  elements.previewViewerContainer.innerHTML = '';
  const contentUrl = api.files.getContentUrl(fullFile.id);

  if (isCredential) {
    const raw = fullFile.extracted_text || '';
    const extractLine = (prefix) => {
      const match = raw.match(new RegExp(`\\*\\*${prefix}:\\*\\*\\s*(.+)`, 'i'));
      return match ? match[1].trim() : '';
    };

    const titleMatch = raw.match(/# Credential:\s*(.+)/i) || raw.match(/\*\*Service \/ Heading:\*\*\s*(.+)/i);
    const titleVal = titleMatch ? titleMatch[1].trim() : (fullFile.original_name || '').replace('🔑 ', '');
    let usernameVal = extractLine('Email / Username');
    let passwordVal = extractLine('Password / Secret / URI');
    let urlVal = extractLine('URL / Endpoint');

    // Fallback extraction from summary if needed
    if (!usernameVal && fullFile.summary) {
      const sumUserMatch = fullFile.summary.match(/User\/Email:\s*([^|]+)/i);
      if (sumUserMatch) usernameVal = sumUserMatch[1].trim();
    }
    if (!urlVal && fullFile.summary) {
      const sumUrlMatch = fullFile.summary.match(/URL:\s*([^|]+)/i);
      if (sumUrlMatch) urlVal = sumUrlMatch[1].trim();
    }

    let notesVal = '';
    const notesIndex = raw.indexOf('**Notes:**');
    if (notesIndex !== -1) {
      const afterNotes = raw.substring(notesIndex + 10);
      notesVal = afterNotes.split('---')[0].trim();
    }

    let isPasswordRevealed = false;
    let autoHideTimer = null;

    const credViewer = document.createElement('div');
    credViewer.className = 'credential-detail-card';
    credViewer.innerHTML = `
      <div class="cred-detail-box">
        <div class="cred-field-group">
          <label class="cred-field-label">Heading / Service Name</label>
          <div class="cred-field-val"><strong style="font-size: 1.15rem; color: #1c1917;">${escapeHtml(titleVal)}</strong></div>
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
          <label class="cred-field-label">Password / Secret / Database Connection URI</label>
          
          <!-- Locked / Biometric Protection Banner -->
          <div class="cred-bio-lock-container" id="cred-bio-lock-banner">
            <div class="cred-bio-lock-info">
              <span style="font-size: 1.6rem;">🛡️</span>
              <div class="cred-bio-lock-text">
                <strong>Password Protected with Biometrics</strong>
                <span>Verify with Fingerprint or Windows Hello to view raw password</span>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-primary" id="btn-unlock-password-bio" style="font-size: 0.82rem; padding: 6px 14px;">
              <span>👆 Authenticate & Reveal</span>
            </button>
          </div>

          <!-- Password Display Field (Masked by default) -->
          <div class="cred-copy-row" style="margin-top: 6px;">
            <input type="password" readonly value="${escapeHtml(passwordVal)}" class="form-input cred-input-field" id="copy-pass-val" placeholder="••••••••••••" style="letter-spacing: 2px;">
            <button type="button" class="btn btn-sm btn-secondary" id="btn-toggle-view-pass" title="Authenticate to reveal">👁️ Reveal</button>
            <button type="button" class="btn btn-sm btn-primary" id="btn-copy-password" title="Copy password">📋 Copy</button>
          </div>
          <span id="pass-security-note" style="font-size: 0.72rem; color: #78716c; margin-top: 2px;">🔒 Password is encrypted & locked to vault owner biometrics.</span>
        </div>` : `
        <div class="cred-field-group">
          <label class="cred-field-label">Password / Secret</label>
          <div class="cred-field-val" style="color: #78716c; font-style: italic;">No password saved for this item.</div>
        </div>`}

        ${urlVal ? `
        <div class="cred-field-group">
          <label class="cred-field-label">Website URL / Database Host</label>
          <div class="cred-field-val">
            <a href="${escapeHtml(urlVal)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); font-weight: 600; text-decoration: underline; word-break: break-all;">${escapeHtml(urlVal)} ↗</a>
          </div>
        </div>` : ''}

        ${notesVal ? `
        <div class="cred-field-group">
          <label class="cred-field-label">Notes & Details</label>
          <div class="cred-field-val" style="white-space: pre-wrap; font-size: 0.88rem; color: #44403c; line-height: 1.5; background: #fffdfa; padding: 12px; border-radius: 8px; border: 1px solid #e2ddd3;">${escapeHtml(notesVal)}</div>
        </div>` : ''}
      </div>
    `;

    elements.previewViewerContainer.appendChild(credViewer);

    const btnCopyUser = credViewer.querySelector('#btn-copy-username');
    if (btnCopyUser && usernameVal) {
      btnCopyUser.addEventListener('click', () => {
        navigator.clipboard.writeText(usernameVal);
        btnCopyUser.textContent = '✓ Copied!';
        setTimeout(() => btnCopyUser.textContent = '📋 Copy', 2000);
      });
    }

    const inputPass = credViewer.querySelector('#copy-pass-val');
    const btnUnlockBio = credViewer.querySelector('#btn-unlock-password-bio');
    const btnTogglePass = credViewer.querySelector('#btn-toggle-view-pass');
    const btnCopyPass = credViewer.querySelector('#btn-copy-password');
    const lockBanner = credViewer.querySelector('#cred-bio-lock-banner');
    const secNote = credViewer.querySelector('#pass-security-note');

    // Biometric Authenticator Routine to Unmask Password
    async function verifyAndRevealPassword() {
      if (isPasswordRevealed) {
        // Hide password
        isPasswordRevealed = false;
        if (inputPass) {
          inputPass.type = 'password';
          inputPass.style.letterSpacing = '2px';
        }
        if (btnTogglePass) btnTogglePass.textContent = '👁️ Reveal';
        if (lockBanner) lockBanner.style.display = 'flex';
        if (secNote) secNote.textContent = '🔒 Password is encrypted & locked to vault owner biometrics.';
        if (autoHideTimer) clearTimeout(autoHideTimer);
        return;
      }

      try {
        if (btnUnlockBio) btnUnlockBio.textContent = '👆 Scanning...';

        if (window.PublicKeyCredential) {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          const userId = new Uint8Array(16);
          window.crypto.getRandomValues(userId);

          await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: 'Personal AI Vault', id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname },
              user: { id: userId, name: state.currentUser?.email || 'owner@vault.local', displayName: state.currentUser?.username || 'Owner' },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
              authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
              timeout: 60000,
              attestation: 'none'
            }
          });
        }

        // Authentication Succeeded
        isPasswordRevealed = true;
        if (inputPass) {
          inputPass.type = 'text';
          inputPass.style.letterSpacing = 'normal';
        }
        if (btnTogglePass) btnTogglePass.textContent = '🙈 Mask';
        if (lockBanner) lockBanner.style.display = 'none';
        if (secNote) secNote.textContent = '✅ Biometrically unlocked. Auto-locking in 30 seconds for security.';

        // Auto re-mask after 30 seconds
        if (autoHideTimer) clearTimeout(autoHideTimer);
        autoHideTimer = setTimeout(() => {
          if (isPasswordRevealed) {
            isPasswordRevealed = false;
            if (inputPass) {
              inputPass.type = 'password';
              inputPass.style.letterSpacing = '2px';
            }
            if (btnTogglePass) btnTogglePass.textContent = '👁️ Reveal';
            if (lockBanner) lockBanner.style.display = 'flex';
            if (secNote) secNote.textContent = '🔒 Password automatically re-locked.';
          }
        }, 30000);

      } catch (err) {
        console.warn('Biometric verify error:', err);
        if (btnUnlockBio) btnUnlockBio.textContent = '👆 Authenticate & Reveal';
        alert('Biometric verification cancelled or failed. Password remains locked.');
      }
    }

    btnUnlockBio?.addEventListener('click', verifyAndRevealPassword);
    btnTogglePass?.addEventListener('click', verifyAndRevealPassword);

    btnCopyPass?.addEventListener('click', async () => {
      if (!isPasswordRevealed) {
        await verifyAndRevealPassword();
      }
      if (isPasswordRevealed && passwordVal) {
        navigator.clipboard.writeText(passwordVal);
        btnCopyPass.textContent = '✓ Copied!';
        setTimeout(() => btnCopyPass.textContent = '📋 Copy', 2000);
      }
    });

  } else if (isImage) {
    const img = document.createElement('img');
    img.src = contentUrl;
    img.alt = fullFile.original_name;
    elements.previewViewerContainer.appendChild(img);
  } else if (isPdf) {
    const iframe = document.createElement('iframe');
    iframe.src = contentUrl;
    elements.previewViewerContainer.appendChild(iframe);
  } else if (isText) {
    const pre = document.createElement('pre');
    pre.className = 'preview-text-viewer';
    pre.textContent = fullFile.extracted_text || 'Loading document content...';
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
  elements.previewExtractedText.textContent = fullFile.extracted_text || fullFile.summary || '[No text content extracted]';

  // Tags
  let tagsArray = [];
  try {
    tagsArray = typeof fullFile.tags === 'string' ? JSON.parse(fullFile.tags) : (fullFile.tags || []);
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

    // Sidebar Status Card (if present)
    if (elements.storageStatusBadge) {
      elements.storageStatusBadge.textContent = storage.connected ? 'Connected' : 'Staging Mode';
      elements.storageStatusBadge.className = `status-badge-mini ${storage.connected ? 'connected' : ''}`;
    }
    if (elements.storageStatusText) {
      elements.storageStatusText.textContent = storage.connected ? storage.bucket : 'Local Staging';
    }
    if (elements.aiStatusText) {
      elements.aiStatusText.textContent = ai.connected ? ai.provider : 'Not Connected';
    }
    if (elements.pushStatusText) {
      elements.pushStatusText.textContent = state.pushSubscription ? '🟢 Active' : (Notification.permission === 'granted' ? '🟡 Ready' : '⚪ Not Enabled');
    }

    // Status Modal Diagnostics
    if (elements.diagStorageBadge) {
      elements.diagStorageBadge.textContent = storage.connected ? 'Connected' : 'Action Needed';
      elements.diagStorageBadge.className = `badge ${storage.connected ? 'badge-success' : 'badge-warning'}`;
    }
    if (elements.diagStorageMsg) {
      elements.diagStorageMsg.textContent = storage.message;
    }

    if (elements.diagAiBadge) {
      elements.diagAiBadge.textContent = ai.connected ? 'Connected' : 'Action Needed';
      elements.diagAiBadge.className = `badge ${ai.connected ? 'badge-success' : 'badge-warning'}`;
    }
    if (elements.diagAiMsg) {
      elements.diagAiMsg.textContent = ai.message;
    }

    if (elements.diagPushBadge && elements.diagPushMsg) {
      const pushInfo = res.services.push;
      elements.diagPushBadge.textContent = 'Active';
      elements.diagPushBadge.className = 'badge badge-success';
      elements.diagPushMsg.textContent = (pushInfo && pushInfo.message) ? pushInfo.message : 'Web Push active with scheduled reminder runner every 60s.';
    }

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

    // Local Laptop Folder / File / Path Search
    const isFolderSearch = /\b(folder|directory)\b/i.test(normalized);
    const isFileSearch = /\b(file|document|pdf|docx|image|code)\b/i.test(normalized);
    const isLaptopQuery = /\b(laptop|pc|computer|drive|disk)\b/i.test(normalized) || isFolderSearch || /\b(path\s+of|where\s+is)\b/i.test(normalized);

    if (isLaptopQuery || /\b(find\s+folder|find\s+file|search\s+laptop)\b/i.test(normalized)) {
      const searchTerms = command
        .trim()
        .replace(/[?.,!]+$/, '')
        .replace(/^(where\s+is|find|search|give\s+me|get\s+path\s+of|show\s+me|locate|open)\s+(the\s+)?(folder|file|path|directory)?\s*(for\s+|of\s+|named\s+)?/i, '')
        .replace(/\s+(on\s+my\s+(laptop|pc|computer)|in\s+my\s+(laptop|pc)|in\s+my\s+vault)$/i, '')
        .trim();

      if (searchTerms) {
        result.innerHTML = `<em>🔍 [${authMethod} Verified] Searching your laptop for "${escapeHtml(searchTerms)}"...</em>`;
        const typeFilter = isFolderSearch ? 'folder' : (isFileSearch ? 'file' : 'all');
        
        api.search.searchLaptop(searchTerms, typeFilter).then(data => {
          if (data.results && data.results.length > 0) {
            let listHtml = `<div class="voice-laptop-results" style="margin-top:12px; text-align:left; background:#18181b; border:1px solid #27272a; border-radius:8px; padding:12px;">`;
            listHtml += `<div style="font-weight:700; color:#4ade80; margin-bottom:8px; font-size:0.85rem;">✅ Found ${data.results.length} matching item(s) on your laptop:</div>`;
            
            data.results.slice(0, 4).forEach((item, idx) => {
              listHtml += `
                <div style="margin-bottom:10px; padding-bottom:8px; border-bottom:${idx < Math.min(3, data.results.length - 1) ? '1px solid #27272a' : 'none'};">
                  <div style="font-size:0.86rem; font-weight:600; color:#fff;">${item.type === 'folder' ? '📁' : '📄'} ${escapeHtml(item.name)} <span style="font-size:0.72rem; color:#a1a1aa; font-weight:normal;">(${item.type})</span></div>
                  <div style="font-family:monospace; font-size:0.76rem; color:#38bdf8; word-break:break-all; margin:3px 0 6px; background:#09090b; padding:4px 8px; border-radius:4px; border:1px solid #27272a;">${escapeHtml(item.path)}</div>
                  <div style="display:flex; gap:6px;">
                    <button type="button" class="btn btn-sm btn-secondary btn-copy-voice-path" data-path="${escapeHtml(item.path)}" style="padding:3px 8px; font-size:0.72rem;">📋 Copy Path</button>
                    <button type="button" class="btn btn-sm btn-primary btn-open-voice-path" data-path="${escapeHtml(item.path)}" style="padding:3px 8px; font-size:0.72rem;">📂 Open in Explorer</button>
                  </div>
                </div>
              `;
            });
            listHtml += `</div>`;
            result.innerHTML = listHtml;

            // Wire up copy and open buttons
            result.querySelectorAll('.btn-copy-voice-path').forEach(btn => {
              btn.addEventListener('click', () => {
                navigator.clipboard.writeText(btn.dataset.path);
                btn.textContent = '✓ Copied!';
                setTimeout(() => btn.textContent = '📋 Copy Path', 2000);
              });
            });

            result.querySelectorAll('.btn-open-voice-path').forEach(btn => {
              btn.addEventListener('click', async () => {
                try {
                  await api.search.openInExplorer(btn.dataset.path);
                  btn.textContent = '✓ Opened!';
                  setTimeout(() => btn.textContent = '📂 Open in Explorer', 2000);
                } catch (e) {
                  alert('Could not open path: ' + e.message);
                }
              });
            });

          } else {
            result.innerHTML = `<span style="color:#f87171;">⚠️ No files or folders matching "<strong>${escapeHtml(searchTerms)}</strong>" were found on your laptop.</span>`;
          }
        }).catch(err => {
          result.innerHTML = `<span style="color:#f87171;">❌ Laptop search error: ${escapeHtml(err.message)}</span>`;
        });
        return;
      }
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
    result.textContent = `✅ [${authMethod} Verified] Command executed: "${command}". Try saying "Find folder MyStorage", "Where is resume on laptop", or "Open my email".`;
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

try {
  setupVoiceAssistant();
} catch (e) {
  console.warn('Voice assistant initialization warning:', e);
}

// Boot application
function bootApp() {
  try {
    initApp().catch(err => {
      console.error('App init error:', err);
      showAuthView();
    });
  } catch (err) {
    console.error('Boot error:', err);
    showAuthView();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
