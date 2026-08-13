'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  PieChart, TrendingUp, TrendingDown, Shield, Cpu, Activity,
  DollarSign, Briefcase, Users, BookOpen, Workflow, AlertTriangle,
  CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, RefreshCw,
  Download, Filter, Calendar, Sparkles, Target, Zap, ChevronRight,
  Layers, Lock, Eye, Award, ExternalLink, HelpCircle
} from 'lucide-react';

interface ExecutiveData {
  healthScore: number;
  aiConfidenceScore: number;
  summaryText: string;
  dailyHighlights: string[];
  metrics: {
    overview: { healthScore: number; aiConfidenceScore: number; weeklySummary: string; dailyHighlights: string[] };
    crm: { totalCompanies: number; activeClients: number; newLeads: number; conversionRate: number; salesPipelineValue: number; opportunityWinRate: number };
    projects: { activeProjects: number; completedProjects: number; delayedProjects: number; budgetUsagePercent: number; teamProductivityScore: number; resourceUtilizationPercent: number };
    financial: { revenue: number; expectedRevenue: number; proposalValue: number; contractValue: number; monthlyGrowthPercent: number; q3Forecast: number };
    team: { activeUsers: number; departmentPerformance: Array<{ department: string; score: number }>; workloadDistribution: Array<{ category: string; percent: number }>; timeTrackingTotalHours: number; meetingStats: { totalMeetings: number; avgDurationMins: number; actionItemsCount: number } };
    knowledge: { articlesCreated: number; mostViewedDocuments: Array<{ title: string; views: number }>; searchTrends: Array<{ term: string; count: number }>; knowledgeHealthScore: number };
    workflows: { totalWorkflows: number; successfulExecutions: number; failedExecutions: number; automationSavingsHours: number };
  };
  insights: Array<{ id: string; category: string; title: string; description: string; impact: string; actionable: boolean; recommendedAction: string }>;
  predictions: Array<{ id: string; targetMetric: string; metricName: string; predictedValue: number; unit: string; confidenceRangeMin: number; confidenceRangeMax: number; confidenceScorePercent: number; horizon: string; rationale: string }>;
  alerts: Array<{ id: string; severity: string; title: string; message: string; sourceModule: string; actionUrl?: string; isAcknowledged: boolean; createdAt: string }>;
  lastCalculatedAt: string;
}

export default function EnterpriseExecutiveDashboardPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'alerts' | 'predictions'>('overview');
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'ytd'>('quarter');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/organizations/${orgSlug}/executive/dashboard`);
      setData(res);
    } catch (err) {
      console.error('Failed to load executive dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await apiFetch(`/organizations/${orgSlug}/executive/dashboard`);
      setData(res);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `executive-dashboard-${orgSlug}-${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-xs font-semibold text-gray-500">Aggregating Enterprise AI Executive Intelligence...</p>
        </div>
      </div>
    );
  }

  const m = data?.metrics;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950 text-white shadow-xl gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Enterprise Executive AI Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live C-Suite Mode
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Real-time cross-department analytics, organization health metrics, predictive forecasts, and strategic AI recommendations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Date Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-medium text-white focus:outline-none"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter (Q3)</option>
            <option value="ytd">Year To Date</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-medium text-white focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="Sales">Sales & CRM</option>
            <option value="Engineering">Engineering & PM</option>
            <option value="Finance">Finance</option>
            <option value="Operations">Operations</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 font-medium text-xs flex items-center gap-1.5 transition-colors text-white shadow-sm"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto scrollbar-hide pb-0.5">
        {[
          { id: 'overview', label: 'Executive Overview', icon: Activity },
          { id: 'insights', label: `AI Strategic Insights (${data?.insights?.length || 0})`, icon: Sparkles },
          { id: 'alerts', label: `Risk & Compliance Alerts (${data?.alerts?.filter((a) => !a.isAcknowledged).length || 0})`, icon: AlertTriangle },
          { id: 'predictions', label: 'AI Predictive Forecasting', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Executive Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Section 1: Health Score Gauge & AI Summary Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Score Gauge */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Organization Health Score</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                  Optimal Growth
                </span>
              </div>

              <div className="flex items-center justify-center py-4">
                <div className="relative w-36 h-36 rounded-full border-8 border-emerald-500/20 flex items-center justify-center bg-gradient-to-tr from-emerald-500/10 to-teal-500/5">
                  <div className="text-center">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      {data?.healthScore || 94}
                    </span>
                    <span className="text-xs font-bold text-gray-400 block">/ 100</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-gray-100 dark:border-zinc-800 text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Cpu size={14} className="text-indigo-500" />
                  <span>AI Confidence:</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{data?.aiConfidenceScore || 96.5}%</span>
              </div>
            </div>

            {/* AI Executive Briefing */}
            <div className="lg:col-span-2 p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-primary" /> Weekly Business Executive Briefing
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">Synthesized by AI Assistant Core</span>
              </div>

              <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed font-sans bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                {data?.summaryText}
              </p>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Daily Key Highlights</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data?.dailyHighlights?.map((highlight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-zinc-400 p-2.5 rounded-lg bg-gray-50/50 dark:bg-zinc-800/40">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Large Executive KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase">
                <span>Sales Pipeline</span>
                <DollarSign size={18} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${m?.crm.salesPipelineValue.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp size={14} /> +{m?.financial.monthlyGrowthPercent}% MoM
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase">
                <span>Contracted Revenue</span>
                <Award size={18} className="text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${m?.financial.revenue.toLocaleString()}
              </p>
              <div className="text-xs text-gray-500 font-mono">
                Forecast: ${m?.financial.q3Forecast.toLocaleString()}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase">
                <span>Active Projects</span>
                <Briefcase size={18} className="text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {m?.projects.activeProjects} Projects
              </p>
              <div className="text-xs text-gray-500">
                {m?.projects.delayedProjects} Delayed | {m?.projects.teamProductivityScore}% Velocity
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase">
                <span>Team Capacity</span>
                <Users size={18} className="text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {m?.team.activeUsers} Members
              </p>
              <div className="text-xs text-gray-500">
                {m?.projects.resourceUtilizationPercent}% Utilization Rate
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase">
                <span>Automation Saved</span>
                <Workflow size={18} className="text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {m?.workflows.automationSavingsHours} hrs/mo
              </p>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {m?.workflows.successfulExecutions} Executions (99.3%)
              </div>
            </div>
          </div>

          {/* Section 3: Revenue & Sales Pipeline Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Pipeline Funnel Breakdown */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Target size={18} className="text-emerald-500" /> Sales Funnel Conversion Rates
                </h3>
                <span className="text-xs text-gray-400 font-mono">Win Rate: {m?.crm.opportunityWinRate}%</span>
              </div>

              <div className="space-y-3">
                {[
                  { stage: 'New Leads', count: m?.crm.newLeads, val: '$680,000', width: 'w-full', color: 'bg-indigo-500' },
                  { stage: 'Proposals Sent', count: 38, val: '$480,000', width: 'w-4/5', color: 'bg-blue-500' },
                  { stage: 'Opportunities In Negotiation', count: 34, val: '$420,000', width: 'w-3/5', color: 'bg-purple-500' },
                  { stage: 'Active Client Contracts', count: m?.crm.activeClients, val: '$1,280,000', width: 'w-2/5', color: 'bg-emerald-500' },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-700 dark:text-zinc-300">{item.stage} ({item.count})</span>
                      <span className="font-mono text-gray-500">{item.val}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} ${item.width} rounded-full transition-all duration-500`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Performance Matrix */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-purple-500" /> Department Performance Breakdown
                </h3>
                <span className="text-xs text-gray-400">Target Score: 90+</span>
              </div>

              <div className="space-y-3.5">
                {m?.team.departmentPerformance.map((dept, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-900 dark:text-gray-100">{dept.department}</span>
                      <span className="font-mono text-primary">{dept.score} / 100</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full"
                        style={{ width: `${dept.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: AI Recommendations & Critical Risk Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Strategic Recommendations Panel */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" /> AI Strategic Recommendations
                </h3>
                <button onClick={() => setActiveTab('insights')} className="text-xs text-primary font-medium hover:underline">
                  View All ({data?.insights?.length})
                </button>
              </div>

              <div className="space-y-3">
                {data?.insights?.slice(0, 3).map((ins) => (
                  <div key={ins.id} className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-gray-900 dark:text-white">{ins.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        ins.impact === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                      }`}>
                        {ins.impact}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">{ins.description}</p>
                    <div className="text-[11px] text-primary font-medium flex items-center gap-1 pt-1">
                      <span>Action: {ins.recommendedAction}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Alerts Panel */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500" /> Active Risk & Compliance Alerts
                </h3>
                <button onClick={() => setActiveTab('alerts')} className="text-xs text-primary font-medium hover:underline">
                  Manage Alerts ({data?.alerts?.length})
                </button>
              </div>

              <div className="space-y-3">
                {data?.alerts?.map((alt) => (
                  <div key={alt.id} className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/80 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          alt.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                        }`}>
                          {alt.severity}
                        </span>
                        <span className="font-semibold text-xs text-gray-900 dark:text-white">{alt.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">{alt.message}</p>
                    </div>
                    {alt.actionUrl && (
                      <Link
                        href={`/${orgSlug}${alt.actionUrl}`}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-primary hover:text-white transition-colors text-xs shrink-0"
                      >
                        <ArrowUpRight size={14} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI Strategic Insights */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI Strategic Business Insights</h2>
              <p className="text-xs text-gray-500">Cross-department recommendations generated by the Executive AI Engine</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.insights?.map((ins) => (
              <div key={ins.id} className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded bg-primary/10 text-primary">
                    {ins.category}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    ins.impact === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                  }`}>
                    {ins.impact} Impact
                  </span>
                </div>

                <h3 className="font-bold text-sm text-gray-900 dark:text-white">{ins.title}</h3>
                <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">{ins.description}</p>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/80 text-xs space-y-1">
                  <span className="font-semibold text-primary block">Recommended Action:</span>
                  <span className="text-gray-700 dark:text-zinc-300">{ins.recommendedAction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Risk & Compliance Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Executive Risk & Compliance Alerts</h2>
              <p className="text-xs text-gray-500">Monitor contract renewals, milestone delays, and capacity bottlenecks</p>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">Severity</th>
                  <th className="px-6 py-3.5">Alert Details</th>
                  <th className="px-6 py-3.5">Source Module</th>
                  <th className="px-6 py-3.5 text-right">Action Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {data?.alerts?.map((alt) => (
                  <tr key={alt.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        alt.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                      }`}>
                        {alt.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-y-0.5">
                      <p className="font-semibold text-xs text-gray-900 dark:text-white">{alt.title}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">{alt.message}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-semibold text-indigo-500">
                      {alt.sourceModule}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {alt.actionUrl && (
                        <Link
                          href={`/${orgSlug}${alt.actionUrl}`}
                          className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                        >
                          Resolve Issue <ArrowUpRight size={14} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: AI Predictive Forecasting */}
      {activeTab === 'predictions' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI Predictive Intelligence Engine</h2>
            <p className="text-xs text-gray-500">30-day and 90-day predictive forecasts with statistical confidence ranges</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data?.predictions?.map((pred) => (
              <div key={pred.id} className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">{pred.metricName}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                    {pred.confidenceScorePercent}% Confidence
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block">Predicted Value ({pred.horizon})</span>
                    <span className="text-2xl font-extrabold text-primary">
                      {pred.unit === 'USD' ? `$${pred.predictedValue.toLocaleString()}` : `${pred.predictedValue} ${pred.unit}`}
                    </span>
                  </div>
                  <div className="text-right text-xs font-mono text-gray-500">
                    <span>Range: </span>
                    <span className="font-semibold text-gray-700 dark:text-zinc-300">
                      {pred.unit === 'USD' ? `$${pred.confidenceRangeMin.toLocaleString()} - $${pred.confidenceRangeMax.toLocaleString()}` : `${pred.confidenceRangeMin} - ${pred.confidenceRangeMax}`}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-sans space-y-1">
                  <span className="font-semibold text-gray-900 dark:text-white block">AI Forecasting Rationale:</span>
                  <p>{pred.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
