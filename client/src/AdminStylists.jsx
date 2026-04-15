import { useState, useEffect } from 'react';
import { useToast, useConfirm } from './Notifications';
import API_URL from './config';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ShiftModal({ stylistName, dayIndex, existingShift, onSave, onDelete, onClose }) {
  const confirm = useConfirm();
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
    const ok = await confirm({
      title: `Remove ${DAY_FULL[dayIndex]} shift?`,
      message: `This will remove ${stylistName}'s ${DAY_FULL[dayIndex]} shift.`,
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    setSaving(true);
    try { await onDelete(existingShift.id); onClose(); }
    catch (err) { setError(err.message || 'Failed to delete shift'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm p-6 relative border border-[#E4E0D8]">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#B4A894] hover:text-[#1A1A18] text-xl bg-transparent border-none cursor-pointer">✕</button>
        <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-1" style={{ color: '#B8975A' }}>{existingShift ? 'Edit Shift' : 'Add Shift'}</p>
        <h3 className="font-display text-[1.3rem] font-light text-[#1A1A18] mb-5">{stylistName} · {DAY_FULL[dayIndex]}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[0.62rem] tracking-[0.12em] uppercase text-[#7A7870] block mb-1">Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-[#E4E0D8] p-3 text-[0.85rem] font-light bg-[#FAFAF8] focus:outline-none focus:border-[#B8975A]" />
          </div>
          <div>
            <label className="text-[0.62rem] tracking-[0.12em] uppercase text-[#7A7870] block mb-1">End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border border-[#E4E0D8] p-3 text-[0.85rem] font-light bg-[#FAFAF8] focus:outline-none focus:border-[#B8975A]" />
          </div>
          {error && <p className="text-[0.75rem] font-light" style={{ color: '#B56145' }}>{error}</p>}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase bg-[#1A1A18] text-white border-none cursor-pointer hover:bg-[#B8975A] disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Shift'}
          </button>
          {existingShift && (
            <button onClick={handleDelete} disabled={saving} className="px-5 py-3 text-[0.68rem] font-light tracking-[0.1em] uppercase border bg-transparent cursor-pointer transition-colors" style={{ color: '#B56145', borderColor: '#E4D5AE' }}>Remove</button>
          )}
        </div>
      </div>
    </div>
  );
}

function OverrideConfirmModal({ stylistName, overrideDate, endDate, preview, reason, cancelRemainingOnly, onConfirm, onCancel, saving }) {
  const formatDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const isRange = endDate && endDate !== overrideDate;
  const dateLabel = isRange
    ? `${formatDate(overrideDate)} — ${formatDate(endDate)}`
    : formatDate(overrideDate);
  const daysCount = preview.dates || 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md p-6 relative border border-[#E4E0D8] max-h-[90vh] overflow-y-auto">
        <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-1" style={{ color: '#B56145' }}>⚠ Confirm Date Block</p>
        <h3 className="font-display text-[1.3rem] font-light text-[#1A1A18] mb-1">{stylistName}</h3>
        <p className="text-[0.72rem] font-light text-[#7A7870] mb-1">{dateLabel}</p>
        {isRange && <p className="text-[0.65rem] font-light text-[#B4A894] mb-4">{daysCount} day{daysCount !== 1 ? 's' : ''} blocked</p>}
        {!isRange && <div className="mb-4" />}
        {preview.count === 0 ? (
          <div className="border border-[#B8975A] bg-[rgba(184,151,90,0.08)] p-4 mb-4">
            <p className="text-[0.82rem] font-medium" style={{ color: '#B8975A' }}>✓ No bookings affected</p>
            <p className="text-[0.72rem] font-light text-[#7A7870] mt-1">No confirmed bookings exist for {isRange ? 'these dates' : 'this date'}{cancelRemainingOnly ? ' from now onwards' : ''}.</p>
          </div>
        ) : (
          <div className="border border-[#E4D5AE] bg-[#FBF3E6] p-4 mb-4">
            <p className="text-[0.82rem] font-medium" style={{ color: '#B56145' }}>{preview.count} booking{preview.count > 1 ? 's' : ''} will be cancelled</p>
            <p className="text-[0.72rem] font-light text-[#7A7870] mt-1 mb-3">{cancelRemainingOnly ? 'Remaining bookings from now onwards.' : `All bookings ${isRange ? 'in this range' : 'on this date'}.`} Customers will be emailed automatically.</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {preview.bookings.map(b => (
                <div key={b.id} className="flex justify-between text-[0.72rem] bg-white px-3 py-2 border border-[#E4E0D8]">
                  <span className="font-medium text-[#1A1A18]">{b.customer_name}</span>
                  <span className="text-[#7A7870] font-light">{b.service_name} · {new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {reason && (
          <div className="bg-[#FAFAF8] border border-[#E4E0D8] p-3 mb-4 text-[0.75rem] font-light text-[#7A7870]">
            <span className="text-[0.6rem] tracking-[0.12em] uppercase block mb-1" style={{ color: '#B8975A' }}>Reason</span>{reason}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onConfirm} disabled={saving}
            className="flex-1 py-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase text-white border-none cursor-pointer transition-colors disabled:opacity-50"
            style={{ background: '#B56145' }}>
            {saving ? 'Processing...' : preview.count > 0 ? `Cancel ${preview.count} Booking${preview.count > 1 ? 's' : ''} & Block` : 'Block Date'}
          </button>
          <button onClick={onCancel} disabled={saving} className="px-5 py-3 text-[0.68rem] font-light tracking-[0.1em] uppercase text-[#7A7870] border border-[#E4E0D8] bg-transparent cursor-pointer hover:text-[#1A1A18] hover:border-[#1A1A18] transition-colors">Go Back</button>
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
        <span className="text-[0.62rem] tracking-[0.12em] uppercase text-[#7A7870]">{label}</span>
        <span className="font-display text-[1.2rem] font-light text-[#1A1A18]">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #B8975A ${pct}%, #E4E0D8 ${pct}%)` }} />
      <div className="flex justify-between text-[0.62rem] font-light text-[#B4A894] mt-1">
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
        <span className="text-[0.62rem] tracking-[0.12em] uppercase text-[#7A7870]">Peak Days</span>
        <span className="text-[0.72rem] font-light text-[#7A7870]">{peakDays.length === 0 ? 'None' : peakDays.map(d => DAYS[d]).join(', ')}</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day, idx) => (
          <button key={idx} type="button" onClick={() => toggle(idx)}
            className={`py-2 text-[0.62rem] tracking-[0.1em] uppercase border transition-colors cursor-pointer ${peakDays.includes(idx) ? 'text-white' : 'bg-[#FAFAF8] border-[#E4E0D8] text-[#7A7870] hover:border-[#1A1A18]'}`}
            style={peakDays.includes(idx) ? { background: '#B8975A', borderColor: '#B8975A' } : {}}>
            {day}
          </button>
        ))}
      </div>
      <p className="text-[0.62rem] font-light text-[#B4A894] mt-1">Click to toggle. <span style={{ color: '#B8975A' }}>Gold = peak day.</span></p>
    </div>
  );
}

function BlockDateSection({ stylist, authHeader, onOverrideSaved, allStylistsMode = false }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [selectedDate, setSelectedDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useRange, setUseRange] = useState(false);
  const [allStylists, setAllStylists] = useState(false);
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
      const body = {
        stylist_id: stylist.id,
        override_date: selectedDate,
        end_date: useRange && endDate ? endDate : null,
        cancel_remaining_only: cancelRemainingOnly,
        all_stylists: allStylists,
      };
      const res = await fetch(`${API_URL}/api/shifts/overrides/preview`, {
        method: 'POST', headers: authHeader,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to preview'); return; }
      setPreview(data);
    } catch { toast.error('Something went wrong'); } finally { setPreviewing(false); }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const body = {
        stylist_id: stylist.id,
        override_date: selectedDate,
        end_date: useRange && endDate ? endDate : null,
        is_working: false,
        reason: reason || null,
        cancel_remaining_only: cancelRemainingOnly,
        all_stylists: allStylists,
      };
      const res = await fetch(`${API_URL}/api/shifts/overrides`, {
        method: 'POST', headers: authHeader,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to save override'); return; }
      setPreview(null); setSelectedDate(''); setEndDate(''); setReasonPreset(''); setReasonCustom(''); setCancelRemainingOnly(false); setAllStylists(false); setUseRange(false);
      await fetchOverrides();
      onOverrideSaved(data.cancelledCount);
    } catch { toast.error('Something went wrong'); } finally { setSaving(false); }
  };

  const handleRemoveOverride = async (id) => {
    const ok = await confirm({
      title: 'Remove this date block?',
      message: 'The stylist will appear available again.',
      confirmText: 'Remove',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/api/shifts/overrides/${id}`, { method: 'DELETE', headers: authHeader });
      if (!res.ok) { toast.error('Failed to remove override'); return; }
      toast.success('Date block removed.');
      await fetchOverrides();
    } catch { toast.error('Something went wrong'); }
  };

  return (
    <div>
      <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-1" style={{ color: '#B8975A' }}>Date Overrides</p>
      <p className="text-[0.75rem] font-light text-[#7A7870] mb-4">Block dates for sick days, holidays, or emergency closures. Confirmed bookings will be auto-cancelled and customers emailed.</p>
      <div className="bg-[#FAFAF8] border border-[#E4E0D8] p-4 space-y-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[0.6rem] tracking-[0.12em] uppercase text-[#7A7870] block mb-1">{useRange ? 'Start Date' : 'Date to Block'}</label>
            <input type="date" min={today} value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setPreview(null); if (!useRange) setEndDate(''); }}
              className="w-full border border-[#E4E0D8] p-2.5 text-[0.82rem] font-light bg-white focus:outline-none focus:border-[#B8975A]" />
          </div>
          {useRange ? (
            <div>
              <label className="text-[0.6rem] tracking-[0.12em] uppercase text-[#7A7870] block mb-1">End Date</label>
              <input type="date" min={selectedDate || today} value={endDate}
                onChange={e => { setEndDate(e.target.value); setPreview(null); }}
                className="w-full border border-[#E4E0D8] p-2.5 text-[0.82rem] font-light bg-white focus:outline-none focus:border-[#B8975A]" />
            </div>
          ) : (
            <div>
              <label className="text-[0.6rem] tracking-[0.12em] uppercase text-[#7A7870] block mb-1">Reason (optional)</label>
              <select value={reasonPreset} onChange={e => { setReasonPreset(e.target.value); setReasonCustom(''); }}
                className="w-full border border-[#E4E0D8] p-2.5 text-[0.82rem] font-light bg-white focus:outline-none focus:border-[#B8975A]">
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
                  className="w-full border border-[#E4E0D8] p-2.5 text-[0.82rem] font-light bg-white focus:outline-none focus:border-[#B8975A] mt-2" />
              )}
            </div>
          )}
        </div>
        {/* Reason row when in range mode */}
        {useRange && (
          <div>
            <label className="text-[0.6rem] tracking-[0.12em] uppercase text-[#7A7870] block mb-1">Reason (optional)</label>
            <select value={reasonPreset} onChange={e => { setReasonPreset(e.target.value); setReasonCustom(''); }}
              className="w-full border border-[#E4E0D8] p-2.5 text-[0.82rem] font-light bg-white focus:outline-none focus:border-[#B8975A]">
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
                className="w-full border border-[#E4E0D8] p-2.5 text-[0.82rem] font-light bg-white focus:outline-none focus:border-[#B8975A] mt-2" />
            )}
          </div>
        )}
        {/* Toggles */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => { setUseRange(v => !v); setEndDate(''); setPreview(null); }}
              className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0"
              style={{ background: useRange ? '#B8975A' : '#E4E0D8' }}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${useRange ? 'left-5' : 'left-0.5'}`} />
            </div>
            <div>
              <span className="text-[0.72rem] font-medium text-[#1A1A18]">Multiple days</span>
              <span className="text-[0.62rem] font-light text-[#7A7870] block">Block a date range instead of a single day</span>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => { setAllStylists(v => !v); setPreview(null); }}
              className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0"
              style={{ background: allStylists ? '#B8975A' : '#E4E0D8' }}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${allStylists ? 'left-5' : 'left-0.5'}`} />
            </div>
            <div>
              <span className="text-[0.72rem] font-medium text-[#1A1A18]">All stylists</span>
              <span className="text-[0.62rem] font-light text-[#7A7870] block">Close the whole salon — applies to every stylist</span>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setCancelRemainingOnly(v => !v)}
              className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0"
              style={{ background: cancelRemainingOnly ? '#B8975A' : '#E4E0D8' }}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${cancelRemainingOnly ? 'left-5' : 'left-0.5'}`} />
            </div>
            <div>
              <span className="text-[0.72rem] font-medium text-[#1A1A18]">Cancel remaining only</span>
              <span className="text-[0.62rem] font-light text-[#7A7870] block">Only cancel bookings from now onwards — keeps completed morning appointments intact</span>
            </div>
          </label>
        </div>
        <button onClick={handlePreview} disabled={!selectedDate || (useRange && !endDate) || previewing}
          className="w-full border border-[#1A1A18] text-[#1A1A18] py-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase bg-transparent hover:bg-[#1A1A18] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
          {previewing ? 'Checking bookings...' : 'Check & Block Date'}
        </button>
      </div>
      {overridesLoading ? (
        <div className="h-10 bg-[#F0EDE5] animate-pulse" />
      ) : overrides.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[0.6rem] tracking-[0.12em] uppercase mb-2" style={{ color: '#B8975A' }}>Active Blocks</p>
          {overrides.map(o => (
            <div key={o.id} className="flex items-center justify-between border border-[#E4D5AE] bg-[#FBF3E6] px-4 py-2.5">
              <div>
                <span className="text-[0.82rem] font-medium text-[#1A1A18]">
                  {new Date(o.override_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {o.reason && <span className="text-[0.72rem] font-light text-[#7A7870] ml-2">· {o.reason}</span>}
              </div>
              <button onClick={() => handleRemoveOverride(o.id)} className="text-[0.62rem] tracking-[0.1em] uppercase bg-transparent border-none cursor-pointer ml-4 transition-colors" style={{ color: '#B56145' }}>Remove</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[0.75rem] font-light text-[#B4A894] italic">No date blocks set.</p>
      )}
      {preview && (
        <OverrideConfirmModal
          stylistName={allStylists ? 'All Stylists' : stylist.name}
          overrideDate={selectedDate}
          endDate={useRange ? endDate : null}
          preview={preview}
          reason={reason} cancelRemainingOnly={cancelRemainingOnly}
          onConfirm={handleConfirm} onCancel={() => setPreview(null)} saving={saving}
        />
      )}
    </div>
  );
}

function StylistCard({ stylist, authHeader, onPricingUpdated }) {
  const toast = useToast();
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
      if (!res.ok) { const err = await res.json(); toast.error(err.error || 'Failed to save pricing'); return; }
      setPricingSaved(true); onPricingUpdated();
      setTimeout(() => setPricingSaved(false), 2500);
    } catch { toast.error('Something went wrong'); } finally { setSavingPricing(false); }
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
    <div className="bg-white border border-[#E4E0D8] overflow-hidden">
      {overrideBanner && <div className="text-[0.72rem] font-medium tracking-[0.1em] uppercase px-6 py-3" style={{ background: '#B8975A', color: '#fff' }}>{overrideBanner}</div>}
      <div className="bg-[#FAFAF8] border-b border-[#E4E0D8] px-6 py-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h3 className="font-display text-[1.4rem] font-medium text-[#1A1A18]">{stylist.name}</h3>
          <p className="text-[0.72rem] font-light text-[#7A7870]">{stylist.email}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[0.62rem] tracking-[0.15em] uppercase" style={{ color: '#B8975A' }}>£{EXAMPLE_BASE} base</p>
          <p className="font-display text-[1.1rem] font-light text-[#1A1A18]">£{previewNormal} <span className="text-[0.78rem] font-light text-[#7A7870]">/ peak</span> £{previewPeak}</p>
        </div>
      </div>
      <div className="p-6 space-y-8">
        <div className="space-y-5">
          <p className="text-[0.62rem] tracking-[0.15em] uppercase" style={{ color: '#B8975A' }}>Pricing</p>
          <PricingSlider label="Price Multiplier" value={multiplier} min={0.8} max={2.0} step={0.05} format={v => `×${v.toFixed(2)}`} onChange={setMultiplier} />
          <PricingSlider label="Peak Surcharge" value={peakPercent} min={0} max={50} step={1} format={v => `+${v}%`} onChange={setPeakPercent} />
          <PeakDayToggles peakDays={peakDays} onChange={setPeakDays} />
          <PricingSlider label="Evening Peak From" value={peakHourStart} min={14} max={20} step={1} format={formatHour} onChange={v => setPeakHourStart(Math.round(v))} />
          <div className="bg-[#FAFAF8] border border-[#E4E0D8] p-4 flex gap-6">
            <div>
              <span className="text-[0.62rem] tracking-[0.1em] uppercase text-[#7A7870] block">Standard (£{EXAMPLE_BASE})</span>
              <span className="font-display text-[1.2rem] font-light text-[#1A1A18]">£{previewNormal}</span>
            </div>
            <div>
              <span className="text-[0.62rem] tracking-[0.1em] uppercase block" style={{ color: '#B8975A' }}>⚡ Peak · {peakDays.map(d => DAYS[d]).join(', ') || 'None'} + after {formatHour(peakHourStart)}</span>
              <span className="font-display text-[1.2rem] font-light" style={{ color: '#B8975A' }}>£{previewPeak}</span>
            </div>
          </div>
          <button onClick={handleSavePricing} disabled={savingPricing}
            className={`w-full py-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase transition-colors border-none cursor-pointer ${pricingSaved ? 'text-white' : 'bg-[#1A1A18] text-white hover:bg-[#B8975A] disabled:opacity-50'}`}
            style={pricingSaved ? { background: '#B8975A' } : {}}>
            {pricingSaved ? '✓ Saved' : savingPricing ? 'Saving...' : 'Save Pricing'}
          </button>
        </div>
        <div>
          <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-3" style={{ color: '#B8975A' }}>Weekly Schedule</p>
          {shiftsLoading ? (
            <div className="grid grid-cols-7 gap-1">{DAYS.map(d => <div key={d} className="h-16 bg-[#F0EDE5] animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day, idx) => {
                const shift = getShiftForDay(idx);
                const isPeakDay = peakDays.includes(idx);
                return (
                  <button key={idx} onClick={() => setShiftModal({ dayIndex: idx, existingShift: shift })}
                    className={`flex flex-col items-center justify-center p-2 border min-h-[4.2rem] text-center transition-colors group cursor-pointer
                      ${shift ? isPeakDay ? 'text-white' : 'bg-[#1A1A18] border-[#1A1A18] text-white' : 'bg-[#FAFAF8] border-[#E4E0D8] text-[#7A7870]'}`}
                    style={shift && isPeakDay ? { background: '#B8975A', borderColor: '#B8975A' } : {}}>
                    <span className="text-[0.6rem] tracking-[0.1em] uppercase block">{day}</span>
                    {shift ? (
                      <><span className="text-[0.65rem] mt-1 block font-light leading-tight">{shift.start_time?.slice(0, 5)}</span>
                      <span className="text-[0.65rem] block font-light leading-tight">{shift.end_time?.slice(0, 5)}</span></>
                    ) : <span className="text-[0.6rem] mt-1 opacity-60 group-hover:opacity-100">+ Add</span>}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-[0.65rem] font-light text-[#7A7870] mt-2">Click any day to add, edit or remove a shift. <span style={{ color: '#B8975A' }}>Gold = peak day.</span></p>
        </div>
        <div className="border-t border-[#E4E0D8]" />
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
    return <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-64 bg-white border border-[#E4E0D8] animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-1" style={{ color: '#B8975A' }}>Stylists</p>
        <h2 className="font-display text-[1.6rem] font-light text-[#1A1A18]">Stylist Management</h2>
        <p className="text-[0.78rem] font-light text-[#7A7870] mt-1">Manage pricing, weekly schedules, and date overrides per stylist.</p>
      </div>
      {stylists.length === 0 ? (
        <div className="bg-white border border-[#E4E0D8] p-16 text-center">
          <p className="font-display text-[1.2rem] font-light text-[#7A7870]">No stylists found.</p>
        </div>
      ) : (
        <div className="space-y-6">{stylists.map(s => <StylistCard key={s.id} stylist={s} authHeader={authHeader} onPricingUpdated={fetchStylists} />)}</div>
      )}
    </div>
  );
}