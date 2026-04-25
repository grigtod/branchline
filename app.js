const STORAGE_KEY = "sleekllm-state-v1";
const ENABLE_LANDING_PAGE = true;
const LANDING_LOGO_PATH = "assets/branchline-logo-gradient-simple.png";
const PRODUCT_NAME = "Branchline";
const PRODUCT_TAGLINE = "Follow the thread that matters.";
const PRODUCT_DEFINITION =
  "Branchline is a branching AI chat workspace that lets you open focused side conversations from highlighted passages while keeping the full conversation context intact.";
const PRODUCT_EXPLANATION =
  "Ask in the main chat, highlight the exact part of an assistant reply you want to dig into, and continue in a side thread without derailing the original conversation.";
const BASE_SYSTEM_PROMPT =
  "You are a helpful assistant inside a branching conversation workspace. Answer naturally. When the user opens a side thread, keep the main conversation in mind while focusing on the selected excerpt that started that thread.";
const DEFAULT_MODELS = ["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"];
const DEFAULT_THINKING = ["none", "low", "medium", "high", "xhigh"];
const MODEL_PRICING = {
  "gpt-5.4": { input: 2.5, output: 15.0 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, output: 1.25 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
};

const dom = {
  landingPage: document.getElementById("landing-page"),
  landingStage: document.getElementById("landing-stage"),
  enterAppButton: document.getElementById("enter-app-button"),
  appShell: document.getElementById("app-shell"),
  sidebar: document.getElementById("sidebar"),
  newChatButton: document.getElementById("new-chat-button"),
  collapseSidebarButton: document.getElementById("collapse-sidebar-button"),
  expandSidebarButton: document.getElementById("expand-sidebar-button"),
  toggleFullscreenButton: document.getElementById("toggle-fullscreen-button"),
  openFavoritesButton: document.getElementById("open-favorites-button"),
  openSettingsButton: document.getElementById("open-settings-button"),
  closeSettingsButton: document.getElementById("close-settings-button"),
  conversationList: document.getElementById("conversation-list"),
  apiKeyInput: document.getElementById("api-key-input"),
  toggleKeyVisibility: document.getElementById("toggle-key-visibility"),
  modelSelect: document.getElementById("model-select"),
  thinkingSelect: document.getElementById("thinking-select"),
  modelCost: document.getElementById("model-cost"),
  sessionCost: document.getElementById("session-cost"),
  chatHeader: document.getElementById("chat-header"),
  chatView: document.getElementById("chat-view"),
  chatStage: document.getElementById("chat-stage"),
  rootComposer: document.getElementById("root-composer"),
  rootInput: document.getElementById("root-input"),
  rootSendButton: document.getElementById("send-root-button"),
  settingsPage: document.getElementById("settings-page"),
  settingsBackdrop: document.getElementById("settings-backdrop"),
  favoritesPage: document.getElementById("favorites-page"),
  favoritesBackdrop: document.getElementById("favorites-backdrop"),
  closeFavoritesButton: document.getElementById("close-favorites-button"),
  favoritesList: document.getElementById("favorites-list"),
  selectionMenu: document.getElementById("selection-menu"),
  buttonTooltip: document.getElementById("button-tooltip"),
  toastRegion: document.getElementById("toast-region"),
};

const ui = {
  appEntered: !ENABLE_LANDING_PAGE,
  pendingScopes: new Set(),
  pendingAnalyses: new Set(),
  selection: null,
  settingsOpen: false,
  favoritesOpen: false,
  sidebarCollapsed: false,
  pendingScrollThreadId: null,
  hoveredTooltipButton: null,
  toastTimers: [],
  toasts: [],
};

let state = loadState();

init();

function init() {
  bindEvents();
  render();
}

function bindEvents() {
  dom.enterAppButton.addEventListener("click", handleEnterApp);
  dom.newChatButton.addEventListener("click", handleNewChat);
  dom.collapseSidebarButton.addEventListener("click", handleCollapseSidebar);
  dom.expandSidebarButton.addEventListener("click", handleExpandSidebar);
  dom.toggleFullscreenButton.addEventListener("click", handleToggleFullscreen);
  dom.openFavoritesButton.addEventListener("click", openFavoritesPage);
  dom.openSettingsButton.addEventListener("click", openSettingsPage);
  dom.closeSettingsButton.addEventListener("click", closeSettingsPage);
  dom.conversationList.addEventListener("click", handleConversationListClick);
  dom.rootComposer.addEventListener("submit", handleRootSubmit);
  dom.rootInput.addEventListener("input", handleRootDraftInput);
  dom.rootInput.addEventListener("keydown", handleComposerKeydown);
  dom.apiKeyInput.addEventListener("input", handleSettingsInput);
  dom.modelSelect.addEventListener("change", handleSettingsInput);
  dom.thinkingSelect.addEventListener("change", handleSettingsInput);
  dom.toggleKeyVisibility.addEventListener("click", handleToggleKeyVisibility);
  dom.chatView.addEventListener("click", handleChatViewClick);
  dom.chatView.addEventListener("input", handleChatViewInput);
  dom.chatView.addEventListener("keydown", handleComposerKeydown);
  dom.chatView.addEventListener("submit", handleThreadSubmit);
  dom.settingsBackdrop.addEventListener("click", closeSettingsPage);
  dom.favoritesBackdrop.addEventListener("click", closeFavoritesPage);
  dom.closeFavoritesButton.addEventListener("click", closeFavoritesPage);
  dom.favoritesList.addEventListener("click", handleFavoritesListClick);
  dom.selectionMenu.addEventListener("click", handleSelectionMenuClick);
  document.addEventListener("mouseup", handleSelectionCandidate);
  document.addEventListener("keyup", handleSelectionCandidate);
  document.addEventListener("mousedown", handleOutsidePointerDown);
  document.addEventListener("mouseover", handleTooltipPointerEnter);
  document.addEventListener("mouseout", handleTooltipPointerLeave);
  document.addEventListener("focusin", handleTooltipFocusIn);
  document.addEventListener("focusout", handleTooltipFocusOut);
  document.addEventListener("keydown", handleDocumentKeydown);
  window.addEventListener("scroll", handleGlobalViewportChange, true);
  window.addEventListener("resize", handleGlobalViewportChange);
}

function handleNewChat() {
  const conversation = createConversation();
  state.conversations.unshift(conversation);
  state.activeConversationId = conversation.id;
  saveState();
  clearSelectionMenu();
  render();
  dom.rootInput.focus();
}

function handleEnterApp() {
  ui.appEntered = true;
  ui.settingsOpen = false;
  ui.favoritesOpen = false;
  render();
  window.requestAnimationFrame(() => {
    dom.rootInput.focus();
  });
}

function handleCollapseSidebar() {
  ui.sidebarCollapsed = true;
  renderAppFrame();
  window.requestAnimationFrame(() => {
    dom.expandSidebarButton.focus();
  });
}

function handleExpandSidebar() {
  ui.sidebarCollapsed = false;
  renderAppFrame();
  window.requestAnimationFrame(() => {
    dom.newChatButton.focus();
  });
}

async function handleToggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  } catch (error) {
    showToast("Fullscreen is unavailable in this browser right now.");
  }
}

function handleConversationListClick(event) {
  const deleteButton = event.target.closest("[data-delete-conversation-id]");
  if (deleteButton) {
    const conversationId = deleteButton.dataset.deleteConversationId;
    const remaining = state.conversations.filter((conversation) => conversation.id !== conversationId);
    state.conversations = remaining.length ? remaining : [createConversation()];
    state.favorites = (state.favorites || []).filter((favorite) => favorite.conversationId !== conversationId);

    if (state.activeConversationId === conversationId || !state.conversations.some((conversation) => conversation.id === state.activeConversationId)) {
      state.activeConversationId = state.conversations[0].id;
    }

    clearSelectionMenu();
    saveState();
    render();
    return;
  }

  const button = event.target.closest("[data-conversation-id]");
  if (!button) {
    return;
  }

  state.activeConversationId = button.dataset.conversationId;
  clearSelectionMenu();
  saveState();
  render();
}

function handleRootDraftInput(event) {
  const conversation = getActiveConversation();
  if (!conversation) {
    return;
  }

  conversation.draft = event.target.value;
  autosizeTextarea(event.target);
  saveState();
}

function handleSettingsInput(event) {
  state.settings.apiKey = dom.apiKeyInput.value.trim();
  state.settings.model = dom.modelSelect.value;
  state.settings.thinking = dom.thinkingSelect.value;
  saveState();

  if (event.target === dom.modelSelect) {
    dom.thinkingSelect.disabled = !supportsReasoning(dom.modelSelect.value);
  }

  renderPricing();
}

function handleToggleKeyVisibility() {
  state.settings.apiKeyVisible = !state.settings.apiKeyVisible;
  renderSettings();
  saveState();
}

function handleDocumentKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  if (ui.settingsOpen) {
    event.preventDefault();
    closeSettingsPage();
    return;
  }

  if (ui.favoritesOpen) {
    event.preventDefault();
    closeFavoritesPage();
  }
}

function handleChatViewClick(event) {
  const conversation = getActiveConversation();
  if (!conversation) {
    return;
  }

  const deleteThreadButton = event.target.closest("[data-delete-thread-id]");
  if (deleteThreadButton) {
    const didDelete = removeThreadById(conversation.messages, deleteThreadButton.dataset.deleteThreadId);
    if (didDelete) {
      touchConversation(conversation);
      clearNativeSelection();
      clearSelectionMenu();
      saveState();
      render();
    }
    return;
  }

  const compactToggle = event.target.closest("[data-compaction-toggle]");
  if (compactToggle) {
    const messageElement = compactToggle.closest(".message");
    const message = messageElement ? findMessageById(conversation.messages, messageElement.dataset.messageId) : null;
    if (message) {
      message.compactions = (message.compactions || []).filter(
        (compaction) => compaction.id !== compactToggle.dataset.compactionToggle,
      );
      touchConversation(conversation);
      saveState();
      render();
    }
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const removeAnalysisButton = event.target.closest("[data-remove-analysis-id]");
  if (removeAnalysisButton) {
    const messageElement = removeAnalysisButton.closest(".message");
    const message = messageElement ? findMessageById(conversation.messages, messageElement.dataset.messageId) : null;
    if (message) {
      message.analyses = (message.analyses || []).filter(
        (analysis) => analysis.id !== removeAnalysisButton.dataset.removeAnalysisId,
      );
      touchConversation(conversation);
      saveState();
      render();
    }
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const toggle = event.target.closest("[data-thread-toggle]");
  if (toggle) {
    const thread = findThreadById(conversation.messages, toggle.dataset.threadToggle);
    if (thread) {
      thread.collapsed = !thread.collapsed;
      saveState();
      render();
    }
    return;
  }

  const mark = event.target.closest("mark[data-thread-id]");
  if (mark) {
    const thread = findThreadById(conversation.messages, mark.dataset.threadId);
    if (thread) {
      thread.collapsed = !thread.collapsed;
      saveState();
      render();
    }
    return;
  }
}

function handleChatViewInput(event) {
  const textarea = event.target.closest("textarea[data-thread-id]");
  if (!textarea) {
    return;
  }

  const conversation = getActiveConversation();
  if (!conversation) {
    return;
  }

  const thread = findThreadById(conversation.messages, textarea.dataset.threadId);
  if (!thread) {
    return;
  }

  thread.draft = textarea.value;
  autosizeTextarea(textarea);
  saveState();
}

function handleComposerKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey) {
    return;
  }

  const rootTextarea = event.target.closest("#root-input");
  if (rootTextarea) {
    event.preventDefault();
    dom.rootComposer.requestSubmit();
    return;
  }

  const threadTextarea = event.target.closest("textarea[data-thread-id]");
  if (threadTextarea) {
    event.preventDefault();
    threadTextarea.closest("form")?.requestSubmit();
  }
}

async function handleRootSubmit(event) {
  event.preventDefault();
  await submitPrompt([]);
}

async function handleThreadSubmit(event) {
  const form = event.target.closest("form[data-thread-id]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const threadPath = parseThreadPath(form.dataset.threadPath);
  await submitPrompt(threadPath);
}

function handleSelectionCandidate() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    clearSelectionMenu();
    return;
  }

  const range = selection.getRangeAt(0);
  const messageText = findSelectionMessageText(range);
  if (!messageText) {
    clearSelectionMenu();
    return;
  }

  const selectedText = selection.toString().trim();
  if (selectedText.length < 2) {
    clearSelectionMenu();
    return;
  }

  const messageElement = messageText.closest(".message");
  const conversation = getActiveConversation();
  if (!messageElement || !conversation) {
    clearSelectionMenu();
    return;
  }

  const messageId = messageElement.dataset.messageId;
  const message = findMessageById(conversation.messages, messageId);
  if (!message) {
    clearSelectionMenu();
    return;
  }

  const offsets = getRangeOffsets(messageText, range);
  if (offsets.end <= offsets.start) {
    clearSelectionMenu();
    return;
  }

  const overlap = findOverlappingThread(message.threads || [], offsets.start, offsets.end);
  if (overlap && !isSameAnchor(overlap, offsets.start, offsets.end, selectedText)) {
    clearSelectionMenu();
    showToast("That span already belongs to a nearby thread. Open a fresh span or continue inside the thread itself.");
    return;
  }

  if (findOverlappingFavorite(getMessageFavorites(conversation.id, messageId), offsets.start, offsets.end)) {
    clearSelectionMenu();
    showToast("That passage is already in favorites. Remove it there first if you want to reuse the same span.");
    return;
  }

  const rect = range.getBoundingClientRect();
  ui.selection = {
    messageId,
    threadPath: parseThreadPath(messageElement.dataset.threadPath),
    selectedText,
    startOffset: offsets.start,
    endOffset: offsets.end,
    action: overlap ? "open" : "create",
    existingThreadId: overlap ? overlap.id : null,
    x: clamp(rect.left + rect.width / 2, 16, window.innerWidth - 16),
    y: Math.max(rect.top - 16, 16),
  };

  renderSelectionMenu();
}

function handleOutsidePointerDown(event) {
  if (dom.selectionMenu.contains(event.target)) {
    return;
  }

  if (event.target.closest(".message-text")) {
    return;
  }

  clearSelectionMenu();
}

function handleTooltipPointerEnter(event) {
  const button = event.target.closest("button[data-tooltip]");
  if (!button || button.disabled || !button.isConnected) {
    return;
  }

  if (button.contains(event.relatedTarget)) {
    return;
  }

  showButtonTooltip(button);
}

function handleTooltipPointerLeave(event) {
  if (!ui.hoveredTooltipButton) {
    return;
  }

  if (ui.hoveredTooltipButton.contains(event.relatedTarget)) {
    return;
  }

  hideButtonTooltip();
}

function handleTooltipFocusIn(event) {
  const button = event.target.closest("button[data-tooltip]");
  if (!button || button.disabled || !button.isConnected) {
    return;
  }

  showButtonTooltip(button);
}

function handleTooltipFocusOut(event) {
  if (!ui.hoveredTooltipButton) {
    return;
  }

  if (ui.hoveredTooltipButton.contains(event.relatedTarget)) {
    return;
  }

  hideButtonTooltip();
}

function handleGlobalViewportChange() {
  clearSelectionMenu();
  hideButtonTooltip();
}

function handleFavoritesListClick(event) {
  const deleteButton = event.target.closest("[data-delete-favorite-id]");
  if (!deleteButton) {
    return;
  }

  state.favorites = (state.favorites || []).filter((favorite) => favorite.id !== deleteButton.dataset.deleteFavoriteId);
  saveState();
  render();
}

async function handleSelectionThreadAction() {
  if (!ui.selection) {
    return;
  }

  const conversation = getActiveConversation();
  if (!conversation) {
    clearSelectionMenu();
    return;
  }

  if (ui.selection.action === "open" && ui.selection.existingThreadId) {
    const thread = findThreadById(conversation.messages, ui.selection.existingThreadId);
    if (thread) {
      thread.collapsed = false;
      ui.pendingScrollThreadId = thread.id;
      saveState();
      render();
    }
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const message = findMessageById(conversation.messages, ui.selection.messageId);
  if (!message) {
    clearSelectionMenu();
    return;
  }

  const thread = createThread({
    anchorText: ui.selection.selectedText,
    anchorMessageId: message.id,
    startOffset: ui.selection.startOffset,
    endOffset: ui.selection.endOffset,
  });

  message.threads = message.threads || [];
  message.threads.push(thread);
  touchConversation(conversation);
  ui.pendingScrollThreadId = thread.id;
  saveState();
  render();
  clearNativeSelection();
  clearSelectionMenu();
}

async function handleSelectionCompactAction() {
  if (!ui.selection) {
    return;
  }

  const conversation = getActiveConversation();
  if (!conversation) {
    clearSelectionMenu();
    return;
  }

  const message = findMessageById(conversation.messages, ui.selection.messageId);
  if (!message) {
    clearSelectionMenu();
    return;
  }

  const overlappingThread = findOverlappingThread(message.threads || [], ui.selection.startOffset, ui.selection.endOffset);
  if (overlappingThread) {
    showToast("You can’t compact text that already belongs to a branch.");
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const overlappingCompaction = findOverlappingCompaction(
    message.compactions || [],
    ui.selection.startOffset,
    ui.selection.endOffset,
  );
  if (overlappingCompaction) {
    showToast("That span is already compacted.");
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  message.compactions = message.compactions || [];
  message.compactions.push(
    createCompaction({
      compactedText: ui.selection.selectedText,
      startOffset: ui.selection.startOffset,
      endOffset: ui.selection.endOffset,
    }),
  );
  touchConversation(conversation);
  saveState();
  render();
  clearNativeSelection();
  clearSelectionMenu();
}

async function handleSelectionDebateAction() {
  if (!ui.selection) {
    return;
  }

  const conversation = getActiveConversation();
  if (!conversation) {
    clearSelectionMenu();
    return;
  }

  if (!state.settings.apiKey) {
    showToast("Add your OpenAI API key in Settings first so Branchline can reach the model.");
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const selection = { ...ui.selection };
  const message = findMessageById(conversation.messages, selection.messageId);
  if (!message) {
    clearSelectionMenu();
    return;
  }

  const overlappingThread = findOverlappingThread(message.threads || [], selection.startOffset, selection.endOffset);
  if (overlappingThread) {
    if (overlappingThread.kind === "debate" && isSameAnchor(overlappingThread, selection.startOffset, selection.endOffset, selection.selectedText)) {
      overlappingThread.collapsed = false;
      ui.pendingScrollThreadId = overlappingThread.id;
      saveState();
      render();
    } else {
      showToast("That span already belongs to another thread. Pick a fresh excerpt or continue inside the existing thread.");
    }
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const thread = createThread({
    anchorText: selection.selectedText,
    anchorMessageId: message.id,
    startOffset: selection.startOffset,
    endOffset: selection.endOffset,
    kind: "debate",
  });

  message.threads = message.threads || [];
  message.threads.push(thread);
  touchConversation(conversation);
  ui.pendingScrollThreadId = thread.id;
  saveState();
  render();
  clearNativeSelection();
  clearSelectionMenu();

  await runAutomatedThreadReply(
    conversation,
    [...selection.threadPath, thread.id],
    buildInitialDebatePrompt(thread.anchorText),
  );
}

async function handleSelectionBookmarkAction() {
  if (!ui.selection) {
    return;
  }

  const conversation = getActiveConversation();
  if (!conversation) {
    clearSelectionMenu();
    return;
  }

  const message = findMessageById(conversation.messages, ui.selection.messageId);
  if (!message) {
    clearSelectionMenu();
    return;
  }

  if (findOverlappingThread(message.threads || [], ui.selection.startOffset, ui.selection.endOffset)) {
    showToast("You can’t favorite text that already belongs to a branch.");
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  if (findOverlappingCompaction(message.compactions || [], ui.selection.startOffset, ui.selection.endOffset)) {
    showToast("Expand that compacted text before adding it to favorites.");
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const overlappingFavorite = findOverlappingFavorite(
    getMessageFavorites(conversation.id, message.id),
    ui.selection.startOffset,
    ui.selection.endOffset,
  );

  if (overlappingFavorite) {
    showToast("That passage is already in favorites.");
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  state.favorites = state.favorites || [];
  state.favorites.push(
    createFavorite({
      conversationId: conversation.id,
      messageId: message.id,
      selectedText: ui.selection.selectedText,
      startOffset: ui.selection.startOffset,
      endOffset: ui.selection.endOffset,
    }),
  );
  saveState();
  render();
  showToast("Added to favorites.");
  clearNativeSelection();
  clearSelectionMenu();
}

async function handleSelectionAnalyseAction() {
  if (!ui.selection) {
    return;
  }

  const lensInput = window.prompt("What do you want to analyse in this text?", "");
  if (lensInput === null) {
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const analysisPrompt = lensInput.trim();
  if (!analysisPrompt) {
    showToast("Add an analysis prompt first.");
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const conversation = getActiveConversation();
  if (!conversation) {
    clearSelectionMenu();
    return;
  }

  if (!state.settings.apiKey) {
    showToast("Add your OpenAI API key in Settings first so Branchline can reach the model.");
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const selection = { ...ui.selection };
  const message = findMessageById(conversation.messages, selection.messageId);
  if (!message) {
    clearSelectionMenu();
    return;
  }

  if (findOverlappingAnalysis(message.analyses || [], selection.startOffset, selection.endOffset)) {
    showToast("Remove the current analysis highlight on this span before running a new one.");
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  const analysisScopeKey = makeAnalysisScopeKey(conversation.id, message.id);
  if (ui.pendingAnalyses.has(analysisScopeKey)) {
    clearNativeSelection();
    clearSelectionMenu();
    return;
  }

  ui.pendingAnalyses.add(analysisScopeKey);
  clearNativeSelection();
  clearSelectionMenu();
  render();

  try {
    const segments = await requestSelectionAnalysis(selection.selectedText, analysisPrompt, selection.startOffset);
    if (!segments.length) {
      showToast(`No strong matches found for "${truncate(normalizeWhitespace(analysisPrompt), 36)}".`);
      return;
    }

    message.analyses = message.analyses || [];
    message.analyses.push(
      createAnalysis({
        prompt: analysisPrompt,
        selectedText: selection.selectedText,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        segments,
      }),
    );
    touchConversation(conversation);
    saveState();
    render();
    showToast(`Applied "${truncate(normalizeWhitespace(analysisPrompt), 28)}" analysis.`);
  } catch (error) {
    showToast(error.message || "The analysis request failed.");
  } finally {
    ui.pendingAnalyses.delete(analysisScopeKey);
    saveState();
    render();
  }
}

async function handleSelectionMenuClick(event) {
  const button = event.target.closest("[data-selection-action]");
  if (!button) {
    return;
  }

  const { selectionAction } = button.dataset;
  if (!selectionAction) {
    return;
  }

  event.preventDefault();

  if (selectionAction === "compact") {
    await handleSelectionCompactAction();
    return;
  }

  if (selectionAction === "branch") {
    await handleSelectionThreadAction();
    return;
  }

  if (selectionAction === "debate") {
    await handleSelectionDebateAction();
    return;
  }

  if (selectionAction === "analyse") {
    await handleSelectionAnalyseAction();
    return;
  }

  if (selectionAction === "bookmark") {
    await handleSelectionBookmarkAction();
    return;
  }

  clearNativeSelection();
  clearSelectionMenu();
}

async function submitPrompt(threadPath) {
  const conversation = getActiveConversation();
  if (!conversation) {
    return;
  }

  const scope = getScopeTarget(conversation, threadPath);
  if (!scope) {
    return;
  }

  const draft = scope.draft.trim();
  if (!draft) {
    return;
  }

  if (!state.settings.apiKey) {
    showToast("Add your OpenAI API key in Settings first so Branchline can reach the model.");
    return;
  }

  const scopeKey = makeScopeKey(conversation.id, threadPath);
  if (ui.pendingScopes.has(scopeKey)) {
    return;
  }

  const userMessage = createMessage("user", draft);
  scope.messages.push(userMessage);
  scope.draft = "";
  touchConversation(conversation);

  if (!conversation.title || conversation.title === "New chat") {
    conversation.title = summarizeTitle(draft);
  }

  ui.pendingScopes.add(scopeKey);
  clearSelectionMenu();
  saveState();
  render();

  try {
    const input = buildApiInput(conversation, threadPath);
    const output = await requestAssistantReply(input);
    scope.messages.push(createMessage("assistant", output));
    touchConversation(conversation);
  } catch (error) {
    showToast(error.message || "The request failed.");
  } finally {
    ui.pendingScopes.delete(scopeKey);
    saveState();
    render();
  }
}

async function runAutomatedThreadReply(conversation, threadPath, instruction) {
  const scope = getScopeTarget(conversation, threadPath);
  if (!scope || !instruction || !state.settings.apiKey) {
    return;
  }

  const scopeKey = makeScopeKey(conversation.id, threadPath);
  if (ui.pendingScopes.has(scopeKey)) {
    return;
  }

  ui.pendingScopes.add(scopeKey);
  saveState();
  render();

  try {
    const input = buildApiInput(conversation, threadPath, {
      supplementalUserPrompt: instruction,
    });
    const output = await requestAssistantReply(input);
    scope.messages.push(createMessage("assistant", output));
    touchConversation(conversation);
  } catch (error) {
    showToast(error.message || "The request failed.");
  } finally {
    ui.pendingScopes.delete(scopeKey);
    saveState();
    render();
  }
}

async function requestAssistantReply(input) {
  const model = state.settings.model || DEFAULT_MODELS[0];
  const body = {
    model,
    input,
  };

  if (supportsReasoning(model)) {
    body.reasoning = {
      effort: state.settings.thinking || "medium",
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.settings.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = data?.error?.message;
    throw new Error(apiMessage || "OpenAI returned an error.");
  }

  const text = extractResponseText(data);
  if (!text) {
    throw new Error("The model returned an empty response.");
  }

  return text.trim();
}

async function requestAssistantJson(input, failureMessage) {
  const text = await requestAssistantReply(input);
  const parsed = parseJsonResponse(text);
  if (parsed === null) {
    throw new Error(failureMessage || "The model returned an invalid JSON response.");
  }
  return parsed;
}

function buildApiInput(conversation, threadPath, options = {}) {
  const input = [
    {
      role: "system",
      content: [{ type: "input_text", text: BASE_SYSTEM_PROMPT }],
    },
  ];

  appendMessageListToInput(input, conversation.messages);

  const ancestors = threadPath
    .map((threadId) => findThreadById(conversation.messages, threadId))
    .filter(Boolean);

  ancestors.forEach((thread, index) => {
    input.push({
      role: "system",
      content: [
        {
          type: "input_text",
          text: buildThreadFocusPrompt(thread, index),
        },
      ],
    });
    appendMessageListToInput(input, thread.messages);
  });

  if (typeof options.supplementalUserPrompt === "string" && options.supplementalUserPrompt.trim()) {
    input.push({
      role: "user",
      content: [{ type: "input_text", text: options.supplementalUserPrompt.trim() }],
    });
  }

  return input;
}

function buildThreadFocusPrompt(thread, index) {
  const focusIntro =
    `Thread focus ${index + 1}: the user opened a side discussion about this excerpt from an earlier assistant reply:\n"""` +
    `\n${thread.anchorText}\n"""`;

  if (thread.kind === "debate") {
    return (
      `${focusIntro}\n` +
      "This is a debate thread. Take a rigorous contrarian stance toward the excerpt and stress-test its reasoning. " +
      "Explain where it may be false, overstated, misleading, manipulative, incomplete, or unsupported. " +
      "Give concrete objections, note uncertainty when needed, and prefer honesty over performative disagreement."
    );
  }

  return `${focusIntro}\nStay grounded in the full main conversation while focusing on this passage and the thread that follows.`;
}

function buildInitialDebatePrompt(selectedText) {
  return (
    "Start a debate about the selected excerpt below.\n\n" +
    `Excerpt:\n"""\n${selectedText}\n"""\n\n` +
    "Give the strongest contrarian reading you can. Focus on reasons the excerpt may be false, misleading, manipulative, incomplete, poorly supported, or rhetorically slanted. " +
    "Use concise paragraphs and concrete reasoning."
  );
}

function buildAnalysisRequestInput(selectedText, analysisPrompt) {
  return [
    {
      role: "system",
      content: [
        {
          type: "input_text",
          text:
            "You are a text analysis engine. Return JSON only. " +
            'Analyze the excerpt using the requested lens and return {"segments":[{"start":number,"end":number,"score":number,"reason":string}]}. ' +
            "Offsets must be exact character offsets relative to the excerpt, spans must be non-overlapping, highlights must stay tight to the exact words that show the target trait, and score must be between 0 and 1. " +
            "Return an empty segments array if nothing matches clearly.",
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text:
            `Analysis lens: ${analysisPrompt}\n\n` +
            `Excerpt:\n"""\n${selectedText}\n"""\n\n` +
            "Return only JSON.",
        },
      ],
    },
  ];
}

async function requestSelectionAnalysis(selectedText, analysisPrompt, baseOffset) {
  const parsed = await requestAssistantJson(
    buildAnalysisRequestInput(selectedText, analysisPrompt),
    "The model returned analysis data in an unexpected format.",
  );
  return normalizeAnalysisSegments(parsed, selectedText, baseOffset);
}

function appendMessageListToInput(target, messages) {
  messages.forEach((message) => {
    target.push({
      role: message.role,
      content: [
        {
          type: message.role === "assistant" ? "output_text" : "input_text",
          text: message.content,
        },
      ],
    });
  });
}

function render() {
  hideButtonTooltip();
  renderAppFrame();
  renderLandingPage();
  renderSettings();
  renderFavorites();
  renderPricing();
  renderSidebar();
  renderHeader();
  renderConversation();
  renderSelectionMenu();
  renderToasts();
  syncButtonTooltips();
  autosizeAllTextareas();
  flushPendingScroll();
}

function renderAppFrame() {
  const showLandingPage = ENABLE_LANDING_PAGE && !ui.appEntered;
  dom.landingPage.classList.toggle("hidden", !showLandingPage);
  dom.appShell.classList.toggle("hidden", showLandingPage);
  dom.appShell.classList.toggle("sidebar-collapsed", ui.sidebarCollapsed);
  dom.sidebar.setAttribute("aria-hidden", String(ui.sidebarCollapsed));
  dom.collapseSidebarButton.classList.toggle("hidden", ui.sidebarCollapsed);
  dom.expandSidebarButton.classList.toggle("hidden", !ui.sidebarCollapsed);
  dom.expandSidebarButton.setAttribute("aria-hidden", String(!ui.sidebarCollapsed));
}

function renderSettings() {
  dom.apiKeyInput.type = state.settings.apiKeyVisible ? "text" : "password";
  dom.apiKeyInput.value = state.settings.apiKey || "";
  dom.modelSelect.value = state.settings.model || DEFAULT_MODELS[0];
  dom.thinkingSelect.value = state.settings.thinking || "medium";
  dom.thinkingSelect.disabled = !supportsReasoning(dom.modelSelect.value);
  dom.toggleKeyVisibility.textContent = state.settings.apiKeyVisible ? "Hide" : "Show";
  const showSettings = ui.appEntered && ui.settingsOpen;
  dom.settingsPage.classList.toggle("hidden", !showSettings);
  dom.settingsPage.setAttribute("aria-hidden", String(!showSettings));
  dom.openSettingsButton.setAttribute("aria-expanded", String(ui.settingsOpen));
  document.body.classList.toggle("settings-open", showSettings || ui.favoritesOpen);
}

function renderFavorites() {
  const showFavorites = ui.appEntered && ui.favoritesOpen;
  dom.favoritesPage.classList.toggle("hidden", !showFavorites);
  dom.favoritesPage.setAttribute("aria-hidden", String(!showFavorites));
  dom.openFavoritesButton.setAttribute("aria-expanded", String(ui.favoritesOpen));
  document.body.classList.toggle("settings-open", showFavorites || ui.settingsOpen);

  dom.favoritesList.innerHTML = "";
  const favorites = [...(state.favorites || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!favorites.length) {
    const empty = document.createElement("div");
    empty.className = "favorites-empty";
    empty.textContent = "No favorites yet. Highlight an assistant passage and choose Bookmark to save it here.";
    dom.favoritesList.appendChild(empty);
    return;
  }

  favorites.forEach((favorite) => {
    const card = document.createElement("article");
    card.className = "favorite-card";

    const top = document.createElement("div");
    top.className = "favorite-card-top";

    const textWrap = document.createElement("div");

    const title = document.createElement("h3");
    title.className = "favorite-card-title";
    title.textContent = getFavoriteConversationTitle(favorite);

    const meta = document.createElement("p");
    meta.className = "favorite-card-meta";
    meta.textContent = formatFavoriteMeta(favorite);

    textWrap.append(title, meta);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "favorite-delete";
    deleteButton.dataset.deleteFavoriteId = favorite.id;
    deleteButton.setAttribute("aria-label", "Delete favorite");

    const deleteIcon = document.createElement("img");
    deleteIcon.className = "favorite-delete-icon";
    deleteIcon.src = "assets/delete-bucket.svg";
    deleteIcon.alt = "";
    deleteIcon.setAttribute("aria-hidden", "true");
    deleteButton.appendChild(deleteIcon);

    top.append(textWrap, deleteButton);

    const quote = document.createElement("p");
    quote.className = "favorite-quote";
    quote.textContent = favorite.selectedText;

    card.append(top, quote);
    dom.favoritesList.appendChild(card);
  });
}

function renderLandingPage() {
  dom.landingStage.innerHTML = "";
  dom.landingStage.appendChild(buildLandingHero());
}

function openSettingsPage() {
  ui.settingsOpen = true;
  ui.favoritesOpen = false;
  renderFavorites();
  renderSettings();
  window.requestAnimationFrame(() => {
    dom.apiKeyInput.focus();
  });
}

function closeSettingsPage() {
  ui.settingsOpen = false;
  renderSettings();
}

function openFavoritesPage() {
  ui.favoritesOpen = true;
  ui.settingsOpen = false;
  renderSettings();
  renderFavorites();
  window.requestAnimationFrame(() => {
    dom.closeFavoritesButton.focus();
  });
}

function closeFavoritesPage() {
  ui.favoritesOpen = false;
  renderFavorites();
}

function renderPricing() {
  const conversation = getActiveConversation();
  const model = state.settings.model || DEFAULT_MODELS[0];
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    dom.modelCost.textContent = "Pricing unavailable";
    dom.sessionCost.textContent = "";
    return;
  }

  dom.modelCost.textContent = `$${formatPrice(pricing.input)} in / $${formatPrice(pricing.output)} out per 1M tokens`;

  const estimate = conversation ? estimateConversationCost(conversation, pricing) : 0;
  const thinkingNote = supportsReasoning(model) ? `Thinking: ${state.settings.thinking || "medium"}.` : "No reasoning setting for this model.";
  //dom.sessionCost.textContent = `This chat: about $${formatTinyPrice(estimate)}. ${thinkingNote}`;
}

function renderSidebar() {
  dom.conversationList.innerHTML = "";
  const activeId = state.activeConversationId;
  const conversations = [...state.conversations].sort(sortByUpdatedAt);

  conversations.forEach((conversation) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `conversation-card${conversation.id === activeId ? " active" : ""}`;
    button.dataset.conversationId = conversation.id;

    const title = document.createElement("span");
    title.className = "conversation-title";
    title.textContent = conversation.title || "New chat";

    const preview = document.createElement("span");
    preview.className = "conversation-preview";
    preview.textContent = buildConversationPreview(conversation);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "conversation-delete";
    deleteButton.dataset.deleteConversationId = conversation.id;
    deleteButton.setAttribute("aria-label", `Delete chat ${conversation.title || "New chat"}`);
    deleteButton.title = "Delete chat";

    const deleteIcon = document.createElement("img");
    deleteIcon.className = "conversation-delete-icon";
    deleteIcon.src = "assets/delete-bucket.svg";
    deleteIcon.alt = "";
    deleteIcon.setAttribute("aria-hidden", "true");
    deleteButton.appendChild(deleteIcon);

    button.append(title, preview, deleteButton);
    dom.conversationList.appendChild(button);
  });
}

function renderHeader() {
  const conversation = getActiveConversation();
  dom.chatHeader.innerHTML = "";

  if (!conversation) {
    return;
  }

  const model = state.settings.model || DEFAULT_MODELS[0];
  const thinking = supportsReasoning(model) ? state.settings.thinking || "medium" : "n/a";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h2");
  title.className = "chat-title";
  title.textContent = conversation.title || "New chat";
  titleWrap.append(title);

  const meta = document.createElement("div");
  meta.className = "chat-meta";
  meta.textContent = `${countMessages(conversation.messages)} messages across ${countThreads(conversation.messages)} threads`;

  const status = document.createElement("div");
  status.className = "chat-status";

  const statusTop = document.createElement("div");
  statusTop.className = "chat-status-top";

  const chips = document.createElement("div");
  chips.className = "chat-status-chips";

  const controls = document.createElement("div");
  controls.className = "chat-header-controls";

  const modelChip = document.createElement("span");
  modelChip.className = "chat-status-chip";
  modelChip.textContent = `Model: ${model}`;

  const thinkingChip = document.createElement("span");
  thinkingChip.className = "chat-status-chip";
  thinkingChip.textContent = `Thinking: ${thinking}`;

  chips.append(modelChip, thinkingChip);

  controls.append(dom.toggleFullscreenButton, dom.openFavoritesButton, dom.openSettingsButton);
  statusTop.append(chips, controls);
  status.append(statusTop);
  titleWrap.append(meta);
  dom.chatHeader.append(titleWrap, status);
  dom.chatHeader.classList.toggle("hidden", false);
}

function renderConversation() {
  const conversation = getActiveConversation();
  dom.chatView.innerHTML = "";
  dom.rootInput.value = conversation?.draft || "";
  const rootPending = conversation ? ui.pendingScopes.has(makeScopeKey(conversation.id, [])) : false;
  dom.rootInput.disabled = !conversation || rootPending;
  dom.rootSendButton.disabled = !conversation || rootPending;
  dom.chatStage.classList.toggle("is-empty", Boolean(conversation) && conversation.messages.length === 0);
  dom.rootComposer.classList.toggle("composer-centered", Boolean(conversation) && conversation.messages.length === 0);
  dom.rootInput.placeholder =
    conversation && conversation.messages.length === 0
      ? "Start with a question, prompt, or idea. Branch when a reply gets interesting."
      : "Continue the conversation";

  if (!conversation || conversation.messages.length === 0) {
    return;
  }

  const stack = document.createElement("div");
  stack.className = "message-stack";
  stack.appendChild(renderMessageList(conversation.messages, []));

  if (ui.pendingScopes.has(makeScopeKey(conversation.id, []))) {
    stack.appendChild(renderTypingIndicator("Thinking in the main thread"));
  }

  dom.chatView.appendChild(stack);
}

function buildLandingHero() {
  const section = document.createElement("section");
  section.className = "landing-hero";

  const intro = document.createElement("div");
  intro.className = "landing-intro";

  const titleRow = document.createElement("div");
  titleRow.className = "landing-title-row";

  const titleMark = document.createElement("img");
  titleMark.className = "landing-title-mark";
  titleMark.src = LANDING_LOGO_PATH;
  titleMark.alt = "";
  titleMark.setAttribute("aria-hidden", "true");

  const title = document.createElement("h2");
  title.className = "landing-title";
  title.textContent = PRODUCT_TAGLINE;

  const definition = document.createElement("p");
  definition.className = "landing-definition";
  definition.textContent = PRODUCT_DEFINITION;

  const explanation = document.createElement("p");
  explanation.className = "landing-explanation";
  explanation.textContent = PRODUCT_EXPLANATION;

  titleRow.append(titleMark, title);
  intro.append(titleRow, definition, explanation);

  const grid = document.createElement("div");
  grid.className = "landing-grid";

  const howItWorks = createLandingCard(
    "How it works",
    [
      "Start with your main prompt in the root chat.",
      "Highlight part of an assistant answer to open a focused branch.",
      "Keep exploring details without losing the original thread.",
    ],
  );

  const whyItHelps = createLandingCard(
    "Why it helps",
    [
      "Prevents one interesting detail from derailing the whole conversation.",
      "Lets research, writing, and debugging stay organized by topic.",
      "Makes long AI chats easier to revisit and reuse.",
    ],
  );

  const bestFor = createLandingCard(
    "Best for",
    [
      "Writers unpacking ideas from one response.",
      "Developers drilling into a specific code suggestion.",
      "Researchers following multiple lines of thought at once.",
    ],
  );

  const ctaPanel = document.createElement("div");
  ctaPanel.className = "landing-cta-panel";
  ctaPanel.appendChild(dom.enterAppButton);

  grid.append(howItWorks, whyItHelps, bestFor);
  section.append(intro, grid, ctaPanel);
  return section;
}

function createLandingCard(titleText, items) {
  const article = document.createElement("article");
  article.className = "landing-card";

  const title = document.createElement("h3");
  title.className = "landing-card-title";
  title.textContent = titleText;

  const list = document.createElement("ul");
  list.className = "landing-list";

  items.forEach((itemText) => {
    const item = document.createElement("li");
    item.textContent = itemText;
    list.appendChild(item);
  });

  article.append(title, list);
  return article;
}

function renderMessageList(messages, threadPath) {
  const fragment = document.createDocumentFragment();
  messages.forEach((message) => {
    fragment.appendChild(renderMessage(message, threadPath));
  });
  return fragment;
}

function renderMessage(message, threadPath) {
  const wrapper = document.createElement("article");
  wrapper.className = `message ${message.role}`;
  wrapper.dataset.messageId = message.id;
  wrapper.dataset.role = message.role;
  wrapper.dataset.threadPath = threadPath.join("|");

  const shell = document.createElement("div");
  shell.className = "message-shell";

  const meta = document.createElement("div");
  meta.className = "message-meta";

  const role = document.createElement("span");
  role.className = "message-role";
  role.textContent = message.role === "assistant" ? "Assistant" : "You";

  const time = document.createElement("span");
  time.textContent = formatTime(message.createdAt);

  meta.append(role, time);

  const analysisActions = renderMessageAnalysisActions(message);
  if (analysisActions) {
    meta.appendChild(analysisActions);
  }

  const body = document.createElement("div");
  body.className = "message-text";
  body.dataset.messageId = message.id;
  body.dataset.threadPath = threadPath.join("|");

  if (message.role === "assistant") {
    body.appendChild(
      buildFormattedTextFragment(
        message.content,
        message.threads || [],
        threadPath,
        message.compactions || [],
        getMessageFavorites(getActiveConversation()?.id, message.id),
        message.analyses || [],
      ),
    );
  } else {
    body.appendChild(buildFormattedTextFragment(message.content, [], threadPath, message.compactions || [], [], []));
  }

  shell.append(meta, body);
  wrapper.appendChild(shell);

  return wrapper;
}

function renderMessageAnalysisActions(message) {
  const conversation = getActiveConversation();
  if (!conversation) {
    return null;
  }

  const actions = document.createElement("div");
  actions.className = "message-meta-actions";

  const analyses = message.analyses || [];
  analyses.forEach((analysis) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "message-analysis-chip";
    button.dataset.removeAnalysisId = analysis.id;
    button.dataset.tooltip = `Remove "${truncate(normalizeWhitespace(analysis.prompt), 28)}" analysis`;
    button.setAttribute("aria-label", `Remove ${analysis.prompt} analysis`);

    const label = document.createElement("span");
    label.className = "message-analysis-chip-label";
    label.textContent = truncate(normalizeWhitespace(analysis.prompt), 24);

    const close = document.createElement("span");
    close.className = "message-analysis-chip-close";
    close.setAttribute("aria-hidden", "true");
    close.textContent = "x";

    button.append(label, close);
    actions.appendChild(button);
  });

  if (ui.pendingAnalyses.has(makeAnalysisScopeKey(conversation.id, message.id))) {
    const status = document.createElement("span");
    status.className = "message-analysis-status";
    status.textContent = "Analysing...";
    actions.appendChild(status);
  }

  return actions.childNodes.length ? actions : null;
}

function renderThread(thread, threadPath) {
  const section = document.createElement("section");
  section.className = `thread-card inline-thread ${thread.kind === "debate" ? "thread-card--debate" : ""}`.trim();
  section.id = `thread-${thread.id}`;

  const header = document.createElement("div");
  header.className = "thread-header";

  const label = document.createElement("span");
  label.className = `thread-label ${thread.kind === "debate" ? "thread-label--debate" : ""}`.trim();
  label.textContent = thread.kind === "debate" ? "Debate thread" : "Focused thread";

  const context = document.createElement("div");
  context.className = "thread-context";
  context.appendChild(label);

  const meta = document.createElement("div");
  meta.className = "thread-meta";

  const summary = document.createElement("span");
  summary.className = "thread-summary";
  summary.textContent = `${thread.messages.length} message${thread.messages.length === 1 ? "" : "s"}`;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "thread-delete";
  deleteButton.dataset.deleteThreadId = thread.id;
  deleteButton.setAttribute("aria-label", "Delete thread");

  const deleteIcon = document.createElement("img");
  deleteIcon.className = "thread-delete-icon";
  deleteIcon.src = "assets/delete-bucket.svg";
  deleteIcon.alt = "";
  deleteIcon.setAttribute("aria-hidden", "true");
  deleteButton.appendChild(deleteIcon);

  meta.append(summary, deleteButton);
  header.append(context, meta);
  section.appendChild(header);

  const body = document.createElement("div");
  body.className = "thread-body";

  if (thread.messages.length === 0) {
    const empty = document.createElement("div");
    empty.className = `thread-empty ${thread.kind === "debate" ? "thread-empty--debate" : ""}`.trim();
    empty.textContent =
      thread.kind === "debate"
        ? "Branchline is building the contrarian case for this excerpt. Keep pulling on the thread once it lands."
        : "Ask about this excerpt to start the branch.";
    body.appendChild(empty);
  } else {
    body.appendChild(renderMessageList(thread.messages, threadPath));
  }

  if (ui.pendingScopes.has(makeScopeKey(getActiveConversation().id, threadPath))) {
    body.appendChild(
      renderTypingIndicator(thread.kind === "debate" ? "Building the contrarian case" : "Thinking inside this branch"),
    );
  }

  body.appendChild(renderThreadComposer(thread, threadPath));
  section.appendChild(body);
  return section;
}

function renderThreadComposer(thread, threadPath) {
  const form = document.createElement("form");
  form.className = "thread-composer";
  form.dataset.threadId = thread.id;
  form.dataset.threadPath = threadPath.join("|");

  const textarea = document.createElement("textarea");
  textarea.rows = 1;
  textarea.placeholder =
    thread.kind === "debate" ? "Challenge the argument, ask for evidence, or test the reasoning..." : "Talk about this section...";
  textarea.value = thread.draft || "";
  textarea.dataset.threadId = thread.id;
  textarea.disabled = ui.pendingScopes.has(makeScopeKey(getActiveConversation().id, threadPath));

  const button = document.createElement("button");
  button.type = "submit";
  button.className = "primary-button";
  button.textContent = "Send";
  button.disabled = ui.pendingScopes.has(makeScopeKey(getActiveConversation().id, threadPath));

  const actions = document.createElement("div");
  actions.className = "composer-actions";
  actions.append(button);

  form.append(textarea, actions);
  return form;
}

function renderTypingIndicator(label) {
  const wrapper = document.createElement("div");
  wrapper.className = "typing-indicator";

  const dots = document.createElement("div");
  dots.className = "typing-dots";
  dots.innerHTML = "<span></span><span></span><span></span>";

  const copy = document.createElement("span");
  copy.className = "typing-copy";
  copy.textContent = label;

  wrapper.append(dots, copy);
  return wrapper;
}

function renderSelectionMenu() {
  if (!ui.selection) {
    dom.selectionMenu.classList.add("hidden");
    dom.selectionMenu.setAttribute("aria-hidden", "true");
    return;
  }

  dom.selectionMenu.classList.remove("hidden");
  dom.selectionMenu.setAttribute("aria-hidden", "false");
  dom.selectionMenu.style.left = `${ui.selection.x}px`;
  dom.selectionMenu.style.top = `${ui.selection.y}px`;
  dom.selectionMenu.style.transform = "translate(-50%, -100%)";
}

function clearSelectionMenu() {
  ui.selection = null;
  renderSelectionMenu();
}

function syncButtonTooltips() {
  document.querySelectorAll("button:not(.conversation-card)").forEach((button) => {
    if (button.hasAttribute("data-no-tooltip")) {
      button.removeAttribute("data-tooltip");
      return;
    }

    const existingLabel = button.dataset.tooltip?.trim();
    const titleLabel = button.getAttribute("title")?.trim();
    const ariaLabel = button.getAttribute("aria-label")?.trim();
    const textLabel = button.querySelector("img, .selection-action-glyph")
      ? ""
      : normalizeWhitespace(button.textContent || "");
    const label = existingLabel || titleLabel || ariaLabel || textLabel;

    if (!label) {
      button.removeAttribute("data-tooltip");
      return;
    }

    button.dataset.tooltip = label;
    if (titleLabel) {
      button.removeAttribute("title");
    }
  });

  if (ui.hoveredTooltipButton && !ui.hoveredTooltipButton.isConnected) {
    hideButtonTooltip();
  }
}

function showButtonTooltip(button) {
  const label = button.dataset.tooltip?.trim();
  if (!label) {
    return;
  }

  ui.hoveredTooltipButton = button;
  dom.buttonTooltip.textContent = label;
  dom.buttonTooltip.classList.remove("hidden");
  dom.buttonTooltip.setAttribute("aria-hidden", "false");
  updateButtonTooltipPosition(button);
}

function updateButtonTooltipPosition(button) {
  const rect = button.getBoundingClientRect();
  const tooltipWidth = dom.buttonTooltip.offsetWidth;
  const tooltipHeight = dom.buttonTooltip.offsetHeight;
  const left = clamp(rect.left + rect.width / 2, 16 + tooltipWidth / 2, window.innerWidth - 16 - tooltipWidth / 2);
  const top = Math.max(rect.top - tooltipHeight - 12, 12);

  dom.buttonTooltip.style.left = `${left}px`;
  dom.buttonTooltip.style.top = `${top}px`;
  dom.buttonTooltip.style.transform = "translateX(-50%) translateY(0)";
}

function hideButtonTooltip() {
  ui.hoveredTooltipButton = null;
  dom.buttonTooltip.classList.add("hidden");
  dom.buttonTooltip.setAttribute("aria-hidden", "true");
}

function renderToasts() {
  dom.toastRegion.innerHTML = "";
  ui.toasts.forEach((toast) => {
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = toast.message;
    dom.toastRegion.appendChild(item);
  });
}

function showToast(message) {
  const toast = {
    id: crypto.randomUUID(),
    message,
  };
  ui.toasts = [...ui.toasts, toast];
  renderToasts();

  const timer = window.setTimeout(() => {
    ui.toasts = ui.toasts.filter((item) => item.id !== toast.id);
    renderToasts();
  }, 3400);

  ui.toastTimers.push(timer);
}

function flushPendingScroll() {
  if (!ui.pendingScrollThreadId) {
    return;
  }

  const node = document.getElementById(`thread-${ui.pendingScrollThreadId}`);
  if (node) {
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  ui.pendingScrollThreadId = null;
}

function autosizeAllTextareas() {
  document.querySelectorAll("textarea").forEach((textarea) => autosizeTextarea(textarea));
}

function autosizeTextarea(textarea) {
  textarea.style.height = "0px";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
}

function buildFormattedTextFragment(text, threads, threadPath = [], compactions = [], favorites = [], analyses = []) {
  const container = document.createElement("div");
  container.className = "markdown-content";
  container.appendChild(buildMarkdownFragment(text));

  applyInlineDecorations(container, threads, threadPath, compactions, favorites);
  refreshCompactOnlyMarkdownBlocks(container);
  applyAnalysisDecorations(container, analyses);

  const fragment = document.createDocumentFragment();
  while (container.firstChild) {
    fragment.appendChild(container.firstChild);
  }

  return fragment;
}

function buildRenderableDecorations(threads, compactions, favorites) {
  const decorations = [
    ...(threads || []).map((thread) => ({ ...thread, kind: "thread" })),
    ...(compactions || []).map((compaction) => ({ ...compaction, kind: "compact" })),
    ...(favorites || []).map((favorite) => ({ ...favorite, kind: "favorite" })),
  ]
    .filter((item) => Number.isInteger(item.startOffset) && Number.isInteger(item.endOffset))
    .slice()
    .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset);

  const renderable = [];
  let lastEnd = -1;

  decorations.forEach((item) => {
    if (item.startOffset < lastEnd || item.endOffset <= item.startOffset) {
      return;
    }

    renderable.push(item);
    lastEnd = item.endOffset;
  });

  return renderable;
}

function buildMarkdownFragment(text) {
  const fragment = document.createDocumentFragment();
  const blocks = parseMarkdownBlocks(text);

  blocks.forEach((block, index) => {
    if (index > 0) {
      fragment.appendChild(document.createTextNode("\n\n"));
    }

    fragment.appendChild(renderMarkdownBlock(block));
  });

  return fragment;
}

function parseMarkdownBlocks(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fenceMatch = line.match(/^```([\w-]+)?\s*$/);
    if (fenceMatch) {
      const language = fenceMatch[1] || "";
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push({ type: "code", language, text: codeLines.join("\n") });
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    if (/^(\s*)([-*+])\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^(\s*)([-*+])\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^(\s*)([-*+])\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    if (/^([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "divider" });
      index += 1;
      continue;
    }

    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/.test(lines[index]) &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^(\s*)([-*+])\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^([-*_])(?:\s*\1){2,}\s*$/.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function renderMarkdownBlock(block) {
  switch (block.type) {
    case "heading":
      return createMarkdownInlineBlock(`md-block md-heading md-heading-${block.level}`, block.text);
    case "paragraph":
      return createMarkdownInlineBlock("md-block md-paragraph", block.text);
    case "blockquote":
      return createMarkdownInlineBlock("md-block md-blockquote", block.text);
    case "list":
      return createMarkdownListBlock(block);
    case "code":
      return createMarkdownCodeBlock(block);
    case "divider": {
      const divider = document.createElement("span");
      divider.className = "md-block md-divider";
      divider.setAttribute("aria-hidden", "true");
      return divider;
    }
    default:
      return createMarkdownInlineBlock("md-block md-paragraph", block.text || "");
  }
}

function createMarkdownInlineBlock(className, text) {
  const block = document.createElement("span");
  block.className = className;
  appendInlineMarkdown(block, text);
  return block;
}

function createMarkdownListBlock(block) {
  const wrapper = document.createElement("span");
  wrapper.className = "md-block md-list";

  block.items.forEach((itemText, index) => {
    if (index > 0) {
      wrapper.appendChild(document.createTextNode("\n"));
    }

    const item = document.createElement("span");
    item.className = "md-list-item";
    item.dataset.marker = block.ordered ? `${index + 1}.` : "\u2022";
    appendInlineMarkdown(item, itemText);
    wrapper.appendChild(item);
  });

  return wrapper;
}

function createMarkdownCodeBlock(block) {
  const wrapper = document.createElement("span");
  wrapper.className = "md-block md-code-block";
  if (block.language) {
    wrapper.dataset.language = block.language;
  }

  const code = document.createElement("code");
  code.textContent = block.text;
  wrapper.appendChild(code);
  return wrapper;
}

function appendInlineMarkdown(parent, text) {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|(\*\*|__)(.+?)\4|(\*|_)(.+?)\6/gs;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parent.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    }

    if (match[1] && match[2]) {
      const link = document.createElement("a");
      link.href = match[2];
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      appendInlineMarkdown(link, match[1]);
      parent.appendChild(link);
    } else if (match[3]) {
      const code = document.createElement("code");
      code.className = "md-inline-code";
      code.textContent = match[3];
      parent.appendChild(code);
    } else if (match[5]) {
      const strong = document.createElement("strong");
      appendInlineMarkdown(strong, match[5]);
      parent.appendChild(strong);
    } else if (match[7]) {
      const emphasis = document.createElement("em");
      appendInlineMarkdown(emphasis, match[7]);
      parent.appendChild(emphasis);
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    parent.appendChild(document.createTextNode(text.slice(cursor)));
  }
}

function applyInlineDecorations(container, threads, threadPath, compactions = [], favorites = []) {
  const decorations = buildRenderableDecorations(threads, compactions, favorites)
    .slice()
    .sort((a, b) => b.startOffset - a.startOffset);

  decorations.forEach((item) => {
    if (item.kind === "compact") {
      renderCompactionIntoMarkdown(container, item);
      return;
    }

    if (item.kind === "favorite") {
      renderFavoriteIntoMarkdown(container, item);
      return;
    }

    renderThreadAnchorIntoMarkdown(container, item, threadPath);
  });
}

function applyAnalysisDecorations(container, analyses = []) {
  const segments = (analyses || [])
    .flatMap((analysis) =>
      (analysis.segments || []).map((segment) => ({
        ...segment,
        analysisId: analysis.id,
        prompt: analysis.prompt,
      })),
    )
    .sort((a, b) => b.startOffset - a.startOffset || b.endOffset - a.endOffset);

  segments.forEach((segment) => {
    renderAnalysisSegmentIntoMarkdown(container, segment);
  });
}

function renderFavoriteIntoMarkdown(container, favorite) {
  const start = locateRenderableTextPosition(container, favorite.startOffset, "start");
  const end = locateRenderableTextPosition(container, favorite.endOffset, "end");
  if (!start || !end) {
    return;
  }

  const isolated = isolateRenderableTextRange(start, end);
  if (!isolated) {
    return;
  }

  const textNodes = collectRenderableTextNodes(container, isolated.startNode, isolated.endNode);
  if (!textNodes.length) {
    return;
  }

  let lastMarker = null;
  textNodes.forEach((node) => {
    const marker = document.createElement("span");
    marker.className = "favorite-inline-anchor";
    marker.dataset.favoriteId = favorite.id;
    marker.textContent = node.data;
    node.replaceWith(marker);
    lastMarker = marker;
  });

  if (!lastMarker) {
    return;
  }

  const indicator = document.createElement("span");
  indicator.className = "favorite-inline-indicator";
  indicator.dataset.favoriteIndicator = favorite.id;
  indicator.setAttribute("aria-hidden", "true");
  lastMarker.after(indicator);
}

function renderCompactionIntoMarkdown(container, compaction) {
  const start = locateRenderableTextPosition(container, compaction.startOffset, "start");
  const end = locateRenderableTextPosition(container, compaction.endOffset, "end");
  if (!start || !end) {
    return;
  }

  const isolated = isolateRenderableTextRange(start, end);
  if (!isolated) {
    return;
  }

  const textNodes = collectRenderableTextNodes(container, isolated.startNode, isolated.endNode);
  if (!textNodes.length) {
    return;
  }

  markCompactionAffectedMarkdownBlocks(textNodes);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "compact-inline-button";
  button.dataset.compactionToggle = compaction.id;
  button.dataset.sourceLength = String(compaction.endOffset - compaction.startOffset);
  button.setAttribute("aria-label", "Expand compacted text");
  button.textContent = "...";

  textNodes[0].replaceWith(button);
  textNodes.slice(1).forEach((node) => node.remove());
}

function refreshCompactOnlyMarkdownBlocks(container) {
  container.querySelectorAll(".md-list-item, .md-blockquote").forEach((block) => {
    const wasAffectedByCompaction = block.dataset.compactionAffected === "true";
    const hasCompactButton = Boolean(block.querySelector("button[data-compaction-toggle]"));
    const isCompactOnly = wasAffectedByCompaction && isCompactOnlyContent(block);

    block.classList.toggle("is-compact-only", isCompactOnly);
    block.classList.toggle("is-compact-collapsed", isCompactOnly && !hasCompactButton);
  });

  container.querySelectorAll(".md-list").forEach((list) => {
    collapseCompactedMarkdownListItems(list);
  });
}

function isCompactOnlyContent(node) {
  return Array.from(node.childNodes).every((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      return !child.data.trim();
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      return true;
    }

    if (child.matches("button[data-compaction-toggle]")) {
      return true;
    }

    return isCompactOnlyContent(child);
  });
}

function markCompactionAffectedMarkdownBlocks(textNodes) {
  textNodes.forEach((node) => {
    const parentBlock = node.parentElement?.closest(".md-list-item, .md-blockquote");
    if (parentBlock) {
      parentBlock.dataset.compactionAffected = "true";
    }
  });
}

function collapseCompactedMarkdownListItems(list) {
  const visibleItems = Array.from(list.children).filter(
    (child) =>
      child.classList.contains("md-list-item") && !child.classList.contains("is-compact-collapsed"),
  );

  list.replaceChildren();

  visibleItems.forEach((item, index) => {
    if (index > 0) {
      list.appendChild(document.createTextNode("\n"));
    }
    list.appendChild(item);
  });
}

function renderAnalysisSegmentIntoMarkdown(container, segment) {
  const start = locateRenderableTextPosition(container, segment.startOffset, "start");
  const end = locateRenderableTextPosition(container, segment.endOffset, "end");
  if (!start || !end) {
    return;
  }

  const isolated = isolateRenderableTextRange(start, end);
  if (!isolated) {
    return;
  }

  const textNodes = collectRenderableTextNodes(container, isolated.startNode, isolated.endNode);
  if (!textNodes.length) {
    return;
  }

  textNodes.forEach((node) => {
    const mark = document.createElement("span");
    mark.className = "analysis-highlight";
    mark.dataset.analysisId = segment.analysisId;
    mark.dataset.analysisPrompt = segment.prompt;
    mark.style.setProperty("--analysis-strength", clamp(segment.score, 0.12, 1).toFixed(2));
    mark.textContent = node.data;
    node.replaceWith(mark);
  });
}

function renderThreadAnchorIntoMarkdown(container, thread, threadPath) {
  const start = locateRenderableTextPosition(container, thread.startOffset, "start");
  const end = locateRenderableTextPosition(container, thread.endOffset, "end");
  if (!start || !end) {
    return;
  }

  const isolated = isolateRenderableTextRange(start, end);
  if (!isolated) {
    return;
  }

  const textNodes = collectRenderableTextNodes(container, isolated.startNode, isolated.endNode);
  if (!textNodes.length) {
    return;
  }

  let lastMark = null;
  textNodes.forEach((node) => {
    const mark = document.createElement("mark");
    mark.className = [
      "anchor-highlight",
      thread.collapsed ? "is-collapsed" : "is-open",
      thread.kind === "debate" ? "anchor-highlight--debate" : "",
    ]
      .filter(Boolean)
      .join(" ");
    mark.dataset.threadId = thread.id;
    mark.dataset.threadGenerated = "true";
    mark.title = thread.collapsed ? "Open focused thread" : "Close focused thread";
    mark.textContent = node.data;
    node.replaceWith(mark);
    lastMark = mark;
  });

  if (!lastMark) {
    return;
  }

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = ["thread-toggle", "thread-inline-toggle", thread.kind === "debate" ? "thread-inline-toggle--debate" : ""]
    .filter(Boolean)
    .join(" ");
  toggle.dataset.threadToggle = thread.id;
  toggle.dataset.threadGenerated = "true";
  toggle.setAttribute("aria-expanded", String(!thread.collapsed));
  toggle.setAttribute("aria-label", thread.collapsed ? "Open focused thread" : "Close focused thread");
  toggle.textContent = thread.collapsed ? "+" : "-";
  lastMark.after(toggle);

  if (!thread.collapsed) {
    toggle.after(renderThread(thread, [...threadPath, thread.id]));
  }
}

function createRenderableTextWalker(root) {
  return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.data.length) {
        return NodeFilter.FILTER_REJECT;
      }

      if (node.parentElement?.closest("[data-thread-generated='true'], .thread-card")) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });
}

function locateRenderableTextPosition(container, targetOffset, bias = "start") {
  const walker = createRenderableTextWalker(container);
  let traversed = 0;
  let lastNode = null;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const nextTraversed = traversed + node.data.length;

    const isBoundary = targetOffset === nextTraversed;
    if (targetOffset < nextTraversed || (bias === "end" && isBoundary)) {
      return { node, offset: targetOffset - traversed };
    }

    traversed = nextTraversed;
    lastNode = node;
  }

  if (lastNode) {
    return { node: lastNode, offset: lastNode.data.length };
  }

  return null;
}

function isolateRenderableTextRange(start, end) {
  if (!start.node || !end.node || (start.node === end.node && start.offset === end.offset)) {
    return null;
  }

  if (start.node === end.node) {
    const node = start.node;
    if (end.offset < node.data.length) {
      node.splitText(end.offset);
    }

    const selectedNode = start.offset > 0 ? node.splitText(start.offset) : node;
    return { startNode: selectedNode, endNode: selectedNode };
  }

  if (end.offset < end.node.data.length) {
    end.node.splitText(end.offset);
  }

  const startNode = start.offset > 0 ? start.node.splitText(start.offset) : start.node;
  return { startNode, endNode: end.node };
}

function collectRenderableTextNodes(container, startNode, endNode) {
  const nodes = [];
  const walker = createRenderableTextWalker(container);
  let isCollecting = false;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node === startNode) {
      isCollecting = true;
    }

    if (isCollecting) {
      nodes.push(node);
    }

    if (node === endNode) {
      break;
    }
  }

  return nodes;
}

function buildConversationPreview(conversation) {
  const allMessages = flattenMessages(conversation.messages);
  const latest = [...allMessages].reverse().find((message) => message.content);
  if (!latest) {
    return "Start a new conversation";
  }

  return truncate(getPlainText(latest.content).replace(/\s+/g, " "), 72);
}

function flattenMessages(messages) {
  const result = [];
  messages.forEach((message) => {
    result.push(message);
    (message.threads || []).forEach((thread) => {
      result.push(...flattenMessages(thread.messages));
    });
  });
  return result;
}

function getScopeTarget(conversation, threadPath) {
  if (!threadPath.length) {
    return conversation;
  }

  const thread = findThreadById(conversation.messages, threadPath[threadPath.length - 1]);
  return thread || null;
}

function getActiveConversation() {
  return state.conversations.find((conversation) => conversation.id === state.activeConversationId) || null;
}

function findMessageById(messages, messageId) {
  for (const message of messages) {
    if (message.id === messageId) {
      return message;
    }

    for (const thread of message.threads || []) {
      const nested = findMessageById(thread.messages, messageId);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function findThreadById(messages, threadId) {
  for (const message of messages) {
    for (const thread of message.threads || []) {
      if (thread.id === threadId) {
        return thread;
      }

      const nested = findThreadById(thread.messages, threadId);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function removeThreadById(messages, threadId) {
  for (const message of messages) {
    const threads = message.threads || [];
    const matchIndex = threads.findIndex((thread) => thread.id === threadId);
    if (matchIndex >= 0) {
      threads.splice(matchIndex, 1);
      return true;
    }

    for (const thread of threads) {
      if (removeThreadById(thread.messages, threadId)) {
        return true;
      }
    }
  }

  return false;
}

function findSelectionMessageText(range) {
  const common = range.commonAncestorContainer;
  const element = common.nodeType === Node.ELEMENT_NODE ? common : common.parentElement;
  const messageText = element?.closest(".message-text");
  const message = messageText?.closest(".message");
  if (!messageText || !message || message.dataset.role !== "assistant") {
    return null;
  }

  if (!messageText.contains(range.startContainer) || !messageText.contains(range.endContainer)) {
    return null;
  }

  return messageText;
}

function getRangeOffsets(container, range) {
  return {
    start: getSourceOffsetForBoundary(container, range.startContainer, range.startOffset),
    end: getSourceOffsetForBoundary(container, range.endContainer, range.endOffset),
  };
}

function getSourceOffsetForBoundary(root, targetNode, targetOffset) {
  const state = {
    offset: 0,
    found: false,
  };

  walkSourceNodes(root, targetNode, targetOffset, state);
  return state.offset;
}

function walkSourceNodes(node, targetNode, targetOffset, state) {
  if (state.found) {
    return;
  }

  if (node === targetNode) {
    if (node.nodeType === Node.TEXT_NODE) {
      state.offset += targetOffset;
      state.found = true;
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const limit = Math.min(targetOffset, node.childNodes.length);
      for (let index = 0; index < limit; index += 1) {
        state.offset += measureSourceLength(node.childNodes[index]);
      }
      state.found = true;
    }
    return;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    state.offset += node.data.length;
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  if (isZeroLengthSourceNode(node)) {
    return;
  }

  if (isCompactionToggleNode(node)) {
    state.offset += measureSourceLength(node);
    return;
  }

  Array.from(node.childNodes).some((child) => {
    walkSourceNodes(child, targetNode, targetOffset, state);
    return state.found;
  });
}

function measureSourceLength(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.data.length;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return 0;
  }

  if (isCompactionToggleNode(node)) {
    return Number(node.dataset.sourceLength) || 0;
  }

  if (isZeroLengthSourceNode(node)) {
    return 0;
  }

  return Array.from(node.childNodes).reduce((total, child) => total + measureSourceLength(child), 0);
}

function isCompactionToggleNode(node) {
  return node.matches?.("button[data-compaction-toggle]");
}

function isZeroLengthSourceNode(node) {
  return node.matches?.(".thread-card, button[data-thread-toggle]");
}

function findOverlappingThread(threads, startOffset, endOffset) {
  return (threads || []).find(
    (thread) => thread.startOffset < endOffset && thread.endOffset > startOffset,
  );
}

function findOverlappingCompaction(compactions, startOffset, endOffset) {
  return (compactions || []).find(
    (compaction) => compaction.startOffset < endOffset && compaction.endOffset > startOffset,
  );
}

function findOverlappingAnalysis(analyses, startOffset, endOffset) {
  return (analyses || []).find(
    (analysis) => analysis.startOffset < endOffset && analysis.endOffset > startOffset,
  );
}

function findOverlappingFavorite(favorites, startOffset, endOffset) {
  return (favorites || []).find(
    (favorite) => favorite.startOffset < endOffset && favorite.endOffset > startOffset,
  );
}

function isSameAnchor(thread, startOffset, endOffset, selectedText) {
  return (
    thread.startOffset === startOffset &&
    thread.endOffset === endOffset &&
    normalizeWhitespace(thread.anchorText) === normalizeWhitespace(selectedText)
  );
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function getPlainText(value) {
  const container = document.createElement("div");
  container.appendChild(buildMarkdownFragment(value));
  return container.textContent || "";
}

function parseThreadPath(path) {
  if (!path) {
    return [];
  }

  return path.split("|").filter(Boolean);
}

function createConversation() {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    draft: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createMessage(role, content) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    threads: [],
    compactions: [],
    analyses: [],
    createdAt: new Date().toISOString(),
  };
}

function getMessageFavorites(conversationId, messageId) {
  return (state.favorites || []).filter(
    (favorite) => favorite.conversationId === conversationId && favorite.messageId === messageId,
  );
}

function createThread({ anchorText, anchorMessageId, startOffset, endOffset, kind = "branch" }) {
  return {
    id: crypto.randomUUID(),
    anchorText,
    anchorMessageId,
    startOffset,
    endOffset,
    kind,
    collapsed: false,
    messages: [],
    draft: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createCompaction({ compactedText, startOffset, endOffset }) {
  return {
    id: crypto.randomUUID(),
    compactedText,
    startOffset,
    endOffset,
    createdAt: new Date().toISOString(),
  };
}

function createAnalysis({ prompt, selectedText, startOffset, endOffset, segments }) {
  return {
    id: crypto.randomUUID(),
    prompt,
    selectedText,
    startOffset,
    endOffset,
    segments,
    createdAt: new Date().toISOString(),
  };
}

function createFavorite({ conversationId, messageId, selectedText, startOffset, endOffset }) {
  return {
    id: crypto.randomUUID(),
    conversationId,
    messageId,
    selectedText,
    startOffset,
    endOffset,
    createdAt: new Date().toISOString(),
  };
}

function touchConversation(conversation) {
  conversation.updatedAt = new Date().toISOString();
}

function summarizeTitle(text) {
  const trimmed = normalizeWhitespace(text);
  return truncate(trimmed || "New chat", 42);
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function estimateConversationCost(conversation, pricing) {
  const messages = flattenMessages(conversation.messages);
  const inputTokens = messages
    .filter((message) => message.role === "user")
    .reduce((total, message) => total + estimateTokens(message.content), 0);
  const outputTokens = messages
    .filter((message) => message.role === "assistant")
    .reduce((total, message) => total + estimateTokens(message.content), 0);

  return (inputTokens / 1000000) * pricing.input + (outputTokens / 1000000) * pricing.output;
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(getPlainText(text).length / 4));
}

function formatPrice(value) {
  return Number(value).toFixed(value >= 1 ? 2 : value >= 0.1 ? 2 : 3).replace(/\.00$/, "");
}

function formatTinyPrice(value) {
  if (value === 0) {
    return "0.0000";
  }

  if (value < 0.01) {
    return value.toFixed(4);
  }

  return value.toFixed(3);
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFavoriteConversationTitle(favorite) {
  const conversation = state.conversations.find((item) => item.id === favorite.conversationId);
  return conversation?.title || "Saved snippet";
}

function formatFavoriteMeta(favorite) {
  return `${truncate(normalizeWhitespace(favorite.selectedText), 72)} · ${formatDateTime(favorite.createdAt)}`;
}

function countMessages(messages) {
  return flattenMessages(messages).length;
}

function countThreads(messages) {
  let total = 0;
  messages.forEach((message) => {
    total += (message.threads || []).length;
    (message.threads || []).forEach((thread) => {
      total += countThreads(thread.messages);
    });
  });
  return total;
}

function makeScopeKey(conversationId, threadPath) {
  return `${conversationId}:${threadPath.join(">") || "root"}`;
}

function makeAnalysisScopeKey(conversationId, messageId) {
  return `${conversationId}:analysis:${messageId}`;
}

function supportsReasoning(model) {
  return model.startsWith("gpt-5");
}

function sortByUpdatedAt(a, b) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function sortByCreatedAt(a, b) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function loadState() {
  const fallback = createFreshState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    console.warn("Failed to load state.", error);
    return fallback;
  }
}

function createFreshState() {
  const conversation = createConversation();
  return {
    settings: {
      apiKey: "",
      apiKeyVisible: false,
      model: DEFAULT_MODELS[0],
      thinking: "medium",
    },
    favorites: [],
    conversations: [conversation],
    activeConversationId: conversation.id,
  };
}

function normalizeState(candidate) {
  const base = createFreshState();
  const settings = candidate?.settings || {};
  const conversations =
    Array.isArray(candidate?.conversations) && candidate.conversations.length
      ? candidate.conversations.map(normalizeConversation)
      : base.conversations;
  const activeConversationId = conversations.some(
    (conversation) => conversation.id === candidate?.activeConversationId,
  )
    ? candidate.activeConversationId
    : conversations[0].id;

  return {
    settings: {
      apiKey: typeof settings.apiKey === "string" ? settings.apiKey : "",
      apiKeyVisible: Boolean(settings.apiKeyVisible),
      model: DEFAULT_MODELS.includes(settings.model) ? settings.model : DEFAULT_MODELS[0],
      thinking: DEFAULT_THINKING.includes(settings.thinking) ? settings.thinking : "medium",
    },
    favorites: Array.isArray(candidate?.favorites) ? candidate.favorites.map(normalizeFavorite) : [],
    conversations,
    activeConversationId,
  };
}

function normalizeConversation(conversation) {
  return {
    id: typeof conversation.id === "string" ? conversation.id : crypto.randomUUID(),
    title: typeof conversation.title === "string" && conversation.title ? conversation.title : "New chat",
    draft: typeof conversation.draft === "string" ? conversation.draft : "",
    messages: Array.isArray(conversation.messages) ? conversation.messages.map(normalizeMessage) : [],
    createdAt: conversation.createdAt || new Date().toISOString(),
    updatedAt: conversation.updatedAt || conversation.createdAt || new Date().toISOString(),
  };
}

function normalizeMessage(message) {
  return {
    id: typeof message.id === "string" ? message.id : crypto.randomUUID(),
    role: message.role === "assistant" ? "assistant" : "user",
    content: typeof message.content === "string" ? message.content : "",
    threads: Array.isArray(message.threads) ? message.threads.map(normalizeThread) : [],
    compactions: Array.isArray(message.compactions) ? message.compactions.map(normalizeCompaction) : [],
    analyses: Array.isArray(message.analyses) ? message.analyses.map(normalizeAnalysis) : [],
    createdAt: message.createdAt || new Date().toISOString(),
  };
}

function normalizeThread(thread) {
  return {
    id: typeof thread.id === "string" ? thread.id : crypto.randomUUID(),
    anchorText: typeof thread.anchorText === "string" ? thread.anchorText : "",
    anchorMessageId: typeof thread.anchorMessageId === "string" ? thread.anchorMessageId : "",
    startOffset: Number.isInteger(thread.startOffset) ? thread.startOffset : 0,
    endOffset: Number.isInteger(thread.endOffset) ? thread.endOffset : 0,
    kind: thread.kind === "debate" ? "debate" : "branch",
    collapsed: Boolean(thread.collapsed),
    messages: Array.isArray(thread.messages) ? thread.messages.map(normalizeMessage) : [],
    draft: typeof thread.draft === "string" ? thread.draft : "",
    createdAt: thread.createdAt || new Date().toISOString(),
    updatedAt: thread.updatedAt || thread.createdAt || new Date().toISOString(),
  };
}

function normalizeCompaction(compaction) {
  return {
    id: typeof compaction.id === "string" ? compaction.id : crypto.randomUUID(),
    compactedText: typeof compaction.compactedText === "string" ? compaction.compactedText : "",
    startOffset: Number.isInteger(compaction.startOffset) ? compaction.startOffset : 0,
    endOffset: Number.isInteger(compaction.endOffset) ? compaction.endOffset : 0,
    createdAt: compaction.createdAt || new Date().toISOString(),
  };
}

function normalizeAnalysis(analysis) {
  return {
    id: typeof analysis.id === "string" ? analysis.id : crypto.randomUUID(),
    prompt: typeof analysis.prompt === "string" ? analysis.prompt : "",
    selectedText: typeof analysis.selectedText === "string" ? analysis.selectedText : "",
    startOffset: Number.isInteger(analysis.startOffset) ? analysis.startOffset : 0,
    endOffset: Number.isInteger(analysis.endOffset) ? analysis.endOffset : 0,
    segments: normalizeAnalysisSegments(analysis.segments, typeof analysis.selectedText === "string" ? analysis.selectedText : "", Number.isInteger(analysis.startOffset) ? analysis.startOffset : 0),
    createdAt: analysis.createdAt || new Date().toISOString(),
  };
}

function normalizeFavorite(favorite) {
  return {
    id: typeof favorite.id === "string" ? favorite.id : crypto.randomUUID(),
    conversationId: typeof favorite.conversationId === "string" ? favorite.conversationId : "",
    messageId: typeof favorite.messageId === "string" ? favorite.messageId : "",
    selectedText: typeof favorite.selectedText === "string" ? favorite.selectedText : "",
    startOffset: Number.isInteger(favorite.startOffset) ? favorite.startOffset : 0,
    endOffset: Number.isInteger(favorite.endOffset) ? favorite.endOffset : 0,
    createdAt: favorite.createdAt || new Date().toISOString(),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearNativeSelection() {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeAnalysisSegments(source, selectedText, baseOffset) {
  const rawSegments = Array.isArray(source) ? source : Array.isArray(source?.segments) ? source.segments : [];
  const result = [];
  let lastEnd = -1;

  rawSegments
    .map((segment) => ({
      start:
        Number.isFinite(segment?.startOffset) && Number.isFinite(segment?.endOffset)
          ? Math.floor(segment.startOffset - baseOffset)
          : Number.isFinite(segment?.start)
            ? Math.floor(segment.start)
            : NaN,
      end:
        Number.isFinite(segment?.startOffset) && Number.isFinite(segment?.endOffset)
          ? Math.floor(segment.endOffset - baseOffset)
          : Number.isFinite(segment?.end)
            ? Math.floor(segment.end)
            : NaN,
      score: Number.isFinite(segment?.score)
        ? Number(segment.score)
        : Number.isFinite(segment?.intensity)
          ? Number(segment.intensity)
          : Number.isFinite(segment?.strength)
            ? Number(segment.strength)
            : NaN,
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .forEach((segment) => {
      if (!Number.isInteger(segment.start) || !Number.isInteger(segment.end)) {
        return;
      }

      const boundedStart = clamp(segment.start, 0, selectedText.length);
      const boundedEnd = clamp(segment.end, 0, selectedText.length);
      if (boundedEnd <= boundedStart || boundedStart < lastEnd) {
        return;
      }

      if (!selectedText.slice(boundedStart, boundedEnd).trim()) {
        return;
      }

      result.push({
        startOffset: baseOffset + boundedStart,
        endOffset: baseOffset + boundedEnd,
        score: clamp(Number.isFinite(segment.score) ? segment.score : 0.5, 0.08, 1),
      });
      lastEnd = boundedEnd;
    });

  return result;
}

function parseJsonResponse(text) {
  const candidates = [text.trim()];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.push(fenced[1].trim());
  }

  const extracted = extractFirstJsonBlock(text);
  if (extracted) {
    candidates.push(extracted);
  }

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return JSON.parse(candidate);
    } catch (error) {
      continue;
    }
  }

  return null;
}

function extractFirstJsonBlock(text) {
  let startIndex = -1;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "{" || text[index] === "[") {
      startIndex = index;
      break;
    }
  }

  if (startIndex < 0) {
    return "";
  }

  const opener = text[startIndex];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (character === "\\") {
        isEscaped = true;
        continue;
      }

      if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === opener) {
      depth += 1;
      continue;
    }

    if (character === closer) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return "";
}

function extractResponseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  if (Array.isArray(data.output)) {
    const parts = [];
    data.output.forEach((item) => {
      if (item.type !== "message" || !Array.isArray(item.content)) {
        return;
      }

      item.content.forEach((content) => {
        if (content.type === "output_text" && typeof content.text === "string") {
          parts.push(content.text);
        }

        if (content.type === "text" && typeof content.text === "string") {
          parts.push(content.text);
        }
      });
    });

    if (parts.length) {
      return parts.join("\n");
    }
  }

  const fallback = data?.choices?.[0]?.message?.content;
  if (typeof fallback === "string") {
    return fallback;
  }

  if (Array.isArray(fallback)) {
    return fallback
      .map((item) => item?.text || item?.content || "")
      .join("\n")
      .trim();
  }

  return "";
}
