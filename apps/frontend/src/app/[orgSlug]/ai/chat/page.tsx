'use client';

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Bot, Send, Plus, Search, Pin, Folder, MessageSquare, Trash2, Edit2,
  Copy, RefreshCw, Square, Zap, Cpu, Sparkles, BookOpen, ChevronDown,
  FolderPlus, Check, X, Shield, FileCode, Sliders, ArrowDown
} from 'lucide-react';

const MODEL_OPTIONS = [
  { provider: 'OPENAI', model: 'gpt-4o', label: 'GPT-4o (OpenAI Omni)', badge: 'bg-emerald-500/10 text-emerald-600' },
  { provider: 'OPENAI', model: 'gpt-4o-mini', label: 'GPT-4o Mini', badge: 'bg-emerald-500/10 text-emerald-600' },
  { provider: 'ANTHROPIC', model: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet (Anthropic)', badge: 'bg-amber-500/10 text-amber-600' },
  { provider: 'GEMINI', model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Google)', badge: 'bg-blue-500/10 text-blue-600' },
  { provider: 'DEEPSEEK', model: 'deepseek-chat', label: 'DeepSeek V3 Chat', badge: 'bg-cyan-500/10 text-cyan-600' },
  { provider: 'OLLAMA', model: 'llama3', label: 'Ollama Llama 3 (Local)', badge: 'bg-purple-500/10 text-purple-600' },
];

export default function AIChatPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;

  // Conversations & Folders
  const [conversations, setConversations] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);

  // Selection & Form State
  const [selectedModelObj, setSelectedModelObj] = useState(MODEL_OPTIONS[0]);
  const [inputContent, setInputContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [providerUnconfigured, setProviderUnconfigured] = useState(false);

  // Modals & UI Controls
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isPromptPickerOpen, setIsPromptPickerOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversationsAndFolders = async () => {
    setLoading(true);
    setApiError(null);
    setProviderUnconfigured(false);
    try {
      const [convsRes, foldersRes, promptsRes] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/ai/chat/conversations`),
        apiFetch(`/organizations/${orgSlug}/ai/chat/folders`),
        apiFetch(`/organizations/${orgSlug}/prompts`).catch(() => []),
      ]);
      setConversations(convsRes || []);
      setFolders(foldersRes || []);
      setPrompts(promptsRes || []);

      // Check if any AI providers are configured
      try {
        const providersRes = await apiFetch(`/organizations/${orgSlug}/ai/providers`);
        if (!providersRes || providersRes.length === 0) {
          setProviderUnconfigured(true);
        }
      } catch { /* provider check failure is non-blocking */ }

      if (convsRes && convsRes.length > 0 && !activeConversation) {
        selectConversation(convsRes[0]);
      }
    } catch (err: any) {
      console.error('Failed to load chat data:', err);
      setApiError(err?.message || 'Failed to connect to AI Chat service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversationsAndFolders();
  }, [orgSlug]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const selectConversation = async (conv: any) => {
    setActiveConversation(conv);
    const foundModel = MODEL_OPTIONS.find((m) => m.model === conv.model) || MODEL_OPTIONS[0];
    setSelectedModelObj(foundModel);

    try {
      const msgs = await apiFetch(`/organizations/${orgSlug}/ai/chat/messages/${conv.id}`);
      setMessages(msgs || []);
      calculateTotalTokens(msgs || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const calculateTotalTokens = (msgList: any[]) => {
    const sum = msgList.reduce((acc, m) => acc + (m.tokens || 0), 0);
    setTotalTokens(sum);
  };

  const createNewChat = async (): Promise<any> => {
    try {
      const newConv = await apiFetch(`/organizations/${orgSlug}/ai/chat/conversations`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'New AI Chat Thread',
          provider: selectedModelObj.provider,
          model: selectedModelObj.model,
        }),
      });

      setConversations((prev) => [newConv, ...prev]);
      setActiveConversation(newConv);
      setMessages([]);
      setTotalTokens(0);
      return newConv;
    } catch (err) {
      console.error('Failed to create new chat:', err);
      return null;
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim() || sending) return;

    let targetConv = activeConversation;
    if (!targetConv) {
      targetConv = await createNewChat();
      if (!targetConv) return;
    }

    const currentText = inputContent;
    setInputContent('');
    setSending(true);

    const tempUserMsg = {
      id: 'temp-user-' + Date.now(),
      role: 'USER',
      content: currentText,
      tokens: Math.ceil(currentText.length / 4),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await apiFetch(`/organizations/${orgSlug}/ai/chat/messages`, {
        method: 'POST',
        body: JSON.stringify({
          conversationId: targetConv.id,
          content: currentText,
          provider: selectedModelObj.provider,
          model: selectedModelObj.model,
        }),
      });

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        res.userMessage,
        res.assistantMessage,
      ]);

      setTotalTokens((prev) => prev + (res.userMessage.tokens || 0) + (res.assistantMessage.tokens || 0));

      const updatedConvs = conversations.map((c) =>
        c.id === targetConv.id
          ? { ...c, title: c.title === 'New AI Chat Thread' ? currentText.substring(0, 30) : c.title, updatedAt: new Date().toISOString() }
          : c
      );
      setConversations(updatedConvs);
    } catch (err) {
      console.error('Failed to post message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleTogglePin = async (conv: any) => {
    try {
      const updated = await apiFetch(`/organizations/${orgSlug}/ai/chat/conversations/${conv.id}/pin`, {
        method: 'POST',
      });
      setConversations(conversations.map((c) => (c.id === conv.id ? updated : c)));
    } catch (err) {
      console.error('Failed to pin chat:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/ai/chat/conversations/${id}`, { method: 'DELETE' });
      const filtered = conversations.filter((c) => c.id !== id);
      setConversations(filtered);
      if (activeConversation?.id === id) {
        if (filtered.length > 0) selectConversation(filtered[0]);
        else createNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const newFolder = await apiFetch(`/organizations/${orgSlug}/ai/chat/folders`, {
        method: 'POST',
        body: JSON.stringify({ name: newFolderName }),
      });
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setIsFolderModalOpen(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleInsertPrompt = (prompt: any) => {
    setInputContent(prompt.userPrompt || '');
    setIsPromptPickerOpen(false);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedConvs = filteredConversations.filter((c) => c.isPinned);
  const unpinnedConvs = filteredConversations.filter((c) => !c.isPinned);

  return (
    <div className="space-y-4">
      {/* API Error Banner */}
      {apiError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          <Shield size={18} className="shrink-0" />
          <span><strong>Connection Error:</strong> {apiError}</span>
          <button onClick={fetchConversationsAndFolders} className="ml-auto p-1.5 rounded hover:bg-red-500/10">
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* Provider Unconfigured Banner */}
      {providerUnconfigured && !apiError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-sm">
          <Cpu size={18} className="shrink-0 text-amber-500" />
          <span>
            <strong>No AI Providers Configured.</strong>{' '}
            To use AI Chat, configure at least one provider in{' '}
            <a href={`/${orgSlug}/settings/ai`} className="underline font-semibold hover:text-amber-600">
              AI Settings → Providers
            </a>.
          </span>
        </div>
      )}

      <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      {/* Sidebar Navigation */}
      <div className="w-72 bg-gray-50/70 dark:bg-zinc-900/60 border-r border-gray-200 dark:border-zinc-800 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-3 space-y-2 border-b border-gray-200 dark:border-zinc-800">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-4 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus size={16} /> New Chat Thread
          </button>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
          {/* Pinned Section */}
          {pinnedConvs.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Pin size={11} className="text-amber-500" /> Pinned Threads
              </div>
              <div className="space-y-0.5 mt-1">
                {pinnedConvs.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectConversation(c)}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                      activeConversation?.id === c.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-200/50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare size={14} className="shrink-0" />
                      <span className="truncate">{c.title}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePin(c); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-amber-500"
                    >
                      <Pin size={12} className="fill-amber-500 text-amber-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Folders Section */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span className="flex items-center gap-1"><Folder size={11} /> Workspace Folders</span>
              <button onClick={() => setIsFolderModalOpen(true)} className="hover:text-primary">
                <FolderPlus size={13} />
              </button>
            </div>
            {folders.length > 0 && (
              <div className="space-y-1 mt-1 pl-1">
                {folders.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-2 py-1 rounded text-gray-600 dark:text-zinc-400 text-xs">
                    <span className={`w-2 h-2 rounded-full ${f.color || 'bg-blue-500'}`} />
                    <span className="font-medium truncate">{f.name}</span>
                    <span className="ml-auto text-[10px] text-gray-400">({f._count?.conversations || 0})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Threads */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Recent Threads
            </div>
            <div className="space-y-0.5 mt-1">
              {unpinnedConvs.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c)}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeConversation?.id === c.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-200/50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare size={14} className="shrink-0 text-gray-400" />
                    <span className="truncate">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePin(c); }}
                      className="text-gray-400 hover:text-amber-500"
                      title="Pin Thread"
                    >
                      <Pin size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id); }}
                      className="text-gray-400 hover:text-rose-500"
                      title="Delete Thread"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 min-w-0">
        {/* Top Header Bar */}
        <div className="h-14 px-6 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <select
              value={selectedModelObj.model}
              onChange={(e) => {
                const opt = MODEL_OPTIONS.find((m) => m.model === e.target.value) || MODEL_OPTIONS[0];
                setSelectedModelObj(opt);
                if (activeConversation) {
                  apiFetch(`/organizations/${orgSlug}/ai/chat/conversations/${activeConversation.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ provider: opt.provider, model: opt.model }),
                  });
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-xs font-semibold"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.model} value={opt.model}>{opt.label}</option>
              ))}
            </select>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedModelObj.badge}`}>
              {selectedModelObj.provider} ONLINE
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1 font-mono">
              <Zap size={14} className="text-amber-500" /> {totalTokens.toLocaleString()} Tokens
            </span>
          </div>
        </div>

        {/* Message Stream Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Blackdesk Enterprise AI Workspace</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Start typing or choose a prompt template from your library to generate intelligence insights across your organization.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'USER' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                    <Bot size={18} />
                  </div>
                )}

                <div
                  className={`group relative rounded-2xl p-4 text-xs leading-relaxed max-w-2xl space-y-2 ${
                    msg.role === 'USER'
                      ? 'bg-primary text-primary-foreground rounded-br-none shadow-sm'
                      : 'bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                  <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[10px] opacity-70">
                    <span>{msg.role === 'USER' ? 'You' : `${msg.model || selectedModelObj.model}`}</span>
                    <div className="flex items-center gap-2">
                      {msg.tokens > 0 && <span>{msg.tokens} tokens</span>}
                      {msg.responseTimeMs > 0 && <span>{msg.responseTimeMs}ms</span>}
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="hover:text-primary p-0.5"
                        title="Copy message"
                      >
                        {copiedMsgId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                {msg.role === 'USER' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                    U
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex gap-4 max-w-4xl mx-auto justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                <Bot size={18} className="animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs text-gray-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                AI is generating response...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 relative">
          {/* Prompt Picker Popup */}
          {isPromptPickerOpen && (
            <div className="absolute bottom-full left-4 mb-2 w-96 max-h-64 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 z-30 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800 text-xs font-bold">
                <span className="flex items-center gap-1"><FileCode size={14} className="text-primary" /> Prompt Library Presets</span>
                <button onClick={() => setIsPromptPickerOpen(false)}><X size={14} /></button>
              </div>
              {prompts.length === 0 ? (
                <p className="text-xs text-gray-400 p-2">No templates configured in Prompt Library.</p>
              ) : (
                prompts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleInsertPrompt(p)}
                    className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer text-xs space-y-0.5"
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">{p.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{p.userPrompt}</div>
                  </div>
                ))
              )}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            <textarea
              rows={2}
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Message AI Assistant... (Press Enter to send, Shift+Enter for new line)"
              className="w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 pl-4 pr-24 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-sans resize-none"
            />

            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPromptPickerOpen(!isPromptPickerOpen)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-500 hover:text-primary text-xs flex items-center gap-1"
                title="Insert Prompt Template"
              >
                <FileCode size={14} />
              </button>

              <button
                type="submit"
                disabled={!inputContent.trim() || sending}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* New Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Create Conversation Folder</h3>
              <button onClick={() => setIsFolderModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Folder Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Pipelines, Research"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
