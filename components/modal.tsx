"use client";
import { useEffect, useRef, useId } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  focusTitle = false,
  closeLabel = "Close task dialog",
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  onClose: () => void;
  focusTitle?: boolean;
  closeLabel?: string;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = ref.current;
    element?.showModal();
    if (focusTitle)
      element?.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
    return () => {
      element?.close();
      if (previous?.isConnected) previous.focus();
      else
        document.querySelector<HTMLButtonElement>(".capture-button")?.focus();
    };
  }, [focusTitle]);
  return (
    <div className="modal-backdrop">
      <dialog
        ref={ref}
        className="capture-dialog"
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </dialog>
    </div>
  );
}
