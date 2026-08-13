'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Bell, Mail, MessageSquare, Smartphone, Globe, Send, Plus,
  Settings, Trash2, RefreshCw, Loader2, CheckCircle2, XCircle, Clock,
  BarChart3, FileText, Webhook, Users, Edit3, Eye, Play, Pause
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
    SENDING: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    DELIVERED: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    FAILED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    BOUNCED: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    READ: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    ACTIVE: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    DISABLED: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export default function CommunicationsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'templates' | 'messages' | 'webhooks'>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', channel: 'EMAIL', providerType: 'SMTP', config: '{}' });
  const [newTemplate, setNewTemplate] = useState({ name: '', channel: 'EMAIL', subject: '', body: '', bodyFormat: 'HTML' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, providersData, templatesData, messagesData, webhooksData] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/communications/stats`),
        apiFetch(`/organizations/${orgSlug}/communications/providers`),
        apiFetch(`/organizations/${orgSlug}/communications/templates`),
        apiFetch(`/organizations/${orgSlug}/communications/messages?limit=20`),
        apiFetch(`/organizations/${orgSlug}/communications/webhooks`),
      ]);
      setStats(statsData);
      setProviders(providersData || []);
      setTemplates(templatesData || []);
      setMessages(messagesData.items || []);
      setWebhooks(webhooksData || []);
    } catch (err) {
      console.error('Failed to load communications data:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/organizations/${orgSlug}/communications/providers`, {
        method: 'POST',
        body: JSON.stringify({ ...newProvider, config: JSON.parse(newProvider.config || '{}') }),
      });
      setShowAddProvider(false);
      setNewProvider({ name: '', channel: 'EMAIL', providerType: 'SMTP', config: '{}' });
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/organizations/${orgSlug}/communications/templates`, {
        method: 'POST',
        body: JSON.stringify(newTemplate),
      });
      setShowAddTemplate(false);
      setNewTemplate({ name: '', channel: 'EMAIL', subject: '', body: '', bodyFormat: 'HTML' });
      loadData();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-indigo-500/10 rounded-2xl p-6 border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg">
              <Bell size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Communications</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Manage email, Slack, Teams, SMS, push notifications, and webhooks
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSendMessage(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-medium">
              <Send size={16} />
              Send Message
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto">
        {(['overview', 'providers', 'templates', 'messages', 'webhooks'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
            }`}>
            {tab === 'overview' && <BarChart3 size={15} className="inline mr-1.5" />}
            {tab === 'providers' && <Settings size={15} className="inline mr-1.5" />}
            {tab === 'templates' && <FileText size={15} className="inline mr-1.5" />}
            {tab === 'messages' && <Send size={15} className="inline mr-1.5" />}
            {tab === 'webhooks' && <Globe size={15} className="inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Send size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Total Messages</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.deliveryStats?.delivered || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Delivered</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.deliveryStats?.failed || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Failed</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <BarChart3 size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.deliveryStats?.successRate || 0}%</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Success Rate</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Messages by Channel</h3>
              {stats.byChannel?.length > 0 ? (
                <div className="space-y-2">
                  {stats.byChannel.map((c: any) => (
                    <div key={c.channel} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                      <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">{c.channel}</span>
                      <span className="text-sm text-gray-500">{c._count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No data</p>
              )}
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Messages by Status</h3>
              {stats.byStatus?.length > 0 ? (
                <div className="space-y-2">
                  {stats.byStatus.map((s: any) => (
                    <div key={s.status} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                      <StatusBadge status={s.status} />
                      <span className="text-sm text-gray-500">{s._count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Communication Providers</h3>
            <button onClick={() => setShowAddProvider(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20">
              <Plus size={14} /> Add Provider
            </button>
          </div>
          <div className="p-5">
            {providers.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-8">No providers configured</p>
            ) : (
              <div className="space-y-2">
                {providers.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white">
                        {p.channel === 'EMAIL' ? <Mail size={15} /> : p.channel === 'SLACK' ? <MessageSquare size={15} /> : p.channel === 'SMS' ? <Smartphone size={15} /> : <Globe size={15} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{p.channel} · {p.providerType}{p.isDefault ? ' · Default' : ''}</p>
                      </div>
                    </div>
                    <StatusBadge status={p.isEnabled ? 'ACTIVE' : 'DISABLED'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Message Templates</h3>
            <button onClick={() => setShowAddTemplate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20">
              <Plus size={14} /> Add Template
            </button>
          </div>
          <div className="p-5">
            {templates.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-8">No templates created</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map((t: any) => (
                  <div key={t.id} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                      <span className="text-xs text-gray-400 uppercase">{t.channel}</span>
                    </div>
                    {t.subject && <p className="text-xs text-gray-500 mb-1">Subject: {t.subject}</p>}
                    <p className="text-xs text-gray-400 line-clamp-2">{t.body?.substring(0, 100)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Message History</h3>
            <button onClick={loadData} className="p-1.5 text-gray-400 hover:text-gray-600"><RefreshCw size={15} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500">Channel</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Subject</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Sent</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Deliveries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {messages.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium uppercase text-gray-500">{m.channel}</span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">{m.subject || '(no subject)'}</td>
                    <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
                    <td className="px-5 py-3 text-gray-500">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="px-5 py-3 text-gray-500">{m._count?.deliveries || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {messages.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No messages sent</p>}
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Webhooks</h3>
          </div>
          <div className="p-5">
            {webhooks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-8">No webhooks configured</p>
            ) : (
              <div className="space-y-2">
                {webhooks.map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{w.name}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">{w.url}</p>
                    </div>
                    <StatusBadge status={w.isEnabled ? 'ACTIVE' : 'DISABLED'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Provider</h2>
            <form onSubmit={handleCreateProvider} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Name</label>
                <input type="text" value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Channel</label>
                <select value={newProvider.channel} onChange={(e) => setNewProvider({ ...newProvider, channel: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm">
                  <option value="EMAIL">Email</option>
                  <option value="SLACK">Slack</option>
                  <option value="TEAMS">Microsoft Teams</option>
                  <option value="DISCORD">Discord</option>
                  <option value="SMS">SMS</option>
                  <option value="PUSH">Push</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Provider Type</label>
                <input type="text" value={newProvider.providerType} onChange={(e) => setNewProvider({ ...newProvider, providerType: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm" required />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddProvider(false)} className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-xl hover:bg-primary/90">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Template</h2>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Name</label>
                <input type="text" value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Channel</label>
                <select value={newTemplate.channel} onChange={(e) => setNewTemplate({ ...newTemplate, channel: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm">
                  <option value="EMAIL">Email</option>
                  <option value="SLACK">Slack</option>
                  <option value="TEAMS">Teams</option>
                  <option value="DISCORD">Discord</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Subject</label>
                <input type="text" value={newTemplate.subject} onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Body (use {'{{variable}}'} syntax)</label>
                <textarea value={newTemplate.body} onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-mono" rows={5} required />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddTemplate(false)} className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-xl hover:bg-primary/90">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSendMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Send Message</h2>
            <p className="text-sm text-gray-500 mb-4">Use the API to send messages programmatically. POST to <code className="text-xs bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">/organizations/{orgSlug}/communications/send</code></p>
            <pre className="p-4 rounded-xl bg-gray-900 text-green-400 text-xs overflow-x-auto">
{`{
  "channel": "EMAIL",
  "subject": "Hello",
  "body": "Hi {{name}}, welcome!",
  "recipients": [{"address": "user@example.com"}],
  "templateId": "optional-template-id",
  "templateVariables": {"name": "John"}
}`}
            </pre>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowSendMessage(false)} className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
