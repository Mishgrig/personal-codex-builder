interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card compact-modal" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p className="helper-text">{description}</p>
        <div className="action-strip">
          <button className="secondary-button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={danger ? "secondary-button danger" : "primary-button"} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
