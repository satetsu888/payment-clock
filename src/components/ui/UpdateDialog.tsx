import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          アップデート
        </h2>

        {state.phase === "checking" && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            更新を確認しています...
          </div>
        )}

        {state.phase === "latest" && (
          <p className="text-sm text-green-600">
            最新バージョンです。
          </p>
        )}

        {state.phase === "available" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              バージョン <span className="font-medium">{state.version}</span> が利用可能です。
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
              バージョン {state.version} をダウンロード中...
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
                : `${Math.round(state.downloaded / 1024 / 1024)}MB ダウンロード済み`}
            </p>
          </div>
        )}

        {state.phase === "error" && (
          <p className="text-sm text-red-600">{state.message}</p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          {state.phase !== "downloading" && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              閉じる
            </button>
          )}
          {state.phase === "available" && (
            <button
              type="button"
              onClick={handleInstall}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              今すぐアップデート
            </button>
          )}
          {state.phase === "error" && (
            <button
              type="button"
              onClick={checkForUpdate}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
            >
              再試行
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
