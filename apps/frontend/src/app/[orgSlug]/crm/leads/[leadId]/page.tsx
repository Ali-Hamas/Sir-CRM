'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Building2,
  FileText, Clock, Tag, Star, DollarSign, Calendar, Zap,
  CheckCircle, ExternalLink, Globe
} from 'lucide-react';

interface LeadDetail {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  country: string | null;
  source: string;
  status: string;
  leadScore: number;
  estimatedValue: number | null;
  expectedCloseDate: string | null;
  description: string | null;
  assignedTo: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  tags: { id: string; name: string }[];
  notes: {
    id: string;
    content: string;
    createdAt: string;
    createdBy: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null };
  }[];
  activities: {
    id: string;
    action: string;
    description: string | null;
    createdAt: string;
    user: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null };
  }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CONTACTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  QUALIFIED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  PROPOSAL_SENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  NEGOTIATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  WON: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Website', REFERRAL: 'Referral', LINKEDIN: 'LinkedIn',
  EMAIL_CAMPAIGN: 'Email Campaign', EVENT: 'Event', COLD_OUTREACH: 'Cold Outreach',
  PARTNER: 'Partner', OTHER: 'Other',
};

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 30) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function formatValue(value: number | null) {
  if (!value) return '-';
  return `$${value.toLocaleString()}`;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const leadId = params.leadId as string;

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'activity'>('overview');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertCompanyId, setConvertCompanyId] = useState('');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchLead();
    apiFetch(`/organizations/${orgSlug}/companies?limit=200`)
      .then((data) => setCompanies(data.items?.map((c: any) => ({ id: c.id, name: c.name })) || []))
      .catch(() => {});
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/leads/${leadId}`);
      setLead(data);
    } catch (err) {
      console.error('Failed to fetch lead:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/leads/${leadId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: newNote }),
      });
      setNewNote('');
      fetchLead();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/organizations/${orgSlug}/leads/${leadId}`, { method: 'DELETE' });
      router.push(`/${orgSlug}/crm/leads`);
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      const payload: any = {};
      if (convertCompanyId) payload.companyId = convertCompanyId;

      await apiFetch(`/organizations/${orgSlug}/leads/${leadId}/convert`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowConvertConfirm(false);
      fetchLead();
    } catch (err: any) {
      console.error('Failed to convert lead:', err);
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <Zap size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Lead not found</p>
        <Link href={`/${orgSlug}/crm/leads`} className="text-primary hover:underline text-sm mt-2 inline-block">Back to Leads</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
              {lead.firstName?.[0]}{lead.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{lead.firstName} {lead.lastName}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                  {lead.status.replace(/_/g, ' ')}
                </span>
                {lead.companyName && <span className="text-sm text-gray-500">{lead.companyName}</span>}
                {lead.jobTitle && <span className="text-sm text-gray-400">{lead.jobTitle}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.status !== 'WON' && lead.status !== 'LOST' && (
            <button
              onClick={() => setShowConvertConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <CheckCircle size={16} /> Convert
            </button>
          )}
          <Link
            href={`/${orgSlug}/crm/leads/${leadId}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Edit size={16} /> Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-zinc-800">
        <nav className="flex gap-6">
          {(['overview', 'notes', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab}
              {tab === 'notes' && lead.notes.length > 0 && (
                <span className="ml-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-full px-1.5 text-xs">{lead.notes.length}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Info */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Lead Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Lead Score</p>
                  <div className="flex items-center gap-2">
                    <Star size={16} className={getScoreColor(lead.leadScore)} />
                    <span className={`text-lg font-bold ${getScoreColor(lead.leadScore)}`}>{lead.leadScore}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Source</p>
                  <p className="text-sm font-medium">{SOURCE_LABELS[lead.source] || lead.source}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Estimated Value</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <DollarSign size={14} className="text-gray-400" />
                    {formatValue(lead.estimatedValue)}
                  </p>
                </div>
                {lead.expectedCloseDate && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Expected Close Date</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(lead.expectedCloseDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              {lead.description && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{lead.description}</p>
                </div>
              )}
            </div>

            {/* Contact Details */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Contact Details</h3>
              <div className="space-y-3">
                {lead.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail size={16} className="text-gray-400 shrink-0" />
                    <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={16} className="text-gray-400 shrink-0" />
                    <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                  </div>
                )}
                {lead.country && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin size={16} className="text-gray-400 shrink-0" />
                    {lead.country}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                  {lead.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {lead.assignedTo.firstName?.[0]}{lead.assignedTo.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{lead.assignedTo.firstName} {lead.assignedTo.lastName}</p>
                        <p className="text-xs text-gray-500">{lead.assignedTo.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Unassigned</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created By</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">
                      {lead.createdBy.firstName?.[0]}{lead.createdBy.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{lead.createdBy.firstName} {lead.createdBy.lastName}</p>
                      <p className="text-xs text-gray-500">{new Date(lead.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                  <p className="text-sm">{new Date(lead.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {lead.tags.length > 0 && (
              <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag) => (
                    <span key={tag.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-medium">
                      <Tag size={12} /> {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this lead..."
              rows={3}
              className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || addingNote}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>

          {lead.notes.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lead.notes.map((note) => (
                <div key={note.id} className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {note.createdBy.firstName?.[0]}{note.createdBy.lastName?.[0]}
                    </div>
                    <span>{note.createdBy.firstName} {note.createdBy.lastName}</span>
                    <span>-</span>
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          {lead.activities.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lead.activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {activity.user.firstName?.[0]}{activity.user.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.firstName} {activity.user.lastName}</span>
                      {' '}
                      <span className="text-gray-600 dark:text-gray-400">{activity.action.replace(/_/g, ' ').toLowerCase()}</span>
                    </p>
                    {activity.description && <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Convert Confirmation Modal */}
      {showConvertConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Convert Lead</h3>
            <p className="text-sm text-gray-500 mb-4">
              Convert <strong>{lead.firstName} {lead.lastName}</strong> into a Contact{lead.companyName ? ` and Company "${lead.companyName}"` : ''}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Link to existing company (optional)</label>
              <select
                value={convertCompanyId}
                onChange={(e) => setConvertCompanyId(e.target.value)}
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
              >
                <option value="">Create new company{lead.companyName ? ` ("${lead.companyName}")` : ''}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConvertConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
              <button
                onClick={handleConvert}
                disabled={converting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
              >
                {converting ? 'Converting...' : 'Convert Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Delete Lead</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{lead.firstName} {lead.lastName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
