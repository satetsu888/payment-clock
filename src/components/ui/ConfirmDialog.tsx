import { Dialog } from "./Dialog";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "OK",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog onClose={onCancel} size="sm">
      <Dialog.Header title={title} />
      <Dialog.Content>
        <p className="text-sm text-gray-600">{message}</p>
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.CancelButton onClick={onCancel} disabled={loading} />
        <Dialog.ActionButton
          variant="danger"
          onClick={onConfirm}
          loading={loading}
          loadingText="Deleting..."
        >
          {confirmLabel}
        </Dialog.ActionButton>
      </Dialog.Footer>
    </Dialog>
  );
}
