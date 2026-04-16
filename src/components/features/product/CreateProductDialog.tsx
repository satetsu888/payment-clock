import { useState } from "react";
import { Dialog } from "../../ui/Dialog";

interface CreateProductDialogProps {
  onSubmit: (name: string, description?: string) => Promise<void>;
  onClose: () => void;
}

export function CreateProductDialog({
  onSubmit,
  onClose,
}: CreateProductDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(name.trim(), description.trim() || undefined);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onClose={onClose} size="md">
      <Dialog.Header title="Create Product" />
      <form onSubmit={handleSubmit}>
        <Dialog.Content>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pro Plan"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              disabled={loading}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </Dialog.Content>
        <Dialog.Footer>
          <Dialog.CancelButton onClick={onClose} disabled={loading} />
          <Dialog.ActionButton
            type="submit"
            disabled={!name.trim()}
            loading={loading}
            loadingText="Creating..."
          >
            Create
          </Dialog.ActionButton>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
