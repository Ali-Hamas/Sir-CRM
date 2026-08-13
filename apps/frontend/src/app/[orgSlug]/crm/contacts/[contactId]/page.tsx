'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Globe, Linkedin,
  Building2, FileText, Clock, User, Tag, Plus
} from 'lucide-react';

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  linkedinUrl: string | null;
  country: string | null;
  city: string | null;
  preferredLanguage: string | null;
  status: string;
  isPrimary: boolean;
  company: { id: string; name: string; industry: string | null; website: string | null } | null;
  assignedTo: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  tags: { id: string; name: string }[];
  notes: {
    id: string;
    content: string;
    createdAt: string;
    createdBy: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null };
  }[];
  activities: {
    id: string;
    action: string;
    description: string | null;
    createdAt: string;
    user: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null };
  }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const contactId = params.contactId as string;

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'activity'>('overview');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchContact();
  }, [contactId]);

  const fetchContact = async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/contacts/${contactId}`);
      setContact(data);
    } catch (err) {
      console.error('Failed to fetch contact:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/contacts/${contactId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: newNote }),
      });
      setNewNote('');
      fetchContact();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/organizations/${orgSlug}/contacts/${contactId}`, { method: 'DELETE' });
      router.push(`/${orgSlug}/crm/contacts`);
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-20">
        <User size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Contact not found</p>
        <Link href={`/${orgSlug}/crm/contacts`} className="text-primary hover:underline text-sm mt-2 inline-block">
          Back to Contacts
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
              {contact.firstName?.[0]}{contact.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {contact.firstName} {contact.lastName}
                {contact.isPrimary && (
                  <span className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded font-medium">PRIMARY</span>
                )}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[contact.status]}`}>
                  {contact.status}
                </span>
                {contact.jobTitle && <span className="text-sm text-gray-500">{contact.jobTitle}</span>}
                {contact.company && (
                  <Link href={`/${orgSlug}/crm/companies/${contact.company.id}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                    <Building2 size={14} /> {contact.company.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${orgSlug}/crm/contacts/${contactId}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Edit size={16} /> Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-zinc-800">
        <nav className="flex gap-6">
          {(['overview', 'notes', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab}
              {tab === 'notes' && contact.notes.length > 0 && (
                <span className="ml-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-full px-1.5 text-xs">
                  {contact.notes.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Details */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Contact Information</h3>
              <div className="space-y-3">
                {contact.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail size={16} className="text-gray-400 shrink-0" />
                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={16} className="text-gray-400 shrink-0" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                  </div>
                )}
                {contact.mobile && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={16} className="text-gray-400 shrink-0" />
                    <span>Mobile: <a href={`tel:${contact.mobile}`} className="hover:underline">{contact.mobile}</a></span>
                  </div>
                )}
                {contact.linkedinUrl && (
                  <div className="flex items-center gap-3 text-sm">
                    <Linkedin size={16} className="text-gray-400 shrink-0" />
                    <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn Profile</a>
                  </div>
                )}
                {(contact.city || contact.country) && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin size={16} className="text-gray-400 shrink-0" />
                    {[contact.city, contact.country].filter(Boolean).join(', ')}
                  </div>
                )}
                {!contact.email && !contact.phone && !contact.mobile && !contact.linkedinUrl && !contact.city && (
                  <p className="text-sm text-gray-400">No contact details added</p>
                )}
              </div>
            </div>

            {/* Job Details */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Job Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contact.jobTitle && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Job Title</p>
                    <p className="text-sm font-medium">{contact.jobTitle}</p>
                  </div>
                )}
                {contact.department && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Department</p>
                    <p className="text-sm font-medium">{contact.department}</p>
                  </div>
                )}
                {contact.preferredLanguage && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Preferred Language</p>
                    <p className="text-sm font-medium">{contact.preferredLanguage}</p>
                  </div>
                )}
                {!contact.jobTitle && !contact.department && !contact.preferredLanguage && (
                  <p className="text-sm text-gray-400 col-span-2">No job details added</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                  {contact.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {contact.assignedTo.firstName?.[0]}{contact.assignedTo.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{contact.assignedTo.firstName} {contact.assignedTo.lastName}</p>
                        <p className="text-xs text-gray-500">{contact.assignedTo.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Unassigned</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created By</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">
                      {contact.createdBy.firstName?.[0]}{contact.createdBy.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{contact.createdBy.firstName} {contact.createdBy.lastName}</p>
                      <p className="text-xs text-gray-500">{new Date(contact.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                  <p className="text-sm">{new Date(contact.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {contact.tags.length > 0 && (
              <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <span key={tag.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-medium">
                      <Tag size={12} /> {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this contact..."
              rows={3}
              className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || addingNote}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>

          {contact.notes.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contact.notes.map((note) => (
                <div key={note.id} className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {note.createdBy.firstName?.[0]}{note.createdBy.lastName?.[0]}
                    </div>
                    <span>{note.createdBy.firstName} {note.createdBy.lastName}</span>
                    <span>-</span>
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          {contact.activities.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contact.activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {activity.user.firstName?.[0]}{activity.user.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.firstName} {activity.user.lastName}</span>
                      {' '}
                      <span className="text-gray-600 dark:text-gray-400">{activity.action.replace(/_/g, ' ').toLowerCase()}</span>
                    </p>
                    {activity.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Delete Contact</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{contact.firstName} {contact.lastName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
