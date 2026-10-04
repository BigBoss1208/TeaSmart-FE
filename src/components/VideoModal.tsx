import { useState } from "react";
import { Icon } from "./Icon";

export function YouTubeModal({
  videoId,
  title,
  isOpen,
  onClose
}: {
  videoId: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="video-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="video-modal-inner" onClick={(e) => e.stopPropagation()}>
        <button
          className="video-modal-close"
          onClick={onClose}
          aria-label="Đóng video"
        >
          <Icon name="close" size={26} />
        </button>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          width="100%"
          height="100%"
          style={{ border: 0, width: "100%", height: "100%", display: "block" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export function VideoCard({
  videoId,
  title,
  subtitle,
  image,
  duration = "Video tư liệu"
}: {
  videoId: string;
  title: string;
  subtitle?: string;
  image: string;
  duration?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="video-card"
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setOpen(true);
          }
        }}
        aria-label={`Xem video: ${title}`}
      >
        <img src={image} alt={title} />
        <div className="video-card-overlay">
          <button
            type="button"
            className="video-play-btn"
            aria-label={`Phát video ${title}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            <Icon name="play" size={26} />
          </button>
          {subtitle && (
            <span className="eyebrow" style={{ color: "#c7d6c2", marginBottom: "4px" }}>
              {subtitle}
            </span>
          )}
          <div style={{ font: "500 20px 'Lora', serif", lineHeight: "1.3", color: "#ffffff" }}>
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <span
              style={{
                background: "rgba(0,0,0,0.6)",
                padding: "2px 8px",
                borderRadius: "2px",
                fontSize: "10px",
                color: "var(--cream)"
              }}
            >
              ▶ YouTube · {duration}
            </span>
            <small style={{ color: "rgba(255,255,255,.75)" }}>Bấm để mở và xem video</small>
          </div>
        </div>
      </div>

      <YouTubeModal
        videoId={videoId}
        title={title}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
