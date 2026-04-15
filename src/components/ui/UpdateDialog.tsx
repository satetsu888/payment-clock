import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Dialog } from "./Dialog";

interface UpdateDialogProps {
  open: boolean;
  onClose: () => void;
}

type UpdateState =
  | { phase: "checking" }
  | { phase: "latest" }
  | { phase: "available"; version: string; body?: string }
  | { phase: "downloading"; version: string; downloaded: number; total: number | null }
  | { phase: "error"; message: string };

export function UpdateDialog({ open, onClose }: UpdateDialogProps) {
  const [state, setState] = useState<UpdateState>({ phase: "checking" });

  const checkForUpdate = useCallback(async () => {
    setState({ phase: "checking" });
    try {
      const update = await check();
      if (update) {
        setState({
          phase: "available",
          version: update.version,
          body: update.body,
        });
      } else {
        setState({ phase: "latest" });
      }
    } catch (e) {
      setState({ phase: "error", message: String(e) });
    }
  }, []);

  useEffect(() => {
    if (open) {
      checkForUpdate();
    }
  }, [open, checkForUpdate]);

  const handleInstall = async () => {
    if (state.phase !== "available") return;
    const version = state.version;
    setState({ phase: "downloading", version, downloaded: 0, total: null });
    try {
      const update = await check();
      if (!update) return;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          setState({
            phase: "downloading",
            version,
            downloaded: 0,
            total: event.data.contentLength ?? null,
          });
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setState((prev) =>
            prev.phase === "downloading"
              ? { ...prev, downloaded }
              : prev,
          );
        }
      });
      await relaunch();
    } catch (e) {
      setState({ phase: "error", message: String(e) });
    }
  };

  if (!open) return null;

  return (
    <Dialog onClose={onClose} size="sm">
      <Dialog.Header title="Update" />
      <Dialog.Content>
        {state.phase === "checking" && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            Checking for updates...
          </div>
        )}

        {state.phase === "latest" && (
          <p className="text-sm text-green-600">
            You're up to date.
          </p>
        )}

        {state.phase === "available" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Version <span className="font-medium">{state.version}</span> is available.
            </p>
            {state.body && (
              <div className="text-xs text-gray-500 whitespace-pre-wrap border-l-2 border-gray-200 pl-3 max-h-40 overflow-y-auto">
                {state.body}
              </div>
            )}
          </div>
        )}

        {state.phase === "downloading" && (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              Downloading version {state.version}...
            </p>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: state.total
                    ? `${Math.round((state.downloaded / state.total) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {state.total
                ? `${Math.round(state.downloaded / 1024 / 1024)}MB / ${Math.round(state.total / 1024 / 1024)}MB`
                : `${Math.round(state.downloaded / 1024 / 1024)}MB downloaded`}
            </p>
          </div>
        )}

        {state.phase === "error" && (
          <p className="text-sm text-red-600">{state.message}</p>
        )}
      </Dialog.Content>
      <Dialog.Footer>
        {state.phase !== "downloading" && (
          <Dialog.CancelButton onClick={onClose}>
            Close
          </Dialog.CancelButton>
        )}
        {state.phase === "available" && (
          <Dialog.ActionButton onClick={handleInstall}>
            Update Now
          </Dialog.ActionButton>
        )}
        {state.phase === "error" && (
          <button
            type="button"
            onClick={checkForUpdate}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
