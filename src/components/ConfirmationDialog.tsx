"use client";

import { Modal } from "@/components/Modal";

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  pending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="font-body text-sm text-ink-soft">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-secondary !px-4 !py-2 text-xs">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={`!px-4 !py-2 text-xs font-body font-medium transition-colors disabled:opacity-50 ${
            danger ? "bg-rust text-paper hover:bg-rust/90" : "btn-primary"
          }`}
        >
          {pending ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
