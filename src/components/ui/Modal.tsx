"use client";

import { useEffect, useRef, useCallback } from "react";
import Button from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
}

export default function Modal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Onayla",
  cancelText = "İptal",
  variant = "primary",
  loading = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      // Focus the cancel button when modal opens
      cancelBtnRef.current?.focus();
    } else {
      dialog.close();
    }
  }, [open]);

  // Focus trap — keep focus inside the modal content
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !contentRef.current) return;
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 bg-transparent"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
        <div
          ref={contentRef}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
          role="alertdialog"
          aria-labelledby="modal-title"
          aria-describedby={description ? "modal-description" : undefined}
        >
          <h3
            id="modal-title"
            className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2"
          >
            {title}
          </h3>
          {description && (
            <p
              id="modal-description"
              className="text-sm text-gray-500 dark:text-gray-400 mb-6"
            >
              {description}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              ref={cancelBtnRef}
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              size="sm"
              onClick={onConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
