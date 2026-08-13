'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

interface Company { id: string; name: string; }
interface Contact { id: string; firstName: string; lastName: string; }
interface Opportunity { id: string; name: string; }
interface User { id: string; firstName: string; lastName: string; }

export default function NewProposalPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState({
    title: '', companyId: '', contactId: '', opportunityId: '', ownerId: '',
    currency: 'USD', totalValue: '', discount: '', tax: '',
    issueDate: '', expiryDate: '', notes: '', termsAndConditions: '',
  });

  const [sections, setSections] = useState<{ title: string; content: string }[]>([
    { title: 'Executive Summary', content: '' },
  ]);

  useEffect(() => {
    Promise.all([
      apiFetch(`/organizations/${orgSlug}/companies?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/contacts?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/opportunities?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=100`).catch(() => ({ items: [] })),
    ]).then(([c, co, o, u]) => {
      setCompanies(c.items?.map((i: any) => ({ id: i.id, name: i.name })) || []);
      setContacts(co.items?.map((i: any) => ({ id: i.id, firstName: i.firstName, lastName: i.lastName })) || []);
      setOpportunities(o.items?.map((i: any) => ({ id: i.id, name: i.name })) || []);
      setUsers(u.items?.map((m: any) => m.user) || []);
    });
  }, [orgSlug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSectionChange = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const addSection = () => setSections([...sections, { title: '', content: '' }]);
  const removeSection = (index: number) => setSections(sections.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = {
        title: form.title, currency: form.currency,
        sections: sections.filter((s) => s.title.trim()),
      };
      if (form.companyId) payload.companyId = form.companyId;
      if (form.contactId) payload.contactId = form.contactId;
      if (form.opportunityId) payload.opportunityId = form.opportunityId;
      if (form.ownerId) payload.ownerId = form.ownerId;
      if (form.totalValue) payload.totalValue = parseFloat(form.totalValue);
      if (form.discount) payload.discount = parseFloat(form.discount);
      if (form.tax) payload.tax = parseFloat(form.tax);
      if (form.issueDate) payload.issueDate = form.issueDate;
      if (form.expiryDate) payload.expiryDate = form.expiryDate;
      if (form.notes) payload.notes = form.notes;
      if (form.termsAndConditions) payload.termsAndConditions = form.termsAndConditions;

      const proposal = await apiFetch(`/organizations/${orgSlug}/proposals`, { method: 'POST', body: JSON.stringify(payload) });
      router.push(`/${orgSlug}/crm/proposals/${proposal.id}`);
    } catch (err: any) { setError(err.message || 'Failed to create proposal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
        <div><h1 className="text-2xl font-bold tracking-tight">New Proposal</h1><p className="text-sm text-gray-500 mt-1">Create a new proposal or quotation</p></div>
      </div>
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Proposal Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="Enterprise License Proposal" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
            </div>
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
              <label className="block text-sm font-medium mb-1">Owner</label>
              <select name="ownerId" value={form.ownerId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Pricing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Total Value</label>
              <input type="number" name="totalValue" value={form.totalValue} onChange={handleChange} min="0" step="0.01" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount</label>
              <input type="number" name="discount" value={form.discount} onChange={handleChange} min="0" step="0.01" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax</label>
              <input type="number" name="tax" value={form.tax} onChange={handleChange} min="0" step="0.01" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Issue Date</label>
              <input type="date" name="issueDate" value={form.issueDate} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expiry Date</label>
              <input type="date" name="expiryDate" value={form.expiryDate} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sections</h2>
            <button type="button" onClick={addSection} className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><Plus size={14} /> Add Section</button>
          </div>
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div key={index} className="border border-gray-100 dark:border-zinc-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input type="text" value={section.title} onChange={(e) => handleSectionChange(index, 'title', e.target.value)} placeholder="Section title" className="flex-1 rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  {sections.length > 1 && <button type="button" onClick={() => removeSection(index)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}
                </div>
                <textarea value={section.content} onChange={(e) => handleSectionChange(index, 'content', e.target.value)} placeholder="Section content..." rows={4} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Internal notes..." className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
            <textarea name="termsAndConditions" value={form.termsAndConditions} onChange={handleChange} rows={4} placeholder="Terms and conditions..." className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/${orgSlug}/crm/proposals`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save size={16} />{saving ? 'Creating...' : 'Create Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
}
