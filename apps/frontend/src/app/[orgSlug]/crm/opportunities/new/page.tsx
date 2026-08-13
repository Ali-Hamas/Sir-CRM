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
];

const SOURCE_OPTIONS = [
  'Website', 'Referral', 'LinkedIn', 'Email Campaign', 'Event', 'Cold Outreach', 'Partner', 'Other',
];

export default function NewOpportunityPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    name: '', companyId: '', contactId: '', assignedToId: '', stage: 'NEW_OPPORTUNITY',
    probability: '0', estimatedValue: '', currency: 'USD', expectedCloseDate: '',
    source: '', description: '', competitor: '', nextFollowupDate: '', tagsInput: '',
  });

  useEffect(() => {
    Promise.all([
      apiFetch(`/organizations/${orgSlug}/companies?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/contacts?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=100`).catch(() => ({ items: [] })),
    ]).then(([c, co, u]) => {
      setCompanies(c.items?.map((i: any) => ({ id: i.id, name: i.name })) || []);
      setContacts(co.items?.map((i: any) => ({ id: i.id, firstName: i.firstName, lastName: i.lastName, email: i.email })) || []);
      setUsers(u.items?.map((m: any) => m.user) || []);
    });
  }, [orgSlug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Opportunity name is required'); return; }
    setSaving(true); setError('');
    try {
      const tags = form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const payload: any = { name: form.name, stage: form.stage, probability: parseInt(form.probability, 10) || 0, currency: form.currency };
      if (form.companyId) payload.companyId = form.companyId;
      if (form.contactId) payload.contactId = form.contactId;
      if (form.assignedToId) payload.assignedToId = form.assignedToId;
      if (form.estimatedValue) payload.estimatedValue = parseFloat(form.estimatedValue);
      if (form.expectedCloseDate) payload.expectedCloseDate = form.expectedCloseDate;
      if (form.source) payload.source = form.source;
      if (form.description) payload.description = form.description;
      if (form.competitor) payload.competitor = form.competitor;
      if (form.nextFollowupDate) payload.nextFollowupDate = form.nextFollowupDate;
      if (tags.length > 0) payload.tags = tags;

      const opp = await apiFetch(`/organizations/${orgSlug}/opportunities`, { method: 'POST', body: JSON.stringify(payload) });
      router.push(`/${orgSlug}/crm/opportunities/${opp.id}`);
    } catch (err: any) { setError(err.message || 'Failed to create opportunity'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
        <div><h1 className="text-2xl font-bold tracking-tight">New Opportunity</h1><p className="text-sm text-gray-500 mt-1">Create a new sales opportunity</p></div>
      </div>
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Opportunity Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Enterprise License Deal" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stage</label>
              <select name="stage" value={form.stage} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Probability (%)</label>
              <input type="number" name="probability" value={form.probability} onChange={handleChange} min="0" max="100" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Value (USD)</label>
              <input type="number" name="estimatedValue" value={form.estimatedValue} onChange={handleChange} min="0" step="0.01" placeholder="50000" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select name="currency" value={form.currency} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
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
              <input type="text" name="competitor" value={form.competitor} onChange={handleChange} placeholder="Competitor name" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
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
              <input type="text" name="tagsInput" value={form.tagsInput} onChange={handleChange} placeholder="enterprise, q4 (comma-separated)" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/${orgSlug}/crm/opportunities`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save size={16} />{saving ? 'Creating...' : 'Create Opportunity'}
          </button>
        </div>
      </form>
    </div>
  );
}
