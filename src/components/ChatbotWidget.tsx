import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { Icon } from "./Icon"

import { api, mapProduct, type ApiProduct } from "../lib/commerce"

import { money } from "./ProductCard"

import { validateTeaForm } from "../lib/teaAdvisor"

import {
  requestRagAdvice,
  chatErrorMessage,
  ragAnswerLabel,
  type RagAdvice,
} from "../lib/ragChat"

import type { Product } from "../types"

import "./ChatbotWidget.css"

type Message = {
  text: string;
  at: string;
  answer?: RagAdvice;
  failed?: boolean;
  visibleCount?: number;
};

export default function ChatbotWidget({
  customer,
  onLogin,
  onProduct,
  openSignal = 0,
  productId,
}: {
  customer: boolean
  onLogin: () => void
  onProduct: (p: Product) => void
  openSignal?: number
  productId?: number
}) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [busy, setBusy] = useState(false)

  const [failedQuestion, setFailedQuestion] = useState<string | null>(null)

  const suggested = useRef<number[]>([])

  const abort = useRef<AbortController | null>(null),
    flight = useRef(false),
    scroller = useRef<HTMLDivElement>(null),
    content = useRef<HTMLDivElement>(null),
    follow = useRef(true),
    lastScrollTop = useRef(0),
    context = useRef<RagAdvice["preferences"] | undefined>(undefined)

  const [images, setImages] = useState<Record<string, string>>({})

  useEffect(() => {
    if (openSignal) setOpen(true)
  }, [openSignal])

  function scrollToLatest() {
    const node = scroller.current
    if (!node || !follow.current) return
    const latestMessage = node.querySelectorAll<HTMLElement>("[data-chat-message]")
    const target = latestMessage[latestMessage.length - 1]
    // Move only this scroll container. Keep the answer text above its cards visible.
    node.scrollTop = target
      ? node.scrollTop + target.getBoundingClientRect().top - node.getBoundingClientRect().top - 15
      : node.scrollHeight
    lastScrollTop.current = node.scrollTop
  }

  useLayoutEffect(() => { scrollToLatest() }, [messages, busy, open])

  useEffect(() => {
    if (!open || !content.current || !scroller.current) return
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(scrollToLatest)
    })
    observer.observe(content.current)
    observer.observe(scroller.current)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [open])

  useEffect(() => () => abort.current?.abort(), [])

  function resetConversation() {
    abort.current?.abort();
    flight.current = false;
    setBusy(false);
    setMessages([]);
    context.current = undefined;
    suggested.current = [];
    setImages({});
    setText("");
    setFailedQuestion(null);
    follow.current = true;
    lastScrollTop.current = 0;
  }

  useEffect(() => { resetConversation(); }, [customer]);

  useLayoutEffect(() => {
    abort.current?.abort();
    flight.current = false;
    setBusy(false);
    setFailedQuestion(null);
  }, [productId]);

  function close() {
    abort.current?.abort()
    flight.current = false
    setBusy(false)
    setOpen(false)
  }

  async function send(value = text) {
    if (flight.current || !customer || !value.trim()) return
    follow.current = true
    if (validateTeaForm(value, "", "")) {
      setMessages((m) => [
        ...m,
        {
          text: "Vui lòng nhập câu hỏi hợp lệ; không gửi token hoặc thông tin đăng nhập.",
          at: "",
          failed: true,
        },
      ])
      return
    }
    flight.current = true
    setBusy(true)
    if (value === text) setText("")
    setFailedQuestion(null)
    const controller = new AbortController()
    abort.current = controller

    const at = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
    setMessages((m) => [...m, { text: value.trim(), at }].slice(-16))

    try {
      const answer = await requestRagAdvice(
        value,
        {},
        context.current,
        messages.filter((m) => !m.answer && !m.failed).map((m) => m.text),
        controller.signal,
        undefined,
        productId,
        suggested.current,
      )
      if (controller.signal.aborted) return
      if (
        ![
          "CURRENT_PRODUCT",
          "CUSTOMER_SUPPORT",
          "OUT_OF_SCOPE",
          "GREETING",
          "CLARIFICATION",
          "KNOWLEDGE",
          "BESTSELLERS",
          "REVIEWS",
        ].includes(answer.businessKind ?? "")
      )
        context.current = answer.preferences
      if (answer.businessKind !== "CURRENT_PRODUCT" && answer.businessProducts?.length)
        suggested.current = answer.businessProducts
          .map((p) => p.productId)
          .slice(0, 4)
      setMessages((m) =>
        [
          ...m,
          {
            text: answer.reply,
            at: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            answer,
          },
        ].slice(-16),
      )

      void Promise.all(
        (answer.businessProducts ?? []).slice(0, 4).map(async (item) => {
          try {
            const p = await api<ApiProduct>(
              `/products/${encodeURIComponent(item.slug)}`,
              {
                signal: AbortSignal.any([
                  controller.signal,
                  AbortSignal.timeout(5000),
                ]),
              },
            )
            if (!controller.signal.aborted && p.imageUrl)
              setImages((x) => ({ ...x, [item.slug]: p.imageUrl! }))
          } catch {}
        }),
      )
    } catch (e) {
      if (!controller.signal.aborted) {
        const error = chatErrorMessage(e)
        setMessages((m) => [...m, { text: error, at, failed: true }])
        setFailedQuestion(value)
      }
    } finally {
      if (!controller.signal.aborted) {
        flight.current = false
        setBusy(false)
      }
    }
  }

  const productImage = (answer: RagAdvice, slug: string, id: number) => images[slug] || answer.recommendations.items.find(item => item.product.productId === id)?.product.imageUrl

  return (
    <div className="tea-chat-widget">
      {open && (
        <section
          className="tea-chat-window"
          role="dialog"
          aria-label="TeaSmart AI"
          aria-modal="false"
        >
          <header>
            <span className="tea-chat-logo">
              <Icon name="leaf" size={25} />
            </span>
            <div>
              <strong>TeaSmart AI</strong>
              <small>Trợ lý tư vấn chè Thái Nguyên</small>
            </div>
            <button
              aria-label="Làm mới hội thoại"
              onClick={resetConversation}
            >
              ↻
            </button>
            <button aria-label="Thu nhỏ chatbot" onClick={close}>
              −
            </button>
            <button aria-label="Đóng chatbot" onClick={close}>
              ×
            </button>
          </header>
          <div className="tea-chat-messages" aria-live="polite" ref={scroller} onScroll={() => {
            const node = scroller.current
            if (!node) return
            if (node.scrollTop < lastScrollTop.current - 2) follow.current = false
            else if (node.scrollHeight - node.clientHeight - node.scrollTop < 40) follow.current = true
            lastScrollTop.current = node.scrollTop
          }}>
            <div className="tea-chat-content" ref={content}>
              <div className="tea-chat-ai">
                <span className="tea-chat-avatar">
                  <Icon name="leaf" size={17} />
                </span>
                <p>
                  Xin chào! Mình là TeaSmart AI. Mình có thể giúp bạn lựa chọn
                  chè, tìm hiểu sản phẩm và giải đáp kiến thức về chè Thái Nguyên.
                </p>
              </div>
              {!customer && (
                <p>
                  Đăng nhập tài khoản khách hàng để gửi câu hỏi.{" "}
                  <button onClick={onLogin}>Đăng nhập</button>
                </p>
              )}
              {messages.map((m, i) => {
                const answer = m.answer, visibleCount = m.visibleCount ?? 4
                return (
                  <div
                    key={i}
                    data-chat-message=""
                    className={
                      m.answer || m.failed ? "tea-chat-ai" : "tea-chat-user"
                    }
                  >
                    {(m.answer || m.failed) && (
                      <span className="tea-chat-avatar">
                        <Icon name="leaf" size={17} />
                      </span>
                    )}
                    <div>
                      <p role={m.failed ? "alert" : undefined}>{m.text}</p>
                      <time>{m.at}</time>
                      {m.answer && (
                        <small>
                          {ragAnswerLabel(m.answer)}
                        </small>
                      )}
                      {m.answer?.sources?.map((s) => (
                        <a
                          key={s.id}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {s.title}
                        </a>
                      ))}
                      {!!answer?.businessProducts?.length && (
                        <div className="tea-chat-products">
                          {answer.businessProducts.slice(0, visibleCount).map((p) => (
                            <article key={p.productId}>
                              {productImage(answer,p.slug,p.productId) ? (
                                <img src={productImage(answer,p.slug,p.productId) || undefined} alt={p.name} />
                              ) : (
                                <div className="tea-chat-no-image">
                                  <Icon name="leaf" />
                                  Chưa có ảnh
                                </div>
                              )}
                              <strong>{p.name}</strong>
                              {answer.recommendations.items
                                .find((item) => item.product.productId === p.productId)
                                ?.reasons.map((reason) => (
                                  <small key={reason}>{reason}</small>
                                ))}
                              <b>{money(p.price)}</b>
                              <small>Còn {p.stockQuantity} gói</small>
                              <button
                                onClick={async () => {
                                  try {
                                    const data = await api<ApiProduct>(
                                      `/products/${encodeURIComponent(p.slug)}`,
                                    )
                                    onProduct(mapProduct(data))
                                  } catch {
                                    setMessages((m) => [
                                      ...m,
                                      {
                                        text: "Không tải được sản phẩm. Vui lòng thử lại.",
                                        at: "",
                                        failed: true,
                                      },
                                    ])
                                  }
                                }}
                              >
                                Xem chi tiết
                              </button>
                            </article>
                          ))}
                        </div>
                      )}
                      {!!answer?.businessProducts?.length && (
                        <div className="tea-chat-pagination">
                          <small>
                            Đang xem{" "}
                            {Math.min(visibleCount, answer.businessProducts.length)}/
                            {answer.businessProducts.length} sản phẩm
                          </small>
                          {visibleCount < answer.businessProducts.length && (
                            <button onClick={() => setMessages(items => items.map(item => item === m ? { ...item, visibleCount: (item.visibleCount ?? 4) + 4 } : item))}>
                              Xem thêm sản phẩm
                            </button>
                          )}
                        </div>
                      )}
                      {answer?.businessKind === "PRODUCTS" &&
                        !answer.businessProducts?.length && (
                          <p>
                            Không có sản phẩm phù hợp. Hãy đổi ngân sách hoặc nhu cầu.
                          </p>
                        )}
                    </div>
                  </div>
                )
              })}
              {failedQuestion && (
                <button disabled={busy} onClick={() => void send(failedQuestion)}>
                  Thử lại câu hỏi
                </button>
              )}
              {busy && <p role="status">Đang tra cứu dữ liệu…</p>}
            </div>
          </div>
          <div className="tea-chat-prompts">
            {[
              "Chè ít chát",
              "Chè dưới 300k",
              "Chè làm quà biếu",
              "Cách pha chè",
              "Chè bán chạy",
            ].map((q) => (
              <button
                key={q}
                disabled={busy || !customer}
                onClick={() => void send(q)}
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <label className="sr-only" htmlFor="widget-message">
              Nội dung tư vấn
            </label>
            <textarea
              id="widget-message"
              placeholder="Nhập câu hỏi của bạn…"
              maxLength={1000}
              value={text}
              disabled={!customer}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <button
              aria-label="Gửi tin nhắn"
              disabled={busy || !customer || !text.trim()}
            >
              <Icon name="arrow" />
            </button>
          </form>
        </section>
      )}
      <button
        className="tea-chat-launcher"
        aria-label={open ? "Thu nhỏ TeaSmart AI" : "Mở TeaSmart AI"}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon name="leaf" size={29} />
      </button>
    </div>
  )
}
