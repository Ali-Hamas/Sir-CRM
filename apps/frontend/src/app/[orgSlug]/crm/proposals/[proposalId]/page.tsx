'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft, Edit, Trash2, Send, Copy, CheckCircle, XCircle,
  FileText, DollarSign, Calendar, Building2, Users, Clock,
  ChevronDown, MessageSquare
} from 'lucide-react';

interface ProposalDetail {
  id: string;
  proposalNumber: string;
  title: string;
  status: string;
  currency: string;
  totalValue: number | null;
  discount: number | null;
  tax: number | null;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  company: { id: string; name: string; industry: string | null } | null;
  contact: { id: string; firstName: string; lastName: string; email: string; phone: string | null } | null;
  opportunity: { id: string; name: string; stage: string; estimatedValue: number | null } | null;
  meeting: { id: string; title: string; date: string } | null;
  owner: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  sections: { id: string; title: string; content: string | null; sortOrder: number }[];
  versions: { id: string; versionNumber: number; title: string; status: string; totalValue: number | null; createdAt: string }[];
  approvalLogs: { id: string; action: string; comment: string | null; user: { firstName: string; lastName: string }; createdAt: string }[];
  activities: { id: string; action: string; description: string | null; createdAt: string; user: { firstName: string; lastName: string; profilePictureUrl: string | null } }[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  INTERNAL_REVIEW: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  VIEWED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  REVISION_REQUESTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  ACCEPTED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  EXPIRED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const proposalId = params.proposalId as string;

  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'versions' | 'activity'>('content');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchProposal(); }, [proposalId]);

  const fetchProposal = async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/proposals/${proposalId}`);
      setProposal(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/organizations/${orgSlug}/proposals/${proposalId}`, { method: 'DELETE' });
      router.push(`/${orgSlug}/crm/proposals`);
    } catch (err) { console.error(err); }
  };

  const handleSend = async () => {
    setProcessing(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/proposals/${proposalId}/send`, { method: 'POST' });
      fetchProposal();
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  };

  const handleApprove = async (action: string) => {
    setProcessing(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/proposals/${proposalId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action, comment: approvalComment || undefined }),
      });
      setShowApprovalModal(false);
      setApprovalComment('');
      fetchProposal();
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  };

  const handleDuplicate = async () => {
    try {
      const newProposal = await apiFetch(`/organizations/${orgSlug}/proposals/${proposalId}/duplicate`, { method: 'POST' });
      router.push(`/${orgSlug}/crm/proposals/${newProposal.id}`);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!proposal) return <div className="text-center py-20"><p className="text-gray-500">Proposal not found</p></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs text-gray-500 font-mono">{proposal.proposalNumber}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[proposal.status]}`}>{proposal.status.replace(/_/g, ' ')}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{proposal.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {['DRAFT', 'INTERNAL_REVIEW', 'REVISION_REQUESTED'].includes(proposal.status) && (
            <button onClick={handleSend} disabled={processing} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Send size={16} /> Send
            </button>
          )}
          {!['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(proposal.status) && (
            <button onClick={() => setShowApprovalModal(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800">
              <CheckCircle size={16} /> Review
            </button>
          )}
          <button onClick={handleDuplicate} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800">
            <Copy size={16} /> Duplicate
          </button>
          <Link href={`/${orgSlug}/crm/proposals/${proposalId}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800">
            <Edit size={16} /> Edit
          </Link>
          <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-zinc-800">
        <nav className="flex gap-6">
          {(['content', 'versions', 'activity'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab}
              {tab === 'versions' && proposal.versions.length > 0 && <span className="ml-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full px-1.5 text-xs">{proposal.versions.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Pricing */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Pricing Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-sm text-gray-500">Subtotal</span><span className="text-sm font-medium">{proposal.currency} {proposal.totalValue?.toLocaleString() || '0'}</span></div>
                {proposal.discount && <div className="flex justify-between"><span className="text-sm text-gray-500">Discount</span><span className="text-sm font-medium text-red-600">-{proposal.currency} {proposal.discount.toLocaleString()}</span></div>}
                {proposal.tax && <div className="flex justify-between"><span className="text-sm text-gray-500">Tax</span><span className="text-sm font-medium">{proposal.currency} {proposal.tax.toLocaleString()}</span></div>}
                <div className="flex justify-between pt-3 border-t border-gray-100 dark:border-zinc-800">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-lg font-bold">{proposal.currency} {((proposal.totalValue || 0) - (proposal.discount || 0) + (proposal.tax || 0)).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Proposal Content</h3>
              {proposal.sections.length === 0 ? (
                <p className="text-sm text-gray-400">No sections added yet</p>
              ) : (
                <div className="space-y-6">
                  {proposal.sections.map((section) => (
                    <div key={section.id}>
                      <h4 className="font-medium text-sm mb-2">{section.title}</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{section.content || ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes & Terms */}
            {(proposal.notes || proposal.termsAndConditions) && (
              <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6 space-y-4">
                {proposal.notes && <div><h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3><p className="text-sm whitespace-pre-wrap">{proposal.notes}</p></div>}
                {proposal.termsAndConditions && <div><h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Terms & Conditions</h3><p className="text-sm whitespace-pre-wrap">{proposal.termsAndConditions}</p></div>}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Details */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
              <div className="space-y-3">
                <div><p className="text-xs text-gray-500 mb-1">Owner</p>
                  {proposal.owner ? <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{proposal.owner.firstName?.[0]}{proposal.owner.lastName?.[0]}</div><span className="text-sm">{proposal.owner.firstName} {proposal.owner.lastName}</span></div> : <p className="text-sm text-gray-400">Unassigned</p>}
                </div>
                <div><p className="text-xs text-gray-500 mb-1">Issue Date</p><p className="text-sm">{proposal.issueDate ? new Date(proposal.issueDate).toLocaleDateString() : '-'}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Expiry Date</p><p className="text-sm">{proposal.expiryDate ? new Date(proposal.expiryDate).toLocaleDateString() : '-'}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Created</p><p className="text-sm">{new Date(proposal.createdAt).toLocaleDateString()}</p></div>
              </div>
            </div>

            {/* Associations */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Associations</h3>
              <div className="space-y-3">
                {proposal.company && <Link href={`/${orgSlug}/crm/companies/${proposal.company.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><Building2 size={14} className="text-gray-400" />{proposal.company.name}</Link>}
                {proposal.contact && <div className="flex items-center gap-2 text-sm"><Users size={14} className="text-gray-400" />{proposal.contact.firstName} {proposal.contact.lastName}</div>}
                {proposal.opportunity && <Link href={`/${orgSlug}/crm/opportunities/${proposal.opportunity.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><DollarSign size={14} className="text-gray-400" />{proposal.opportunity.name}</Link>}
              </div>
            </div>

            {/* Approval Log */}
            {proposal.approvalLogs.length > 0 && (
              <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Approval History</h3>
                <div className="space-y-3">
                  {proposal.approvalLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.action === 'APPROVED' ? 'bg-green-500' : log.action === 'REJECTED' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
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
          </div>
        </div>
      )}

      {/* Versions Tab */}
      {activeTab === 'versions' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          {proposal.versions.length === 0 ? (
            <div className="text-center py-12"><FileText size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-sm text-gray-500">No versions yet</p></div>
          ) : (
            <div className="space-y-3">
              {proposal.versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">v{v.versionNumber}</div>
                    <div>
                      <p className="text-sm font-medium">{v.title}</p>
                      <p className="text-xs text-gray-500">{v.totalValue ? `${proposal.currency} ${v.totalValue.toLocaleString()}` : '-'} &middot; {new Date(v.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status] || ''}`}>{v.status.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          {proposal.activities.length === 0 ? (
            <div className="text-center py-12"><Clock size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-sm text-gray-500">No activity yet</p></div>
          ) : (
            <div className="space-y-4">
              {proposal.activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{a.user.firstName?.[0]}{a.user.lastName?.[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm"><span className="font-medium">{a.user.firstName} {a.user.lastName}</span> <span className="text-gray-600 dark:text-gray-400">{a.action.replace(/_/g, ' ').toLowerCase()}</span></p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Review Proposal</h3>
            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} placeholder="Add a comment (optional)..." rows={3} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowApprovalModal(false); setApprovalComment(''); }} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={() => handleApprove('REVISION_REQUESTED')} disabled={processing} className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md disabled:opacity-50">Request Revision</button>
              <button onClick={() => handleApprove('REJECTED')} disabled={processing} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50">Reject</button>
              <button onClick={() => handleApprove('APPROVED')} disabled={processing} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50">Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Delete Proposal</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <strong>{proposal.title}</strong>?</p>
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
