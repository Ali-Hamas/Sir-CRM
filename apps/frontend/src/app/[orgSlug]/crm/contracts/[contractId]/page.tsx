'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft, Edit, Trash2, FileText, DollarSign, Calendar, Building2,
  Users, Clock, RefreshCw, CheckCircle, AlertTriangle, Briefcase
} from 'lucide-react';

interface ContractDetail {
  id: string;
  contractNumber: string;
  title: string;
  status: string;
  contractType: string;
  currency: string;
  contractValue: number | null;
  paymentTerms: string | null;
  autoRenewal: boolean;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  renewalDate: string | null;
  company: { id: string; name: string; industry: string | null } | null;
  contact: { id: string; firstName: string; lastName: string; email: string; phone: string | null } | null;
  proposal: { id: string; title: string; proposalNumber: string } | null;
  opportunity: { id: string; name: string; stage: string; estimatedValue: number | null } | null;
  owner: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  versions: { id: string; versionNumber: number; title: string; status: string; contractValue: number | null; createdAt: string }[];
  approvalLogs: { id: string; action: string; comment: string | null; user: { firstName: string; lastName: string }; createdAt: string }[];
  activities: { id: string; action: string; description: string | null; createdAt: string; user: { firstName: string; lastName: string; profilePictureUrl: string | null } }[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  INTERNAL_REVIEW: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  PENDING_CLIENT_SIGNATURE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  SIGNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const contractId = params.contractId as string;

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchContract(); }, [contractId]);

  const fetchContract = async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/contracts/${contractId}`);
      setContract(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/organizations/${orgSlug}/contracts/${contractId}`, { method: 'DELETE' });
      router.push(`/${orgSlug}/crm/contracts`);
    } catch (err) { console.error(err); }
  };

  const handleActivate = async () => {
    setProcessing(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/contracts/${contractId}/activate`, { method: 'POST' });
      fetchContract();
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  };

  const handleRenew = async () => {
    setProcessing(true);
    try {
      const result = await apiFetch(`/organizations/${orgSlug}/contracts/${contractId}/renew`, { method: 'POST' });
      router.push(`/${orgSlug}/crm/contracts/${result.newContract.id}`);
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!contract) return <div className="text-center py-20"><p className="text-gray-500">Contract not found</p></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs text-gray-500 font-mono">{contract.contractNumber}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[contract.status]}`}>{contract.status.replace(/_/g, ' ')}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{contract.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!['ACTIVE', 'EXPIRED', 'CANCELLED'].includes(contract.status) && (
            <button onClick={handleActivate} disabled={processing} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              <CheckCircle size={16} /> Activate
            </button>
          )}
          {contract.status === 'ACTIVE' && contract.endDate && new Date(contract.endDate) > new Date() && (
            <button onClick={handleRenew} disabled={processing} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800">
              <RefreshCw size={16} /> Renew
            </button>
          )}
          <Link href={`/${orgSlug}/crm/contracts/${contractId}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800">
            <Edit size={16} /> Edit
          </Link>
          <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Contract Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500 mb-1">Contract Value</p><p className="text-lg font-bold flex items-center gap-1"><DollarSign size={16} className="text-gray-400" />{contract.contractValue ? `${contract.currency} ${contract.contractValue.toLocaleString()}` : '-'}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Contract Type</p><p className="text-sm">{contract.contractType.replace(/_/g, ' ')}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Start Date</p><p className="text-sm">{contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '-'}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">End Date</p><p className="text-sm">{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '-'}</p></div>
              {contract.renewalDate && <div><p className="text-xs text-gray-500 mb-1">Renewal Date</p><p className="text-sm">{new Date(contract.renewalDate).toLocaleDateString()}</p></div>}
              <div><p className="text-xs text-gray-500 mb-1">Auto Renewal</p><p className="text-sm">{contract.autoRenewal ? 'Yes' : 'No'}</p></div>
              {contract.paymentTerms && <div className="sm:col-span-2"><p className="text-xs text-gray-500 mb-1">Payment Terms</p><p className="text-sm">{contract.paymentTerms}</p></div>}
              {contract.notes && <div className="sm:col-span-2"><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm whitespace-pre-wrap">{contract.notes}</p></div>}
            </div>
          </div>

          {/* Versions */}
          {contract.versions.length > 0 && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Version History</h3>
              <div className="space-y-3">
                {contract.versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">v{v.versionNumber}</div>
                      <div>
                        <p className="text-sm font-medium">{v.title}</p>
                        <p className="text-xs text-gray-500">{v.contractValue ? `${contract.currency} ${v.contractValue.toLocaleString()}` : '-'} &middot; {new Date(v.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status] || ''}`}>{v.status.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Log */}
          {contract.approvalLogs.length > 0 && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Approval History</h3>
              <div className="space-y-3">
                {contract.approvalLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.action === 'ACTIVATED' ? 'bg-green-500' : log.action === 'RENEWED' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                    <div>
                      <p className="text-sm"><span className="font-medium">{log.user.firstName}</span> <span className="text-gray-500">{log.action.replace(/_/g, ' ').toLowerCase()}</span></p>
                      {log.comment && <p className="text-xs text-gray-500 mt-0.5">{log.comment}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          {contract.activities.length > 0 && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Activity</h3>
              <div className="space-y-4">
                {contract.activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{a.user.firstName?.[0]}{a.user.lastName?.[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm"><span className="font-medium">{a.user.firstName} {a.user.lastName}</span> <span className="text-gray-600 dark:text-gray-400">{a.action.replace(/_/g, ' ').toLowerCase()}</span></p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-500 mb-1">Owner</p>
                {contract.owner ? <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{contract.owner.firstName?.[0]}{contract.owner.lastName?.[0]}</div><span className="text-sm">{contract.owner.firstName} {contract.owner.lastName}</span></div> : <p className="text-sm text-gray-400">Unassigned</p>}
              </div>
              <div><p className="text-xs text-gray-500 mb-1">Created</p><p className="text-sm">{new Date(contract.createdAt).toLocaleDateString()}</p></div>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Associations</h3>
            <div className="space-y-3">
              {contract.company && <Link href={`/${orgSlug}/crm/companies/${contract.company.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><Building2 size={14} className="text-gray-400" />{contract.company.name}</Link>}
              {contract.contact && <div className="flex items-center gap-2 text-sm"><Users size={14} className="text-gray-400" />{contract.contact.firstName} {contract.contact.lastName}</div>}
              {contract.proposal && <Link href={`/${orgSlug}/crm/proposals/${contract.proposal.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><FileText size={14} className="text-gray-400" />{contract.proposal.title}</Link>}
              {contract.opportunity && <Link href={`/${orgSlug}/crm/opportunities/${contract.opportunity.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><DollarSign size={14} className="text-gray-400" />{contract.opportunity.name}</Link>}
            </div>
          </div>

          {contract.status === 'ACTIVE' && contract.endDate && (
            <div className="border border-amber-200 dark:border-amber-900/30 rounded-lg bg-amber-50 dark:bg-amber-900/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Renewal Info</p>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-500">Contract ends on {new Date(contract.endDate).toLocaleDateString()}{contract.autoRenewal ? ' and will auto-renew' : ''}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Delete Contract</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <strong>{contract.title}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
