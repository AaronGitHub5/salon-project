import { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================
// TOAST
// ============================================================
const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed top-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100%-3rem)] sm:w-full"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .toast-item { animation: toast-slide-in 0.25s ease-out; }
      `}</style>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const borderColor =
    toast.type === 'error' ? '#E4D5AE' : toast.type === 'success' ? '#B8975A' : '#E4E0D8';
  const iconBg =
    toast.type === 'error'
      ? '#FBF3E6'
      : toast.type === 'success'
      ? 'rgba(184,151,90,0.12)'
      : '#FAFAF8';
  const iconColor =
    toast.type === 'error' ? '#B56145' : toast.type === 'success' ? '#B8975A' : '#7A7870';
  const icon = toast.type === 'error' ? '✕' : toast.type === 'success' ? '✓' : 'i';

  return (
    <div
      className="toast-item bg-white border flex items-start gap-3 p-4 pointer-events-auto"
      style={{ borderColor }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[0.75rem] shrink-0 font-medium"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <p className="text-[0.82rem] font-light text-[#1A1A18] flex-1 leading-relaxed">
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        className="text-[#B4A894] hover:text-[#1A1A18] text-sm bg-transparent border-none cursor-pointer p-0 leading-none shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ============================================================
// CONFIRM
// ============================================================
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        destructive: !!options.destructive,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  // Close on Escape
  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter') handleConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
          onClick={handleCancel}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <div
            className="bg-white w-full max-w-sm p-7 border border-[#E4E0D8]"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-[0.62rem] tracking-[0.15em] uppercase mb-2"
              style={{ color: state.destructive ? '#B56145' : '#B8975A' }}
            >
              {state.destructive ? '⚠ Confirm Action' : 'Please Confirm'}
            </p>
            <h3
              className="font-display text-[1.4rem] font-light text-[#1A1A18] leading-tight mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {state.title}
            </h3>
            {state.message && (
              <p className="text-[0.82rem] font-light text-[#7A7870] leading-relaxed mb-6">
                {state.message}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase text-white border-none cursor-pointer transition-colors"
                style={{ background: state.destructive ? '#B56145' : '#1A1A18' }}
              >
                {state.confirmText}
              </button>
              <button
                onClick={handleCancel}
                className="px-5 py-3 text-[0.68rem] font-light tracking-[0.1em] uppercase text-[#7A7870] border border-[#E4E0D8] bg-transparent cursor-pointer hover:text-[#1A1A18] hover:border-[#1A1A18] transition-colors"
              >
                {state.cancelText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
