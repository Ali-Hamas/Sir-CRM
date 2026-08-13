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
  Layers, Lock, Eye, Award, ExternalLink, HelpCircle, BarChart3,
  SlidersHorizontal, Plus, Trash2, FileText, Check, AlertCircle,
  MessageSquare, Bot, Database, UserCheck, Wrench, ShieldAlert,
  ArrowRight, Play, LineChart as LineChartIcon
} from 'lucide-react';

interface AnalyticsData {
  organization: { id: string; name: string; slug: string };
  healthScore: number;
  aiConfidenceScore: number;
  metrics: {
    overview: { healthScore: number; aiConfidenceScore: number; activeUsersCount: number; totalEntitiesCount: number };
    crm: { totalCompanies: number; totalContacts: number; totalLeads: number; totalOpportunities: number; totalMeetings: number; totalContracts: number; salesPipelineValue: number; opportunityWinRate: number; leadConversionRate: number; avgContractValue: number };
    projects: { totalProjects: number; activeProjects: number; completedProjects: number; totalTasks: number; completedTasks: number; taskCompletionRate: number; totalHoursTracked: number; resourceUtilizationPercent: number; productivityScore: number };
    knowledgeAndDocuments: { totalKnowledgeArticles: number; totalDocuments: number; totalDocumentStorageBytes: number; knowledgeUsageScore: number; documentActivityCount: number };
    workflowsAndProcesses: { totalWorkflows: number; workflowExecutionsCount: number; workflowSuccessRate: number; totalBusinessProcesses: number; businessProcessExecutionsCount: number; automationSavingsHours: number };
    communications: { totalMessagesSent: number; deliveredRate: number; emailMessagesCount: number; slackMessagesCount: number; webhookTriggersCount: number };
    aiUsage: { totalAiExecutions: number; totalTokensConsumed: number; avgLatencyMs: number; agentExecutionsCount: number; toolExecutionsCount: number };
  };
  forecasts: Array<{ id: string; targetMetric: string; metricName: string; currentValue: number; predictedValue: number; unit: string; confidenceRangeMin: number; confidenceRangeMax: number; confidenceScore: number; horizon: string; trend: string; rationale: string; historicalTrend: Array<{ label: string; value: number }>; forecastPoints: Array<{ label: string; predicted: number }> }>;
  anomalies: Array<{ id: string; metricKey: string; metricName: string; category: string; severity: string; expectedValue: number; actualValue: number; deviationPercent: number; description: string; detectedAt: string; isResolved: boolean }>;
  recommendations: Array<{ id: string; category: string; title: string; description: string; impact: string; actionable: boolean; actionStep?: string; estimatedRoi?: string; status: string }>;
  activeDashboard: { id: string; name: string; widgets: Array<{ id: string; title: string; type: string; metricKey?: string; positionX: number; positionY: number; width: number; height: number }> } | null;
  lastCalculatedAt: string;
}

export default function AnalyticsPlatformPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<
    'Executive' | 'CRM' | 'Projects' | 'AI' | 'Communications' | 'Workflows' | 'Reports' | 'Forecasts' | 'Recommendations'
  >('Executive');

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d');
  const [reports, setReports] = useState<any[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('EXECUTIVE_SUMMARY');

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/organizations/${orgSlug}/analytics/overview`);
      setData(res);
      const repList = await apiFetch(`/organizations/${orgSlug}/analytics/reports`).catch(() => []);
      setReports(repList);
    } catch (err) {
      console.error('Failed to load analytics overview:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await apiFetch(`/organizations/${orgSlug}/analytics/overview`);
      setData(res);
    } catch (err) {
      console.error('Failed to refresh analytics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const newReport = await apiFetch(`/organizations/${orgSlug}/analytics/reports/generate`, {
        method: 'POST',
        body: JSON.stringify({ type: selectedReportType }),
      });
      setReports((prev) => [newReport, ...prev]);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleExportData = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `blackdesk-analytics-${orgSlug}-${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400">Loading BlackDesk Decision Intelligence & Analytics...</p>
        </div>
      </div>
    );
  }

  const m = data?.metrics;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <PieChart className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise Analytics & Decision Intelligence</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Real-time cross-system metrics aggregation, predictive forecasting, AI recommendation engine & automated reporting.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range Selector */}
          <div className="flex items-center bg-gray-100 dark:bg-zinc-800/80 rounded-lg p-1 text-xs font-medium border border-gray-200 dark:border-zinc-700">
            {(['7d', '30d', '90d', 'ytd'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors border border-gray-200 dark:border-zinc-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Export Data
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 dark:border-zinc-800 scrollbar-hide">
        {(
          [
            { id: 'Executive', icon: Activity },
            { id: 'CRM', icon: Briefcase },
            { id: 'Projects', icon: Layers },
            { id: 'AI', icon: Sparkles },
            { id: 'Communications', icon: MessageSquare },
            { id: 'Workflows', icon: Workflow },
            { id: 'Reports', icon: FileText },
            { id: 'Forecasts', icon: LineChartIcon },
            { id: 'Recommendations', icon: Award },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary font-semibold bg-primary/5'
                  : 'border-transparent text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-zinc-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.id}
            </button>
          );
        })}
      </div>

      {/* ========================================== */}
      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {/* ========================================== */}
      {activeTab === 'Executive' && (
        <div className="space-y-6">
          {/* Quick KPI Header Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Org Health Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data?.healthScore}%</span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">+2.4% vs last week</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Sales Pipeline Value</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${m?.crm.salesPipelineValue.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Task Velocity</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{m?.projects.taskCompletionRate}%</span>
                  <span className="text-xs text-gray-500">{m?.projects.completedTasks}/{m?.projects.totalTasks} completed</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Automation Savings</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{m?.workflowsAndProcesses.automationSavingsHours} hrs</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Zap className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Active Anomalies & Risk Alerts */}
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Detected Operational Anomalies & Risks ({data?.anomalies.filter((a) => !a.isResolved).length})
              </h3>
              <span className="text-xs font-semibold text-gray-500">Auto-monitored</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data?.anomalies.map((anom) => (
                <div
                  key={anom.id || anom.metricKey}
                  className={`p-3.5 rounded-lg border text-xs flex flex-col justify-between ${
                    anom.isResolved
                      ? 'bg-gray-50 dark:bg-zinc-800/40 border-gray-200 dark:border-zinc-800 opacity-60'
                      : anom.severity === 'CRITICAL' || anom.severity === 'HIGH'
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">{anom.metricName}</span>
                      <p className="text-gray-600 dark:text-zinc-400 mt-0.5">{anom.description}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        anom.severity === 'HIGH' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}
                    >
                      {anom.severity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/50 dark:border-zinc-800">
                    <span className="text-[11px] text-gray-500">
                      Expected: {anom.expectedValue} | Actual: <strong className="text-gray-800 dark:text-zinc-200">{anom.actualValue}</strong> ({anom.deviationPercent > 0 ? '+' : ''}{anom.deviationPercent}%)
                    </span>
                    <span className="text-[10px] text-gray-400">{new Date(anom.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: CRM ANALYTICS */}
      {/* ========================================== */}
      {activeTab === 'CRM' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Companies</p>
              <p className="text-xl font-bold mt-1">{m?.crm.totalCompanies}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Contacts</p>
              <p className="text-xl font-bold mt-1">{m?.crm.totalContacts}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Active Leads</p>
              <p className="text-xl font-bold mt-1">{m?.crm.totalLeads}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Lead Conversion</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{m?.crm.leadConversionRate}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Opp Win Rate</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{m?.crm.opportunityWinRate}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Avg Contract Val</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">${m?.crm.avgContractValue.toLocaleString()}</p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold">Sales Pipeline & Conversion Breakdown</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span>Inbound Lead Conversion</span>
                  <span>{m?.crm.leadConversionRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${m?.crm.leadConversionRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span>Opportunity Win Rate</span>
                  <span>{m?.crm.opportunityWinRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${m?.crm.opportunityWinRate}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: PROJECTS & PRODUCTIVITY */}
      {/* ========================================== */}
      {activeTab === 'Projects' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Active Projects</p>
              <p className="text-xl font-bold mt-1">{m?.projects.activeProjects} / {m?.projects.totalProjects}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Hours Tracked</p>
              <p className="text-xl font-bold mt-1">{m?.projects.totalHoursTracked} hrs</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Capacity Utilization</p>
              <p className="text-xl font-bold text-purple-600 mt-1">{m?.projects.resourceUtilizationPercent}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Team Productivity Index</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{m?.projects.productivityScore}/100</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: AI & AUTOMATION */}
      {/* ========================================== */}
      {activeTab === 'AI' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Total AI Executions</p>
              <p className="text-xl font-bold mt-1">{m?.aiUsage.totalAiExecutions.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Tokens Consumed</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{m?.aiUsage.totalTokensConsumed.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Avg Latency</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{m?.aiUsage.avgLatencyMs} ms</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">AI Agents Executed</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{m?.aiUsage.agentExecutionsCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 5: COMMUNICATIONS */}
      {/* ========================================== */}
      {activeTab === 'Communications' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Total Messages Sent</p>
              <p className="text-xl font-bold mt-1">{m?.communications.totalMessagesSent.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Delivery Success Rate</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{m?.communications.deliveredRate}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Email Messages</p>
              <p className="text-xl font-bold mt-1">{m?.communications.emailMessagesCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Slack Notifications</p>
              <p className="text-xl font-bold mt-1">{m?.communications.slackMessagesCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 6: WORKFLOWS */}
      {/* ========================================== */}
      {activeTab === 'Workflows' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Configured Workflows</p>
              <p className="text-xl font-bold mt-1">{m?.workflowsAndProcesses.totalWorkflows}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Execution Success Rate</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{m?.workflowsAndProcesses.workflowSuccessRate}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Business Processes</p>
              <p className="text-xl font-bold mt-1">{m?.workflowsAndProcesses.totalBusinessProcesses}</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
              <p className="text-xs text-gray-500">Automation Hours Saved</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{m?.workflowsAndProcesses.automationSavingsHours} hrs</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 7: REPORTS */}
      {/* ========================================== */}
      {activeTab === 'Reports' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Generate Executive & Department Reports</h3>
              <div className="flex items-center gap-2">
                <select
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value="EXECUTIVE_SUMMARY">Executive Summary</option>
                  <option value="DEPARTMENT_SUMMARY">Department Summary</option>
                  <option value="WEEKLY_PERFORMANCE">Weekly Performance</option>
                  <option value="MONTHLY_PERFORMANCE">Monthly Performance</option>
                </select>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  {generatingReport ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-zinc-800">
              {reports.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No generated reports found. Click "Generate Report" above.</p>
              ) : (
                reports.map((rep) => (
                  <div key={rep.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">{rep.title}</span>
                      <p className="text-gray-500 text-[11px] mt-0.5">{rep.summaryText}</p>
                    </div>
                    <span className="text-[11px] text-gray-400">{new Date(rep.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 8: FORECASTS */}
      {/* ========================================== */}
      {activeTab === 'Forecasts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.forecasts.map((f) => (
              <div key={f.targetMetric} className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{f.metricName}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                    {f.confidenceScore}% Confidence
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xs text-gray-500">Current</span>
                    <p className="text-lg font-bold">
                      {f.unit === 'USD' ? `$${f.currentValue.toLocaleString()}` : `${f.currentValue}${f.unit === '%' ? '%' : ''}`}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Forecasted ({f.horizon.replace('_', ' ')})</span>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {f.unit === 'USD' ? `$${f.predictedValue.toLocaleString()}` : `${f.predictedValue}${f.unit === '%' ? '%' : ''}`}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-zinc-800">
                  {f.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 9: RECOMMENDATIONS */}
      {/* ========================================== */}
      {activeTab === 'Recommendations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {data?.recommendations.map((rec) => (
              <div key={rec.id || rec.title} className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {rec.category}
                    </span>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{rec.title}</h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-zinc-400">{rec.description}</p>
                  {rec.actionStep && (
                    <p className="text-xs font-medium text-primary mt-1 flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" /> Action: {rec.actionStep}
                    </p>
                  )}
                </div>

                {rec.estimatedRoi && (
                  <div className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                    Est ROI: {rec.estimatedRoi}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
