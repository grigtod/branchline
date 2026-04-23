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
  selectionMenu: document.getElementById("selection-menu"),
  selectionThreadButton: document.getElementById("selection-thread-button"),
  selectionDismissButton: document.getElementById("selection-dismiss-button"),
  toastRegion: document.getElementById("toast-region"),
};

const ui = {
  appEntered: !ENABLE_LANDING_PAGE,
  pendingScopes: new Set(),
  selection: null,
  settingsOpen: false,
  sidebarCollapsed: false,
  pendingScrollThreadId: null,
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
  dom.selectionThreadButton.addEventListener("click", handleSelectionThreadAction);
  dom.selectionDismissButton.addEventListener("click", clearSelectionMenu);
  document.addEventListener("mouseup", handleSelectionCandidate);
  document.addEventListener("keyup", handleSelectionCandidate);
  document.addEventListener("mousedown", handleOutsidePointerDown);
  document.addEventListener("keydown", handleDocumentKeydown);
  window.addEventListener("scroll", clearSelectionMenu, true);
  window.addEventListener("resize", clearSelectionMenu);
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
  if (event.key === "Escape" && ui.settingsOpen) {
    event.preventDefault();
    closeSettingsPage();
  }
}

function handleChatViewClick(event) {
  const conversation = getActiveConversation();
  if (!conversation) {
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

function buildApiInput(conversation, threadPath) {
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
          text:
            `Thread focus ${index + 1}: the user opened a side discussion about this excerpt from an earlier assistant reply:\n"""` +
            `\n${thread.anchorText}\n"""` +
            "\nStay grounded in the full main conversation while focusing on this passage and the thread that follows.",
        },
      ],
    });
    appendMessageListToInput(input, thread.messages);
  });

  return input;
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
  renderAppFrame();
  renderLandingPage();
  renderSettings();
  renderPricing();
  renderSidebar();
  renderHeader();
  renderConversation();
  renderSelectionMenu();
  renderToasts();
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
  document.body.classList.toggle("settings-open", showSettings);
}

function renderLandingPage() {
  dom.landingStage.innerHTML = "";
  dom.landingStage.appendChild(buildLandingHero());
}

function openSettingsPage() {
  ui.settingsOpen = true;
  renderSettings();
  window.requestAnimationFrame(() => {
    dom.apiKeyInput.focus();
  });
}

function closeSettingsPage() {
  ui.settingsOpen = false;
  renderSettings();
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

  controls.append(dom.toggleFullscreenButton, dom.openSettingsButton);
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

  const body = document.createElement("div");
  body.className = "message-text";
  body.dataset.messageId = message.id;
  body.dataset.threadPath = threadPath.join("|");

  if (message.role === "assistant") {
    body.appendChild(buildFormattedTextFragment(message.content, message.threads || [], threadPath));
  } else {
    body.appendChild(buildFormattedTextFragment(message.content, [], threadPath));
  }

  shell.append(meta, body);
  wrapper.appendChild(shell);

  return wrapper;
}

function renderThread(thread, threadPath) {
  const section = document.createElement("section");
  section.className = "thread-card inline-thread";
  section.id = `thread-${thread.id}`;

  const header = document.createElement("div");
  header.className = "thread-header";

  const label = document.createElement("span");
  label.className = "thread-label";
  label.textContent = "Focused thread";

  const context = document.createElement("div");
  context.className = "thread-context";
  context.appendChild(label);

  const meta = document.createElement("div");
  meta.className = "thread-meta";

  const summary = document.createElement("span");
  summary.className = "thread-summary";
  summary.textContent = `${thread.messages.length} message${thread.messages.length === 1 ? "" : "s"}`;

  meta.appendChild(summary);
  header.append(context, meta);
  section.appendChild(header);

  const body = document.createElement("div");
  body.className = "thread-body";

  if (thread.messages.length === 0) {
    const empty = document.createElement("div");
    empty.className = "thread-empty";
    empty.textContent = "Ask about this excerpt to start the branch.";
    body.appendChild(empty);
  } else {
    body.appendChild(renderMessageList(thread.messages, threadPath));
  }

  if (ui.pendingScopes.has(makeScopeKey(getActiveConversation().id, threadPath))) {
    body.appendChild(renderTypingIndicator("Thinking inside this branch"));
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
  textarea.placeholder = "Talk about this section...";
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
  dom.selectionThreadButton.textContent = ui.selection.action === "open" ? "Open thread" : "Talk about this";
}

function clearSelectionMenu() {
  ui.selection = null;
  renderSelectionMenu();
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

function buildFormattedTextFragment(text, threads, threadPath = []) {
  const fragment = document.createDocumentFragment();
  const parts = parseSimpleMarkdown(text);
  const anchors = buildRenderableAnchors(threads);
  let cursor = 0;

  anchors.forEach((thread) => {
    if (thread.startOffset > cursor) {
      appendFormattedRange(fragment, parts, cursor, thread.startOffset);
    }

    fragment.appendChild(renderInlineThreadAnchor(thread, parts));
    if (!thread.collapsed) {
      fragment.appendChild(renderThread(thread, [...threadPath, thread.id]));
    }
    cursor = thread.endOffset;
  });

  const displayLength = getDisplayTextLength(parts);
  if (cursor < displayLength) {
    appendFormattedRange(fragment, parts, cursor, displayLength);
  }

  return fragment;
}

function renderInlineThreadAnchor(thread, parts) {
  const wrapper = document.createElement("span");
  wrapper.className = "anchor-inline";

  const mark = document.createElement("mark");
  mark.className = `anchor-highlight ${thread.collapsed ? "is-collapsed" : "is-open"}`;
  mark.dataset.threadId = thread.id;
  mark.title = thread.collapsed ? "Open focused thread" : "Close focused thread";
  appendFormattedRange(mark, parts, thread.startOffset, thread.endOffset);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "thread-toggle thread-inline-toggle";
  toggle.dataset.threadToggle = thread.id;
  toggle.setAttribute("aria-expanded", String(!thread.collapsed));
  toggle.setAttribute("aria-label", thread.collapsed ? "Open focused thread" : "Close focused thread");
  toggle.textContent = thread.collapsed ? "+" : "-";

  wrapper.append(mark, toggle);
  return wrapper;
}

function buildRenderableAnchors(threads) {
  const anchors = (threads || [])
    .filter((thread) => Number.isInteger(thread.startOffset) && Number.isInteger(thread.endOffset))
    .slice()
    .sort((a, b) => a.startOffset - b.startOffset);

  const renderable = [];
  let lastEnd = -1;

  anchors.forEach((thread) => {
    if (thread.startOffset < lastEnd || thread.endOffset <= thread.startOffset) {
      return;
    }

    renderable.push(thread);
    lastEnd = thread.endOffset;
  });

  return renderable;
}

function parseSimpleMarkdown(text) {
  const parts = [];
  const pattern = /(\*\*|__)(.+?)\1/gs;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push({ strong: false, text: text.slice(cursor, match.index) });
    }

    parts.push({ strong: true, text: match[2] });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    parts.push({ strong: false, text: text.slice(cursor) });
  }

  return parts.length ? parts : [{ strong: false, text }];
}

function appendFormattedRange(parent, parts, start, end) {
  if (end <= start) {
    return;
  }

  let cursor = 0;
  parts.forEach((part) => {
    const nextCursor = cursor + part.text.length;
    const sliceStart = Math.max(start, cursor);
    const sliceEnd = Math.min(end, nextCursor);

    if (sliceEnd > sliceStart) {
      const text = part.text.slice(sliceStart - cursor, sliceEnd - cursor);
      const node = part.strong ? document.createElement("strong") : document.createTextNode(text);
      if (part.strong) {
        node.textContent = text;
      }
      parent.appendChild(node);
    }

    cursor = nextCursor;
  });
}

function getDisplayTextLength(parts) {
  return parts.reduce((total, part) => total + part.text.length, 0);
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
  const startRange = range.cloneRange();
  startRange.selectNodeContents(container);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = range.cloneRange();
  endRange.selectNodeContents(container);
  endRange.setEnd(range.endContainer, range.endOffset);

  return {
    start: startRange.toString().length,
    end: endRange.toString().length,
  };
}

function findOverlappingThread(threads, startOffset, endOffset) {
  return (threads || []).find(
    (thread) => thread.startOffset < endOffset && thread.endOffset > startOffset,
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
  return parseSimpleMarkdown(value)
    .map((part) => part.text)
    .join("");
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
    createdAt: new Date().toISOString(),
  };
}

function createThread({ anchorText, anchorMessageId, startOffset, endOffset }) {
  return {
    id: crypto.randomUUID(),
    anchorText,
    anchorMessageId,
    startOffset,
    endOffset,
    collapsed: false,
    messages: [],
    draft: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    collapsed: Boolean(thread.collapsed),
    messages: Array.isArray(thread.messages) ? thread.messages.map(normalizeMessage) : [],
    draft: typeof thread.draft === "string" ? thread.draft : "",
    createdAt: thread.createdAt || new Date().toISOString(),
    updatedAt: thread.updatedAt || thread.createdAt || new Date().toISOString(),
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
