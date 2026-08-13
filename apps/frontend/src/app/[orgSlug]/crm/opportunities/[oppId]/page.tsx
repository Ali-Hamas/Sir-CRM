'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft, Edit, Trash2, DollarSign, Calendar, Building2,
  User, FileText, Clock, Tag, Star, ExternalLink, ChevronRight,
  CheckCircle, XCircle, Pause
} from 'lucide-react';

interface OppDetail {
  id: string;
  name: string;
  probability: number;
  estimatedValue: number | null;
  currency: string;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  source: string | null;
  description: string | null;
  competitor: string | null;
  nextFollowupDate: string | null;
  stage: string;
  status: string;
  company: { id: string; name: string; industry: string | null; website: string | null } | null;
  contact: { id: string; firstName: string; lastName: string; email: string; phone: string | null; jobTitle: string | null } | null;
  lead: { id: string; firstName: string; lastName: string; email: string } | null;
  assignedTo: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  tags: { id: string; name: string }[];
  notes: { id: string; content: string; createdAt: string; createdBy: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } }[];
  activities: { id: string; action: string; description: string | null; createdAt: string; user: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } }[];
  createdAt: string;
  updatedAt: string;
}

const STAGES = [
  { id: 'NEW_OPPORTUNITY', label: 'New Opportunity' },
  { id: 'QUALIFICATION', label: 'Qualification' },
  { id: 'DISCOVERY', label: 'Discovery' },
  { id: 'PROPOSAL', label: 'Proposal' },
  { id: 'NEGOTIATION', label: 'Negotiation' },
  { id: 'CONTRACT_REVIEW', label: 'Contract Review' },
  { id: 'WON', label: 'Won' },
  { id: 'LOST', label: 'Lost' },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  WON: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  ON_HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function formatValue(value: number | null) {
  if (!value) return '-';
  return `$${value.toLocaleString()}`;
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const oppId = params.oppId as string;

  const [opp, setOpp] = useState<OppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'activity'>('overview');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { fetchOpp(); }, [oppId]);

  const fetchOpp = async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/opportunities/${oppId}`);
      setOpp(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/opportunities/${oppId}/notes`, {
        method: 'POST', body: JSON.stringify({ content: newNote }),
      });
      setNewNote('');
      fetchOpp();
    } finally { setAddingNote(false); }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/organizations/${orgSlug}/opportunities/${oppId}`, { method: 'DELETE' });
      router.push(`/${orgSlug}/crm/opportunities`);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!opp) return <div className="text-center py-20"><p className="text-gray-500">Opportunity not found</p></div>;

  const stageIndex = STAGES.findIndex((s) => s.id === opp.stage);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{opp.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[opp.status]}`}>{opp.status}</span>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-zinc-800">{opp.stage.replace(/_/g, ' ')}</span>
              {opp.company && <Link href={`/${orgSlug}/crm/companies/${opp.company.id}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1"><Building2 size={14} /> {opp.company.name}</Link>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/crm/opportunities/${oppId}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"><Edit size={16} /> Edit</Link>
          <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={16} /> Delete</button>
        </div>
      </div>

      {/* Pipeline Progress */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center gap-1">
          {STAGES.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${i <= stageIndex ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${i <= stageIndex ? 'bg-primary' : 'bg-gray-300 dark:bg-zinc-600'}`}></div>
                <span className="hidden lg:inline">{s.label}</span>
              </div>
              {i < STAGES.length - 1 && <ChevronRight size={14} className="text-gray-300 mx-0.5 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-zinc-800">
        <nav className="flex gap-6">
          {(['overview', 'notes', 'activity'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {tab}
              {tab === 'notes' && opp.notes.length > 0 && <span className="ml-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full px-1.5 text-xs">{opp.notes.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Deal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Estimated Value</p>
                  <p className="text-lg font-bold flex items-center gap-1"><DollarSign size={16} className="text-gray-400" />{formatValue(opp.estimatedValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Probability</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${opp.probability}%` }}></div>
                    </div>
                    <span className="text-sm font-medium">{opp.probability}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Expected Close</p>
                  <p className="text-sm flex items-center gap-1"><Calendar size={14} className="text-gray-400" />{opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : '-'}</p>
                </div>
                {opp.actualCloseDate && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Actual Close</p>
                    <p className="text-sm">{new Date(opp.actualCloseDate).toLocaleDateString()}</p>
                  </div>
                )}
                {opp.source && <div><p className="text-xs text-gray-500 mb-1">Source</p><p className="text-sm">{opp.source}</p></div>}
                {opp.competitor && <div><p className="text-xs text-gray-500 mb-1">Competitor</p><p className="text-sm">{opp.competitor}</p></div>}
              </div>
              {opp.description && <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800"><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-sm whitespace-pre-wrap">{opp.description}</p></div>}
            </div>
          </div>
          <div className="space-y-6">
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Owner</p>
                  {opp.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{opp.assignedTo.firstName?.[0]}{opp.assignedTo.lastName?.[0]}</div>
                      <div><p className="text-sm font-medium">{opp.assignedTo.firstName} {opp.assignedTo.lastName}</p><p className="text-xs text-gray-500">{opp.assignedTo.email}</p></div>
                    </div>
                  ) : <p className="text-sm text-gray-400">Unassigned</p>}
                </div>
                {opp.contact && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Contact</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">{opp.contact.firstName?.[0]}{opp.contact.lastName?.[0]}</div>
                      <div><p className="text-sm font-medium">{opp.contact.firstName} {opp.contact.lastName}</p><p className="text-xs text-gray-500">{opp.contact.email}</p></div>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="text-sm">{new Date(opp.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            {opp.tags.length > 0 && (
              <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {opp.tags.map((tag) => <span key={tag.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-medium"><Tag size={12} /> {tag.name}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." rows={3} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            <div className="flex justify-end mt-2">
              <button onClick={handleAddNote} disabled={!newNote.trim() || addingNote} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{addingNote ? 'Adding...' : 'Add Note'}</button>
            </div>
          </div>
          {opp.notes.length === 0 ? (
            <div className="text-center py-12"><FileText size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-sm text-gray-500">No notes yet</p></div>
          ) : opp.notes.map((note) => (
            <div key={note.id} className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{note.createdBy.firstName?.[0]}{note.createdBy.lastName?.[0]}</div>
                <span>{note.createdBy.firstName} {note.createdBy.lastName}</span> - <span>{new Date(note.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity */}
      {activeTab === 'activity' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          {opp.activities.length === 0 ? (
            <div className="text-center py-12"><Clock size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-sm text-gray-500">No activity yet</p></div>
          ) : opp.activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 last:border-0 last:pb-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{a.user.firstName?.[0]}{a.user.lastName?.[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm"><span className="font-medium">{a.user.firstName} {a.user.lastName}</span> <span className="text-gray-600 dark:text-gray-400">{a.action.replace(/_/g, ' ').toLowerCase()}</span></p>
                {a.description && <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>}
                <p className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Delete Opportunity</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <strong>{opp.name}</strong>?</p>
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
