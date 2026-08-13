'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const contactId = params.contactId as string;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    jobTitle: '',
    department: '',
    email: '',
    phone: '',
    mobile: '',
    linkedinUrl: '',
    country: '',
    city: '',
    preferredLanguage: '',
    status: 'ACTIVE',
    isPrimary: false,
    companyId: '',
    assignedToId: '',
    tagsInput: '',
  });

  useEffect(() => {
    Promise.all([
      apiFetch(`/organizations/${orgSlug}/contacts/${contactId}`),
      apiFetch(`/organizations/${orgSlug}/companies?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=100`).catch(() => ({ items: [] })),
    ]).then(([contact, companiesData, membersData]) => {
      setForm({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        jobTitle: contact.jobTitle || '',
        department: contact.department || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        linkedinUrl: contact.linkedinUrl || '',
        country: contact.country || '',
        city: contact.city || '',
        preferredLanguage: contact.preferredLanguage || '',
        status: contact.status || 'ACTIVE',
        isPrimary: contact.isPrimary || false,
        companyId: contact.companyId || '',
        assignedToId: contact.assignedToId || '',
        tagsInput: contact.tags?.map((t: any) => t.name).join(', ') || '',
      });
      setCompanies(companiesData.items?.map((c: any) => ({ id: c.id, name: c.name })) || []);
      setUsers(membersData.items?.map((m: any) => m.user) || []);
    }).catch(() => {
      setError('Failed to load contact');
    }).finally(() => {
      setLoading(false);
    });
  }, [orgSlug, contactId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
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
        status: form.status,
        isPrimary: form.isPrimary,
        jobTitle: form.jobTitle || null,
        department: form.department || null,
        email: form.email || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
        linkedinUrl: form.linkedinUrl || null,
        country: form.country || null,
        city: form.city || null,
        preferredLanguage: form.preferredLanguage || null,
        companyId: form.companyId || null,
        assignedToId: form.assignedToId || null,
        tags,
      };

      await apiFetch(`/organizations/${orgSlug}/contacts/${contactId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      router.push(`/${orgSlug}/crm/contacts/${contactId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Contact</h1>
          <p className="text-sm text-gray-500 mt-1">Update contact information</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Personal Information</h2>
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
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile</label>
              <input type="tel" name="mobile" value={form.mobile} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
              <input type="url" name="linkedinUrl" value={form.linkedinUrl} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input type="text" name="country" value={form.country} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input type="text" name="city" value={form.city} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
        </div>

        {/* Job Information */}
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Job Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Title</label>
              <input type="text" name="jobTitle" value={form.jobTitle} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input type="text" name="department" value={form.department} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Language</label>
              <input type="text" name="preferredLanguage" value={form.preferredLanguage} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Association */}
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Association</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <select name="companyId" value={form.companyId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">No Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
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
              <input type="text" name="tagsInput" value={form.tagsInput} onChange={handleChange} placeholder="vip, decision-maker (comma-separated)" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <p className="text-xs text-gray-400 mt-1">Separate tags with commas</p>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isPrimary" checked={form.isPrimary} onChange={handleChange} className="rounded border-gray-300" />
                <span className="text-sm font-medium">Mark as Primary Contact</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/${orgSlug}/crm/contacts/${contactId}`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
