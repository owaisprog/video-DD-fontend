import React, { useEffect, useMemo, useState } from "react";
import {
  Lock,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowDown,
  Video as VideoIcon,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import type { VideoDataType } from "./types";
import { EditVideo } from "./EditVideo";
import {
  getVideoById,
  deleteVideoById,
  getVideoProgress,
} from "../../../lib/api/video";

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const secs = Math.round(totalSeconds);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isProbablyUrl(v?: string) {
  return !!v && (v.startsWith("http://") || v.startsWith("https://"));
}

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

type ProgressInfo = {
  progress: number;
  status: string;
  message: string;
  updatedAt?: string | null;
};

function extractProgress(res: any): ProgressInfo | null {
  const payload = res?.data;

  const candidate =
    (payload?.data && typeof payload.data === "object" ? payload.data : null) ||
    (payload?.message && typeof payload.message === "object"
      ? payload.message
      : null);

  if (!candidate) return null;

  const pNum = Number(candidate.progress ?? 0);
  return {
    progress: Number.isFinite(pNum) ? pNum : 0,
    status: String(candidate.status ?? "queued"),
    message: String(candidate.message ?? ""),
    updatedAt: candidate.updatedAt ?? null,
  };
}

function compactMessage(msg?: string) {
  const m = (msg || "").trim();
  if (!m) return "";
  const cleaned = m
    .replace(/uploading video\.\.\./i, "Uploading video")
    .replace(/uploading thumbnail\.\.\./i, "Uploading thumbnail")
    .replace(/saving video metadata\.\.\./i, "Finalizing")
    .replace(/\.+$/g, "");
  return cleaned.length > 52 ? `${cleaned.slice(0, 52)}…` : cleaned;
}

function CircularProgress({
  value,
  failed,
}: {
  value: number;
  failed?: boolean;
}) {
  const v = clamp(value);
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  return (
    <div className="relative grid place-items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke={failed ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.92)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 320ms ease" }}
        />
      </svg>

      <div className="absolute text-[11px] font-semibold tabular-nums text-white">
        {failed ? "!" : `${v}%`}
      </div>
    </div>
  );
}

function Thumb({
  src,
  duration,
  progressInfo,
}: {
  src?: string;
  duration: string;
  progressInfo?: ProgressInfo | null;
}) {
  const showImage = isProbablyUrl(src);

  const progress = progressInfo ? clamp(progressInfo.progress) : 0;
  const status = progressInfo?.status ?? "queued";
  const isFailed = String(status).toLowerCase() === "failed";
  const isDoneSuccess =
    progress >= 100 || String(status).toLowerCase() === "ready";

  const showOverlay = !!progressInfo && !isDoneSuccess;

  const msg = compactMessage(progressInfo?.message);

  return (
    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
      {showImage ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-black/40 dark:text-white/40">
          <VideoIcon className="h-6 w-6" />
        </div>
      )}

      <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {duration}
      </span>

      {showOverlay ? (
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 45%, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0.62) 100%)",
            }}
          />

          <div className="absolute inset-0 grid place-items-center">
            <div className="rounded-2xl bg-black/25 p-2 shadow-[0_8px_22px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
              <CircularProgress value={progress} failed={isFailed} />
            </div>
          </div>

          {isFailed ? (
            <div className="absolute inset-x-1.5 bottom-1.5 rounded-lg bg-black/55 px-2 py-1.5 ring-1 ring-white/10">
              <div className="truncate text-[10px] leading-snug text-white/90">
                {msg || "Upload failed"}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  rows?: VideoDataType[];
  title?: string;

  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;

  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;

  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;

  sortBy: "asc" | "desc";
  setSortBy: React.Dispatch<React.SetStateAction<"asc" | "desc">>;

  onDeletedRefresh?: () => void;
  readOnly?: boolean;

  uploadingIds?: string[];
  onUploadComplete?: (videoId: string) => void;
};

function VideoRow({
  r,
  gridCols,
  readOnly,
  onDeletedRefresh,
  uploading,
  onUploadComplete,
  onAssetsQueued,
}: {
  r: VideoDataType;
  gridCols: string;
  readOnly: boolean;
  onDeletedRefresh?: () => void;
  uploading: boolean;
  onUploadComplete?: (videoId: string) => void;
  onAssetsQueued?: (videoId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editVideoData, setEditVideoData] = useState<VideoDataType>();
  const [deleteTarget, setDeleteTarget] = useState<VideoDataType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null);
  const shouldPoll = uploading;

  useEffect(() => {
    if (!shouldPoll || !r?._id) return;

    let stopped = false;
    let timer: any = null;

    const tick = async () => {
      try {
        const res = await getVideoProgress(String(r._id));
        const prog = extractProgress(res);
        if (stopped) return;

        if (prog) {
          const isDoneSuccess =
            clamp(prog.progress) >= 100 ||
            String(prog.status).toLowerCase() === "ready";
          const isFailed = String(prog.status).toLowerCase() === "failed";
          const isTerminal = isDoneSuccess || isFailed;

          if (isDoneSuccess) setProgressInfo(null);
          else setProgressInfo(prog);

          if (isTerminal) {
            setTimeout(() => {
              onUploadComplete?.(String(r._id));
            }, 300);
            clearInterval(timer);
          }
        }
      } catch {
        // ignore
      }
    };

    tick();
    timer = setInterval(tick, 1500);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [shouldPoll, r?._id, onUploadComplete]);

  const normalizeVideo = (payload: any): VideoDataType | undefined => {
    if (!payload) return undefined;
    if (Array.isArray(payload)) return payload[0];
    return payload;
  };

  const handleEdit = async (id: string | number) => {
    if (readOnly) return;
    setOpen(true);
    setEditVideoData(undefined);

    try {
      const res = await getVideoById(id);
      const video = normalizeVideo(res?.data?.data);

      if (!video) {
        setOpen(false);
        return;
      }

      setEditVideoData(video);
    } catch {
      setOpen(false);
    }
  };

  const openDelete = (video: VideoDataType) => {
    if (readOnly) return;
    setActionMsg(null);
    setDeleteTarget(video);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (readOnly) return;
    if (!deleteTarget?._id) return;

    setDeleting(true);
    setActionMsg(null);

    try {
      await deleteVideoById(String(deleteTarget._id));
      setActionMsg("Video deleted successfully.");
      setDeleteTarget(null);

      if (onDeletedRefresh) onDeletedRefresh();
      else window.location.reload();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to delete video. Please try again.";
      setActionMsg(msg);
    } finally {
      setDeleting(false);
    }
  };

  const visibility = r.isPublished ? "Public" : "Draft";
  const isDraft = visibility === "Draft";
  const dateLabel = formatDateLabel(r.createdAt);
  const dateSubLabel = "Uploaded";

  return (
    <>
      {actionMsg ? (
        <div className="border-b border-black/10 px-5 py-3 text-xs text-black/70 dark:border-white/10 dark:text-white/70">
          {actionMsg}
        </div>
      ) : null}

      <div
        className={`grid ${gridCols} items-center gap-4 px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5`}
      >
        <div className="flex items-center">
          <input
            type="checkbox"
            disabled
            className="h-4 w-4 rounded border-black/20 bg-transparent accent-black opacity-60 dark:border-white/20 dark:accent-white"
          />
        </div>

        <div className="flex items-center gap-4">
          <Thumb
            src={r.thumbnail}
            duration={formatDuration(r.duration)}
            progressInfo={progressInfo}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-black/90 dark:text-white/90">
              {r.title}
            </div>
            <div className="truncate text-xs text-black/55 dark:text-white/50">
              {r.description || "—"}
            </div>

            {isProbablyUrl(r.videoFile) ? (
              <a
                href={r.videoFile}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs text-black/60 underline hover:text-black/80 dark:text-white/60 dark:hover:text-white/80"
              >
                Open video
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-black/80 dark:text-white/80">
          {isDraft ? (
            <>
              <FileText className="h-4 w-4 text-black/60 dark:text-white/60" />
              <span>Draft</span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-black/60 dark:text-white/60" />
              <span>{visibility}</span>
            </>
          )}
        </div>

        <div>
          <div className="text-sm text-black/80 dark:text-white/80">
            {dateLabel}
          </div>
          <div className="text-xs text-black/45 dark:text-white/45">
            {dateSubLabel}
          </div>
        </div>

        <div className="text-right text-sm text-black/70 dark:text-white/70">
          {r.views}
        </div>
        <div className="text-right text-sm text-black/70 dark:text-white/70">
          {r.commentCounts}
        </div>
        <div className="text-right text-sm text-black/70 dark:text-white/70">
          {r.likesCount}
        </div>

        {!readOnly ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleEdit(r._id)}
              className="inline-flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-black/90 ring-1 ring-black/10 hover:bg-black/10 dark:bg-white/10 dark:text-white/90 dark:ring-white/10 dark:hover:bg-white/15"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            <button
              type="button"
              onClick={() => openDelete(r)}
              className="inline-flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-black/90 ring-1 ring-black/10 hover:bg-black/10 dark:bg-white/10 dark:text-white/90 dark:ring-white/10 dark:hover:bg-white/15"
              title="Delete video"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        ) : null}
      </div>

      {!readOnly && open && editVideoData ? (
        <EditVideo
          data={editVideoData}
          open={open}
          onClose={() => setOpen(false)}
          onUpdatedRefresh={onDeletedRefresh}
          onAssetsQueued={onAssetsQueued}
        />
      ) : null}

      {!readOnly && deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-light-background text-black ring-1 ring-black/10 dark:bg-dark-background dark:text-white dark:ring-white/10">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
              <div className="text-sm font-semibold">Delete video</div>
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 ring-1 ring-black/10 disabled:opacity-50 dark:bg-white/5 dark:ring-white/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 text-sm text-black/75 dark:text-white/75">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-black/90 dark:text-white/90">
                {deleteTarget.title}
              </span>
              ? This action can’t be undone.
            </div>

            <div className="flex justify-end gap-2 border-t border-black/10 px-5 py-4 dark:border-white/10">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-black/90 ring-1 ring-black/10 hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:text-white/90 dark:ring-white/10 dark:hover:bg-white/15"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-100"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function VideosListPanel({
  rows = [],
  title = "Content",
  page,
  setPage,
  limit,
  setLimit,
  query,
  setQuery,
  sortBy,
  setSortBy,
  onDeletedRefresh,
  readOnly = false,
  uploadingIds = [],
  onUploadComplete,
}: Props) {
  const [draftQuery, setDraftQuery] = useState(query);

  // NEW: local processing ids for edit-queued asset updates
  const [localUploadingIds, setLocalUploadingIds] = useState<string[]>([]);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  const canPrev = page > 1;
  const canNext = rows.length === limit;

  const start = rows.length > 0 ? (page - 1) * limit + 1 : 0;
  const end = (page - 1) * limit + rows.length;

  const applySearch = () => {
    setPage(1);
    setQuery(draftQuery.trim());
  };

  const changeLimit = (next: number) => {
    setPage(1);
    setLimit(next);
  };

  const toggleSort = () => {
    setPage(1);
    setSortBy((s) => (s === "asc" ? "desc" : "asc"));
  };

  const gridCols = readOnly
    ? "grid-cols-[44px_minmax(280px,1.6fr)_1fr_1fr_1fr_0.6fr_0.7fr_0.8fr]"
    : "grid-cols-[44px_minmax(280px,1.6fr)_1fr_1fr_1fr_0.6fr_0.7fr_0.8fr_220px]";

  const uploadingSet = useMemo(() => {
    return new Set([
      ...uploadingIds.map((id) => String(id)),
      ...localUploadingIds.map((id) => String(id)),
    ]);
  }, [uploadingIds, localUploadingIds]);

  const handleAssetsQueued = (videoId: string) => {
    setLocalUploadingIds((prev) =>
      prev.includes(videoId) ? prev : [...prev, videoId],
    );
  };

  const handleTrackedUploadComplete = (videoId: string) => {
    setLocalUploadingIds((prev) => prev.filter((id) => id !== videoId));

    if (onUploadComplete) {
      onUploadComplete(videoId);
      return;
    }

    onDeletedRefresh?.();
  };

  const isLikelyProcessing = (r: VideoDataType) => {
    const createdAtMs = new Date(r.createdAt).getTime();
    const recent =
      Number.isFinite(createdAtMs) && Date.now() - createdAtMs < 30 * 60 * 1000;
    const notReady = !isProbablyUrl(r.videoFile);
    return recent && notReady;
  };

  const controlClass =
    "rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm text-black outline-none transition placeholder:text-black/40 focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/20";

  const ghostButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-sm font-medium text-black ring-1 ring-black/10 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:ring-white/10 dark:hover:bg-white/15";

  const pageButtonClass =
    "grid h-9 w-9 place-items-center rounded-xl bg-black/5 text-black ring-1 ring-black/10 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:ring-white/10 dark:hover:bg-white/15";

  return (
    <div className="relative w-full rounded-2xl bg-light-background text-black ring-1 ring-black/10 dark:bg-dark-background dark:text-white dark:ring-white/10">
      <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-black/55 dark:text-white/55">
            {rows.length} item{rows.length === 1 ? "" : "s"}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            applySearch();
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <input
            type="text"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="Search videos..."
            className={`${controlClass} w-full sm:w-64`}
          />

          <button type="submit" className={ghostButtonClass}>
            Search
          </button>

          <button
            type="button"
            onClick={toggleSort}
            className={ghostButtonClass}
          >
            {sortBy === "asc" ? "Oldest" : "Newest"}
            <ArrowDown
              className={`h-4 w-4 transition-transform ${
                sortBy === "asc" ? "rotate-180" : ""
              }`}
            />
          </button>
        </form>
      </div>

      <div
        className={`grid ${gridCols} items-center gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-black/55 dark:text-white/55`}
      >
        <div />
        <div>Video</div>
        <div>Visibility</div>
        <div>Date</div>
        <div className="text-right">Views</div>
        <div className="text-right">Comments</div>
        <div className="text-right">Likes</div>
        {!readOnly ? <div className="text-right">Actions</div> : null}
      </div>

      <div className="divide-y divide-black/10 dark:divide-white/10">
        {rows.length > 0 ? (
          rows.map((r) => {
            const shouldTrack =
              uploadingSet.has(String(r._id)) || isLikelyProcessing(r);

            return (
              <VideoRow
                key={r._id}
                r={r}
                gridCols={gridCols}
                readOnly={readOnly}
                onDeletedRefresh={onDeletedRefresh}
                uploading={shouldTrack}
                onUploadComplete={handleTrackedUploadComplete}
                onAssetsQueued={handleAssetsQueued}
              />
            );
          })
        ) : (
          <div className="px-5 py-10 text-center text-sm text-black/60 dark:text-white/60">
            No videos found.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-black/10 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-black/60 dark:text-white/60">
          {rows.length > 0 ? `Showing ${start}-${end}` : "No results"}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={!canPrev}
            className={pageButtonClass}
            aria-label="First page"
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
            className={pageButtonClass}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="grid h-9 min-w-18 place-items-center rounded-xl bg-black/5 px-3 text-sm font-medium text-black ring-1 ring-black/10 dark:bg-white/10 dark:text-white dark:ring-white/10">
            Page {page}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!canNext}
            className={pageButtonClass}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setPage((p) => p + 5)}
            disabled={!canNext}
            className={pageButtonClass}
            aria-label="Jump ahead"
            title="Jump ahead"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>

          <select
            value={limit}
            onChange={(e) => changeLimit(Number(e.target.value))}
            className={`${controlClass} h-9 min-w-28 py-0`}
            aria-label="Rows per page"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>
    </div>
  );
}
