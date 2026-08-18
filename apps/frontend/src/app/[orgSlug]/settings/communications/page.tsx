'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Send,
  Plus,
  Settings,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  FileText,
  Users,
  Edit3,
  Eye,
  Play,
  RotateCcw,
  Shield,
  X,
  Radio,
  ExternalLink,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
    SENDING: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    DELIVERED: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    PARTIALLY_DELIVERED: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    FAILED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    BOUNCED: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    READ: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    ACTIVE: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    DISABLED: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function getChannelIcon(channel: string) {
  switch (channel?.toUpperCase()) {
    case 'EMAIL':
      return <Mail size={16} className="text-blue-500" />;
    case 'SLACK':
      return <MessageSquare size={16} className="text-emerald-500" />;
    case 'TEAMS':
      return <Users size={16} className="text-indigo-500" />;
    case 'DISCORD':
      return <Radio size={16} className="text-purple-500" />;
    case 'SMS':
      return <Smartphone size={16} className="text-amber-500" />;
    case 'PUSH':
      return <Bell size={16} className="text-rose-500" />;
    default:
      return <Globe size={16} className="text-cyan-500" />;
  }
}

export default function CommunicationsPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'templates' | 'messages' | 'webhooks'>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);

  // Action modals
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [selectedMessageDetails, setSelectedMessageDetails] = useState<any>(null);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [providerForm, setProviderForm] = useState({
    name: '',
    channel: 'EMAIL',
    providerType: 'SMTP',
    isEnabled: true,
    isDefault: false,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    apiKey: '',
    webhookUrl: '',
    fromAddress: '',
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    channel: 'EMAIL',
    subject: '',
    body: '',
    bodyFormat: 'HTML',
  });

  const [sendForm, setSendForm] = useState({
    channel: 'EMAIL',
    recipientEmail: '',
    subject: '',
    body: '',
    bodyFormat: 'HTML',
    templateId: '',
  });

  const loadData = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    try {
      const [statsData, providersData, templatesData, messagesData, webhooksData] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/communications/stats`).catch(() => null),
        apiFetch(`/organizations/${orgSlug}/communications/providers`).catch(() => []),
        apiFetch(`/organizations/${orgSlug}/communications/templates`).catch(() => []),
        apiFetch(`/organizations/${orgSlug}/communications/messages?limit=25`).catch(() => ({ items: [] })),
        apiFetch(`/organizations/${orgSlug}/communications/webhooks`).catch(() => []),
      ]);

      setStats(statsData);
      setProviders(providersData || []);
      setTemplates(templatesData || []);
      setMessages(messagesData?.items || []);
      setWebhooks(webhooksData || []);
    } catch (err) {
      console.error('Failed to load communications data:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let configObj: Record<string, any> = {};
      if (providerForm.channel === 'EMAIL' && providerForm.providerType === 'SMTP') {
        configObj = {
          host: providerForm.smtpHost,
          port: parseInt(providerForm.smtpPort, 10) || 587,
          user: providerForm.smtpUser,
          pass: providerForm.smtpPass,
          from: providerForm.fromAddress,
        };
      } else if (providerForm.providerType === 'SENDGRID') {
        configObj = {
          apiKey: providerForm.apiKey,
          from: providerForm.fromAddress,
        };
      } else if (providerForm.channel === 'SLACK' || providerForm.channel === 'DISCORD' || providerForm.channel === 'TEAMS') {
        configObj = {
          webhookUrl: providerForm.webhookUrl,
        };
      } else {
        configObj = {
          apiKey: providerForm.apiKey,
        };
      }

      await apiFetch(`/organizations/${orgSlug}/communications/providers`, {
        method: 'POST',
        body: JSON.stringify({
          name: providerForm.name,
          channel: providerForm.channel,
          providerType: providerForm.providerType,
          isEnabled: providerForm.isEnabled,
          isDefault: providerForm.isDefault,
          config: configObj,
        }),
      });

      setShowAddProvider(false);
      setProviderForm({
        name: '',
        channel: 'EMAIL',
        providerType: 'SMTP',
        isEnabled: true,
        isDefault: false,
        smtpHost: '',
        smtpPort: '587',
        smtpUser: '',
        smtpPass: '',
        apiKey: '',
        webhookUrl: '',
        fromAddress: '',
      });
      showNotification('success', 'Communication provider configured successfully.');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to create provider');
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProviderId(providerId);
    try {
      const res = await apiFetch(`/organizations/${orgSlug}/communications/providers/${providerId}/test`, {
        method: 'POST',
        body: JSON.stringify({ recipient: currentUser?.email || 'admin@blackdesk.io' }),
      });
      showNotification('success', res.message || 'Test message dispatched successfully.');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Provider test failed.');
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this communication provider?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/communications/providers/${providerId}`, {
        method: 'DELETE',
      });
      showNotification('success', 'Provider deleted.');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete provider');
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/organizations/${orgSlug}/communications/templates`, {
        method: 'POST',
        body: JSON.stringify(templateForm),
      });
      setShowAddTemplate(false);
      setTemplateForm({ name: '', channel: 'EMAIL', subject: '', body: '', bodyFormat: 'HTML' });
      showNotification('success', 'Message template created.');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to create template');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/organizations/${orgSlug}/communications/send`, {
        method: 'POST',
        body: JSON.stringify({
          channel: sendForm.channel,
          subject: sendForm.subject || undefined,
          body: sendForm.body,
          bodyFormat: sendForm.bodyFormat,
          recipients: [{ address: sendForm.recipientEmail, name: 'Recipient' }],
          templateId: sendForm.templateId || undefined,
        }),
      });
      setShowSendMessage(false);
      setSendForm({
        channel: 'EMAIL',
        recipientEmail: '',
        subject: '',
        body: '',
        bodyFormat: 'HTML',
        templateId: '',
      });
      showNotification('success', 'Message queued for dispatch.');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to send message');
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/communications/messages/${messageId}/retry`, {
        method: 'POST',
      });
      showNotification('success', 'Message retry initiated.');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Retry failed');
    }
  };

  if (loading && !stats) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400 font-medium">Loading communication services...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-indigo-500/10 rounded-2xl p-6 border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Mail size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">Communication Center</h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Centralized gateway for transactional email, Slack webhooks, Microsoft Teams, Discord, and SMS.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-gray-700 dark:text-zinc-300"
              title="Refresh status"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => setShowSendMessage(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20"
            >
              <Send size={14} />
              <span>Dispatch Message</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto pb-1 scrollbar-thin">
        {(['overview', 'providers', 'templates', 'messages', 'webhooks'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all capitalize whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'overview' && <BarChart3 size={14} />}
            {tab === 'providers' && <Settings size={14} />}
            {tab === 'templates' && <FileText size={14} />}
            {tab === 'messages' && <Send size={14} />}
            {tab === 'webhooks' && <Globe size={14} />}
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <Send size={18} />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{stats?.total || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Total Dispatched</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {stats?.deliveryStats?.delivered || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Successfully Delivered</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                  <XCircle size={18} />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {stats?.deliveryStats?.failed || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Delivery Failures</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {stats?.deliveryStats?.successRate || 100}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Delivery SLA</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Channel */}
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Traffic by Channel
              </h3>
              {stats?.byChannel && stats.byChannel.length > 0 ? (
                <div className="space-y-2">
                  {stats.byChannel.map((c: any) => (
                    <div
                      key={c.channel}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-2.5">
                        {getChannelIcon(c.channel)}
                        <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                          {c.channel}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-gray-500">
                        {c._count} messages
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-6 text-center">No message history yet</p>
              )}
            </div>

            {/* Configured Providers Quick Summary */}
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Active Gateways ({providers.filter((p) => p.isEnabled).length})
                </h3>
                <button
                  onClick={() => setActiveTab('providers')}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Manage Providers →
                </button>
              </div>

              {providers.length > 0 ? (
                <div className="space-y-2">
                  {providers.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-2.5">
                        {getChannelIcon(p.channel)}
                        <div>
                          <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 block">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {p.providerType}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={p.isEnabled ? 'ACTIVE' : 'DISABLED'} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-400">No communication providers configured.</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddProvider(true)}
                      className="mt-2 text-xs font-bold text-primary hover:underline"
                    >
                      + Add your first provider
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Providers */}
      {activeTab === 'providers' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm animate-fade-in">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Communication Gateways</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Credentials and API keys are stored encrypted and masked for security.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddProvider(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-xs"
              >
                <Plus size={14} />
                <span>Add Provider</span>
              </button>
            )}
          </div>

          <div className="p-6">
            {providers.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-gray-400">
                  <Settings size={22} />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">No providers configured</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Configure SMTP, SendGrid, Slack, or Twilio to send communications automatically.
                </p>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddProvider(true)}
                    className="mt-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
                  >
                    Configure Gateway
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 hover:border-gray-300 dark:hover:border-zinc-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center shadow-2xs">
                          {getChannelIcon(p.channel)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">{p.name}</h4>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {p.channel} · {p.providerType}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={p.isEnabled ? 'ACTIVE' : 'DISABLED'} />
                    </div>

                    {/* Masked Config Summary */}
                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 text-[11px] font-mono space-y-1">
                      <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                        Configuration
                      </div>
                      <div className="text-gray-600 dark:text-zinc-400 truncate">
                        {p.config ? p.config : '{}'}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-zinc-800/60">
                        <button
                          onClick={() => handleTestProvider(p.id)}
                          disabled={testingProviderId === p.id}
                          className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline disabled:opacity-50"
                        >
                          <Play size={12} />
                          <span>{testingProviderId === p.id ? 'Testing...' : 'Test Connection'}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProvider(p.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Delete provider"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Templates */}
      {activeTab === 'templates' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm animate-fade-in">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Message Templates</h3>
            <button
              onClick={() => setShowAddTemplate(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary rounded-xl"
            >
              <Plus size={14} />
              <span>Create Template</span>
            </button>
          </div>
          <div className="p-6">
            {templates.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">No templates configured yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">{t.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                        {t.channel}
                      </span>
                    </div>
                    {t.subject && (
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        <strong className="text-gray-700 dark:text-zinc-300">Subject:</strong> {t.subject}
                      </p>
                    )}
                    <pre className="p-3 rounded-lg bg-gray-950 text-gray-300 font-mono text-[11px] overflow-x-auto max-h-28">
                      {t.body}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Messages History */}
      {activeTab === 'messages' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm animate-fade-in">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Dispatched Messages</h3>
            <button onClick={loadData} className="p-1.5 text-gray-400 hover:text-gray-600">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-zinc-950/80 border-b border-gray-200 dark:border-zinc-800 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3.5">Channel</th>
                  <th className="px-6 py-3.5">Subject / Preview</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      No communications recorded yet.
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(m.channel)}
                          <span className="font-bold uppercase tracking-wider font-mono text-[10px]">
                            {m.channel}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate font-medium text-gray-900 dark:text-white">
                        {m.subject || m.body?.substring(0, 50) || '(No subject)'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 text-[11px]">
                        {new Date(m.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {m.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetryMessage(m.id)}
                            className="p-1.5 text-amber-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            title="Retry dispatch"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Webhooks */}
      {activeTab === 'webhooks' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Webhooks Hub</h3>
          <p className="text-xs text-muted-foreground">
            Configure HTTP webhooks for real-time external event notifications.
          </p>
          {webhooks.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">No outbound webhooks registered.</p>
          ) : (
            <div className="space-y-2">
              {webhooks.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{w.name}</h4>
                    <p className="text-[11px] font-mono text-gray-400 truncate max-w-md">{w.url}</p>
                  </div>
                  <StatusBadge status={w.isEnabled ? 'ACTIVE' : 'DISABLED'} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Provider Modal */}
      {showAddProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings size={18} className="text-primary" />
                Configure Gateway Provider
              </h2>
              <button onClick={() => setShowAddProvider(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProvider} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">Provider Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Primary Mail SMTP"
                    value={providerForm.name}
                    onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">Channel</label>
                  <select
                    value={providerForm.channel}
                    onChange={(e) => {
                      const ch = e.target.value;
                      let defaultType = 'SMTP';
                      if (ch === 'SLACK') defaultType = 'SLACK_WEBHOOK';
                      else if (ch === 'DISCORD') defaultType = 'DISCORD_WEBHOOK';
                      else if (ch === 'TEAMS') defaultType = 'TEAMS_WEBHOOK';
                      else if (ch === 'SMS') defaultType = 'TWILIO';
                      setProviderForm({ ...providerForm, channel: ch, providerType: defaultType });
                    }}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SLACK">Slack</option>
                    <option value="TEAMS">Microsoft Teams</option>
                    <option value="DISCORD">Discord</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
              </div>

              {providerForm.channel === 'EMAIL' && (
                <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-zinc-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">SMTP Host</label>
                      <input
                        type="text"
                        placeholder="smtp.mailtrap.io"
                        value={providerForm.smtpHost}
                        onChange={(e) => setProviderForm({ ...providerForm, smtpHost: e.target.value })}
                        className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">SMTP Port</label>
                      <input
                        type="text"
                        placeholder="587"
                        value={providerForm.smtpPort}
                        onChange={(e) => setProviderForm({ ...providerForm, smtpPort: e.target.value })}
                        className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">SMTP Username</label>
                      <input
                        type="text"
                        value={providerForm.smtpUser}
                        onChange={(e) => setProviderForm({ ...providerForm, smtpUser: e.target.value })}
                        className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">SMTP Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={providerForm.smtpPass}
                        onChange={(e) => setProviderForm({ ...providerForm, smtpPass: e.target.value })}
                        className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(providerForm.channel === 'SLACK' || providerForm.channel === 'DISCORD' || providerForm.channel === 'TEAMS') && (
                <div>
                  <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">Webhook URL</label>
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={providerForm.webhookUrl}
                    onChange={(e) => setProviderForm({ ...providerForm, webhookUrl: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl font-mono text-xs"
                    required
                  />
                </div>
              )}

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerForm.isEnabled}
                    onChange={(e) => setProviderForm({ ...providerForm, isEnabled: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="font-semibold text-gray-700 dark:text-zinc-300">Enabled</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerForm.isDefault}
                    onChange={(e) => setProviderForm({ ...providerForm, isDefault: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="font-semibold text-gray-700 dark:text-zinc-300">Set as Default Gateway</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddProvider(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold"
                >
                  Save Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showSendMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Send size={16} className="text-primary" />
                Dispatch Communication
              </h2>
              <button onClick={() => setShowSendMessage(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">Channel</label>
                  <select
                    value={sendForm.channel}
                    onChange={(e) => setSendForm({ ...sendForm, channel: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SLACK">Slack</option>
                    <option value="TEAMS">Microsoft Teams</option>
                    <option value="DISCORD">Discord</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">Recipient Address</label>
                  <input
                    type="text"
                    placeholder="user@example.com"
                    value={sendForm.recipientEmail}
                    onChange={(e) => setSendForm({ ...sendForm, recipientEmail: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">Subject (Optional)</label>
                <input
                  type="text"
                  placeholder="Subject title..."
                  value={sendForm.subject}
                  onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">Body Content</label>
                <textarea
                  rows={4}
                  placeholder="Enter message text..."
                  value={sendForm.body}
                  onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl font-mono text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowSendMessage(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold"
                >
                  Send Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Template Modal */}
      {showAddTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                Create Template
              </h2>
              <button onClick={() => setShowAddTemplate(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">Template Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Welcome"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">Channel</label>
                  <select
                    value={templateForm.channel}
                    onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SLACK">Slack</option>
                    <option value="TEAMS">Teams</option>
                    <option value="DISCORD">Discord</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Welcome to Blackdesk, {{name}}"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Body (supports {'{{variable}}'} placeholders)
                </label>
                <textarea
                  rows={5}
                  placeholder="Hello {{name}}, your account is now ready..."
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl font-mono text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddTemplate(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
