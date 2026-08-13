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

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
  'Education', 'Real Estate', 'Energy', 'Transportation', 'Media',
  'Telecommunications', 'Agriculture', 'Construction', 'Hospitality',
  'Legal', 'Consulting', 'Other',
];

const COMPANY_TYPES = [
  'Corporation', 'LLC', 'Partnership', 'Sole Proprietorship',
  'Non-Profit', 'Government', 'Startup', 'Subsidiary', 'Other',
];

const STATUS_OPTIONS = [
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'CLIENT', label: 'Client' },
];

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const companyId = params.companyId as string;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    name: '',
    legalName: '',
    industry: '',
    companyType: '',
    website: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    address: '',
    postalCode: '',
    numberOfEmployees: '',
    annualRevenue: '',
    status: 'PROSPECT',
    assignedToId: '',
    tagsInput: '',
  });

  useEffect(() => {
    Promise.all([
      apiFetch(`/organizations/${orgSlug}/companies/${companyId}`),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=100`).catch(() => ({ items: [] })),
    ]).then(([company, membersData]) => {
      setForm({
        name: company.name || '',
        legalName: company.legalName || '',
        industry: company.industry || '',
        companyType: company.companyType || '',
        website: company.website || '',
        email: company.email || '',
        phone: company.phone || '',
        country: company.country || '',
        city: company.city || '',
        address: company.address || '',
        postalCode: company.postalCode || '',
        numberOfEmployees: company.numberOfEmployees?.toString() || '',
        annualRevenue: company.annualRevenue?.toString() || '',
        status: company.status || 'PROSPECT',
        assignedToId: company.assignedToId || '',
        tagsInput: company.tags?.map((t: any) => t.name).join(', ') || '',
      });
      setUsers(membersData.items?.map((m: any) => m.user) || []);
    }).catch(() => {
      setError('Failed to load company');
    }).finally(() => {
      setLoading(false);
    });
  }, [orgSlug, companyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Company name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const tags = form.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: any = {
        name: form.name,
        status: form.status,
        legalName: form.legalName || null,
        industry: form.industry || null,
        companyType: form.companyType || null,
        website: form.website || null,
        email: form.email || null,
        phone: form.phone || null,
        country: form.country || null,
        city: form.city || null,
        address: form.address || null,
        postalCode: form.postalCode || null,
        numberOfEmployees: form.numberOfEmployees ? parseInt(form.numberOfEmployees, 10) : null,
        annualRevenue: form.annualRevenue ? parseFloat(form.annualRevenue) : null,
        assignedToId: form.assignedToId || null,
        tags,
      };

      await apiFetch(`/organizations/${orgSlug}/companies/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      router.push(`/${orgSlug}/crm/companies/${companyId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update company');
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Company</h1>
          <p className="text-sm text-gray-500 mt-1">Update company information</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Legal Name</label>
              <input
                type="text"
                name="legalName"
                value={form.legalName}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Industry</label>
              <select name="industry" value={form.industry} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Select industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company Type</label>
              <select name="companyType" value={form.companyType} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Select type</option>
                {COMPANY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
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
          </div>
        </div>

        {/* Contact Information */}
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="url"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="info@company.com"
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div></div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                type="text"
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="United States"
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="San Francisco"
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Main St, Suite 100"
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Postal Code</label>
              <input
                type="text"
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                placeholder="94105"
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Business Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Number of Employees</label>
              <input
                type="number"
                name="numberOfEmployees"
                value={form.numberOfEmployees}
                onChange={handleChange}
                placeholder="50"
                min="0"
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Annual Revenue (USD)</label>
              <input
                type="number"
                name="annualRevenue"
                value={form.annualRevenue}
                onChange={handleChange}
                placeholder="1000000"
                min="0"
                step="0.01"
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Tags</label>
              <input
                type="text"
                name="tagsInput"
                value={form.tagsInput}
                onChange={handleChange}
                placeholder="enterprise, saas, lead (comma-separated)"
                className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-gray-400 mt-1">Separate tags with commas</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/${orgSlug}/crm/companies/${companyId}`}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
