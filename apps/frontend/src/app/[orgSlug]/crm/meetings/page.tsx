'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, Calendar, Clock, MapPin, Video, Users,
  ChevronLeft, ChevronRight, Filter, List, LayoutGrid,
  CheckCircle, XCircle, ArrowLeft, RefreshCw
} from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  meetingType: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingLink: string | null;
  agenda: string | null;
  outcome: string | null;
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  participants: { user: { id: string; firstName: string; lastName: string; email: string } }[];
  _count: { notes: number; actionItems: number };
  createdAt: string;
}

const MEETING_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'DISCOVERY', label: 'Discovery Meeting' },
  { value: 'FOLLOW_UP', label: 'Follow-up Meeting' },
  { value: 'SALES_PRESENTATION', label: 'Sales Presentation' },
  { value: 'INTERNAL_DISCUSSION', label: 'Internal Discussion' },
  { value: 'STRATEGY_SESSION', label: 'Strategy Session' },
  { value: 'CONTRACT_REVIEW', label: 'Contract Review' },
  { value: 'DEMO', label: 'Demo' },
  { value: 'CLIENT_ONBOARDING', label: 'Client Onboarding' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RESCHEDULED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const TYPE_LABELS: Record<string, string> = {
  DISCOVERY: 'Discovery', FOLLOW_UP: 'Follow-up', SALES_PRESENTATION: 'Presentation',
  INTERNAL_DISCUSSION: 'Internal', STRATEGY_SESSION: 'Strategy', CONTRACT_REVIEW: 'Contract Review',
  DEMO: 'Demo', CLIENT_ONBOARDING: 'Onboarding',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MeetingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [calendarMeetings, setCalendarMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [meetingType, setMeetingType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (meetingType) params.set('meetingType', meetingType);
      params.set('page', String(page));
      params.set('limit', '15');

      const data = await apiFetch(`/organizations/${orgSlug}/meetings?${params.toString()}`);
      setMeetings(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, status, meetingType, page]);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/meetings/calendar?year=${calYear}&month=${calMonth}`);
      setCalendarMeetings(data);
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, calYear, calMonth]);

  useEffect(() => {
    if (view === 'list') fetchList();
    else fetchCalendar();
  }, [view, fetchList, fetchCalendar]);

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/meetings/stats`).then(setStats).catch(() => {});
  }, [orgSlug]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month - 1, 1).getDay();

  const getMeetingsForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarMeetings.filter((m) => m.date.startsWith(dateStr));
  };

  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground text-sm mt-1">Schedule and manage CRM meetings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-gray-200 dark:border-zinc-800 rounded-md overflow-hidden">
            <button onClick={() => setView('list')} className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'}`}>
              <List size={16} /> List
            </button>
            <button onClick={() => setView('calendar')} className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${view === 'calendar' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'}`}>
              <LayoutGrid size={16} /> Calendar
            </button>
          </div>
          <Link href={`/${orgSlug}/crm/meetings/new`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} /> New Meeting
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Today</p>
            <p className="text-2xl font-bold mt-1">{stats.today}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">This Week</p>
            <p className="text-2xl font-bold mt-1">{stats.thisWeek}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Upcoming</p>
            <p className="text-2xl font-bold mt-1">{stats.upcoming}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {view === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search meetings..." className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${showFilters || status || meetingType ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50'}`}>
              <Filter size={16} /> Filters
            </button>
          </div>
          {showFilters && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-4 bg-gray-50 dark:bg-zinc-900/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select value={meetingType} onChange={(e) => { setMeetingType(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                    {MEETING_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronLeft size={20} /></button>
            <h2 className="text-lg font-bold">{MONTHS[calMonth - 1]} {calYear}</h2>
            <button onClick={nextMonth} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-zinc-800 rounded-lg overflow-hidden">
            {DAYS.map((d) => (
              <div key={d} className="bg-gray-50 dark:bg-zinc-800/50 px-2 py-2 text-xs font-medium text-gray-500 text-center">{d}</div>
            ))}
            {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white dark:bg-zinc-900 min-h-[100px]"></div>
            ))}
            {Array.from({ length: getDaysInMonth(calYear, calMonth) }).map((_, i) => {
              const day = i + 1;
              const dayMeetings = getMeetingsForDay(day);
              const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === calMonth && new Date().getFullYear() === calYear;
              return (
                <div key={day} className="bg-white dark:bg-zinc-900 min-h-[100px] p-1.5">
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-600 dark:text-gray-400'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayMeetings.slice(0, 3).map((m) => (
                      <div
                        key={m.id}
                        onClick={() => router.push(`/${orgSlug}/crm/meetings/${m.id}`)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 truncate"
                      >
                        {m.startTime} {m.title}
                      </div>
                    ))}
                    {dayMeetings.length > 3 && (
                      <p className="text-[10px] text-gray-400">+{dayMeetings.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calendar size={48} className="text-gray-300 dark:text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium mb-1">No meetings found</h3>
              <p className="text-sm text-gray-500 mb-4">{search || status || meetingType ? 'Try adjusting your filters' : 'Schedule your first meeting'}</p>
              <Link href={`/${orgSlug}/crm/meetings/new`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
                <Plus size={16} /> New Meeting
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-zinc-800">
              {meetings.map((meeting) => (
                <div key={meeting.id} onClick={() => router.push(`/${orgSlug}/crm/meetings/${meeting.id}`)} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/30 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">{meeting.title}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[meeting.status]}`}>{meeting.status}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500">{TYPE_LABELS[meeting.meetingType] || meeting.meetingType}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(meeting.date).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                        {meeting.location && <span className="flex items-center gap-1"><MapPin size={12} /> {meeting.location}</span>}
                        {meeting.meetingLink && <span className="flex items-center gap-1 text-primary"><Video size={12} /> Online</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        {meeting.company && <span className="text-xs text-gray-500">{meeting.company.name}</span>}
                        {meeting.contact && <span className="text-xs text-gray-500">{meeting.contact.firstName} {meeting.contact.lastName}</span>}
                        {meeting.participants.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Users size={12} /> {meeting.participants.length} participant{meeting.participants.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/30">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-md border disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronLeft size={16} /></button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-md border disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
