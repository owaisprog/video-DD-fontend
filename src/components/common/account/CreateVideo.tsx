import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  FileVideo,
  Type,
  AlignLeft,
  Loader2,
  Tag,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { publishVideoInQueue } from "../../../lib/api/video";
import toast, { Toaster } from "react-hot-toast";
import { extractMessageFromHtml } from "../../../utils/extractMessageFromHtml";
import { VideoPlayer } from "../../../components/media/VideoPlayer";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (videoId: string) => void;
};

type FormType = {
  title: string;
  description: string;
  thumbnail?: FileList;
  isPublished: boolean;
  video: FileList;
};

export const CreateVideo = ({ open, onClose, onSuccess }: ModalProps) => {
  const {
    register,
    watch,
    reset,
    resetField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormType>({
    defaultValues: { isPublished: true },
    mode: "onTouched",
  });

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const normalizeTag = (t: string) => t.trim().replace(/^#+/, "");

  const addTagsFromRaw = (raw: string) => {
    const parts = raw.split(",").map(normalizeTag).filter(Boolean);
    if (parts.length === 0) return;

    setTags((prev) => {
      const existing = new Set(prev.map((x) => x.toLowerCase()));
      const next = [...prev];

      for (const p of parts) {
        const key = p.toLowerCase();
        if (!existing.has(key)) {
          existing.add(key);
          next.push(p);
        }
      }

      return next;
    });
  };

  const removeTag = (t: string) =>
    setTags((prev) => prev.filter((x) => x !== t));

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const thumbnailFiles = watch("thumbnail");
  const videoFiles = watch("video");

  const thumbnailFile = useMemo(() => thumbnailFiles?.[0], [thumbnailFiles]);
  const videoFile = useMemo(() => videoFiles?.[0], [videoFiles]);

  const handleClose = () => {
    reset();
    setThumbnailUrl(null);
    setTags([]);
    setTagInput("");
    onClose();
  };

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailUrl(null);
      return;
    }

    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  useEffect(() => {
    if (!videoFile) return;

    const url = URL.createObjectURL(videoFile);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const onSubmit = async (data: FormType) => {
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("video", data.video[0]);
      formData.append("isPublished", data.isPublished ? "true" : "false");

      if (data.thumbnail?.[0]) {
        formData.append("thumbnail", data.thumbnail[0]);
      }

      tags.forEach((t) => formData.append("tags", t));

      const response = await publishVideoInQueue(formData);

      const videoId =
        response?.data?.data?.videoId ||
        response?.data?.videoId ||
        response?.data?.data?._id;

      if (response.status === 202 && videoId) {
        toast.success("Video queued for processing", {
          position: "bottom-right",
        });

        setTimeout(() => {
          handleClose();
          onSuccess?.(String(videoId));
        }, 300);
      } else {
        toast.error("Failed to queue video. Please try again.", {
          position: "bottom-right",
        });
      }
    } catch (err: any) {
      const html = err?.response?.data;

      if (typeof html === "string") {
        toast.error(extractMessageFromHtml(html), {
          position: "bottom-right",
        });
      } else {
        toast.error(err?.message || "Something went wrong. Please try again.", {
          position: "bottom-right",
        });
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      <button
        aria-label="Close modal"
        onClick={handleClose}
        className="absolute inset-0 bg-black/70"
        disabled={isSubmitting}
      />

      <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-light-background text-black shadow-2xl ring-1 ring-black/10 dark:bg-dark-background dark:text-white dark:ring-white/10">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
          <div>
            <h3 className="text-lg font-semibold">Upload videos</h3>
            <p className="mt-0.5 text-xs text-black/60 dark:text-white/60">
              Add details for your video before publishing.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-black/70 hover:bg-black/5 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/60"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 md:flex-row">
            {/* Left */}
            <div className="w-full md:w-[44%]">
              <div
                className={[
                  "rounded-2xl border bg-black/3 p-6 dark:bg-white/5",
                  errors.video
                    ? "border-red-500/60 ring-1 ring-red-500/30"
                    : "border-black/10 dark:border-white/10",
                ].join(" ")}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`${videoFile ? "hidden" : ""} grid h-28 w-28 place-items-center rounded-full bg-black/6 ring-1 ring-black/10 dark:bg-black/25 dark:ring-white/10`}
                  >
                    <Upload className="h-10 w-10 text-black/70 dark:text-white/70" />
                  </div>

                  <p
                    className={`${videoFile ? "hidden" : ""} mt-2 text-sm text-black/60 dark:text-white/60`}
                  >
                    Your videos will be private until you publish them.
                  </p>

                  <label
                    className={[
                      "mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-light px-6 py-2 text-sm font-semibold text-black shadow-sm hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:focus-visible:ring-white/40",
                      isSubmitting ? "pointer-events-none opacity-60" : "",
                    ].join(" ")}
                  >
                    Select files
                    <input
                      {...register("video", {
                        validate: (files) =>
                          files && files.length > 0
                            ? true
                            : "video is required",
                      })}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={isSubmitting}
                    />
                  </label>

                  {errors.video?.message && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.video.message}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-black/60 dark:text-white/60">
                    {videoFile && (
                      <div className="w-full aspect-video overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-black/25">
                        <VideoPlayer
                          key={`${videoFile.name}-${videoFile.size}-${videoFile.lastModified}`}
                          src={videoFile}
                        />
                      </div>
                    )}

                    <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/4 px-3 py-1 dark:border-white/10 dark:bg-white/5">
                      <FileVideo className="h-3.5 w-3.5" />
                      MP4, MOV, WebM
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/4 px-3 py-1 dark:border-white/10 dark:bg-white/5">
                      Up to 2GB
                    </span>
                  </div>
                </div>
              </div>

              {/* Thumbnail */}
              <div
                className={[
                  "mt-4 rounded-2xl border bg-black/3 p-5 dark:bg-white/5",
                  "border-black/10 dark:border-white/10",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-black/70 dark:text-white/70" />
                    <p className="text-sm font-medium">Thumbnail</p>
                    <span className="text-xs text-black/50 dark:text-white/50">
                      (optional)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      className={[
                        "cursor-pointer rounded-full border border-black/10 bg-light px-4 py-1.5 text-xs font-semibold text-black hover:bg-black/5 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
                        isSubmitting ? "pointer-events-none opacity-60" : "",
                      ].join(" ")}
                    >
                      {thumbnailUrl ? "Change image" : "Select image"}
                      <input
                        {...register("thumbnail")}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isSubmitting}
                      />
                    </label>

                    {thumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          resetField("thumbnail");
                          setThumbnailUrl(null);
                        }}
                        disabled={isSubmitting}
                        className="grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Remove thumbnail"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-black/25">
                  <div className="relative aspect-video w-full">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt="thumbnail"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-black/50 dark:text-white/50">
                        <div className="flex flex-col items-center gap-2 text-center">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            <span className="text-sm font-semibold">
                              Thumbnail is optional
                            </span>
                          </div>
                          <span className="px-4 text-xs text-black/45 dark:text-white/45">
                            If you don’t upload one, a thumbnail will be
                            generated automatically from the video.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="w-full md:w-[56%]">
              <div className="space-y-5">
                {/* Title */}
                <div className="rounded-2xl border border-black/10 bg-black/3 p-5 dark:border-white/10 dark:bg-white/5">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Type className="h-4 w-4 text-black/70 dark:text-white/70" />
                    Title{" "}
                    <span className="text-xs text-black/50 dark:text-white/50">
                      (required)
                    </span>
                  </label>

                  <input
                    {...register("title", { required: "title is required" })}
                    aria-invalid={!!errors.title}
                    type="text"
                    placeholder="Add a title that describes your video"
                    disabled={isSubmitting}
                    className={[
                      "mt-3 w-full rounded-xl border bg-white px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black/30 dark:text-white dark:placeholder:text-white/40",
                      errors.title
                        ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
                        : "border-black/10 focus:border-black/20 focus:ring-black/10 dark:border-white/10 dark:focus:border-white/20 dark:focus:ring-white/10",
                    ].join(" ")}
                  />

                  {errors.title?.message && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="rounded-2xl border border-black/10 bg-black/3 p-5 dark:border-white/10 dark:bg-white/5">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <AlignLeft className="h-4 w-4 text-black/70 dark:text-white/70" />
                    Description{" "}
                    <span className="text-xs text-black/50 dark:text-white/50">
                      (required)
                    </span>
                  </label>

                  <textarea
                    {...register("description", {
                      required: "description is required",
                    })}
                    aria-invalid={!!errors.description}
                    rows={6}
                    placeholder="Tell viewers about your video"
                    disabled={isSubmitting}
                    className={[
                      "mt-3 w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black/30 dark:text-white dark:placeholder:text-white/40",
                      errors.description
                        ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
                        : "border-black/10 focus:border-black/20 focus:ring-black/10 dark:border-white/10 dark:focus:border-white/20 dark:focus:ring-white/10",
                    ].join(" ")}
                  />

                  {errors.description?.message && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.description.message}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                    Add links, credits, and context for your audience.
                  </p>
                </div>

                {/* Tags */}
                <div className="rounded-2xl border border-black/10 bg-black/3 p-5 dark:border-white/10 dark:bg-white/5">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Tag className="h-4 w-4 text-black/70 dark:text-white/70" />
                    Tags{" "}
                    <span className="text-xs text-black/50 dark:text-white/50">
                      (optional)
                    </span>
                  </label>

                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/80 dark:border-white/10 dark:bg-black/25 dark:text-white/80"
                        >
                          #{t}
                          <button
                            type="button"
                            onClick={() => removeTag(t)}
                            disabled={isSubmitting}
                            className="rounded-full p-0.5 text-black/60 hover:bg-black/5 disabled:opacity-60 dark:text-white/60 dark:hover:bg-white/10"
                            aria-label={`Remove tag ${t}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTagsFromRaw(tagInput);
                        setTagInput("");
                      }
                    }}
                    onBlur={() => {
                      addTagsFromRaw(tagInput);
                      setTagInput("");
                    }}
                    type="text"
                    placeholder="Add tags (press Enter or comma)"
                    disabled={isSubmitting}
                    className="mt-3 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-black/40 outline-none focus:border-black/20 focus:ring-2 focus:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-white/40 dark:focus:border-white/20 dark:focus:ring-white/10"
                  />

                  <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                    Example:{" "}
                    <span className="font-semibold">react, node, mongodb</span>
                  </p>
                </div>

                {/* Publish toggle */}
                <div className="rounded-2xl border border-black/10 bg-black/3 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Publish</p>
                      <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                        Set whether this video is visible to others.
                      </p>
                    </div>

                    <label
                      className={[
                        "relative inline-flex h-9 w-16 cursor-pointer items-center",
                        isSubmitting ? "pointer-events-none opacity-60" : "",
                      ].join(" ")}
                    >
                      <input
                        {...register("isPublished")}
                        type="checkbox"
                        className="peer sr-only"
                        disabled={isSubmitting}
                      />
                      <span className="absolute inset-0 rounded-full bg-black/10 ring-1 ring-black/10 peer-checked:bg-black/20 dark:bg-white/10 dark:ring-white/10 dark:peer-checked:bg-white/20" />
                      <span className="relative ml-1 inline-block h-7 w-7 translate-x-0 rounded-full bg-light shadow-sm ring-1 ring-black/10 transition-transform peer-checked:translate-x-7 dark:bg-white dark:ring-white/10" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-black/10 px-6 py-4 dark:border-white/10">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs leading-relaxed text-black/60 sm:text-left dark:text-white/60">
                By submitting your videos, you agree to our{" "}
                <a
                  href="#"
                  className="underline decoration-black/30 hover:decoration-black dark:decoration-white/30 dark:hover:decoration-white"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="underline decoration-black/30 hover:decoration-black dark:decoration-white/30 dark:hover:decoration-white"
                >
                  Community Guidelines
                </a>
                .
              </p>

              <div className="flex items-center justify-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="rounded-full px-5 py-2 text-sm font-medium text-black/80 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/80 dark:hover:bg-white/10"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>
          </div>
        </form>

        {isSubmitting && (
          <div className="pointer-events-none absolute inset-0 bg-black/10 " />
        )}
      </div>
    </div>
  );
};
