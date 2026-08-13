'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

interface Company { id: string; name: string; }
interface Client { id: string; companyName: string; }
interface Contract { id: string; title: string; contractNumber: string; }
interface User { id: string; firstName: string; lastName: string; }

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const projectId = params.projectId as string;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState({
    projectName: '', description: '', status: 'PLANNING', priority: 'MEDIUM',
    budget: '', currency: 'USD', startDate: '', endDate: '',
    companyId: '', clientId: '', contractId: '', projectManagerId: '',
  });

  useEffect(() => {
    Promise.all([
      apiFetch(`/organizations/${orgSlug}/projects/${projectId}`),
      apiFetch(`/organizations/${orgSlug}/companies?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/contracts?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=100`).catch(() => ({ items: [] })),
    ]).then(([project, c, co, u]) => {
      setForm({
        projectName: project.projectName || '',
        description: project.description || '',
        status: project.status || 'PLANNING',
        priority: project.priority || 'MEDIUM',
        budget: project.budget ? String(project.budget) : '',
        currency: project.currency || 'USD',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        companyId: project.companyId || '',
        clientId: project.clientId || '',
        contractId: project.contractId || '',
        projectManagerId: project.projectManagerId || '',
      });
      setCompanies(c.items?.map((i: any) => ({ id: i.id, name: i.name })) || []);
      setContracts(co.items?.map((ct: any) => ({ id: ct.id, title: ct.title, contractNumber: ct.contractNumber })) || []);
      setUsers(u.items?.map((m: any) => m.user) || []);
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [orgSlug, projectId]);

  useEffect(() => {
    if (form.companyId) {
      apiFetch(`/organizations/${orgSlug}/companies/${form.companyId}`).then((company: any) => {
        setClients(company.client ? [{ id: company.client.id, companyName: company.client.companyName }] : []);
      }).catch(() => setClients([]));
    } else {
      setClients([]);
    }
  }, [orgSlug, form.companyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectName.trim()) { setError('Project name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = {
        projectName: form.projectName, description: form.description || null,
        status: form.status, priority: form.priority, currency: form.currency,
        companyId: form.companyId || null, clientId: form.clientId || null,
        contractId: form.contractId || null, projectManagerId: form.projectManagerId || null,
        budget: form.budget ? parseFloat(form.budget) : null,
        startDate: form.startDate || null, endDate: form.endDate || null,
      };
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      router.push(`/${orgSlug}/projects/${projectId}`);
    } catch (err: any) { setError(err.message || 'Failed to update project'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
        <div><h1 className="text-2xl font-bold tracking-tight">Edit Project</h1><p className="text-sm text-gray-500 mt-1">Update project details</p></div>
      </div>
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Project Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Project Name *</label>
              <input type="text" name="projectName" value={form.projectName} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="PLANNING">Planning</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Budget</label>
              <input type="number" name="budget" value={form.budget} onChange={handleChange} min="0" step="0.01" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
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
              <label className="block text-sm font-medium mb-1">Client</label>
              <select name="clientId" value={form.clientId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm" disabled={!form.companyId}>
                <option value="">None</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract</label>
              <select name="contractId" value={form.contractId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">None</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.contractNumber})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Project Manager</label>
              <select name="projectManagerId" value={form.projectManagerId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/${orgSlug}/projects/${projectId}`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save size={16} />{saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
