'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

interface Company { id: string; name: string; }
interface Contact { id: string; firstName: string; lastName: string; }
interface Proposal { id: string; title: string; proposalNumber: string; }
interface Opportunity { id: string; name: string; }
interface User { id: string; firstName: string; lastName: string; }

const CONTRACT_TYPES = [
  { value: 'SERVICE_AGREEMENT', label: 'Service Agreement' },
  { value: 'SOFTWARE_LICENSE', label: 'Software License' },
  { value: 'CONSULTING', label: 'Consulting' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'NDA', label: 'NDA' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewContractPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState({
    title: '', contractType: 'SERVICE_AGREEMENT', status: 'DRAFT', currency: 'USD',
    contractValue: '', paymentTerms: '', autoRenewal: false, notes: '',
    startDate: '', endDate: '', renewalDate: '',
    companyId: '', contactId: '', proposalId: '', opportunityId: '', ownerId: '',
  });

  useEffect(() => {
    Promise.all([
      apiFetch(`/organizations/${orgSlug}/companies?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/contacts?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/proposals?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/opportunities?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=100`).catch(() => ({ items: [] })),
    ]).then(([c, co, p, o, u]) => {
      setCompanies(c.items?.map((i: any) => ({ id: i.id, name: i.name })) || []);
      setContacts(co.items?.map((i: any) => ({ id: i.id, firstName: i.firstName, lastName: i.lastName })) || []);
      setProposals(p.items?.map((i: any) => ({ id: i.id, title: i.title, proposalNumber: i.proposalNumber })) || []);
      setOpportunities(o.items?.map((i: any) => ({ id: i.id, name: i.name })) || []);
      setUsers(u.items?.map((m: any) => m.user) || []);
    });
  }, [orgSlug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = {
        title: form.title, contractType: form.contractType, status: form.status, currency: form.currency,
        autoRenewal: form.autoRenewal, companyId: form.companyId || null, contactId: form.contactId || null,
        proposalId: form.proposalId || null, opportunityId: form.opportunityId || null, ownerId: form.ownerId || null,
        contractValue: form.contractValue ? parseFloat(form.contractValue) : null,
        paymentTerms: form.paymentTerms || null, notes: form.notes || null,
        startDate: form.startDate || null, endDate: form.endDate || null, renewalDate: form.renewalDate || null,
      };
      const contract = await apiFetch(`/organizations/${orgSlug}/contracts`, { method: 'POST', body: JSON.stringify(payload) });
      router.push(`/${orgSlug}/crm/contracts/${contract.id}`);
    } catch (err: any) { setError(err.message || 'Failed to create contract'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
        <div><h1 className="text-2xl font-bold tracking-tight">New Contract</h1><p className="text-sm text-gray-500 mt-1">Create a new contract</p></div>
      </div>
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Contract Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="Enterprise License Agreement" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract Type</label>
              <select name="contractType" value={form.contractType} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="DRAFT">Draft</option><option value="INTERNAL_REVIEW">Internal Review</option><option value="PENDING_CLIENT_SIGNATURE">Pending Signature</option><option value="SIGNED">Signed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract Value</label>
              <input type="number" name="contractValue" value={form.contractValue} onChange={handleChange} min="0" step="0.01" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select name="currency" value={form.currency} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Renewal Date</label>
              <input type="date" name="renewalDate" value={form.renewalDate} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="autoRenewal" checked={form.autoRenewal} onChange={handleChange} className="rounded border-gray-300" />
                <span className="text-sm font-medium">Auto Renewal</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Payment Terms</label>
              <input type="text" name="paymentTerms" value={form.paymentTerms} onChange={handleChange} placeholder="Net 30, Monthly, etc." className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
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
              <label className="block text-sm font-medium mb-1">Proposal</label>
              <select name="proposalId" value={form.proposalId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">None</option>{proposals.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.proposalNumber})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Opportunity</label>
              <select name="opportunityId" value={form.opportunityId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">None</option>{opportunities.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Owner</label>
              <select name="ownerId" value={form.ownerId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/${orgSlug}/crm/contracts`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save size={16} />{saving ? 'Creating...' : 'Create Contract'}
          </button>
        </div>
      </form>
    </div>
  );
}
