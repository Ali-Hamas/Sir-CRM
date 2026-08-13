'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL_SENT', label: 'Proposal Sent' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const SOURCE_OPTIONS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
  { value: 'EVENT', label: 'Event' },
  { value: 'COLD_OUTREACH', label: 'Cold Outreach' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewLeadPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    jobTitle: '',
    country: '',
    source: 'WEBSITE',
    status: 'NEW',
    leadScore: '0',
    estimatedValue: '',
    expectedCloseDate: '',
    description: '',
    assignedToId: '',
    tagsInput: '',
  });

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/team/members?limit=100`)
      .then((data) => setUsers(data.items?.map((m: any) => m.user) || []))
      .catch(() => {});
  }, [orgSlug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const tags = form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        source: form.source,
        status: form.status,
        leadScore: parseInt(form.leadScore, 10) || 0,
      };

      if (form.companyName) payload.companyName = form.companyName;
      if (form.email) payload.email = form.email;
      if (form.phone) payload.phone = form.phone;
      if (form.jobTitle) payload.jobTitle = form.jobTitle;
      if (form.country) payload.country = form.country;
      if (form.estimatedValue) payload.estimatedValue = parseFloat(form.estimatedValue);
      if (form.expectedCloseDate) payload.expectedCloseDate = form.expectedCloseDate;
      if (form.description) payload.description = form.description;
      if (form.assignedToId) payload.assignedToId = form.assignedToId;
      if (tags.length > 0) payload.tags = tags;

      const lead = await apiFetch(`/organizations/${orgSlug}/leads`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push(`/${orgSlug}/crm/leads/${lead.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Lead</h1>
          <p className="text-sm text-gray-500 mt-1">Capture a new sales lead</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Lead Information */}
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Lead Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input type="text" name="firstName" value={form.firstName} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input type="text" name="lastName" value={form.lastName} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input type="text" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Acme Corp" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Job Title</label>
              <input type="text" name="jobTitle" value={form.jobTitle} onChange={handleChange} placeholder="CTO" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="john@example.com" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input type="text" name="country" value={form.country} onChange={handleChange} placeholder="United States" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div></div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Describe this lead..." className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>
          </div>
        </div>

        {/* Sales Details */}
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Sales Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select name="source" value={form.source} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lead Score (0-100)</label>
              <input type="number" name="leadScore" value={form.leadScore} onChange={handleChange} min="0" max="100" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Value (USD)</label>
              <input type="number" name="estimatedValue" value={form.estimatedValue} onChange={handleChange} placeholder="50000" min="0" step="0.01" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expected Close Date</label>
              <input type="date" name="expectedCloseDate" value={form.expectedCloseDate} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assigned To</label>
              <select name="assignedToId" value={form.assignedToId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Tags</label>
              <input type="text" name="tagsInput" value={form.tagsInput} onChange={handleChange} placeholder="hot, enterprise, q4 (comma-separated)" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <p className="text-xs text-gray-400 mt-1">Separate tags with commas</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/${orgSlug}/crm/leads`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <Save size={16} />
            {saving ? 'Creating...' : 'Create Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
