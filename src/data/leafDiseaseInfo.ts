type LeafReference = Readonly<{ title: string; url: string }>;

type LeafDiseaseInfo = Readonly<{
  name: string;
  terminology?: string;
  description: string;
  signs: string;
  recommendations: readonly string[];
  references: readonly LeafReference[];
}>;

const vietnameseTerms = {
  title: "Bộ Nông nghiệp và Phát triển nông thôn · Bản thảo khảo nghiệm giống chè",
  url: "https://www.mard.gov.vn/VanBanLayYKien/VBPLFile/1.%20TCVN%20VCU%20che.pdf",
};

const hawaiiGuide = {
  title: "Đại học Hawaiʻi · Hướng dẫn nhận biết bệnh trên chè",
  url: "https://www3.ctahr.hawaii.edu/oc/freepubs/pdf/PD-33.pdf",
};

const upasiGuide = {
  title: "Viện Nghiên cứu Chè UPASI · Sâu hại và bệnh trên chè",
  url: "https://www.upasitearesearch.org/pests-diseases/",
};

const datasetPaper = {
  title: "Nghiên cứu bộ ảnh lá chè teaLeafBD",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12221660/",
};

// The keys match the existing model's class_index values. This is display data only.
export const leafDiseaseInfo: Readonly<Record<number, LeafDiseaseInfo>> = {
  0: {
    name: "Bệnh đốm rong lá chè",
    terminology: "Tài liệu khảo nghiệm chè trong nước gọi nhóm này là bệnh tảo.",
    description: "Đốm rong là dạng tổn thương thường thấy ở mặt trên lá chè. Các đốm cũ có thể ngả xám xanh.",
    signs: "Đốm gần tròn, hơi gồ, màu tím hoặc nâu đỏ.",
    recommendations: [
      "Quan sát mặt trên lá và chụp cận cảnh dưới ánh sáng tự nhiên để thấy màu và bề mặt đốm.",
      "Kiểm tra chỗ đọng nước và độ thông thoáng của tán, nhất là nơi lá thường ẩm lâu.",
    ],
    references: [
      { title: "Đại học Nông nghiệp Tamil Nadu · Đốm rong trên chè", url: "https://agritech.tnau.ac.in/crop_protection/tea_diseases_1.html" },
      vietnameseTerms,
    ],
  },
  1: {
    name: "Bệnh cháy lá nâu",
    terminology: "Tên hiển thị dịch từ nhãn bộ ảnh. Tài liệu trong nước cũng dùng “bệnh chấm nâu” hoặc “bệnh đốm nâu”.",
    description: "Vết cháy nâu có thể bắt đầu ở mép lá và lan vào trong. Khi vết lớn dần, phần lá bị ảnh hưởng có thể khô.",
    signs: "Mảng nâu vàng đến nâu sẫm ở mép lá, đôi khi có chấm đen nhỏ trong vết.",
    recommendations: [
      "Chụp toàn lá và cận cảnh mép vết để theo dõi vết có lan vào phiến lá hay không.",
      "Kiểm tra các lá lân cận và giữ tán thông thoáng để lá nhanh khô sau mưa.",
    ],
    references: [
      hawaiiGuide,
      { title: "Nghiên cứu triệu chứng bệnh lá chè tại Bangladesh", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11189472/" },
      vietnameseTerms,
    ],
  },
  2: {
    name: "Bệnh cháy lá xám",
    terminology: "Tên hiển thị dịch từ nhãn bộ ảnh. Tài liệu trong nước cũng dùng “bệnh chấm xám” hoặc “bệnh đốm xám”.",
    description: "Vết cháy xám có thể bắt đầu bằng các đốm nâu nhỏ. Khi lớn hơn, vùng giữa vết có thể chuyển xám và rìa vẫn có màu nâu.",
    signs: "Vết có tâm xám, viền nâu, đôi khi có vòng đồng tâm hoặc chấm đen li ti.",
    recommendations: [
      "Chụp cận cảnh tâm và rìa vết. So sánh với vài lá khác trên cùng cành.",
      "Ghi lại vị trí và số lá có dấu hiệu. Nhờ cán bộ bảo vệ thực vật kiểm tra nếu nhiều lá xuất hiện vết mới.",
    ],
    references: [
      { title: "Nghiên cứu thực địa về cháy lá xám trên chè", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11589121/" },
      hawaiiGuide,
      vietnameseTerms,
    ],
  },
  3: {
    name: "Bọ xít muỗi",
    description: "Bọ xít muỗi chích hút ở búp, lá non và đọt chè. Búp và lá non bị hại nặng có thể cong hoặc biến dạng.",
    signs: "Vết chích nhỏ màu nâu đỏ hoặc nâu sẫm, thường ở phần non của cây.",
    recommendations: [
      "Quan sát búp và đọt non vào sáng sớm hoặc chiều mát. Chụp ảnh côn trùng nếu thấy.",
      "Kiểm tra thêm búp ở vài vị trí trong vườn và ghi lại mức độ xuất hiện của vết chích.",
    ],
    references: [upasiGuide, vietnameseTerms],
  },
  4: {
    name: "Nhện đỏ",
    description: "Dấu hại của nhện đỏ trên chè có thể xuất hiện dọc gân chính. Khi lan rộng, mặt lá có thể chuyển sang màu đồng đỏ.",
    signs: "Vùng màu đồng đỏ trên mặt lá, đôi khi có tơ rất mảnh.",
    recommendations: [
      "Dùng kính lúp quan sát gân chính và mặt trên của vài lá có dấu hiệu đổi màu.",
      "Kiểm tra định kỳ các bụi lân cận và ghi lại nơi số lá đổi màu tăng lên.",
    ],
    references: [upasiGuide, vietnameseTerms],
  },
  5: {
    name: "Bọ xít mirid xanh",
    terminology: "Tên mô tả dịch từ nhãn của bộ ảnh. Chưa xác minh được tên tiếng Việt chuyên ngành thống nhất cho nhóm này.",
    description: "Đây là nhóm dấu hại được bộ ảnh gắn với bọ xít chích hút thuộc họ Miridae. Vết trên búp hoặc lá non có thể rõ hơn khi lá mở ra.",
    signs: "Đốm nhỏ nâu đỏ trên búp non. Khi lá lớn, một số vết có thể thành lỗ mép không đều hoặc làm lá biến dạng.",
    recommendations: [
      "Quan sát búp và lá vừa mở. Chụp cả vết hại và côn trùng nếu bắt gặp.",
      "So sánh với vài búp lân cận. Khi dấu hại tăng, gửi ảnh côn trùng và lá cho cán bộ bảo vệ thực vật để phân biệt với các loài chích hút khác.",
    ],
    references: [
      { title: "Nghiên cứu thực địa về bọ xít họ Miridae trên chè", url: "https://www.mdpi.com/2075-4450/10/6/167" },
      datasetPaper,
    ],
  },
  6: {
    name: "Lá chè khỏe mạnh",
    description: "Lá trong ảnh hoặc video gần với nhóm lá trông khỏe trong bộ ảnh. Kết quả chỉ phản ánh phần lá quan sát được.",
    signs: "Bề mặt lá không có những vết đốm, mảng cháy hoặc dấu hại nổi bật thuộc các nhóm mà mô hình nhận diện.",
    recommendations: [
      "Tiếp tục chăm sóc theo lịch hiện tại và theo dõi lá, búp trong các lần kiểm tra vườn.",
      "Nếu thấy dấu hiệu mới, chụp rõ cả hai mặt lá và quan sát thêm các lá lân cận.",
    ],
    references: [datasetPaper],
  },
};
