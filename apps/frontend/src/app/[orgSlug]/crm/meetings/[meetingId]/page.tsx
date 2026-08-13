'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft, Edit, Trash2, Calendar, Clock, MapPin, Video,
  Users, FileText, CheckSquare, Plus, Building2, Target, Zap
} from 'lucide-react';

interface MeetingDetail {
  id: string;
  title: string;
  meetingType: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingLink: string | null;
  agenda: string | null;
  outcome: string | null;
  nextFollowupDate: string | null;
  company: { id: string; name: string; industry: string | null } | null;
  contact: { id: string; firstName: string; lastName: string; email: string; phone: string | null } | null;
  lead: { id: string; firstName: string; lastName: string; email: string } | null;
  opportunity: { id: string; name: string; stage: string; estimatedValue: number | null } | null;
  participants: { user: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } }[];
  notes: { id: string; content: string; createdAt: string; createdBy: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } }[];
  actionItems: { id: string; title: string; description: string | null; status: string; priority: string; dueDate: string | null; owner: { id: string; firstName: string; lastName: string } | null }[];
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RESCHEDULED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const TYPE_LABELS: Record<string, string> = {
  DISCOVERY: 'Discovery Meeting', FOLLOW_UP: 'Follow-up Meeting', SALES_PRESENTATION: 'Sales Presentation',
  INTERNAL_DISCUSSION: 'Internal Discussion', STRATEGY_SESSION: 'Strategy Session',
  CONTRACT_REVIEW: 'Contract Review', DEMO: 'Demo', CLIENT_ONBOARDING: 'Client Onboarding',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const ACTION_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const meetingId = params.meetingId as string;

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'actions'>('details');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Action item form
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState({ title: '', description: '', ownerId: '', dueDate: '', priority: 'MEDIUM' });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchMeeting();
    apiFetch(`/organizations/${orgSlug}/team/members?limit=100`)
      .then((data) => setUsers(data.items?.map((m: any) => m.user) || []))
      .catch(() => {});
  }, [meetingId]);

  const fetchMeeting = async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/meetings/${meetingId}`);
      setMeeting(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/meetings/${meetingId}/notes`, { method: 'POST', body: JSON.stringify({ content: newNote }) });
      setNewNote('');
      fetchMeeting();
    } finally { setAddingNote(false); }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/organizations/${orgSlug}/meetings/${meetingId}`, { method: 'DELETE' });
      router.push(`/${orgSlug}/crm/meetings`);
    } catch (err) { console.error(err); }
  };

  const handleAddAction = async () => {
    if (!actionForm.title.trim()) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/meetings/${meetingId}/action-items`, {
        method: 'POST',
        body: JSON.stringify({
          ...actionForm,
          ownerId: actionForm.ownerId || undefined,
          dueDate: actionForm.dueDate || undefined,
        }),
      });
      setActionForm({ title: '', description: '', ownerId: '', dueDate: '', priority: 'MEDIUM' });
      setShowActionForm(false);
      fetchMeeting();
    } catch (err) { console.error(err); }
  };

  const handleToggleAction = async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await apiFetch(`/organizations/${orgSlug}/meetings/${meetingId}/action-items/${itemId}`, {
        method: 'PATCH', body: JSON.stringify({ status: newStatus }),
      });
      fetchMeeting();
    } catch (err) { console.error(err); }
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!meeting) return <div className="text-center py-20"><p className="text-gray-500">Meeting not found</p></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[meeting.status]}`}>{meeting.status}</span>
              <span className="text-xs text-gray-500">{TYPE_LABELS[meeting.meetingType]}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/crm/meetings/${meetingId}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"><Edit size={16} /> Edit</Link>
          <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={16} /> Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-zinc-800">
        <nav className="flex gap-6">
          {(['details', 'notes', 'actions'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === 'actions' ? `Action Items (${meeting.actionItems.length})` : tab}
              {tab === 'notes' && meeting.notes.length > 0 && <span className="ml-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full px-1.5 text-xs">{meeting.notes.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Meeting Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 mb-1">Date</p><p className="text-sm flex items-center gap-1"><Calendar size={14} className="text-gray-400" />{new Date(meeting.date).toLocaleDateString()}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Time</p><p className="text-sm flex items-center gap-1"><Clock size={14} className="text-gray-400" />{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</p></div>
                {meeting.location && <div><p className="text-xs text-gray-500 mb-1">Location</p><p className="text-sm flex items-center gap-1"><MapPin size={14} className="text-gray-400" />{meeting.location}</p></div>}
                {meeting.meetingLink && <div><p className="text-xs text-gray-500 mb-1">Meeting Link</p><a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1"><Video size={14} />Join Meeting</a></div>}
              </div>
              {meeting.agenda && <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800"><p className="text-xs text-gray-500 mb-1">Agenda</p><p className="text-sm whitespace-pre-wrap">{meeting.agenda}</p></div>}
              {meeting.outcome && <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800"><p className="text-xs text-gray-500 mb-1">Outcome</p><p className="text-sm whitespace-pre-wrap">{meeting.outcome}</p></div>}
              {meeting.nextFollowupDate && <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800"><p className="text-xs text-gray-500 mb-1">Next Follow-up</p><p className="text-sm">{new Date(meeting.nextFollowupDate).toLocaleDateString()}</p></div>}
            </div>
          </div>
          <div className="space-y-6">
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Associations</h3>
              <div className="space-y-3">
                {meeting.company && <Link href={`/${orgSlug}/crm/companies/${meeting.company.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><Building2 size={14} className="text-gray-400" />{meeting.company.name}</Link>}
                {meeting.contact && <div className="flex items-center gap-2 text-sm"><Users size={14} className="text-gray-400" />{meeting.contact.firstName} {meeting.contact.lastName}</div>}
                {meeting.lead && <Link href={`/${orgSlug}/crm/leads/${meeting.lead.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><Zap size={14} className="text-gray-400" />{meeting.lead.firstName} {meeting.lead.lastName}</Link>}
                {meeting.opportunity && <Link href={`/${orgSlug}/crm/opportunities/${meeting.opportunity.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><Target size={14} className="text-gray-400" />{meeting.opportunity.name}</Link>}
              </div>
            </div>
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Participants ({meeting.participants.length})</h3>
              <div className="space-y-2">
                {meeting.participants.map((p) => (
                  <div key={p.user.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{p.user.firstName?.[0]}{p.user.lastName?.[0]}</div>
                    <div><p className="text-sm font-medium">{p.user.firstName} {p.user.lastName}</p><p className="text-xs text-gray-500">{p.user.email}</p></div>
                  </div>
                ))}
                {meeting.participants.length === 0 && <p className="text-sm text-gray-400">No participants</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add meeting notes..." rows={3} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            <div className="flex justify-end mt-2">
              <button onClick={handleAddNote} disabled={!newNote.trim() || addingNote} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{addingNote ? 'Adding...' : 'Add Note'}</button>
            </div>
          </div>
          {meeting.notes.length === 0 ? (
            <div className="text-center py-12"><FileText size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-sm text-gray-500">No notes yet</p></div>
          ) : meeting.notes.map((note) => (
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

      {/* Action Items Tab */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowActionForm(!showActionForm)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
              <Plus size={16} /> Add Action Item
            </button>
          </div>
          {showActionForm && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4 space-y-3">
              <input type="text" value={actionForm.title} onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })} placeholder="Action item title" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input type="text" value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} placeholder="Description (optional)" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="grid grid-cols-3 gap-3">
                <select value={actionForm.ownerId} onChange={(e) => setActionForm({ ...actionForm, ownerId: e.target.value })} className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent text-sm">
                  <option value="">No owner</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                </select>
                <input type="date" value={actionForm.dueDate} onChange={(e) => setActionForm({ ...actionForm, dueDate: e.target.value })} className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent text-sm" />
                <select value={actionForm.priority} onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })} className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent text-sm">
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowActionForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                <button onClick={handleAddAction} disabled={!actionForm.title.trim()} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Add</button>
              </div>
            </div>
          )}
          {meeting.actionItems.length === 0 ? (
            <div className="text-center py-12"><CheckSquare size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-sm text-gray-500">No action items</p></div>
          ) : (
            <div className="space-y-2">
              {meeting.actionItems.map((item) => (
                <div key={item.id} className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4 flex items-center gap-4">
                  <button onClick={() => handleToggleAction(item.id, item.status)} className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${item.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-zinc-600'}`}>
                    {item.status === 'COMPLETED' && <CheckSquare size={12} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>{item.title}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ACTION_STATUS_COLORS[item.status]}`}>{item.status}</span>
                  {item.dueDate && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={12} />{new Date(item.dueDate).toLocaleDateString()}</span>}
                  {item.owner && <span className="text-xs text-gray-500">{item.owner.firstName}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Delete Meeting</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <strong>{meeting.title}</strong>?</p>
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
