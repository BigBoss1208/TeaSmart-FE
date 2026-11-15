/** Describes verification evidence, never infers a payment outcome from HTTP status. */
export function queryOutcomeDescription(outcome: string): string {
  const descriptions: Record<string, string> = {
    INVALID_OR_UNVERIFIED_RESPONSE: "Phản hồi QueryDR chưa được xác minh. Mã lỗi này không phân biệt thiếu chữ ký, sai chữ ký hay nội dung không hợp lệ; giữ nguyên trạng thái cần đối soát.",
    SIGNATURE_REJECTED: "Phản hồi QueryDR thiếu hoặc sai chữ ký. Chưa thể kết luận merchant không khớp, giao dịch không tồn tại hay thanh toán thất bại; giữ nguyên UNKNOWN.",
    SIGNED_MERCHANT_MISMATCH: "Chữ ký hợp lệ nhưng TMN Code không khớp merchant đang cấu hình; không cập nhật giao dịch.",
    SIGNED_REFERENCE_MISMATCH: "Chữ ký hợp lệ nhưng TxnRef không khớp giao dịch đang tra cứu; không cập nhật giao dịch.",
    SIGNED_PROTOCOL_MISMATCH: "Phản hồi đã xác minh chữ ký nhưng command hoặc loại giao dịch không đúng; không cập nhật giao dịch.",
    VERIFIED_QUERY_REJECTED: "VNPay trả mã từ chối truy vấn đã xác minh. Đây là kết quả truy vấn, chưa phải kết quả thanh toán; kể cả không tìm thấy giao dịch cũng không tự giải phóng reservation.",
    VERIFIED_QUERY_MALFORMED_TRANSACTION_STATUS: "Chữ ký hợp lệ nhưng trạng thái giao dịch không đúng định dạng; cần đối soát thêm.",
    VERIFIED_QUERY_INVALID_TRANSACTION: "Chữ ký hợp lệ nhưng dữ liệu giao dịch thiếu hoặc không hợp lệ; cần đối soát thêm.",
    INVALID_RESPONSE: "Nội dung phản hồi QueryDR không hợp lệ; chưa có bằng chứng để cập nhật thanh toán.",
    HTTP_ERROR: "VNPay trả lỗi HTTP; chưa nhận được kết quả giao dịch đã xác minh.",
    VERIFIED_RESPONSE: "Phản hồi QueryDR đã xác minh chữ ký, merchant và TxnRef. Kết quả xử lý phía trên cho biết kiểm tra số tiền và cập nhật giao dịch có hoàn tất hay không.",
    NOT_REQUESTED: "Không gửi QueryDR trong thao tác này; xem kết quả xử lý phía trên.",
  };
  if (descriptions[outcome]) return descriptions[outcome];
  if (["NETWORK_OR_CLIENT_ERROR", "TIMEOUT", "TIMEOUT_OR_INTERRUPTED", "CLIENT_ERROR"].includes(outcome))
    return "Không nhận được kết quả QueryDR có thể xác minh do lỗi kết nối, hết thời gian hoặc lỗi xử lý; giao dịch vẫn cần đối soát.";
  if (["GATEWAY_NOT_CONFIGURED", "NOT_CONFIGURED_OR_GUARD_REJECTED", "TRANSACTION_GUARD"].includes(outcome))
    return "Yêu cầu chưa được gửi do cấu hình Sandbox chưa sẵn sàng hoặc bị chặn an toàn.";
  return "Chưa có mô tả cho kết quả này. HTTP 200 không tự xác nhận thanh toán; giữ nguyên kết quả xử lý của backend.";
}
