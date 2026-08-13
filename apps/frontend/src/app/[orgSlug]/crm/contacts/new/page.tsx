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

export default function NewContactPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [saving, setSaving] = useState(false);
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
      apiFetch(`/organizations/${orgSlug}/companies?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=100`).catch(() => ({ items: [] })),
    ]).then(([companiesData, membersData]) => {
      setCompanies(companiesData.items?.map((c: any) => ({ id: c.id, name: c.name })) || []);
      setUsers(membersData.items?.map((m: any) => m.user) || []);
    });
  }, [orgSlug]);

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
      };

      if (form.jobTitle) payload.jobTitle = form.jobTitle;
      if (form.department) payload.department = form.department;
      if (form.email) payload.email = form.email;
      if (form.phone) payload.phone = form.phone;
      if (form.mobile) payload.mobile = form.mobile;
      if (form.linkedinUrl) payload.linkedinUrl = form.linkedinUrl;
      if (form.country) payload.country = form.country;
      if (form.city) payload.city = form.city;
      if (form.preferredLanguage) payload.preferredLanguage = form.preferredLanguage;
      if (form.companyId) payload.companyId = form.companyId;
      if (form.assignedToId) payload.assignedToId = form.assignedToId;
      if (tags.length > 0) payload.tags = tags;

      const contact = await apiFetch(`/organizations/${orgSlug}/contacts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push(`/${orgSlug}/crm/contacts/${contact.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create contact');
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
          <h1 className="text-2xl font-bold tracking-tight">New Contact</h1>
          <p className="text-sm text-gray-500 mt-1">Add a new contact to your CRM</p>
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
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="john@example.com" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile</label>
              <input type="tel" name="mobile" value={form.mobile} onChange={handleChange} placeholder="+1 (555) 987-6543" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
              <input type="url" name="linkedinUrl" value={form.linkedinUrl} onChange={handleChange} placeholder="https://linkedin.com/in/..." className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input type="text" name="country" value={form.country} onChange={handleChange} placeholder="United States" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input type="text" name="city" value={form.city} onChange={handleChange} placeholder="San Francisco" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
        </div>

        {/* Job Information */}
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Job Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Title</label>
              <input type="text" name="jobTitle" value={form.jobTitle} onChange={handleChange} placeholder="Software Engineer" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input type="text" name="department" value={form.department} onChange={handleChange} placeholder="Engineering" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Language</label>
              <input type="text" name="preferredLanguage" value={form.preferredLanguage} onChange={handleChange} placeholder="English" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
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
          <Link href={`/${orgSlug}/crm/contacts`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <Save size={16} />
            {saving ? 'Creating...' : 'Create Contact'}
          </button>
        </div>
      </form>
    </div>
  );
}
