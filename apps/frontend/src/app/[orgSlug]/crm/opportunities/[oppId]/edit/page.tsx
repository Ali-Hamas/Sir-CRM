'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

interface Company { id: string; name: string; }
interface Contact { id: string; firstName: string; lastName: string; email: string; }
interface User { id: string; firstName: string; lastName: string; email: string; }

const STAGES = [
  { value: 'NEW_OPPORTUNITY', label: 'New Opportunity' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'DISCOVERY', label: 'Discovery' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'CONTRACT_REVIEW', label: 'Contract Review' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

const SOURCE_OPTIONS = [
  'Website', 'Referral', 'LinkedIn', 'Email Campaign', 'Event', 'Cold Outreach', 'Partner', 'Other',
];

export default function EditOpportunityPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const oppId = params.oppId as string;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    name: '', companyId: '', contactId: '', assignedToId: '', stage: 'NEW_OPPORTUNITY', status: 'OPEN',
    probability: '0', estimatedValue: '', currency: 'USD', expectedCloseDate: '',
    source: '', description: '', competitor: '', nextFollowupDate: '', tagsInput: '',
  });

  useEffect(() => {
    Promise.all([
      apiFetch(`/organizations/${orgSlug}/opportunities/${oppId}`),
      apiFetch(`/organizations/${orgSlug}/companies?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/contacts?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=100`).catch(() => ({ items: [] })),
    ]).then(([opp, c, co, u]) => {
      setForm({
        name: opp.name || '', companyId: opp.companyId || '', contactId: opp.contactId || '',
        assignedToId: opp.assignedToId || '', stage: opp.stage || 'NEW_OPPORTUNITY', status: opp.status || 'OPEN',
        probability: opp.probability?.toString() || '0', estimatedValue: opp.estimatedValue?.toString() || '',
        currency: opp.currency || 'USD', expectedCloseDate: opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '',
        source: opp.source || '', description: opp.description || '', competitor: opp.competitor || '',
        nextFollowupDate: opp.nextFollowupDate ? opp.nextFollowupDate.split('T')[0] : '',
        tagsInput: opp.tags?.map((t: any) => t.name).join(', ') || '',
      });
      setCompanies(c.items?.map((i: any) => ({ id: i.id, name: i.name })) || []);
      setContacts(co.items?.map((i: any) => ({ id: i.id, firstName: i.firstName, lastName: i.lastName, email: i.email })) || []);
      setUsers(u.items?.map((m: any) => m.user) || []);
    }).catch(() => setError('Failed to load opportunity')).finally(() => setLoading(false));
  }, [orgSlug, oppId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const tags = form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const payload: any = {
        name: form.name, stage: form.stage, status: form.status,
        probability: parseInt(form.probability, 10) || 0, currency: form.currency,
        companyId: form.companyId || null, contactId: form.contactId || null,
        assignedToId: form.assignedToId || null,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
        expectedCloseDate: form.expectedCloseDate || null, source: form.source || null,
        description: form.description || null, competitor: form.competitor || null,
        nextFollowupDate: form.nextFollowupDate || null, tags,
      };
      await apiFetch(`/organizations/${orgSlug}/opportunities/${oppId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      router.push(`/${orgSlug}/crm/opportunities/${oppId}`);
    } catch (err: any) { setError(err.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
        <div><h1 className="text-2xl font-bold tracking-tight">Edit Opportunity</h1><p className="text-sm text-gray-500 mt-1">Update opportunity details</p></div>
      </div>
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Opportunity Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stage</label>
              <select name="stage" value={form.stage} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Probability (%)</label>
              <input type="number" name="probability" value={form.probability} onChange={handleChange} min="0" max="100" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Value (USD)</label>
              <input type="number" name="estimatedValue" value={form.estimatedValue} onChange={handleChange} min="0" step="0.01" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expected Close Date</label>
              <input type="date" name="expectedCloseDate" value={form.expectedCloseDate} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Next Follow-up</label>
              <input type="date" name="nextFollowupDate" value={form.nextFollowupDate} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select name="source" value={form.source} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Select source</option>
                {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Competitor</label>
              <input type="text" name="competitor" value={form.competitor} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Associations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <select name="companyId" value={form.companyId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">No Company</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact</label>
              <select name="contactId" value={form.contactId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">No Contact</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Owner</label>
              <select name="assignedToId" value={form.assignedToId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <input type="text" name="tagsInput" value={form.tagsInput} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/${orgSlug}/crm/opportunities/${oppId}`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save size={16} />{saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
