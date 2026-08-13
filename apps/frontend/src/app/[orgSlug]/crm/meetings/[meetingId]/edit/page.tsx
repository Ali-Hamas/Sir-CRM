'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

interface Company { id: string; name: string; }
interface Contact { id: string; firstName: string; lastName: string; }
interface Opportunity { id: string; name: string; }
interface Lead { id: string; firstName: string; lastName: string; }
interface User { id: string; firstName: string; lastName: string; email: string; }

const MEETING_TYPES = [
  { value: 'DISCOVERY', label: 'Discovery Meeting' },
  { value: 'FOLLOW_UP', label: 'Follow-up Meeting' },
  { value: 'SALES_PRESENTATION', label: 'Sales Presentation' },
  { value: 'INTERNAL_DISCUSSION', label: 'Internal Discussion' },
  { value: 'STRATEGY_SESSION', label: 'Strategy Session' },
  { value: 'CONTRACT_REVIEW', label: 'Contract Review' },
  { value: 'DEMO', label: 'Demo' },
  { value: 'CLIENT_ONBOARDING', label: 'Client Onboarding' },
];

export default function EditMeetingPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const meetingId = params.meetingId as string;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '', meetingType: 'DISCOVERY', status: 'SCHEDULED',
    date: '', startTime: '09:00', endTime: '10:00',
    location: '', meetingLink: '', agenda: '', outcome: '',
    companyId: '', contactId: '', opportunityId: '', leadId: '',
    nextFollowupDate: '',
  });

  useEffect(() => {
    Promise.all([
      apiFetch(`/organizations/${orgSlug}/meetings/${meetingId}`),
      apiFetch(`/organizations/${orgSlug}/companies?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/contacts?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/opportunities?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/leads?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=100`).catch(() => ({ items: [] })),
    ]).then(([meeting, c, co, o, l, u]) => {
      setForm({
        title: meeting.title || '', meetingType: meeting.meetingType || 'DISCOVERY', status: meeting.status || 'SCHEDULED',
        date: meeting.date ? meeting.date.split('T')[0] : '', startTime: meeting.startTime || '09:00', endTime: meeting.endTime || '10:00',
        location: meeting.location || '', meetingLink: meeting.meetingLink || '', agenda: meeting.agenda || '', outcome: meeting.outcome || '',
        companyId: meeting.companyId || '', contactId: meeting.contactId || '', opportunityId: meeting.opportunityId || '', leadId: meeting.leadId || '',
        nextFollowupDate: meeting.nextFollowupDate ? meeting.nextFollowupDate.split('T')[0] : '',
      });
      setSelectedParticipants(meeting.participants?.map((p: any) => p.userId) || []);
      setCompanies(c.items?.map((i: any) => ({ id: i.id, name: i.name })) || []);
      setContacts(co.items?.map((i: any) => ({ id: i.id, firstName: i.firstName, lastName: i.lastName })) || []);
      setOpportunities(o.items?.map((i: any) => ({ id: i.id, name: i.name })) || []);
      setLeads(l.items?.map((i: any) => ({ id: i.id, firstName: i.firstName, lastName: i.lastName })) || []);
      setUsers(u.items?.map((m: any) => m.user) || []);
    }).catch(() => setError('Failed to load meeting')).finally(() => setLoading(false));
  }, [orgSlug, meetingId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) { setError('Title and date are required'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = {
        title: form.title, meetingType: form.meetingType, status: form.status,
        date: form.date, startTime: form.startTime, endTime: form.endTime,
        participantIds: selectedParticipants,
        location: form.location || null, meetingLink: form.meetingLink || null,
        agenda: form.agenda || null, outcome: form.outcome || null,
        companyId: form.companyId || null, contactId: form.contactId || null,
        opportunityId: form.opportunityId || null, leadId: form.leadId || null,
        nextFollowupDate: form.nextFollowupDate || null,
      };
      await apiFetch(`/organizations/${orgSlug}/meetings/${meetingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      router.push(`/${orgSlug}/crm/meetings/${meetingId}`);
    } catch (err: any) { setError(err.message || 'Failed to update meeting'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
        <div><h1 className="text-2xl font-bold tracking-tight">Edit Meeting</h1><p className="text-sm text-gray-500 mt-1">Update meeting details</p></div>
      </div>
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Meeting Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input type="text" name="title" value={form.title} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select name="meetingType" value={form.meetingType} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                {MEETING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="SCHEDULED">Scheduled</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="RESCHEDULED">Rescheduled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
            </div>
            <div></div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input type="text" name="location" value={form.location} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Meeting Link</label>
              <input type="url" name="meetingLink" value={form.meetingLink} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Agenda</label>
              <textarea name="agenda" value={form.agenda} onChange={handleChange} rows={3} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Outcome</label>
              <textarea name="outcome" value={form.outcome} onChange={handleChange} rows={3} placeholder="Meeting outcome..." className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Associations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <select name="companyId" value={form.companyId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">None</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact</label>
              <select name="contactId" value={form.contactId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">None</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Opportunity</label>
              <select name="opportunityId" value={form.opportunityId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">None</option>{opportunities.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lead</label>
              <select name="leadId" value={form.leadId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">None</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Next Follow-up</label>
              <input type="date" name="nextFollowupDate" value={form.nextFollowupDate} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Participants</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {users.map((u) => (
              <label key={u.id} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedParticipants.includes(u.id) ? 'bg-primary/5 border border-primary/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800 border border-transparent'}`}>
                <input type="checkbox" checked={selectedParticipants.includes(u.id)} onChange={() => toggleParticipant(u.id)} className="rounded border-gray-300" />
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                <div><p className="text-sm font-medium">{u.firstName} {u.lastName}</p><p className="text-xs text-gray-500">{u.email}</p></div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/${orgSlug}/crm/meetings/${meetingId}`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save size={16} />{saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
