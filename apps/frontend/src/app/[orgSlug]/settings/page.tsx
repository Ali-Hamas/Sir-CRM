'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useParams } from 'next/navigation';
import { Loader2, Check, AlertCircle, Building2, Globe, Users, Briefcase } from 'lucide-react';

// ── Field definitions ─────────────────────────────────────────────────────────

const INDUSTRIES = [
  'Technology', 'Finance & Banking', 'Healthcare', 'Education', 'Retail & E-commerce',
  'Manufacturing', 'Real Estate', 'Legal', 'Media & Entertainment', 'Consulting',
  'Government', 'Non-profit', 'Transportation & Logistics', 'Energy & Utilities', 'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Amsterdam', 'Europe/Madrid', 'Europe/Rome', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney', 'Pacific/Auckland',
];

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'CNY', label: 'CNY — Chinese Yuan' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'BRL', label: 'BRL — Brazilian Real' },
  { code: 'MXN', label: 'MXN — Mexican Peso' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'AED', label: 'AED — UAE Dirham' },
];

// ── Input wrapper ─────────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';
const labelClass = 'block text-xs font-semibold mb-1 text-gray-700 dark:text-zinc-300 uppercase tracking-wide';

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 mb-6">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <div className="h-3 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
      <div className="h-9 w-full bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrganizationSettingsPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm({
    defaultValues: {
      name: '',
      legalName: '',
      industry: '',
      businessType: '',
      companySize: '',
      address: '',
      city: '',
      stateRegion: '',
      country: '',
      postalCode: '',
      timezone: '',
      currency: '',
    },
  });

  // ── Load org data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgSlug) return;
    setLoading(true);

    Promise.all([
      apiFetch(`/organizations/${orgSlug}`),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=1`).catch(() => ({ total: 0 })),
    ])
      .then(([org, membersData]) => {
        reset({
          name: org.name || '',
          legalName: org.legalName || '',
          industry: org.industry || '',
          businessType: org.businessType || '',
          companySize: org.companySize || '',
          address: org.address || '',
          city: org.city || '',
          stateRegion: org.stateRegion || '',
          country: org.country || '',
          postalCode: org.postalCode || '',
          timezone: org.timezone || '',
          currency: org.currency || '',
        });
        setMemberCount(membersData?.total ?? null);
      })
      .catch((err) => showToast('error', err.message || 'Failed to load organization settings'))
      .finally(() => setLoading(false));
  }, [orgSlug, reset]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await apiFetch(`/organizations/${orgSlug}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      showToast('success', 'Organization settings saved successfully');
      reset(data); // Mark form as clean
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Organization Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your organization's profile, preferences, and configuration.
        </p>
      </div>

      {/* Stats strip */}
      {!loading && memberCount !== null && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Members</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{memberCount}</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Organization</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{orgSlug}</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Status</div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Active
            </span>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {toast.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.text}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Section: Company Identity ──────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
          <SectionHeader
            icon={Building2}
            title="Company Identity"
            description="Your organization's legal and display information"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {loading ? (
              [...Array(6)].map((_, i) => <FieldSkeleton key={i} />)
            ) : (
              <>
                <div>
                  <label className={labelClass}>Company Name *</label>
                  <input {...register('name', { required: true })} className={inputClass} placeholder="Acme Corporation" />
                </div>
                <div>
                  <label className={labelClass}>Legal Name</label>
                  <input {...register('legalName')} className={inputClass} placeholder="Acme Corporation Ltd." />
                </div>
                <div>
                  <label className={labelClass}>Industry</label>
                  <select {...register('industry')} className={inputClass}>
                    <option value="">— Select Industry —</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Business Type</label>
                  <select {...register('businessType')} className={inputClass}>
                    <option value="">— Select Type —</option>
                    <option value="B2B">B2B</option>
                    <option value="B2C">B2C</option>
                    <option value="B2B2C">B2B2C</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="Non-profit">Non-profit</option>
                    <option value="Government">Government</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Company Size</label>
                  <div className="flex flex-wrap gap-2">
                    {COMPANY_SIZES.map((size) => (
                      <label key={size} className="flex items-center cursor-pointer">
                        <input type="radio" value={size} {...register('companySize')} className="sr-only peer" />
                        <span className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 dark:border-zinc-700 peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary hover:border-primary/50 transition-colors cursor-pointer">
                          {size}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Section: Location ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
          <SectionHeader
            icon={Globe}
            title="Location & Address"
            description="Physical address and geographic information"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {loading ? (
              [...Array(5)].map((_, i) => <FieldSkeleton key={i} />)
            ) : (
              <>
                <div className="md:col-span-2">
                  <label className={labelClass}>Street Address</label>
                  <input {...register('address')} className={inputClass} placeholder="123 Main Street" />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input {...register('city')} className={inputClass} placeholder="San Francisco" />
                </div>
                <div>
                  <label className={labelClass}>State / Region</label>
                  <input {...register('stateRegion')} className={inputClass} placeholder="California" />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input {...register('country')} className={inputClass} placeholder="United States" />
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <input {...register('postalCode')} className={inputClass} placeholder="94105" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Section: Preferences ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
          <SectionHeader
            icon={Briefcase}
            title="Regional Preferences"
            description="Timezone and currency defaults for the organization"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {loading ? (
              [...Array(2)].map((_, i) => <FieldSkeleton key={i} />)
            ) : (
              <>
                <div>
                  <label className={labelClass}>Default Timezone</label>
                  <select {...register('timezone')} className={inputClass}>
                    <option value="">— Select Timezone —</option>
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Default Currency</label>
                  <select {...register('currency')} className={inputClass}>
                    <option value="">— Select Currency —</option>
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Save button ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          {isDirty && !saving && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              You have unsaved changes
            </p>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              type="submit"
              disabled={saving || loading}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Saving…</>
              ) : (
                <><Check size={14} /> Save Changes</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
