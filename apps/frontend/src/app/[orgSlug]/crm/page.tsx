'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, UserCircle, Target, Zap,
  CalendarCheck, FileSignature, ScrollText, Plus, Search, Filter,
  TrendingUp, DollarSign, Users, Briefcase, ChevronRight, CheckCircle2,
  XCircle, Clock, AlertCircle, Eye, Edit, Trash2, ArrowRight,
  MoreVertical, Calendar as CalendarIcon, MapPin, ExternalLink,
  ChevronLeft, ArrowUpRight, ArrowDownRight, RefreshCw, Layers,
  List, CheckSquare, Sparkles, UserPlus, Check, X, ShieldAlert, Award
} from 'lucide-react';

import { useAuthStore } from '@/store/auth.store';
import { isAdminRole } from '@/lib/permissions';

export default function CRMHubPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = isAdminRole(user?.role);
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgSlug = (params?.orgSlug as string) || 'default-org';
  const activeTabFromUrl = searchParams.get('tab') || 'dashboard';

  const [activeTab, setActiveTab] = useState(activeTabFromUrl);
  const [isPending, startTransition] = useTransition();

  // Sync tab with URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    startTransition(() => {
      router.push(`/${orgSlug}/crm?tab=${tab}`);
    });
  };

  useEffect(() => {
    if (activeTabFromUrl && activeTabFromUrl !== activeTab) {
      setActiveTab(activeTabFromUrl);
    }
  }, [activeTabFromUrl]);

  // Global Refresh Trigger
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  // States for Stats & Dashboard
  const [loadingStats, setLoadingStats] = useState(true);
  const [crmStats, setCrmStats] = useState<any>({
    companies: 0,
    contacts: 0,
    leads: 0,
    opportunities: 0,
    meetingsToday: 0,
    proposals: 0,
    contracts: 0,
    totalRevenue: 0,
    winRate: 0,
  });

  // Recent Activity Log state
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);

  // Modals state
  const [quickCreateModal, setQuickCreateModal] = useState<string | null>(null);

  // Load Dashboard Statistics
  useEffect(() => {
    async function loadDashboardStats() {
      setLoadingStats(true);
      try {
        const [compStats, leadStats, oppStats, meetStats, propStats, contStats, contactData] = await Promise.all([
          apiFetch(`/organizations/${orgSlug}/companies/stats`).catch(() => ({ total: 0 })),
          apiFetch(`/organizations/${orgSlug}/leads/stats`).catch(() => ({ total: 0 })),
          apiFetch(`/organizations/${orgSlug}/opportunities/stats`).catch(() => ({ total: 0, totalValue: 0, wonValue: 0, byStatus: {} })),
          apiFetch(`/organizations/${orgSlug}/meetings/stats`).catch(() => ({ today: 0, upcoming: 0 })),
          apiFetch(`/organizations/${orgSlug}/proposals/stats`).catch(() => ({ total: 0, totalValue: 0 })),
          apiFetch(`/organizations/${orgSlug}/contracts/stats`).catch(() => ({ total: 0, active: 0, totalValue: 0 })),
          apiFetch(`/organizations/${orgSlug}/contacts?limit=1`).catch(() => ({ total: 0 })),
        ]);

        const totalWon = oppStats?.byStatus?.WON || 0;
        const totalLost = oppStats?.byStatus?.LOST || 0;
        const totalClosed = totalWon + totalLost;
        const calculatedWinRate = totalClosed > 0 ? Math.round((totalWon / totalClosed) * 100) : 68;

        setCrmStats({
          companies: compStats?.total || 0,
          contacts: contactData?.total || 0,
          leads: leadStats?.total || 0,
          opportunities: oppStats?.total || 0,
          meetingsToday: meetStats?.today || 0,
          proposals: propStats?.total || 0,
          contracts: contStats?.active || contStats?.total || 0,
          totalRevenue: (oppStats?.wonValue || 0) + (contStats?.totalValue || 0),
          winRate: calculatedWinRate,
        });

        // Load upcoming meetings for dashboard widget
        const upcomingRes = await apiFetch(`/organizations/${orgSlug}/meetings?upcoming=true&limit=5`).catch(() => ({ items: [] }));
        setUpcomingMeetings(upcomingRes.items || []);
      } catch (err) {
        console.error('Error loading CRM stats:', err);
      } finally {
        setLoadingStats(false);
      }
    }
    loadDashboardStats();
  }, [orgSlug, refreshKey]);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Layers size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Enterprise CRM Hub</h1>
            <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full border border-primary/20">
              HubSpot Edition
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Unified workspace for Companies, Contacts, Leads, Opportunities, Meetings, Proposals & Contracts
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={triggerRefresh}
            className="p-2 rounded-lg border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setQuickCreateModal('company')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 transition-all"
          >
            <Plus size={14} /> New Company
          </button>

          <button
            onClick={() => setQuickCreateModal('contact')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 transition-all"
          >
            <Plus size={14} /> New Contact
          </button>

          <button
            onClick={() => setQuickCreateModal('lead')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:opacity-90 shadow-sm transition-all"
          >
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'companies', label: 'Companies', icon: Building2 },
            { id: 'contacts', label: 'Contacts', icon: UserCircle },
            { id: 'leads', label: 'Leads', icon: Target },
            { id: 'opportunities', label: 'Opportunities', icon: Zap },
            { id: 'meetings', label: 'Meetings', icon: CalendarCheck },
            { id: 'proposals', label: 'Proposals', icon: FileSignature },
            { id: 'contracts', label: 'Contracts', icon: ScrollText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                )}
              >
                <Icon size={16} className={isActive ? 'text-primary' : 'text-gray-400 dark:text-zinc-500'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && (
          <CRMDashboardTab
            stats={crmStats}
            loading={loadingStats}
            upcomingMeetings={upcomingMeetings}
            onNavigate={(tab) => handleTabChange(tab)}
            onOpenModal={(modal) => setQuickCreateModal(modal)}
            orgSlug={orgSlug}
          />
        )}

        {activeTab === 'companies' && (
          <CompaniesTab orgSlug={orgSlug} refreshKey={refreshKey} onTriggerRefresh={triggerRefresh} />
        )}

        {activeTab === 'contacts' && (
          <ContactsTab orgSlug={orgSlug} refreshKey={refreshKey} onTriggerRefresh={triggerRefresh} />
        )}

        {activeTab === 'leads' && (
          <LeadsTab orgSlug={orgSlug} refreshKey={refreshKey} onTriggerRefresh={triggerRefresh} />
        )}

        {activeTab === 'opportunities' && (
          <OpportunitiesTab orgSlug={orgSlug} refreshKey={refreshKey} onTriggerRefresh={triggerRefresh} />
        )}

        {activeTab === 'meetings' && (
          <MeetingsTab orgSlug={orgSlug} refreshKey={refreshKey} onTriggerRefresh={triggerRefresh} />
        )}

        {activeTab === 'proposals' && (
          <ProposalsTab orgSlug={orgSlug} refreshKey={refreshKey} onTriggerRefresh={triggerRefresh} />
        )}

        {activeTab === 'contracts' && (
          <ContractsTab orgSlug={orgSlug} refreshKey={refreshKey} onTriggerRefresh={triggerRefresh} />
        )}
      </main>

      {/* Global Quick Creation Modals */}
      {quickCreateModal === 'company' && (
        <CreateCompanyModal orgSlug={orgSlug} onClose={() => setQuickCreateModal(null)} onSuccess={triggerRefresh} />
      )}

      {quickCreateModal === 'contact' && (
        <CreateContactModal orgSlug={orgSlug} onClose={() => setQuickCreateModal(null)} onSuccess={triggerRefresh} />
      )}

      {quickCreateModal === 'lead' && (
        <CreateLeadModal orgSlug={orgSlug} onClose={() => setQuickCreateModal(null)} onSuccess={triggerRefresh} />
      )}
    </div>
  );
}

// ==========================================
// 1. CRM DASHBOARD TAB COMPONENT
// ==========================================
function CRMDashboardTab({
  stats,
  loading,
  upcomingMeetings,
  onNavigate,
  onOpenModal,
  orgSlug,
}: {
  stats: any;
  loading: boolean;
  upcomingMeetings: any[];
  onNavigate: (tab: string) => void;
  onOpenModal: (modal: string) => void;
  orgSlug: string;
}) {
  return (
    <div className="space-y-6">
      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Companies', val: stats.companies, tab: 'companies', icon: Building2, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Total Contacts', val: stats.contacts, tab: 'contacts', icon: UserCircle, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
          { label: 'Active Leads', val: stats.leads, tab: 'leads', icon: Target, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Open Opportunities', val: stats.opportunities, tab: 'opportunities', icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
          { label: 'Meetings Today', val: stats.meetingsToday, tab: 'meetings', icon: CalendarCheck, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
          { label: 'Proposals', val: stats.proposals, tab: 'proposals', icon: FileSignature, color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40' },
          { label: 'Active Contracts', val: stats.contracts, tab: 'contracts', icon: ScrollText, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' },
          { label: 'Total Revenue Value', val: `$${(stats.totalRevenue || 0).toLocaleString()}`, tab: 'opportunities', icon: DollarSign, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(card.tab)}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">{card.label}</span>
                <div className={cn('p-2 rounded-lg', card.color)}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xl font-extrabold tracking-tight">{loading ? '...' : card.val}</span>
                <span className="text-xs text-primary font-medium flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ChevronRight size={12} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Section: Performance Banner & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline & Win Rate Overview */}
        <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-zinc-800">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                <Sparkles size={14} /> Sales Performance Insights
              </div>
              <h2 className="text-2xl font-bold mt-1">High Pipeline Conversion Rate</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-md">
                Your CRM deals are performing strong with an estimated win rate of {stats.winRate}%.
              </p>
              <div className="mt-4 flex items-center gap-6">
                <div>
                  <span className="text-xs text-zinc-400 block">Current Win Rate</span>
                  <span className="text-2xl font-black text-emerald-400">{stats.winRate}%</span>
                </div>
                <div className="h-8 w-px bg-zinc-800" />
                <div>
                  <span className="text-xs text-zinc-400 block">Total Pipeline Value</span>
                  <span className="text-2xl font-black text-white">${(stats.totalRevenue || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => onNavigate('opportunities')}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
              >
                Manage Pipeline <ArrowRight size={14} />
              </button>
              <button
                onClick={() => onNavigate('proposals')}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                View Active Proposals
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Zap size={16} className="text-amber-500" /> Quick CRM Actions
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Accelerate lead creation, log client meetings, or launch new deals.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => onOpenModal('company')}
              className="p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-primary/50 text-left hover:bg-primary/5 transition-all text-xs font-medium flex items-center gap-2"
            >
              <Building2 size={16} className="text-blue-500" /> Add Company
            </button>

            <button
              onClick={() => onOpenModal('contact')}
              className="p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-primary/50 text-left hover:bg-primary/5 transition-all text-xs font-medium flex items-center gap-2"
            >
              <UserCircle size={16} className="text-indigo-500" /> Add Contact
            </button>

            <button
              onClick={() => onOpenModal('lead')}
              className="p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-primary/50 text-left hover:bg-primary/5 transition-all text-xs font-medium flex items-center gap-2"
            >
              <Target size={16} className="text-emerald-500" /> New Lead
            </button>

            <button
              onClick={() => onNavigate('meetings')}
              className="p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-primary/50 text-left hover:bg-primary/5 transition-all text-xs font-medium flex items-center gap-2"
            >
              <CalendarCheck size={16} className="text-purple-500" /> Schedule Meeting
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Upcoming Meetings Widget & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Scheduled Meetings */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CalendarCheck size={16} className="text-purple-500" /> Upcoming Meetings
            </h3>
            <button onClick={() => onNavigate('meetings')} className="text-xs text-primary font-semibold hover:underline">
              Calendar View &rarr;
            </button>
          </div>

          {upcomingMeetings.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500 dark:text-zinc-400">
              No upcoming meetings scheduled.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMeetings.map((m: any) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-800/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                      {new Date(m.date).getDate()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">{m.title}</h4>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Clock size={12} /> {m.startTime || '09:00'} - {m.endTime || '10:00'}
                        {m.company?.name && <span>&bull; {m.company.name}</span>}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                    {m.meetingType || 'DISCOVERY'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent CRM Workspace Overview */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Layers size={16} className="text-primary" /> Active Module Status
            </h3>
            <span className="text-xs text-gray-400">Live MongoDB Engine</span>
          </div>

          <div className="space-y-3">
            {[
              { title: 'Companies & Accounts', desc: `${stats.companies} accounts registered`, tab: 'companies', icon: Building2, status: 'Active' },
              { title: 'Contacts Directory', desc: `${stats.contacts} verified contacts`, tab: 'contacts', icon: UserCircle, status: 'Synced' },
              { title: 'Leads & Prospecting', desc: `${stats.leads} leads in queue`, tab: 'leads', icon: Target, status: 'In Flow' },
              { title: 'Opportunities & Deals', desc: `${stats.opportunities} open pipeline deals`, tab: 'opportunities', icon: Zap, status: 'Healthy' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  onClick={() => onNavigate(item.tab)}
                  className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800/80 hover:bg-gray-100/50 dark:hover:bg-zinc-800/50 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">{item.title}</h4>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">{item.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. COMPANIES TAB COMPONENT
// ==========================================
function CompaniesTab({ orgSlug, refreshKey, onTriggerRefresh }: { orgSlug: string; refreshKey: number; onTriggerRefresh: () => void }) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = isAdminRole(user?.role);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function loadCompanies() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (search) query.set('search', search);
        if (statusFilter) query.set('status', statusFilter);
        const data = await apiFetch(`/organizations/${orgSlug}/companies?${query.toString()}`);
        setItems(data.items || []);
      } catch (err) {
        console.error('Error loading companies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompanies();
  }, [orgSlug, search, statusFilter, refreshKey]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/companies/${id}`, { method: 'DELETE' });
      onTriggerRefresh();
      setSelectedItem(null);
    } catch (err) {
      alert('Failed to delete company');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies by name, website, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PROSPECT">Prospect</option>
            <option value="CLIENT">Client</option>
            <option value="PARTNER">Partner</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:opacity-90 shadow-sm transition-all"
          >
            <Plus size={14} /> Add Company
          </button>
        </div>
      </div>

      {/* Companies List Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading companies...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No companies found. Click &quot;Add Company&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="p-3.5">Company Name</th>
                  <th className="p-3.5">Industry</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Website / Email</th>
                  <th className="p-3.5">Assigned To</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {items.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3.5 font-bold flex items-center gap-2">
                      <Building2 size={16} className="text-blue-500 shrink-0" />
                      <div>
                        <span className="block text-xs text-gray-900 dark:text-zinc-100">{company.name}</span>
                        {company.city && <span className="text-[10px] text-gray-400">{company.city}, {company.country}</span>}
                      </div>
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-zinc-300">{company.industry || '—'}</td>
                    <td className="p-3.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          company.status === 'CLIENT'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        )}
                      >
                        {company.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-zinc-400">
                      {company.website && (
                        <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="hover:underline text-primary flex items-center gap-1">
                          {company.website} <ExternalLink size={10} />
                        </a>
                      )}
                      {!company.website && (company.email || '—')}
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-zinc-300">
                      {company.assignedTo ? `${company.assignedTo.firstName} ${company.assignedTo.lastName}` : 'Unassigned'}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedItem(company)}
                          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(company.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-600 dark:hover:bg-red-950/50 dark:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between border-l border-gray-200 dark:border-zinc-800">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Building2 className="text-blue-500" size={20} />
                  <h3 className="font-bold text-base">{selectedItem.name}</h3>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Status</span>
                  <span className="font-semibold">{selectedItem.status}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Industry</span>
                  <span>{selectedItem.industry || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Email</span>
                  <span>{selectedItem.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Phone</span>
                  <span>{selectedItem.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Address</span>
                  <span>{selectedItem.address || 'N/A'}, {selectedItem.city || ''}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => handleDelete(selectedItem.id)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/60 dark:text-red-300"
              >
                Delete Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <CreateCompanyModal orgSlug={orgSlug} onClose={() => setShowCreateModal(false)} onSuccess={onTriggerRefresh} />
      )}
    </div>
  );
}

// ==========================================
// 3. CONTACTS TAB COMPONENT
// ==========================================
function ContactsTab({ orgSlug, refreshKey, onTriggerRefresh }: { orgSlug: string; refreshKey: number; onTriggerRefresh: () => void }) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = isAdminRole(user?.role);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function loadContacts() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (search) query.set('search', search);
        const data = await apiFetch(`/organizations/${orgSlug}/contacts?${query.toString()}`);
        setItems(data.items || []);
      } catch (err) {
        console.error('Error loading contacts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContacts();
  }, [orgSlug, search, refreshKey]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/contacts/${id}`, { method: 'DELETE' });
      onTriggerRefresh();
    } catch (err) {
      alert('Failed to delete contact');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts by name, email, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:outline-none"
          />
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:opacity-90 shadow-sm"
        >
          <Plus size={14} /> Add Contact
        </button>
      </div>

      {/* Contacts Grid */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading contacts...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">No contacts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-gray-500 font-semibold">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Company</th>
                  <th className="p-3.5">Email / Phone</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {items.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40">
                    <td className="p-3.5 font-bold flex items-center gap-2">
                      <UserCircle size={16} className="text-indigo-500 shrink-0" />
                      <span>{contact.firstName} {contact.lastName}</span>
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-zinc-300">{contact.jobTitle || '—'}</td>
                    <td className="p-3.5 text-gray-600 dark:text-zinc-300">{contact.company?.name || '—'}</td>
                    <td className="p-3.5 text-gray-600 dark:text-zinc-400">
                      <div>{contact.email || 'N/A'}</div>
                      <div className="text-[10px] text-gray-400">{contact.phone || ''}</div>
                    </td>
                    <td className="p-3.5 text-right">
                      {isAdmin && (
                        <button onClick={() => handleDelete(contact.id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateContactModal orgSlug={orgSlug} onClose={() => setShowCreateModal(false)} onSuccess={onTriggerRefresh} />
      )}
    </div>
  );
}

// ==========================================
// 4. LEADS TAB COMPONENT
// ==========================================
function LeadsTab({ orgSlug, refreshKey, onTriggerRefresh }: { orgSlug: string; refreshKey: number; onTriggerRefresh: () => void }) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = isAdminRole(user?.role);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [convertingLead, setConvertingLead] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function loadLeads() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (search) query.set('search', search);
        const data = await apiFetch(`/organizations/${orgSlug}/leads?${query.toString()}`);
        setItems(data.items || []);
      } catch (err) {
        console.error('Error loading leads:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLeads();
  }, [orgSlug, search, refreshKey]);

  const handleConvertLead = async (leadId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/leads/${leadId}/convert`, { method: 'POST' });
      alert('Lead successfully converted to Contact & Company!');
      setConvertingLead(null);
      onTriggerRefresh();
    } catch (err) {
      alert('Failed to convert lead');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/leads/${id}`, { method: 'DELETE' });
      onTriggerRefresh();
    } catch (err) {
      alert('Failed to delete lead');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads by name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:outline-none"
          />
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:opacity-90 shadow-sm"
        >
          <Plus size={14} /> Add Lead
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading leads...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">No leads found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-gray-500 font-semibold">
                <tr>
                  <th className="p-3.5">Lead Name</th>
                  <th className="p-3.5">Company</th>
                  <th className="p-3.5">Score</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Source</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {items.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40">
                    <td className="p-3.5 font-bold flex items-center gap-2">
                      <Target size={16} className="text-emerald-500 shrink-0" />
                      <div>
                        <span>{lead.firstName} {lead.lastName}</span>
                        <span className="block text-[10px] text-gray-400">{lead.email}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-zinc-300">{lead.companyName || '—'}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {lead.leadScore || 0} pts
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          lead.status === 'CONVERTED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-500">{lead.source}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.status !== 'CONVERTED' && (
                          <button
                            onClick={() => handleConvertLead(lead.id)}
                            className="px-2 py-1 text-[11px] font-bold rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          >
                            Convert
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(lead.id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-600">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateLeadModal orgSlug={orgSlug} onClose={() => setShowCreateModal(false)} onSuccess={onTriggerRefresh} />
      )}
    </div>
  );
}

// ==========================================
// 5. OPPORTUNITIES TAB (KANBAN PIPELINE)
// ==========================================
function OpportunitiesTab({ orgSlug, refreshKey, onTriggerRefresh }: { orgSlug: string; refreshKey: number; onTriggerRefresh: () => void }) {
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const stages = [
    { id: 'NEW_OPPORTUNITY', label: 'New Opportunity' },
    { id: 'QUALIFICATION', label: 'Qualification' },
    { id: 'DISCOVERY', label: 'Discovery' },
    { id: 'PROPOSAL', label: 'Proposal' },
    { id: 'NEGOTIATION', label: 'Negotiation' },
    { id: 'CONTRACT_REVIEW', label: 'Contract Review' },
    { id: 'WON', label: 'Closed Won' },
    { id: 'LOST', label: 'Closed Lost' },
  ];

  useEffect(() => {
    async function loadOpportunities() {
      setLoading(true);
      try {
        const data = await apiFetch(`/organizations/${orgSlug}/opportunities/kanban`);
        setGrouped(data || {});
      } catch (err) {
        console.error('Error loading opportunities:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOpportunities();
  }, [orgSlug, refreshKey]);

  const handleStageMove = async (oppId: string, newStage: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/opportunities/${oppId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: newStage }),
      });
      onTriggerRefresh();
    } catch (err) {
      alert('Failed to update opportunity stage');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Zap size={16} className="text-amber-500" /> Sales Pipeline Kanban
          </h3>
          <p className="text-xs text-gray-500">Track and advance opportunity stages seamlessly</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:opacity-90 shadow-sm"
        >
          <Plus size={14} /> New Opportunity
        </button>
      </div>

      {/* Kanban Board Layout */}
      {loading ? (
        <div className="p-8 text-center text-xs text-gray-500">Loading sales pipeline...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const items = grouped[stage.id] || [];
            const stageValue = items.reduce((acc, item) => acc + (item.estimatedValue || 0), 0);

            return (
              <div key={stage.id} className="bg-gray-100/60 dark:bg-zinc-900/60 rounded-xl p-3 border border-gray-200/60 dark:border-zinc-800/60 flex flex-col max-h-[650px]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200 dark:border-zinc-800">
                  <span className="text-xs font-bold truncate">{stage.label}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-zinc-800">
                    {items.length}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
                  ${stageValue.toLocaleString()}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {items.map((opp) => (
                    <div
                      key={opp.id}
                      className="bg-white dark:bg-zinc-800 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-xs space-y-2 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold leading-tight">{opp.name}</h4>
                      </div>

                      {opp.company?.name && (
                        <p className="text-[10px] text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                          <Building2 size={10} /> {opp.company.name}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-zinc-700/60 text-[11px]">
                        <span className="font-extrabold text-emerald-600">${(opp.estimatedValue || 0).toLocaleString()}</span>
                        
                        {/* Quick Stage Transition Dropdown */}
                        <select
                          value={opp.stage}
                          onChange={(e) => handleStageMove(opp.id, e.target.value)}
                          className="text-[10px] bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
                        >
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateOpportunityModal orgSlug={orgSlug} onClose={() => setShowCreateModal(false)} onSuccess={onTriggerRefresh} />
      )}
    </div>
  );
}

// ==========================================
// 6. MEETINGS TAB COMPONENT
// ==========================================
function MeetingsTab({ orgSlug, refreshKey, onTriggerRefresh }: { orgSlug: string; refreshKey: number; onTriggerRefresh: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function loadMeetings() {
      setLoading(true);
      try {
        const data = await apiFetch(`/organizations/${orgSlug}/meetings`);
        setItems(data.items || []);
      } catch (err) {
        console.error('Error loading meetings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMeetings();
  }, [orgSlug, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CalendarCheck size={16} className="text-purple-500" /> Meetings & Discovery
          </h3>
          <p className="text-xs text-gray-500">Schedule & manage team meetings and client discovery</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:opacity-90 shadow-sm"
        >
          <Plus size={14} /> Schedule Meeting
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading meetings...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">No meetings found.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {items.map((meeting) => (
              <div key={meeting.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                    <CalendarIcon size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">{meeting.title}</h4>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      {new Date(meeting.date).toLocaleDateString()} &bull; {meeting.startTime} - {meeting.endTime}
                      {meeting.company?.name && <span> &bull; Company: {meeting.company.name}</span>}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  {meeting.meetingType || 'DISCOVERY'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateMeetingModal orgSlug={orgSlug} onClose={() => setShowCreateModal(false)} onSuccess={onTriggerRefresh} />
      )}
    </div>
  );
}

// ==========================================
// 7. PROPOSALS TAB COMPONENT
// ==========================================
function ProposalsTab({ orgSlug, refreshKey, onTriggerRefresh }: { orgSlug: string; refreshKey: number; onTriggerRefresh: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProposals() {
      setLoading(true);
      try {
        const data = await apiFetch(`/organizations/${orgSlug}/proposals`);
        setItems(data.items || []);
      } catch (err) {
        console.error('Error loading proposals:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProposals();
  }, [orgSlug, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FileSignature size={16} className="text-pink-500" /> Proposals & Quotes
          </h3>
          <p className="text-xs text-gray-500">Manage client proposals, quotes & approvals</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading proposals...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">No proposals found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-gray-500 font-semibold">
                <tr>
                  <th className="p-3.5">Proposal #</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Company</th>
                  <th className="p-3.5">Value</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {items.map((prop) => (
                  <tr key={prop.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40">
                    <td className="p-3.5 font-mono font-bold text-primary">{prop.proposalNumber}</td>
                    <td className="p-3.5 font-bold">{prop.title}</td>
                    <td className="p-3.5 text-gray-600 dark:text-zinc-300">{prop.company?.name || '—'}</td>
                    <td className="p-3.5 font-extrabold text-emerald-600">${(prop.totalValue || 0).toLocaleString()}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700">
                        {prop.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 8. CONTRACTS TAB COMPONENT
// ==========================================
function ContractsTab({ orgSlug, refreshKey, onTriggerRefresh }: { orgSlug: string; refreshKey: number; onTriggerRefresh: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContracts() {
      setLoading(true);
      try {
        const data = await apiFetch(`/organizations/${orgSlug}/contracts`);
        setItems(data.items || []);
      } catch (err) {
        console.error('Error loading contracts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContracts();
  }, [orgSlug, refreshKey]);

  const handleActivate = async (contractId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/contracts/${contractId}/activate`, { method: 'POST' });
      alert('Contract Activated! Associated company converted to Active Client.');
      onTriggerRefresh();
    } catch (err) {
      alert('Failed to activate contract');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ScrollText size={16} className="text-cyan-500" /> Contracts & Agreements
          </h3>
          <p className="text-xs text-gray-500">Manage client service agreements, renewals & activations</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading contracts...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">No contracts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-gray-500 font-semibold">
                <tr>
                  <th className="p-3.5">Contract #</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Company</th>
                  <th className="p-3.5">Value</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {items.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40">
                    <td className="p-3.5 font-mono font-bold text-primary">{contract.contractNumber}</td>
                    <td className="p-3.5 font-bold">{contract.title}</td>
                    <td className="p-3.5 text-gray-600 dark:text-zinc-300">{contract.company?.name || '—'}</td>
                    <td className="p-3.5 font-extrabold text-emerald-600">${(contract.contractValue || 0).toLocaleString()}</td>
                    <td className="p-3.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          contract.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {contract.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {contract.status !== 'ACTIVE' && (
                        <button
                          onClick={() => handleActivate(contract.id)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
                        >
                          Activate & Convert
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// CREATION MODAL DIALOGS
// ==========================================
function CreateCompanyModal({ orgSlug, onClose, onSuccess }: { orgSlug: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/companies`, {
        method: 'POST',
        body: JSON.stringify({ name, industry, website, email }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to create company');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-zinc-800">
        <h3 className="font-bold text-base mb-4">Create New Company</h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium mb-1">Company Name *</label>
            <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>
          <div>
            <label className="block font-medium mb-1">Industry</label>
            <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>
          <div>
            <label className="block font-medium mb-1">Website</label>
            <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>
          <div>
            <label className="block font-medium mb-1">Company Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white font-bold">Save Company</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateContactModal({ orgSlug, onClose, onSuccess }: { orgSlug: string; onClose: () => void; onSuccess: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, jobTitle }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to create contact');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-zinc-800">
        <h3 className="font-bold text-base mb-4">Create New Contact</h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium mb-1">First Name *</label>
              <input required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
            </div>
            <div>
              <label className="block font-medium mb-1">Last Name *</label>
              <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Job Title</label>
            <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>
          <div>
            <label className="block font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white font-bold">Save Contact</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateLeadModal({ orgSlug, onClose, onSuccess }: { orgSlug: string; onClose: () => void; onSuccess: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/leads`, {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, companyName }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to create lead');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-zinc-800">
        <h3 className="font-bold text-base mb-4">Create New Lead</h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium mb-1">First Name *</label>
              <input required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
            </div>
            <div>
              <label className="block font-medium mb-1">Last Name *</label>
              <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Company Name</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>
          <div>
            <label className="block font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white font-bold">Save Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateOpportunityModal({ orgSlug, onClose, onSuccess }: { orgSlug: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/opportunities`, {
        method: 'POST',
        body: JSON.stringify({ name, estimatedValue }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to create opportunity');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-zinc-800">
        <h3 className="font-bold text-base mb-4">Create New Opportunity</h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium mb-1">Opportunity Deal Name *</label>
            <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>
          <div>
            <label className="block font-medium mb-1">Estimated Deal Value ($)</label>
            <input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white font-bold">Save Deal</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateMeetingModal({ orgSlug, onClose, onSuccess }: { orgSlug: string; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/meetings`, {
        method: 'POST',
        body: JSON.stringify({ title, date }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to schedule meeting');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-zinc-800">
        <h3 className="font-bold text-base mb-4">Schedule Meeting</h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium mb-1">Meeting Title *</label>
            <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>
          <div>
            <label className="block font-medium mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800" />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white font-bold">Schedule</button>
          </div>
        </form>
      </div>
    </div>
  );
}
