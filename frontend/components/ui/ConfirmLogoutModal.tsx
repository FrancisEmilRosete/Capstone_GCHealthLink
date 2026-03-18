'use client';

interface ConfirmLogoutModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmLogoutModal({
  open,
  onCancel,
  onConfirm,
  title = 'Confirm logout',
  message = 'Are you sure you want to log out?',
  confirmLabel = 'Log Out',
  cancelLabel = 'Cancel',
}: ConfirmLogoutModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 id="logout-confirm-title" className="text-base font-bold text-gray-900">
            {title}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{message}</p>
        </div>

        <div className="px-5 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}