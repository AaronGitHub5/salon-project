import { useState, useEffect } from 'react';
import API_URL from './config';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ShiftModal({ stylistName, dayIndex, existingShift, onSave, onDelete, onClose }) {
  const [startTime, setStartTime] = useState(existingShift?.start_time?.slice(0, 5) || '09:00');
  const [endTime, setEndTime] = useState(existingShift?.end_time?.slice(0, 5) || '17:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (startTime >= endTime) { setError('Start time must be before end time'); return; }
    setSaving(true); setError('');
    try { await onSave({ day_of_week: dayIndex, start_time: startTime, end_time: endTime }, existingShift?.id); onClose(); }
    catch (err) { setError(err.message || 'Failed to save shift'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${DAY_FULL[dayIndex]} shift for ${stylistName}?`)) return;
    setSaving(true);
    try { await onDelete(existingShift.id); onClose(); }
    catch (err) { setError(err.message || 'Failed to delete shift'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl">✕</button>
        <h3 className="font-bold text-sm uppercase tracking-widest mb-1">{existingShift ? 'Edit Shift' : 'Add Shift'}</h3>
        <p className="text-xs text-gray-400 mb-5">{stylistName} · {DAY_FULL[dayIndex]}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-gray-300 p-3 text-sm focus:outline-black" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border border-gray-300 p-3 text-sm focus:outline-black" />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition">
            {saving ? 'Saving...' : 'Save Shift'}
          </button>
          {existingShift && (
            <button onClick={handleDelete} disabled={saving} className="px-4 py-3 border border-red-200 text-red-500 text-xs font-bold uppercase hover:bg-red-50 transition">Remove</button>
          )}
        </div>
      </div>
    </div>
  );
}

function OverrideConfirmModal({ stylistName, overrideDate, preview, reason, cancelRemainingOnly, onConfirm, onCancel, saving }) {
  const formattedDate = new Date(overrideDate + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md shadow-2xl p-6 relative">
        <h3 className="font-bold text-sm uppercase tracking-widest mb-1 text-red-600">⚠ Confirm Date Block</h3>
        <p className="text-xs text-gray-500 mb-4">{stylistName} · {formattedDate}</p>
        {preview.count === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
            <p className="text-green-700 text-sm font-bold">✓ No bookings affected</p>
            <p className="text-green-600 text-xs mt-1">No confirmed bookings exist for this date{cancelRemainingOnly ? ' from now onwards' : ''}.</p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <p className="text-red-700 text-sm font-bold">{preview.count} booking{preview.count > 1 ? 's' : ''} will be cancelled</p>
            <p className="text-red-600 text-xs mt-1 mb-3">{cancelRemainingOnly ? 'Remaining bookings from now onwards.' : 'All bookings on this date.'} Customers will be emailed automatically.</p>
            <div className="space-y-2">
              {preview.bookings.map(b => (
                <div key={b.id} className="flex justify-between text-xs text-red-700 bg-white rounded px-3 py-2 border border-red-100">
                  <span className="font-medium">{b.customer_name}</span>
                  <span className="text-red-400">{b.service_name} · {new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {reason && (
          <div className="bg-gray-50 rounded p-3 mb-4 text-xs text-gray-600">
            <span className="font-bold uppercase tracking-widest text-gray-400 block mb-1">Reason</span>{reason}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onConfirm} disabled={saving}
            className="flex-1 bg-red-600 text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition">
            {saving ? 'Processing...' : preview.count > 0 ? `Cancel ${preview.count} Booking${preview.count > 1 ? 's' : ''} & Block` : 'Block Date'}
          </button>
          <button onClick={onCancel} disabled={saving} className="px-4 py-3 border border-gray-200 text-gray-500 text-xs font-bold uppercase hover:bg-gray-50 transition">Go Back</button>
        </div>
      </div>
    </div>
  );
}

function PricingSlider({ label, value, min, max, step, format, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">{label}</span>
        <span className="text-lg font-bold font-mono">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 appearance-none cursor-pointer rounded-full"
        style={{ background: `linear-gradient(to right, #000 ${pct}%, #e5e7eb ${pct}%)` }} />
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

function PeakDayToggles({ peakDays, onChange }) {
  const toggle = (idx) => onChange(peakDays.includes(idx) ? peakDays.filter(d => d !== idx) : [...peakDays, idx].sort((a, b) => a - b));
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">Peak Days</span>
        <span className="text-xs text-gray-400">{peakDays.length === 0 ? 'None' : peakDays.map(d => DAYS[d]).join(', ')}</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day, idx) => (
          <button key={idx} type="button" onClick={() => toggle(idx)}
            className={`py-2 text-[11px] font-bold uppercase rounded border transition ${peakDays.includes(idx) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400'}`}>
            {day}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Click to toggle. Orange = peak day.</p>
    </div>
  );
}

function BlockDateSection({ stylist, authHeader, onOverrideSaved }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [reasonPreset, setReasonPreset] = useState('');
  const [reasonCustom, setReasonCustom] = useState('');
  const reason = reasonPreset === 'Other' ? reasonCustom : reasonPreset;
  const [cancelRemainingOnly, setCancelRemainingOnly] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState([]);
  const [overridesLoading, setOverridesLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { fetchOverrides(); }, [stylist.id]);

  const fetchOverrides = async () => {
    setOverridesLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shifts/overrides/${stylist.id}`, { headers: authHeader });
      const data = await res.json();
      setOverrides(Array.isArray(data) ? data : []);
    } catch { setOverrides([]); } finally { setOverridesLoading(false); }
  };

  const handlePreview = async () => {
    if (!selectedDate) return;
    setPreviewing(true);
    try {
      const res = await fetch(`${API_URL}/api/shifts/overrides/preview`, {
        method: 'POST', headers: authHeader,
        body: JSON.stringify({ stylist_id: stylist.id, override_date: selectedDate, cancel_remaining_only: cancelRemainingOnly }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Failed to preview'); return; }
      setPreview(data);
    } catch { alert('Something went wrong'); } finally { setPreviewing(false); }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/shifts/overrides`, {
        method: 'POST', headers: authHeader,
        body: JSON.stringify({ stylist_id: stylist.id, override_date: selectedDate, is_working: false, reason: reason || null, cancel_remaining_only: cancelRemainingOnly }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Failed to save override'); return; }
      setPreview(null); setSelectedDate(''); setReasonPreset(''); setReasonCustom(''); setCancelRemainingOnly(false);
      await fetchOverrides();
      onOverrideSaved(data.cancelledCount);
    } catch { alert('Something went wrong'); } finally { setSaving(false); }
  };

  const handleRemoveOverride = async (id) => {
    if (!confirm('Remove this date block? The stylist will appear available again.')) return;
    try {
      const res = await fetch(`${API_URL}/api/shifts/overrides/${id}`, { method: 'DELETE', headers: authHeader });
      if (!res.ok) { alert('Failed to remove override'); return; }
      await fetchOverrides();
    } catch { alert('Something went wrong'); }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Date Overrides</p>
      <p className="text-xs text-gray-400 mb-4">Block a specific date — e.g. sick day, holiday. Confirmed bookings will be auto-cancelled and customers emailed.</p>
      <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Date to Block</label>
            <input type="date" min={today} value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setPreview(null); }}
              className="w-full border border-gray-300 p-2 text-sm bg-white focus:outline-black" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Reason (optional)</label>
            <select value={reasonPreset} onChange={e => { setReasonPreset(e.target.value); setReasonCustom(''); }}
              className="w-full border border-gray-300 p-2 text-sm bg-white focus:outline-black">
              <option value="">Select reason...</option>
              <option value="Sick">Sick</option>
              <option value="Holiday">Holiday</option>
              <option value="Emergency">Emergency</option>
              <option value="Training">Training</option>
              <option value="Other">Other</option>
            </select>
            {reasonPreset === 'Other' && (
              <input type="text" placeholder="Describe reason..." value={reasonCustom}
                onChange={e => setReasonCustom(e.target.value)}
                className="w-full border border-gray-300 p-2 text-sm bg-white focus:outline-black mt-2" />
            )}
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div onClick={() => setCancelRemainingOnly(v => !v)}
            className={`w-10 h-5 rounded-full transition relative flex-shrink-0 ${cancelRemainingOnly ? 'bg-black' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${cancelRemainingOnly ? 'left-5' : 'left-0.5'}`} />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-700">Cancel remaining only</span>
            <span className="text-[10px] text-gray-400 block">Only cancel bookings from now onwards — keeps completed morning appointments intact</span>
          </div>
        </label>
        <button onClick={handlePreview} disabled={!selectedDate || previewing}
          className="w-full border border-black text-black py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition">
          {previewing ? 'Checking bookings...' : 'Check & Block Date'}
        </button>
      </div>
      {overridesLoading ? (
        <div className="h-10 bg-gray-100 animate-pulse rounded" />
      ) : overrides.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Active Blocks</p>
          {overrides.map(o => (
            <div key={o.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded px-3 py-2">
              <div>
                <span className="text-sm font-bold text-red-700">
                  {new Date(o.override_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {o.reason && <span className="text-xs text-red-400 ml-2">· {o.reason}</span>}
              </div>
              <button onClick={() => handleRemoveOverride(o.id)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase ml-4">Remove</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">No date blocks set.</p>
      )}
      {preview && (
        <OverrideConfirmModal
          stylistName={stylist.name} overrideDate={selectedDate} preview={preview}
          reason={reason} cancelRemainingOnly={cancelRemainingOnly}
          onConfirm={handleConfirm} onCancel={() => setPreview(null)} saving={saving}
        />
      )}
    </div>
  );
}

function StylistCard({ stylist, authHeader, onPricingUpdated }) {
  const [multiplier, setMultiplier] = useState(parseFloat(stylist.price_multiplier) || 1.0);
  const [peakPercent, setPeakPercent] = useState(parseFloat(stylist.peak_surcharge_percent) ?? 15);
  const [peakDays, setPeakDays] = useState(stylist.peak_days ?? [5, 6]);
  const [peakHourStart, setPeakHourStart] = useState(stylist.peak_hour_start ?? 17);
  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [shiftModal, setShiftModal] = useState(null);
  const [overrideBanner, setOverrideBanner] = useState(null);

  const EXAMPLE_BASE = 40;
  const previewNormal = (EXAMPLE_BASE * multiplier).toFixed(2);
  const previewPeak = (EXAMPLE_BASE * multiplier * (1 + peakPercent / 100)).toFixed(2);
  const formatHour = (h) => `${String(h).padStart(2, '0')}:00`;

  useEffect(() => { fetchShifts(); }, [stylist.id]);

  const fetchShifts = async () => {
    setShiftsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shifts/stylist/${stylist.id}`, { headers: authHeader });
      const data = await res.json();
      setShifts(Array.isArray(data) ? data : []);
    } catch { setShifts([]); } finally { setShiftsLoading(false); }
  };

  const getShiftForDay = (dayIndex) => shifts.find(s => s.day_of_week === dayIndex) || null;

  const handleSavePricing = async () => {
    setSavingPricing(true); setPricingSaved(false);
    try {
      const res = await fetch(`${API_URL}/api/stylists/${stylist.id}/pricing`, {
        method: 'PUT', headers: authHeader,
        body: JSON.stringify({ price_multiplier: multiplier, peak_surcharge_percent: peakPercent, peak_days: peakDays, peak_hour_start: peakHourStart }),
      });
      if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed to save pricing'); return; }
      setPricingSaved(true); onPricingUpdated();
      setTimeout(() => setPricingSaved(false), 2500);
    } catch { alert('Something went wrong'); } finally { setSavingPricing(false); }
  };

  const handleSaveShift = async ({ day_of_week, start_time, end_time }, existingId) => {
    const url = existingId ? `${API_URL}/api/shifts/${existingId}` : `${API_URL}/api/shifts`;
    const method = existingId ? 'PUT' : 'POST';
    const body = existingId
      ? JSON.stringify({ day_of_week, start_time, end_time })
      : JSON.stringify({ stylist_id: stylist.id, day_of_week, start_time, end_time });
    const res = await fetch(url, { method, headers: authHeader, body });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    await fetchShifts();
  };

  const handleDeleteShift = async (shiftId) => {
    const res = await fetch(`${API_URL}/api/shifts/${shiftId}`, { method: 'DELETE', headers: authHeader });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    await fetchShifts();
  };

  const handleOverrideSaved = (cancelledCount) => {
    setOverrideBanner(cancelledCount > 0
      ? `✓ Date blocked. ${cancelledCount} booking${cancelledCount > 1 ? 's' : ''} cancelled — customers emailed.`
      : '✓ Date blocked. No bookings were affected.'
    );
    setTimeout(() => setOverrideBanner(null), 5000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {overrideBanner && <div className="bg-green-600 text-white text-xs font-bold px-6 py-3">{overrideBanner}</div>}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">{stylist.name}</h3>
          <p className="text-xs text-gray-400">{stylist.email}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">£{EXAMPLE_BASE} base →</p>
          <p className="text-sm font-bold text-gray-700">£{previewNormal} <span className="font-normal text-gray-400">/ peak</span> £{previewPeak}</p>
        </div>
      </div>
      <div className="p-6 space-y-8">
        <div className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Pricing</p>
          <PricingSlider label="Price Multiplier" value={multiplier} min={0.8} max={2.0} step={0.05} format={v => `×${v.toFixed(2)}`} onChange={setMultiplier} />
          <PricingSlider label="Peak Surcharge" value={peakPercent} min={0} max={50} step={1} format={v => `+${v}%`} onChange={setPeakPercent} />
          <PeakDayToggles peakDays={peakDays} onChange={setPeakDays} />
          <PricingSlider label="Evening Peak From" value={peakHourStart} min={14} max={20} step={1} format={formatHour} onChange={v => setPeakHourStart(Math.round(v))} />
          <div className="bg-gray-50 rounded p-3 flex gap-6 text-sm">
            <div>
              <span className="text-xs text-gray-400 block">Standard (£{EXAMPLE_BASE})</span>
              <span className="font-bold font-mono">£{previewNormal}</span>
            </div>
            <div>
              <span className="text-xs text-orange-500 block">⚡ Peak · {peakDays.map(d => DAYS[d]).join(', ') || 'None'} + after {formatHour(peakHourStart)}</span>
              <span className="font-bold font-mono text-orange-600">£{previewPeak}</span>
            </div>
          </div>
          <button onClick={handleSavePricing} disabled={savingPricing}
            className={`w-full py-2.5 text-xs font-bold uppercase tracking-widest transition ${pricingSaved ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-gray-800 disabled:opacity-50'}`}>
            {pricingSaved ? '✓ Saved' : savingPricing ? 'Saving...' : 'Save Pricing'}
          </button>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Weekly Schedule</p>
          {shiftsLoading ? (
            <div className="grid grid-cols-7 gap-1">{DAYS.map(d => <div key={d} className="h-16 bg-gray-100 animate-pulse rounded" />)}</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day, idx) => {
                const shift = getShiftForDay(idx);
                const isPeakDay = peakDays.includes(idx);
                return (
                  <button key={idx} onClick={() => setShiftModal({ dayIndex: idx, existingShift: shift })}
                    className={`flex flex-col items-center justify-center p-2 rounded border min-h-[4rem] text-center transition hover:border-black hover:shadow-sm group
                      ${shift ? isPeakDay ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-black border-black text-white' : 'bg-gray-50 border-gray-200 text-gray-400 border-dashed'}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block">{day}</span>
                    {shift ? (
                      <><span className="text-[9px] mt-1 block font-mono leading-tight">{shift.start_time?.slice(0, 5)}</span>
                      <span className="text-[9px] block font-mono leading-tight">{shift.end_time?.slice(0, 5)}</span></>
                    ) : <span className="text-[10px] mt-1 opacity-50 group-hover:opacity-100">+ Add</span>}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-2">Click any day to add, edit or remove a shift. <span className="text-orange-500">Orange = peak day.</span></p>
        </div>
        <div className="border-t border-gray-100" />
        <BlockDateSection stylist={stylist} authHeader={authHeader} onOverrideSaved={handleOverrideSaved} />
      </div>
      {shiftModal && (
        <ShiftModal stylistName={stylist.name} dayIndex={shiftModal.dayIndex} existingShift={shiftModal.existingShift}
          onSave={handleSaveShift} onDelete={handleDeleteShift} onClose={() => setShiftModal(null)} />
      )}
    </div>
  );
}

export default function AdminStylists({ authHeader }) {
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStylists = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/stylists`, { headers: authHeader });
      const data = await res.json();
      setStylists(Array.isArray(data) ? data : []);
    } catch { setStylists([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchStylists(); }, []);

  if (loading) {
    return <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-64 bg-white border border-gray-200 rounded-lg animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-lg uppercase tracking-widest">Stylist Management</h2>
        <p className="text-xs text-gray-400 mt-1">Manage pricing, weekly schedules, and date overrides per stylist.</p>
      </div>
      {stylists.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center text-gray-400">No stylists found.</div>
      ) : (
        <div className="space-y-6">{stylists.map(s => <StylistCard key={s.id} stylist={s} authHeader={authHeader} onPricingUpdated={fetchStylists} />)}</div>
      )}
    </div>
  );
}