'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Activity, Filter, Search, Download, Terminal, Users, CheckCircle, Bot, RefreshCw } from 'lucide-react';

const INITIAL_ACTIVITIES = [
  { id: 1, action: 'LOGIN', module: 'SYSTEM', entityType: 'USER', user: 'John Doe', time: '10 mins ago', detail: 'Logged in from 192.168.1.1 (Windows OS)', ip: '192.168.1.1' },
  { id: 2, action: 'WORKFLOW_EXECUTED', module: 'WORKFLOWS', entityType: 'WORKFLOW', user: 'Automated Engine', time: '25 mins ago', detail: 'Executed Workflow "Auto Assign Lead & Notify"', ip: '127.0.0.1' },
  { id: 3, action: 'ROLE_CHANGED', module: 'SYSTEM', entityType: 'USER', user: 'Sarah Connor', time: '1 hour ago', detail: 'Role updated to Admin by System Admin', ip: '10.0.0.55' },
  { id: 4, action: 'TEAM_CREATED', module: 'TEAM', entityType: 'TEAM', user: 'Jane Smith', time: '3 hours ago', detail: 'Created team "Frontend Engineering"', ip: '10.0.0.12' },
  { id: 5, action: 'CRM_UPDATED', module: 'CRM', entityType: 'LEAD', user: 'Alex Johnson', time: '5 hours ago', detail: 'Moved Lead "Acme Corp" to Negotiation phase', ip: '192.168.1.100' },
  { id: 6, action: 'TASK_COMPLETED', module: 'TASKS', entityType: 'TASK', user: 'John Doe', time: 'Yesterday', detail: 'Completed "Fix Navigation Bug"', ip: '192.168.1.1' },
];

export default function ActivityLogPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activities, setActivities] = useState<any[]>(INITIAL_ACTIVITIES);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/activities`).catch(() => null);
      if (data && data.items && data.items.length > 0) {
        setActivities(
          data.items.map((item: any) => ({
            id: item.id,
            action: item.action,
            module: item.module || 'SYSTEM',
            entityType: item.entityType,
            user: item.user ? `${item.user.firstName} ${item.user.lastName}` : 'System User',
            time: new Date(item.createdAt).toLocaleString(),
            detail: item.metadata ? JSON.stringify(item.metadata) : `${item.action} on ${item.entityType}`,
            ip: '127.0.0.1',
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [orgSlug]);

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activities, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `activity_audit_logs_${orgSlug}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.detail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = selectedModule === 'ALL' || act.module === selectedModule;
    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Activity Center
          </h2>
          <p className="text-muted-foreground text-sm">Comprehensive audit trail of all organization system events.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchActivities}
            className="p-2 border border-gray-200 dark:border-zinc-800 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExportLogs}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download size={16} /> Export Logs
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search activities, users, or detail..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-gray-400" />
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-md text-sm font-medium bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            <option value="ALL">All Modules</option>
            <option value="SYSTEM">System</option>
            <option value="CRM">CRM</option>
            <option value="TASKS">Tasks</option>
            <option value="WORKFLOWS">Workflows</option>
            <option value="TEAM">Team</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading audit logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Event</th>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Module</th>
                  <th className="px-6 py-4 font-medium">IP Address</th>
                  <th className="px-6 py-4 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {filteredActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-gray-100 dark:bg-zinc-800 shrink-0">
                          <Activity size={16} className="text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {activity.action.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-md truncate">
                            {activity.detail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-zinc-300">
                      {activity.user}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 tracking-wider">
                        {activity.module}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-zinc-400">
                      {activity.ip}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 dark:text-zinc-400 whitespace-nowrap text-xs">
                      {activity.time}
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
