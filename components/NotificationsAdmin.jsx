import React, { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../services/adminAuth';

const CATEGORIES = ['general', 'tournament', 'promo', 'wallet', 'system', 'stream'];
const STATUS_COLORS = {
  draft: '#6b7280',
  scheduled: '#f59e0b',
  sending: '#00d4ff',
  sent: '#22c55e',
  failed: '#ff0080',
  cancelled: '#374151'
};

const initialForm = {
  title: '',
  body: '',
  image_url: '',
  deep_link: '',
  category: 'general',
  priority: 'default',
  target_type: 'all',
  segment_type: 'membership_tier',
  segment_value: '',
  target_user_ids: '',
  send_mode: 'now', // 'now' | 'schedule'
  scheduled_at: '',
  recurrence_rule: '',
  recurrence_end_at: ''
};

export default function NotificationsAdmin() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [audiencePreview, setAudiencePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [statsById, setStatsById] = useState({});

  const buildTargetPayload = useCallback(() => {
    if (form.target_type === 'all') return { target_type: 'all' };
    if (form.target_type === 'users') {
      return {
        target_type: 'users',
        target_user_ids: form.target_user_ids
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      };
    }
    // segment
    const segment = { type: form.segment_type };
    if (form.segment_type === 'membership_tier') segment.value = form.segment_value;
    return { target_type: 'segment', target_segment: segment };
  }, [form]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const res = await adminFetch(`/api/admin/notifications${qs}`);
      const json = await res.json();
      setHistory(json.data || []);
    } catch (e) {
      console.error('Failed to load notification history', e);
    } finally {
      setHistoryLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handlePreviewAudience = async () => {
    setPreviewLoading(true);
    setAudiencePreview(null);
    try {
      const res = await adminFetch('/api/admin/notifications/preview-audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTargetPayload())
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to preview audience');
      setAudiencePreview(json.count);
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setPreviewLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setAudiencePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!form.title.trim() || !form.body.trim()) {
      setMessage({ type: 'error', text: 'Title and message body are required.' });
      return;
    }
    if (form.target_type === 'users' && !form.target_user_ids.trim()) {
      setMessage({ type: 'error', text: 'Add at least one user id for individual targeting.' });
      return;
    }
    if (form.target_type === 'segment' && form.segment_type === 'membership_tier' && !form.segment_value.trim()) {
      setMessage({ type: 'error', text: 'Enter a membership tier value (e.g. vip, pro).' });
      return;
    }
    if (form.send_mode === 'schedule' && !form.scheduled_at) {
      setMessage({ type: 'error', text: 'Pick a date/time to schedule this for.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        image_url: form.image_url.trim() || null,
        deep_link: form.deep_link.trim() || null,
        category: form.category,
        priority: form.priority,
        ...buildTargetPayload(),
        scheduled_at: form.send_mode === 'schedule' ? new Date(form.scheduled_at).toISOString() : null,
        recurrence_rule: form.send_mode === 'schedule' && form.recurrence_rule ? form.recurrence_rule : null,
        recurrence_end_at:
          form.send_mode === 'schedule' && form.recurrence_rule && form.recurrence_end_at
            ? new Date(form.recurrence_end_at).toISOString()
            : null
      };

      const res = await adminFetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create notification');

      setMessage({
        type: 'success',
        text: form.send_mode === 'schedule' ? 'Notification scheduled.' : 'Notification is being sent now.'
      });
      resetForm();
      loadHistory();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = async (item) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    if (!statsById[item.id]) {
      try {
        const res = await adminFetch(`/api/admin/notifications/${item.id}`);
        const json = await res.json();
        setStatsById((prev) => ({ ...prev, [item.id]: json.stats }));
      } catch (e) {
        console.error('Failed to load stats', e);
      }
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this notification?')) return;
    await adminFetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
    loadHistory();
  };

  const handleSendNow = async (id) => {
    if (!confirm('Send this notification immediately?')) return;
    await adminFetch(`/api/admin/notifications/${id}/send-now`, { method: 'POST' });
    loadHistory();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Composer */}
      <div className="bg-bg-card rounded-2xl border border-white/5 p-4 md:p-8 shadow-2xl">
        <h3 className="text-lg md:text-xl font-orbitron font-black text-white uppercase tracking-widest mb-6">
          Broadcast <span className="text-primary">Notification</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title">
              <input
                className={inputClass}
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Season 3 Registrations Open"
              />
            </Field>
            <Field label="Category">
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Message">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={500}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Registrations for the Season 3 championship are now live. Lock in your slot before it fills up."
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Image URL (optional)">
              <input
                className={inputClass}
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </Field>
            <Field label="Deep link (optional)">
              <input
                className={inputClass}
                value={form.deep_link}
                onChange={(e) => setForm((f) => ({ ...f, deep_link: e.target.value }))}
                placeholder="app://TournamentDetails/<tournament_id>"
              />
            </Field>
          </div>

          <Field label="Priority">
            <div className="flex gap-2">
              {['default', 'high'].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className={`px-4 py-2 rounded-lg text-[10px] font-orbitron font-black uppercase tracking-widest border ${form.priority === p ? 'bg-primary text-dark border-primary' : 'bg-white/5 text-gray-500 border-white/5'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>

          {/* Targeting */}
          <div className="border-t border-white/5 pt-5">
            <p className="text-[10px] font-orbitron font-black text-gray-500 uppercase tracking-widest mb-3">
              Audience
            </p>
            <div className="flex gap-2 mb-4">
              {[
                { id: 'all', label: 'Everyone' },
                { id: 'segment', label: 'Segment' },
                { id: 'users', label: 'Specific users' }
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => { setForm((f) => ({ ...f, target_type: t.id })); setAudiencePreview(null); }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-orbitron font-black uppercase tracking-widest border ${form.target_type === t.id ? 'bg-primary text-dark border-primary' : 'bg-white/5 text-gray-500 border-white/5'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {form.target_type === 'segment' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Segment type">
                  <select
                    className={inputClass}
                    value={form.segment_type}
                    onChange={(e) => setForm((f) => ({ ...f, segment_type: e.target.value }))}
                  >
                    <option value="membership_tier">Membership tier</option>
                    <option value="has_balance">Has wallet balance {'>'} 0</option>
                  </select>
                </Field>
                {form.segment_type === 'membership_tier' && (
                  <Field label="Tier value">
                    <input
                      className={inputClass}
                      value={form.segment_value}
                      onChange={(e) => setForm((f) => ({ ...f, segment_value: e.target.value }))}
                      placeholder="e.g. vip, pro, elite"
                    />
                  </Field>
                )}
              </div>
            )}

            {form.target_type === 'users' && (
              <Field label="User IDs (comma-separated)">
                <input
                  className={inputClass}
                  value={form.target_user_ids}
                  onChange={(e) => setForm((f) => ({ ...f, target_user_ids: e.target.value }))}
                  placeholder="uuid-1, uuid-2, uuid-3"
                />
              </Field>
            )}

            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={handlePreviewAudience}
                disabled={previewLoading}
                className="px-4 py-2 rounded-lg text-[10px] font-orbitron font-black uppercase tracking-widest border border-white/10 bg-white/5 text-gray-300 hover:border-primary/50"
              >
                {previewLoading ? 'Checking...' : 'Preview reach'}
              </button>
              {audiencePreview !== null && (
                <span className="text-primary text-xs font-bold">~{audiencePreview.toLocaleString()} users</span>
              )}
            </div>
          </div>

          {/* Scheduling */}
          <div className="border-t border-white/5 pt-5">
            <p className="text-[10px] font-orbitron font-black text-gray-500 uppercase tracking-widest mb-3">
              Delivery
            </p>
            <div className="flex gap-2 mb-4">
              {[
                { id: 'now', label: 'Send now' },
                { id: 'schedule', label: 'Schedule' }
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setForm((f) => ({ ...f, send_mode: m.id }))}
                  className={`px-4 py-2 rounded-lg text-[10px] font-orbitron font-black uppercase tracking-widest border ${form.send_mode === m.id ? 'bg-primary text-dark border-primary' : 'bg-white/5 text-gray-500 border-white/5'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {form.send_mode === 'schedule' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Send at">
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={form.scheduled_at}
                    onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                  />
                </Field>
                <Field label="Repeat">
                  <select
                    className={inputClass}
                    value={form.recurrence_rule}
                    onChange={(e) => setForm((f) => ({ ...f, recurrence_rule: e.target.value }))}
                  >
                    <option value="">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </Field>
                {form.recurrence_rule && (
                  <Field label="Repeat until (optional)">
                    <input
                      type="datetime-local"
                      className={inputClass}
                      value={form.recurrence_end_at}
                      onChange={(e) => setForm((f) => ({ ...f, recurrence_end_at: e.target.value }))}
                    />
                  </Field>
                )}
              </div>
            )}
          </div>

          {message && (
            <div
              className="px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest"
              style={{
                backgroundColor: message.type === 'error' ? 'rgba(255,0,128,0.1)' : 'rgba(34,197,94,0.1)',
                color: message.type === 'error' ? '#ff0080' : '#22c55e'
              }}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full md:w-auto px-8 py-3 rounded-lg bg-primary text-dark font-orbitron font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(0,212,255,0.4)] disabled:opacity-50"
          >
            {submitting ? 'Sending...' : form.send_mode === 'schedule' ? 'Schedule notification' : 'Send now'}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="bg-bg-card rounded-2xl border border-white/5 p-4 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="text-lg md:text-xl font-orbitron font-black text-white uppercase tracking-widest">
            History
          </h3>
          <select
            className={`${inputClass} w-auto`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {Object.keys(STATUS_COLORS).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {historyLoading ? (
          <p className="text-gray-500 text-xs uppercase tracking-widest">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-gray-500 text-xs uppercase tracking-widest">No notifications sent yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(item)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-bold truncate">{item.title}</p>
                    <p className="text-gray-500 text-xs truncate">{item.body}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="px-2 py-1 rounded text-[9px] font-orbitron font-black uppercase tracking-widest"
                      style={{ backgroundColor: `${STATUS_COLORS[item.status]}22`, color: STATUS_COLORS[item.status] }}
                    >
                      {item.status}
                    </span>
                    {['draft', 'scheduled', 'failed'].includes(item.status) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSendNow(item.id); }}
                        className="text-primary text-[10px] font-bold uppercase tracking-widest"
                      >
                        Send now
                      </button>
                    )}
                    {['draft', 'scheduled'].includes(item.status) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCancel(item.id); }}
                        className="text-[#ff0080] text-[10px] font-bold uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </button>
                {expandedId === item.id && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/5 text-xs text-gray-400 space-y-1">
                    <p>Category: <span className="text-gray-300">{item.category}</span> · Target: <span className="text-gray-300">{item.target_type}</span></p>
                    {item.scheduled_at && <p>Scheduled: <span className="text-gray-300">{new Date(item.scheduled_at).toLocaleString()}</span></p>}
                    {item.sent_at && <p>Sent: <span className="text-gray-300">{new Date(item.sent_at).toLocaleString()}</span></p>}
                    {item.recurrence_rule && <p>Repeats: <span className="text-gray-300">{item.recurrence_rule}</span></p>}
                    {statsById[item.id] && (
                      <p>
                        Recipients: <span className="text-gray-300">{statsById[item.id].recipients}</span> · Pushed:{' '}
                        <span className="text-gray-300">{statsById[item.id].push_sent}</span> · Read:{' '}
                        <span className="text-gray-300">{statsById[item.id].read}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[9px] font-orbitron font-black text-gray-500 uppercase tracking-widest mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm font-rajdhani font-bold outline-none focus:border-primary/50 transition-colors';
