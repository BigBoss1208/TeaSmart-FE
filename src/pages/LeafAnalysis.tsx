import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { leafDiseaseInfo } from "../data/leafDiseaseInfo";
import { leafAnalysisErrorMessage, LeafAnalysisError, predictLeaf, type LeafPrediction } from "../lib/leafAnalysisApi";
import { isLeafVideoDurationValid, validateLeafMedia, VIDEO_DURATION_LIMIT, type LeafContentType, type LeafMediaMode } from "../lib/leafMedia";
import "./LeafAnalysis.css";

type Selection = { file: File; contentType: LeafContentType };
type Preview = { selection: Selection; url: string };
type Analysis =
  | { status: "idle" | "loading" }
  | { status: "success"; result: LeafPrediction }
  | { status: "error"; message: string; needsLogin: boolean };

const percentage = new Intl.NumberFormat("vi-VN", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fileSize = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const mediaFormats: Record<LeafContentType, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "video/mp4": "MP4",
};

function formatFileSize(bytes: number) {
  if (bytes < 1_000) return `${fileSize.format(bytes)} B`;
  if (bytes < 1_000_000) return `${fileSize.format(bytes / 1_000)} KB`;
  return `${fileSize.format(bytes / 1_000_000)} MB`;
}

export default function LeafAnalysis() {
  const [mode, setMode] = useState<LeafMediaMode>("image");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [ready, setReady] = useState<Preview | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [analysis, setAnalysis] = useState<Analysis>({ status: "idle" });
  const input = useRef<HTMLInputElement>(null);
  const activePreview = useRef<Preview | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selection) return;
    const next = { selection, url: URL.createObjectURL(selection.file) };
    activePreview.current = next;
    setPreview(next);
    return () => {
      if (activePreview.current === next) activePreview.current = null;
      URL.revokeObjectURL(next.url);
    };
  }, [selection]);

  useEffect(() => () => {
    pending.current?.abort();
    pending.current = null;
  }, []);

  function clear() {
    pending.current?.abort();
    pending.current = null;
    activePreview.current = null;
    setSelection(null);
    setPreview(null);
    setReady(null);
    setDuration(null);
    setMediaError("");
    setAnalysis({ status: "idle" });
    if (input.current) input.current.value = "";
  }

  function pick(file?: File) {
    if (!file) return;
    clear();
    const validation = validateLeafMedia(file, mode);
    if ("error" in validation) {
      setMediaError(validation.error);
      return;
    }
    setSelection({ file, contentType: validation.contentType });
  }

  function previewReady(current: Preview, seconds: number | null) {
    if (activePreview.current !== current) return;
    if (seconds !== null && !isLeafVideoDurationValid(seconds)) {
      previewFailed(current, `Chọn video MP4 phát được và dài tối đa ${VIDEO_DURATION_LIMIT} giây.`);
      return;
    }
    setMediaError("");
    setDuration(seconds);
    setReady(current);
  }

  function previewFailed(current: Preview, message: string) {
    if (activePreview.current !== current) return;
    setReady(null);
    setDuration(null);
    setMediaError(message);
  }

  async function analyze() {
    if (!ready || activePreview.current !== ready || pending.current) return;
    const request = new AbortController();
    pending.current = request;
    setAnalysis({ status: "loading" });
    try {
      const { file, contentType } = ready.selection;
      const result = await predictLeaf(file, contentType, request.signal);
      if (pending.current === request) setAnalysis({ status: "success", result });
    } catch (error) {
      if (pending.current === request) {
        setAnalysis({
          status: "error",
          message: leafAnalysisErrorMessage(error),
          needsLogin: error instanceof LeafAnalysisError && error.status === 401,
        });
      }
    } finally {
      if (pending.current === request) pending.current = null;
    }
  }

  const mediaName = mode === "image" ? "ảnh" : "video";
  const loading = analysis.status === "loading";

  return (
    <main className="page leaf-analysis">
      <section className="leaf-analysis-hero">
        <span><Icon name="leaf" size={38} /></span>
        <div>
          <h1>AI phân loại sâu bệnh lá chè</h1>
          <p>Tải ảnh hoặc video lá chè rõ nét để mô hình hỗ trợ nhận diện tình trạng lá.</p>
        </div>
      </section>

      <section className="leaf-analysis-panel">
        <div className="leaf-media-tabs" role="tablist" aria-label="Loại dữ liệu lá chè">
          {(["image", "video"] as const).map(tab => (
            <button key={tab} role="tab" id={`leaf-tab-${tab}`} aria-selected={mode === tab}
              aria-controls="leaf-media-panel" onClick={() => {
                if (tab === mode) return;
                clear();
                setMode(tab);
              }}>
              <Icon name={tab === "image" ? "camera" : "play"} />
              Tải {tab === "image" ? "ảnh" : "video"} lá chè
            </button>
          ))}
        </div>
        <div className="leaf-analysis-grid">
          <div id="leaf-media-panel" role="tabpanel" aria-labelledby={`leaf-tab-${mode}`} className="leaf-media-upload"
            onDragOver={event => event.preventDefault()} onDrop={event => {
              event.preventDefault();
              pick(event.dataTransfer.files[0]);
            }}>
            <input ref={input} type="file" aria-label={`Tải ${mediaName} lá chè`}
              accept={mode === "image" ? ".jpg,.jpeg,.png,image/jpeg,image/png" : ".mp4,video/mp4"}
              hidden onChange={event => pick(event.target.files?.[0])} />

            {!selection && (
              <div className="leaf-media-drop">
                <Icon name={mode === "image" ? "camera" : "play"} size={34} />
                <strong>Kéo thả {mediaName} lá chè vào đây</strong>
                <span>hoặc</span>
                <button className="btn btn-primary" onClick={() => input.current?.click()}>Chọn {mediaName}</button>
                <small>{mode === "image" ? "JPG, JPEG, PNG · tối đa 10 MiB" : `MP4 · tối đa 30 MB, ${VIDEO_DURATION_LIMIT} giây`}</small>
              </div>
            )}
            {preview && (
              <div className="leaf-media-preview" key={preview.url}>
                <div className="leaf-preview-header">
                  <h2><Icon name={mode === "image" ? "camera" : "play"} />{mode === "image" ? "Ảnh" : "Video"} lá chè đã chọn</h2>
                  <p className="leaf-file-info">
                    <span title={preview.selection.file.name}>{preview.selection.file.name}</span>
                    <span> · {mediaFormats[preview.selection.contentType]} · {formatFileSize(preview.selection.file.size)}</span>
                  </p>
                </div>
                {mode === "image"
                  ? <img src={preview.url} alt="Ảnh lá chè đã chọn" onLoad={() => previewReady(preview, null)}
                      onError={() => previewFailed(preview, "Không đọc được ảnh. Vui lòng chọn ảnh JPG hoặc PNG hợp lệ.")} />
                  : <video src={preview.url} controls preload="metadata"
                      onLoadedMetadata={event => previewReady(preview, event.currentTarget.duration)}
                      onError={() => previewFailed(preview, "Trình duyệt không đọc được video MP4 này.")} />}
                {duration !== null && <small>Thời lượng {duration.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giây</small>}
                <div className="leaf-preview-actions">
                  <button className="btn btn-outline" onClick={() => input.current?.click()}>
                    <Icon name="upload" size={16} />Thay {mediaName}
                  </button>
                  <button className="btn btn-outline" onClick={clear}>
                    <Icon name="trash" size={16} />Xóa {mediaName}
                  </button>
                </div>
              </div>
            )}

            {mediaError && <p role="alert" className="leaf-media-error">{mediaError}</p>}
            <button className="btn btn-primary leaf-analyze-button" disabled={!ready || loading}
              onClick={analyze} aria-describedby="leaf-service-status">
              <Icon name="spark" size={17} />{loading ? "Đang phân tích…" : "Phân tích lá chè"}
            </button>
            <p id="leaf-service-status" className={`leaf-service-status${loading ? " leaf-service-loading" : ""}`} role="status">
              {loading ? "Mô hình đang xử lý tệp. Video có thể mất thêm thời gian."
                : ready && analysis.status === "idle" ? "Tệp đã sẵn sàng để phân tích." : ""}
            </p>
            {analysis.status === "error" && (
              <p role="alert" className="leaf-media-error">
                {analysis.message} {analysis.needsLogin && <a href="/dang-nhap">Đăng nhập</a>}
              </p>
            )}
          </div>

          <div className="leaf-analysis-result" aria-busy={loading}>
            <h2><Icon name="leaf" />Kết quả phân tích</h2>
            {analysis.status === "success" ? <PredictionResult result={analysis.result} /> : (
              <div className="leaf-result-empty">
                <Icon name="leaf" size={55} />
                <h3>{loading ? "Đang chờ kết quả" : "Chưa có kết quả phân tích"}</h3>
                {!loading && <p>{selection ? "Nhấn Phân tích khi tệp đã sẵn sàng." : "Chọn ảnh hoặc video lá chè rõ nét để bắt đầu."}</p>}
              </div>
            )}
            {analysis.status === "success" && (
              <p className="leaf-analysis-disclaimer" role="note">
                <span className="leaf-note-icon" aria-hidden="true">i</span>
                <span>
                  <strong>Lưu ý</strong>{" · "}
                  {mode === "video"
                    ? "Kết quả chỉ hỗ trợ quan sát những khung hình đã phân tích. Để đánh giá cả cây chè, cần kiểm tra trực tiếp."
                    : "Kết quả chỉ hỗ trợ nhận biết ban đầu. Khi cần xác định tình trạng lá chè, hãy nhờ người có chuyên môn kiểm tra trực tiếp."}
                </span>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function PredictionResult({ result }: { result: LeafPrediction }) {
  const { class_index: classIndex, video, warnings } = result;
  const info = leafDiseaseInfo[classIndex];

  return (
    <div className="leaf-result-card">
      <div className="leaf-result-summary" role="status">
        <p>Tình trạng được dự đoán</p>
        <h3>{info.name}</h3>
        <p className="leaf-result-score">
          Điểm dự đoán của mô hình <strong>{percentage.format(result.prediction_score)}</strong>
        </p>
      </div>

      {video && (
        <dl className="leaf-video-stats">
          <div>
            <dt>Số khung hình đã phân tích</dt>
            <dd>{video.sampled_frames} khung</dd>
          </div>
          <div>
            <dt>Mức độ đồng thuận</dt>
            <dd>{video.agreeing_frames}/{video.sampled_frames} khung ({percentage.format(video.agreement_ratio)})</dd>
          </div>
        </dl>
      )}
      {warnings.includes("INCONSISTENT_VIDEO_PREDICTIONS") && (
        <div className="leaf-result-warning" role="status">
          <strong>Cảnh báo kết quả chưa nhất quán</strong>
          <p>Các khung hình cho kết quả khác nhau. Hãy quay lại một lá rõ nét và giữ lá trong khung hình suốt đoạn quay.</p>
        </div>
      )}
      {warnings.includes("INSUFFICIENT_FRAMES_FOR_AGREEMENT") && (
        <div className="leaf-result-warning" role="status">
          <strong>Chưa đủ khung hình để so sánh</strong>
          <p>Mô hình chỉ phân tích được một khung. Hãy thử đoạn quay rõ nét hơn.</p>
        </div>
      )}

      <section className="leaf-result-section" aria-labelledby="leaf-probabilities-heading">
        <h4 id="leaf-probabilities-heading">Xác suất của 7 nhóm</h4>
        <dl className="leaf-result-probabilities">
          {result.class_probabilities.map(({ class_index, probability }) => (
            <div key={class_index} className={class_index === classIndex ? "leaf-probability-selected" : undefined}>
              <dt>{leafDiseaseInfo[class_index].name}</dt>
              <dd>
                <span className="leaf-probability-value">{percentage.format(probability)}</span>
                <span className="leaf-probability-track" aria-hidden="true">
                  <span style={{ width: `${probability * 100}%` }} />
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="leaf-result-section" aria-labelledby="leaf-description-heading">
        <h4 id="leaf-description-heading"><Icon name="receipt" size={17} />Mô tả tình trạng</h4>
        <p>{info.description}</p>
        <p><strong>Dấu hiệu thường gặp</strong> {info.signs}</p>
        {info.terminology && <p className="leaf-terminology">{info.terminology}</p>}
      </section>

      <section className="leaf-result-section" aria-labelledby="leaf-recommendations-heading">
        <h4 id="leaf-recommendations-heading"><Icon name="shieldCheck" size={18} />Khuyến nghị ban đầu</h4>
        <ul className="leaf-recommendations">
          {info.recommendations.map(item => <li key={item}>{item}</li>)}
        </ul>
        <details className="leaf-references">
          <summary>Nguồn tham khảo</summary>
          <ul>
            {info.references.map(({ title, url }) => (
              <li key={url}><a href={url} target="_blank" rel="noreferrer">{title}</a></li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
