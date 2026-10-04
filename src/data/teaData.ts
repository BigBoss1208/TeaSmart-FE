import { Product, TeaRegion, TeaShop, Order, Category, Customer, Review } from "../types";

export const photos = {
  hero: "https://images.unsplash.com/photo-1764141738717-896b3365c196?auto=format&fit=crop&w=1800&q=88",
  hills: "https://images.unsplash.com/photo-1787281486400-2181c10eba68?auto=format&fit=crop&w=1200&q=85",
  leaf: "https://images.unsplash.com/photo-1606441393961-bb2331b77d55?auto=format&fit=crop&w=900&q=85",
  cup: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&w=1000&q=85",
  farmer: "https://images.unsplash.com/photo-1758390285674-f1d55b9d1312?auto=format&fit=crop&w=1200&q=85",
  tea: "https://images.unsplash.com/photo-1715016811010-e67e6f3d440c?auto=format&fit=crop&w=1000&q=85",
  bowls: "https://images.unsplash.com/photo-1715016808399-aa26d9fc71f9?auto=format&fit=crop&w=1000&q=85",
  teaPlantation: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=85",
  teapot: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1000&q=85",
  dryLeaves: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=1000&q=85"
};

export const teaRegionsData: TeaRegion[] = [
  {
    id: "tan-cuong",
    name: "Vùng chè Tân Cương",
    district: "TP. Thái Nguyên",
    altitude: "150m - 300m so với mực nước biển",
    soilType: "Đất feralit đỏ vàng trên phiến thạch sét, giàu phù sa sông Công",
    climate: "Tiểu khí hậu mát mẻ quanh năm từ dãy Tam Đảo che chắn bức xạ gay gắt",
    tagline: "Đệ nhất danh trà – Cái nôi của hương cốm non huyền thoại",
    shortDesc: "Vùng đất trứ danh được mệnh danh là 'Đệ nhất danh trà' xứ Thái, nơi hội tụ phù sa sông Công và bức xạ dịu mát tạo nên hương vị cốm non đặc trưng.",
    fullDesc: "Nằm ở phía Tây thành phố Thái Nguyên, Tân Cương sở hữu dải đồi bát úp thoai thoải ven chân núi Tam Đảo. Dãy núi phía tây chắn bớt nắng gắt buổi chiều, tạo nên lượng ánh sáng tán xạ lý tưởng để búp chè tích lũy tannin và các axit amin quý giá. Chè Tân Cương có cánh xoăn chặt như móc câu, phủ lớp phấn trắng mờ, sắc nước sánh vàng ong như mật, vị chát êm đềm và hậu vị ngọt sâu lưu lại nơi cuống họng.",
    heritageStory: "Nghề làm chè Tân Cương có từ những năm đầu thế kỷ 20, gắn liền với tên tuổi cụ Đội Năm (Võ Văn Thiệt) – người có công mang giống chè từ Phú Thọ về cấy trên đất Tân Cương và sáng lập xưởng chè đầu tiên đạt giải thưởng đấu xảo quốc tế tại Hà Nội năm 1935.",
    features: [
      "Hương thơm cốm non thuần khiết tự nhiên",
      "Vị tiền chát dịu thanh – hậu ngọt đượm kéo dài",
      "Màu nước sánh ánh vàng mật ong tự nhiên",
      "Chỉ dẫn địa lý Chè Tân Cương được bảo hộ quốc gia"
    ],
    specialtyTea: "Trà Đinh Ngọc, Nõn Tôm Tiền Vua, Trà Móc Câu",
    heroImage: photos.hills,
    gallery: [photos.hills, photos.leaf, photos.farmer, photos.tea],
    youtubeVideoId: "cSnLRsksS7U", // Video Thái Nguyên đệ nhất danh trà
    videoTitle: "Khám phá hương vị Đệ nhất danh trà Tân Cương - Thái Nguyên",
    mapCoords: { lat: 21.5542, lng: 105.7725, xPercent: 44, yPercent: 62 }
  },
  {
    id: "trai-cai",
    name: "Vùng chè Trại Cài",
    district: "Huyện Đồng Hỷ",
    altitude: "180m - 350m",
    soilType: "Đất thịt pha cát màu mỡ ven lưu vực sông Cầu",
    climate: "Độ ẩm cao tự nhiên quanh năm từ sương mù dòng sông Cầu",
    tagline: "Vị đậm đà lưu luyến – Hương trà sông Cầu thanh tao",
    shortDesc: "Vùng chè lâu đời ven bờ sông Cầu thuộc Đồng Hỷ, nổi tiếng với nước trà xanh óng ả, vị chát đượm và hậu ngọt lâu cho người sành trà.",
    fullDesc: "Trại Cài thuộc xã Minh Lập, huyện Đồng Hỷ, nằm nép mình bên dòng sông Cầu trong lành. Sương đêm và hơi ẩm dồi dào bốc lên từ lòng sông tưới tắm cho từng nương chè mướt mát. Chè Trại Cài nổi bật với màu nước xanh ngọc trong vắt, vị đậm đà và có độ 'dày' trong vòm họng. Người uống chè Trại Cài thường ấn tượng bởi cảm giác tỉnh táo sảng khoái và vị ngọt lưu giữ rất lâu sau mỗi ngụm trà.",
    heritageStory: "Các bậc cao niên ở Trại Cài đã gìn giữ phương pháp sao sấy chè bằng chảo gang củi lửa qua nhiều thế hệ, tạo nên hương trà đượm mùi nắng sớm và khói sương sông núi.",
    features: [
      "Vị chát rõ nét nhưng đầm ấm, không gắt",
      "Màu nước xanh ánh lục trong trẻo",
      "Búp chè mập mạp giàu hàm lượng khoáng chất",
      "Rất phù hợp cho người có gu uống chè đậm đà truyền thống"
    ],
    specialtyTea: "Chè Búp Trại Cài, Chè Móc Câu Sông Cầu",
    heroImage: photos.hero,
    gallery: [photos.hero, photos.cup, photos.teaPlantation],
    youtubeVideoId: "cTfOKJjDNGk",
    videoTitle: "Hành trình hương chè Trại Cài lưu vực sông Cầu",
    mapCoords: { lat: 21.632, lng: 105.885, xPercent: 68, yPercent: 48 }
  },
  {
    id: "la-bang",
    name: "Vùng chè La Bằng",
    district: "Huyện Đại Từ",
    altitude: "300m - 500m",
    soilType: "Đất phù sa cổ và feralit mùn trên núi, tưới mát bởi suối Kẹm",
    climate: "Nhiệt độ dịu mát quanh năm dưới chân dải Tam Đảo nguyên sinh",
    tagline: "Hương chè sương sớm dưới chân non thiêng Tam Đảo",
    shortDesc: "Vùng chè tựa lưng vào sườn đông Tam Đảo, được tưới nguồn nước suối rừng Kẹm tinh khiết, mang lại vị thanh tao, ít chát và cực kỳ êm dịu.",
    fullDesc: "La Bằng nằm sát chân dãy Tam Đảo hùng vĩ thuộc huyện Đại Từ. Nơi đây sở hữu khí hậu cận ôn đới mát lạnh quanh năm với dòng suối Kẹm bắt nguồn từ rừng nguyên sinh chảy tràn qua các thung lũng chè. Nhờ nguồn nước tinh khiết và sương mù che phủ sáng tối, lá chè La Bằng tích lũy lượng axit amin cao, tạo nên vị chát rất thanh, dịu nhẹ tự nhiên và nước trà xanh biếc mát mắt.",
    heritageStory: "Cây chè ở La Bằng đã gắn với đồng bào các dân tộc Tày, Nùng, Kinh qua gần một thế kỷ. Đến nay, vùng đã đạt nhiều danh hiệu làng nghề truyền thống tiêu biểu và sản phẩm OCOP cấp tỉnh.",
    features: [
      "Vị thanh mát êm ái, độ chát cực thấp",
      "Hương hoa cỏ núi rừng hoang sơ thanh khiết",
      "Nguồn nước suối Kẹm tự nhiên tưới tiêu",
      "Canh tác hữu cơ và sinh thái bền vững"
    ],
    specialtyTea: "Trà Bát Tiên La Bằng, Trà Tôm Nõn Suối Kẹm",
    heroImage: photos.teaPlantation,
    gallery: [photos.teaPlantation, photos.leaf, photos.bowls],
    youtubeVideoId: "xaQGl2cGK68",
    videoTitle: "Nét đẹp vùng chè La Bằng bên dòng suối Kẹm Tam Đảo",
    mapCoords: { lat: 21.583, lng: 105.625, xPercent: 22, yPercent: 54 }
  },
  {
    id: "khe-coc",
    name: "Vùng chè Khe Cốc",
    district: "Huyện Phú Lương",
    altitude: "200m - 400m",
    soilType: "Đất sỏi son và sét vôi giàu vi lượng thung lũng Tức Tranh",
    climate: "Thung lũng lòng chảo nhiều sương đêm, độ ẩm cao",
    tagline: "Tiên phong chè hữu cơ sinh thái – Đậm hương thuần khiết",
    shortDesc: "Thung lũng chè Tức Tranh nổi danh với mô hình canh tác hữu cơ đạt chuẩn châu Âu, giữ trọn vị chè nguyên bản an lành cho sức khỏe.",
    fullDesc: "Khe Cốc thuộc xã Tức Tranh, huyện Phú Lương, vùng đất lòng chảo được bao bọc bởi những dải núi đá vôi trập trùng. Đây là vùng chè tiên phong của tỉnh Thái Nguyên đạt các chứng nhận hữu cơ quốc tế (EU, USDA). Từng búp chè được chăm sóc hoàn toàn bằng chế phẩm sinh học từ đậu tương, trứng gà và thảo mộc, tạo nên những lứa chè hữu cơ ngọt hậu sâu sắc, an toàn tuyệt đối.",
    heritageStory: "Những người con Khe Cốc đã dũng cảm chuyển đổi hàng trăm héc-ta chè truyền thống sang quy trình canh tác hữu cơ nghiêm ngặt từ hơn một thập kỷ trước, đưa hương trà quê hương vươn tầm xuất khẩu quốc tế.",
    features: [
      "Canh tác 100% hữu cơ sinh thái nghiêm ngặt",
      "Không tồn dư thuốc bảo vệ thực vật hay phân hóa học",
      "Hương thơm sâu lắng, hậu ngọt lan tỏa khoang miệng",
      "Chứng nhận OCOP 4 sao và tiêu chuẩn VietGAP/Organic"
    ],
    specialtyTea: "Trà Tôm Nõn Khe Cốc Organic, Trà Móc Câu Tức Tranh",
    heroImage: photos.farmer,
    gallery: [photos.farmer, photos.tea, photos.hills],
    youtubeVideoId: "Q0PlyFZBYhQ",
    videoTitle: "Mô hình nông nghiệp chè hữu cơ Khe Cốc - Thái Nguyên",
    mapCoords: { lat: 21.712, lng: 105.815, xPercent: 52, yPercent: 24 }
  }
];

export const teaShopsData: TeaShop[] = [
  {
    id: "htx-hao-dat",
    name: "Hợp tác xã Chè Hảo Đạt",
    brandTitle: "Thương hiệu OCOP 5 Sao Quốc Gia",
    regionId: "tan-cuong",
    regionName: "Vùng chè Tân Cương",
    address: "Xóm Nam Đồng, Xã Tân Cương, TP. Thái Nguyên, Tỉnh Thái Nguyên",
    phone: "0208 3855 868",
    email: "chehaodat.tn@gmail.com",
    established: "Năm 2016",
    founder: "Nghệ nhân Đào Thanh Hảo",
    logo: photos.tea,
    coverImage: photos.hills,
    description: "HTX Chè Hảo Đạt là một trong những đơn vị sản xuất chè quy mô và danh tiếng bậc nhất vùng chè Tân Cương. Với dây chuyền chế biến tự động hóa hiện đại kết hợp bí quyết sao chè gia truyền, Hảo Đạt vinh dự sở hữu sản phẩm Chè Tôm Nõn đạt chuẩn OCOP 5 sao cấp Quốc gia.",
    specialties: ["Chè Tôm Nõn OCOP 5 Sao", "Trà Đinh Thượng Hạng", "Chè Móc Câu Truyền Thống"],
    certifications: ["OCOP 5 Sao Quốc Gia", "Tiêu chuẩn VietGAP", "Chứng nhận ATTP Quốc Gia"],
    youtubeVideoId: "cSnLRsksS7U",
    mapCoords: { xPercent: 46, yPercent: 64 }
  },
  {
    id: "htx-la-bang",
    name: "Hợp tác xã Trà La Bằng",
    brandTitle: "Tinh hoa trà sạch chân đèo Tam Đảo",
    regionId: "la-bang",
    regionName: "Vùng chè La Bằng",
    address: "Xã La Bằng, Huyện Đại Từ, Tỉnh Thái Nguyên",
    phone: "0983 241 568",
    email: "tralabang.daitu@gmail.com",
    established: "Năm 2007",
    founder: "Bà Nguyễn Thị Hải",
    logo: photos.leaf,
    coverImage: photos.teaPlantation,
    description: "Tọa lạc dưới chân núi Tam Đảo lộng gió, HTX Trà La Bằng quy tụ gần 100 hộ trồng chè giàu kinh nghiệm. Tận dụng nguồn nước suối mát lành và phương pháp canh tác theo chuẩn VietGAP, La Bằng đem đến những tách trà êm dịu, thơm hoa rừng và đậm đà nghĩa tình xứ núi.",
    specialties: ["Trà Bát Tiên La Bằng", "Trà Nõn Tôm Suối Kẹm", "Chè Xanh Hương Quê"],
    certifications: ["OCOP 4 Sao Tỉnh Thái Nguyên", "Tiêu chuẩn VietGAP số 12/2022", "Làng nghề chè truyền thống"],
    youtubeVideoId: "xaQGl2cGK68",
    mapCoords: { xPercent: 24, yPercent: 55 }
  },
  {
    id: "htx-khe-coc",
    name: "HTX Chè Hữu Cơ Khe Cốc",
    brandTitle: "Tiên phong Chè Organic Thái Nguyên",
    regionId: "khe-coc",
    regionName: "Vùng chè Khe Cốc",
    address: "Xã Tức Tranh, Huyện Phú Lương, Tỉnh Thái Nguyên",
    phone: "0912 654 321",
    email: "khecoctea.organic@gmail.com",
    established: "Năm 2018",
    founder: "Ông Tô Văn Khiêm",
    logo: photos.farmer,
    coverImage: photos.hero,
    description: "Khe Cốc tự hào là cánh chim đầu đàn về sản xuất chè hữu cơ sinh thái không hóa chất tại miền bắc. Toàn bộ đồi chè được kiểm soát vi sinh nghiêm ngặt, giữ trọn vị ngọt tự nhiên, bảo vệ sức khỏe người dùng và gìn giữ môi trường đất nước thanh sạch.",
    specialties: ["Trà Tôm Nõn Hữu Cơ", "Trà Móc Câu Tức Tranh Organic", "Trà Đinh Khe Cốc Tuyển Chọn"],
    certifications: ["Chứng nhận Hữu cơ Việt Nam (TCVN)", "Tiêu chuẩn VietGAP", "OCOP 4 Sao Tỉnh Thái Nguyên"],
    youtubeVideoId: "Q0PlyFZBYhQ",
    mapCoords: { xPercent: 54, yPercent: 26 }
  },
  {
    id: "htx-trai-cai",
    name: "Hợp tác xã Chè Minh Lập - Trại Cài",
    brandTitle: "Hương chè sông Cầu trăm năm",
    regionId: "trai-cai",
    regionName: "Vùng chè Trại Cài",
    address: "Xã Minh Lập, Huyện Đồng Hỷ, Tỉnh Thái Nguyên",
    phone: "0208 3762 119",
    email: "traicaitea.donghy@gmail.com",
    established: "Năm 2015",
    founder: "Nghệ nhân Nguyễn Văn Cường",
    logo: photos.cup,
    coverImage: photos.tea,
    description: "HTX Trại Cài kế thừa bí quyết sao chè củi lửa thủ công của những gia tộc làm chè lâu đời nhất lưu vực sông Cầu. Sản phẩm nổi danh bởi vị chát đậm sâu, hậu ngọt bền bỉ và nước trà xanh trong như mắt ngọc.",
    specialties: ["Chè Búp Trại Cài Cổ Truyền", "Trà Móc Câu Sông Cầu", "Trà Tôm Thượng Phẩm"],
    certifications: ["OCOP 3 Sao Tỉnh Thái Nguyên", "Tiêu chuẩn An toàn thực phẩm VietGAP"],
    youtubeVideoId: "cTfOKJjDNGk",
    mapCoords: { xPercent: 70, yPercent: 50 }
  }
];

export const initialProducts: Product[] = [
  {
    id: 1,
    name: "Tân Cương Thượng Hạng",
    type: "Chè Tân Cương",
    taste: ["Đậm vị", "Hậu ngọt", "Hương cốm"],
    note: "Hương cốm non · Vị đậm thanh · Búp chè chuẩn 1 tôm 2 lá",
    price: 285000,
    weight: "200g",
    rating: 4.9,
    reviewsCount: 126,
    image: photos.tea,
    gallery: [photos.tea, photos.cup, photos.leaf, photos.dryLeaves],
    regionId: "tan-cuong",
    regionName: "Vùng chè Tân Cương",
    description: "Tuyển chọn từ những búp chè non 1 tôm 2 lá hái vào buổi sáng sớm tinh sương tại nương chè Tân Cương. Cánh trà xoăn đều tăm tắp, phủ phấn mờ tự nhiên. Khi pha, tỏa hương cốm non thanh tao, vị tiền chát dịu êm mở lối cho hậu vị ngọt sâu lưu luyến mãi nơi cuống họng.",
    story: "Được thu hái thủ công bởi các nghệ nhân giàu kinh nghiệm tại thung lũng sông Công, sao củi lửa vừa độ để gìn giữ trọn vẹn tinh dầu tự nhiên.",
    intensity: 4,
    astringency: 3,
    sweetness: 5,
    aroma: 5,
    qualityCommitment: {
      origin: "Vùng chỉ dẫn địa lý Tân Cương, TP. Thái Nguyên, Việt Nam",
      altitude: "220m so với mực nước biển",
      harvestMethod: "Thu hái thủ công 1 tôm 2 lá trước khi mặt trời lên đỉnh",
      standard: "Đạt tiêu chuẩn VietGAP & Chứng nhận OCOP 4 sao tỉnh Thái Nguyên",
      packagingDate: "Đóng gói theo từng mẻ sao mới trong tháng",
      shelfLife: "24 tháng kể từ ngày sản xuất",
      safetyCertificate: "Số chứng nhận VSATTP: 18/2023/NNPTNT-TN"
    },
    brewGuide: {
      temp: "80°C - 85°C",
      amount: "5g chè cho ấm 150ml",
      time: "2 - 3 phút mỗi tuần trà",
      notes: "Nên tráng ấm chén bằng nước sôi trước khi pha để giữ nhiệt và giúp trà dậy hương."
    }
  },
  {
    id: 2,
    name: "Nõn Tôm Tiền Vua",
    type: "Chè đặc sản",
    taste: ["Hương thơm", "Làm quà", "Hậu ngọt"],
    note: "Búp nõn tuyển · Hương thanh khiết · Vị ngọt thanh ngọc",
    price: 420000,
    weight: "200g",
    rating: 5.0,
    reviewsCount: 94,
    image: photos.leaf,
    gallery: [photos.leaf, photos.cup, photos.tea],
    regionId: "tan-cuong",
    regionName: "Vùng chè Tân Cương",
    description: "Chỉ thu hái đúng 1 đọt tôm non và 1 lá non kề cận, nõn tôm Tiền Vua là kết tinh của sự kỳ công và tinh tế. Nước trà sánh vàng mật ong trong suốt, hương thơm cốm ngào ngạt và vị ngọt thanh quý phái.",
    intensity: 3,
    astringency: 2,
    sweetness: 5,
    aroma: 5,
    qualityCommitment: {
      origin: "Nương chè cổ Tân Cương, TP. Thái Nguyên",
      altitude: "250m",
      harvestMethod: "Hái 1 tôm 1 lá non bằng tay từng búp",
      standard: "Chuẩn OCOP 5 sao xuất khẩu",
      packagingDate: "Vụ chè mới 2025",
      shelfLife: "24 tháng trong túi nhôm hút chân không",
      safetyCertificate: "Số chứng chỉ ATTP: 22/2023/NNPTNT-TN"
    },
    brewGuide: {
      temp: "80°C",
      amount: "4g cho 150ml nước",
      time: "2 phút",
      notes: "Không dùng nước sôi 100°C trực tiếp để tránh làm cháy cánh trà non mềm mại."
    }
  },
  {
    id: 3,
    name: "Chè Móc Câu Truyền Thống",
    type: "Chè xanh",
    taste: ["Đậm vị", "Uống hằng ngày", "Hậu ngọt"],
    note: "Vị chát dịu · Hậu ngọt lâu · Dòng chè quốc dân Thái Nguyên",
    price: 165000,
    weight: "250g",
    rating: 4.8,
    reviewsCount: 182,
    image: photos.cup,
    gallery: [photos.cup, photos.tea, photos.leaf],
    regionId: "trai-cai",
    regionName: "Vùng chè Trại Cài",
    description: "Cánh trà cong vút như chiếc móc câu đặc trưng, chè mang vị đượm đà truyền thống của nương chè sông Cầu Trại Cài. Thức uống gắn bó thân thương với bàn trà của người Việt, tỉnh táo mỗi sớm mai.",
    intensity: 5,
    astringency: 4,
    sweetness: 4,
    aroma: 4,
    qualityCommitment: {
      origin: "Vùng chè Minh Lập - Trại Cài, Đồng Hỷ, Thái Nguyên",
      altitude: "190m",
      harvestMethod: "Hái thủ công 1 tôm 2 lá",
      standard: "Chứng nhận VietGAP - Canh tác an toàn",
      packagingDate: "Đóng gói hút chân không chuyên dụng",
      shelfLife: "24 tháng",
      safetyCertificate: "Số chứng nhận VSATTP: 09/2022/NNPTNT-TN"
    },
    brewGuide: {
      temp: "85°C",
      amount: "6g cho 180ml nước",
      time: "3 phút",
      notes: "Nước thứ hai và thứ ba vị hậu ngọt sẽ càng đậm đà hơn."
    }
  },
  {
    id: 4,
    name: "Hộp Quà Trà Việt Sơn Mài",
    type: "Quà tặng",
    taste: ["Làm quà", "Ít chát", "Hương thơm"],
    note: "Hai vị trà thượng phẩm · Hộp sơn mài thủ công trang nhã",
    price: 690000,
    weight: "400g",
    rating: 4.9,
    reviewsCount: 68,
    image: photos.bowls,
    gallery: [photos.bowls, photos.tea, photos.cup],
    regionId: "tan-cuong",
    regionName: "Vùng chè Tân Cương",
    description: "Set quà tặng sang trọng phối hợp giữa Trà Đinh Tân Cương và Trà Nõn Tôm La Bằng trong hộp gỗ sơn mài truyền thống chạm khắc họa tiết hoa sen trang nhã, biểu trưng cho sự tri ân và lòng hiếu khách.",
    intensity: 3,
    astringency: 2,
    sweetness: 5,
    aroma: 5,
    qualityCommitment: {
      origin: "Tuyển chọn từ 2 vùng chè Tân Cương & La Bằng",
      harvestMethod: "Búp chè tuyển chọn 100% búp non",
      standard: "Tiêu chuẩn quà tặng ngoại giao OCOP 4 sao",
      shelfLife: "24 tháng",
      safetyCertificate: "Chứng nhận ATTP tiêu chuẩn Quốc gia"
    },
    brewGuide: {
      temp: "80°C",
      amount: "5g",
      time: "2 phút",
      notes: "Tặng kèm muỗng tre gạt trà và thiệp nghệ thuật."
    }
  },
  {
    id: 5,
    name: "Trà Đinh Ngọc Hoàng Gia",
    type: "Chè đặc sản",
    taste: ["Hậu ngọt", "Hương thơm", "Ít chát"],
    note: "Một tôm non nõn · Phiên bản giới hạn · Vua của các loại trà",
    price: 890000,
    weight: "100g",
    rating: 5.0,
    reviewsCount: 52,
    image: photos.leaf,
    gallery: [photos.leaf, photos.tea, photos.cup],
    regionId: "tan-cuong",
    regionName: "Vùng chè Tân Cương",
    description: "Được mệnh danh là 'Đệ nhất phẩm trà', Trà Đinh chỉ thu hái duy nhất phần búp đinh nhọn như chiếc kim khi còn ngậm sương mai. Cần tới cả ngàn búp đinh mới sao được một lạng trà quý hiếm này.",
    intensity: 3,
    astringency: 1,
    sweetness: 5,
    aroma: 5,
    qualityCommitment: {
      origin: "Vườn chè di sản xóm Hồng Thái, Tân Cương",
      altitude: "260m",
      harvestMethod: "Hái 1 đọt đinh duy nhất từ 5h đến 7h sáng",
      standard: "Phiên bản Giới hạn - Giám định chất lượng độc lập",
      shelfLife: "24 tháng bảo quản túi thiếc cao cấp",
      safetyCertificate: "Số kiểm nghiệm: TN-2023-QC99"
    },
    brewGuide: {
      temp: "75°C - 80°C",
      amount: "3g cho 120ml",
      time: "1.5 - 2 phút",
      notes: "Nước đầu mở hương hoa thanh dịu, nước sau ngọt sâu bùi béo tựa ngọc dịch."
    }
  },
  {
    id: 6,
    name: "Trà Xanh Ban Mai La Bằng",
    type: "Chè xanh",
    taste: ["Ít chát", "Uống hằng ngày", "Thanh mát"],
    note: "Nhẹ nhàng · Tươi mát nguồn suối Kẹm Tam Đảo",
    price: 145000,
    weight: "200g",
    rating: 4.7,
    reviewsCount: 76,
    image: photos.teaPlantation,
    gallery: [photos.teaPlantation, photos.cup, photos.leaf],
    regionId: "la-bang",
    regionName: "Vùng chè La Bằng",
    description: "Vị trà nhẹ nhõm, thanh khiết như bầu không khí rừng nguyên sinh Tam Đảo. Lựa chọn tuyệt vời cho người mới bắt đầu thưởng thức trà xanh Thái Nguyên hoặc người thích gu trà êm dịu, không gây mất ngủ.",
    intensity: 2,
    astringency: 2,
    sweetness: 4,
    aroma: 4,
    qualityCommitment: {
      origin: "Chân núi Tam Đảo, xã La Bằng, Đại Từ",
      altitude: "350m",
      harvestMethod: "Hái thủ công tiêu chuẩn VietGAP",
      standard: "Chứng nhận VietGAP HTX La Bằng",
      shelfLife: "24 tháng",
      safetyCertificate: "Số chứng nhận: 14/2023/NNPTNT-TN"
    },
    brewGuide: {
      temp: "80°C",
      amount: "5g",
      time: "2.5 phút",
      notes: "Có thể pha lạnh (Cold Brew) để cảm nhận vị ngọt mát sảng khoái ngày hè."
    }
  },
  {
    id: 7,
    name: "Trà Tôm Nõn Khe Cốc Organic",
    type: "Chè đặc sản",
    taste: ["Đậm vị", "Hậu ngọt", "Hương thơm"],
    note: "Chứng nhận hữu cơ sinh thái · Búp nõn đậm đà tinh túy",
    price: 360000,
    weight: "200g",
    rating: 4.9,
    reviewsCount: 43,
    image: photos.farmer,
    gallery: [photos.farmer, photos.tea, photos.cup],
    regionId: "khe-coc",
    regionName: "Vùng chè Khe Cốc",
    description: "Sản phẩm chè hữu cơ đạt chuẩn OCOP 4 sao huyện Phú Lương. Quy trình nuôi dưỡng hoàn toàn bằng mùn thảo mộc và tưới nước thung lũng đá vôi, đem lại hương thơm mộc mạc và vị ngọt thanh lành tự nhiên.",
    intensity: 4,
    astringency: 3,
    sweetness: 5,
    aroma: 4,
    qualityCommitment: {
      origin: "Thung lũng Tức Tranh, Phú Lương, Thái Nguyên",
      altitude: "280m",
      harvestMethod: "Thu hái thủ công tuyển chọn 1 tôm 1 lá",
      standard: "Canh tác hữu cơ TCVN 11041-2:2017 & VietGAP",
      shelfLife: "24 tháng",
      safetyCertificate: "Giấy chứng nhận Organic: ORG-TN-2023-018"
    },
    brewGuide: {
      temp: "82°C",
      amount: "5g",
      time: "2.5 phút",
      notes: "Nước trà vàng óng ánh lục, uống vào cảm giác cơ thể khoan khoái."
    }
  },
  {
    id: 8,
    name: "Hộp Quà Trà Đinh Bát Giác",
    type: "Quà tặng",
    taste: ["Làm quà", "Hậu ngọt", "Hương thơm"],
    note: "Thiết kế hoàng gia bát giác · Trà Đinh thượng phẩm",
    price: 980000,
    weight: "300g",
    rating: 5.0,
    reviewsCount: 38,
    image: photos.bowls,
    gallery: [photos.bowls, photos.leaf, photos.tea],
    regionId: "tan-cuong",
    regionName: "Vùng chè Tân Cương",
    description: "Tặng phẩm cao cấp tôn vinh văn hóa trà cung đình Việt Nam. Hộp gỗ bát giác lót lụa vàng chứa 30 gói trà Đinh Tân Cương hút chân không định lượng chuẩn cho mỗi lần thưởng ấm.",
    intensity: 3,
    astringency: 2,
    sweetness: 5,
    aroma: 5,
    qualityCommitment: {
      origin: "Vùng lõi di sản Tân Cương, Thái Nguyên",
      harvestMethod: "Hái 100% đinh nõn non",
      standard: "Tiêu chuẩn VIP Gift OCOP 5 sao",
      shelfLife: "24 tháng",
      safetyCertificate: "Đầy đủ chứng nhận kiểm định an toàn và xuất xứ"
    },
    brewGuide: {
      temp: "80°C",
      amount: "1 gói định lượng (10g) cho ấm gia đình",
      time: "2 phút",
      notes: "Thích hợp biếu tặng đối tác, nguyên thủ và bậc tiền bối."
    }
  }
];

export const initialCategories: Category[] = [
  { id: "all", name: "Tất cả sản phẩm", description: "Toàn bộ danh mục trà Thái Nguyên cao cấp", productsCount: 8 },
  { id: "tan-cuong", name: "Chè Tân Cương", description: "Đệ nhất danh trà với hương cốm non lừng danh", productsCount: 4 },
  { id: "dac-san", name: "Chè đặc sản", description: "Những búp trà đinh, nõn tôm quý hiếm tuyển chọn", productsCount: 3 },
  { id: "che-xanh", name: "Chè xanh truyền thống", description: "Vị chát thanh, hậu ngọt sâu cho ấm trà mỗi sớm", productsCount: 2 },
  { id: "qua-tang", name: "Hộp quà trà cao cấp", description: "Trao gửi trọn vẹn tinh hoa văn hóa trà Việt", productsCount: 2 }
];

export const initialOrders: Order[] = [
  {
    id: "#TS240608",
    customerName: "Nguyễn Văn An",
    customerPhone: "0912 345 678",
    customerEmail: "nguyenan@email.com",
    shippingAddress: "Số 18 Hoàng Hoa Thám, Ba Đình, Hà Nội",
    items: [
      { product: initialProducts[0], qty: 2 },
      { product: initialProducts[1], qty: 1 }
    ],
    total: 990000,
    date: "08/06/2025",
    status: "Đang giao",
    paymentMethod: "Thanh toán khi nhận hàng (COD)"
  },
  {
    id: "#TS240607",
    customerName: "Trần Mai Phương",
    customerPhone: "0988 776 655",
    customerEmail: "maiphuong@gmail.com",
    shippingAddress: "Toà nhà Landmark 81, Bình Thạnh, TP. Hồ Chí Minh",
    items: [
      { product: initialProducts[3], qty: 1 }
    ],
    total: 690000,
    date: "07/06/2025",
    status: "Đã xác nhận",
    paymentMethod: "Chuyển khoản ngân hàng"
  },
  {
    id: "#TS240606",
    customerName: "Lê Minh Tuấn",
    customerPhone: "0971 223 344",
    customerEmail: "minhtuan.le@vnn.vn",
    shippingAddress: "Khu đô thị Crown Villas, Gia Sàng, TP. Thái Nguyên",
    items: [
      { product: initialProducts[2], qty: 3 },
      { product: initialProducts[5], qty: 2 }
    ],
    total: 785000,
    date: "06/06/2025",
    status: "Chờ xử lý",
    paymentMethod: "Thanh toán trực tuyến"
  },
  {
    id: "#TS240605",
    customerName: "Vũ Khánh Linh",
    customerPhone: "0934 556 789",
    customerEmail: "khanhlinh.vu@gmail.com",
    shippingAddress: "Số 45 Lê Duẩn, Quận Hải Châu, Đà Nẵng",
    items: [
      { product: initialProducts[4], qty: 1 }
    ],
    total: 890000,
    date: "05/06/2025",
    status: "Đã giao",
    paymentMethod: "Chuyển khoản ngân hàng"
  }
];

export const initialCustomers: Customer[] = [
  { id: 1, name: "Nguyễn Văn An", email: "nguyenan@email.com", phone: "0912 345 678", joinDate: "15/03/2024", ordersCount: 4, totalSpent: 2850000, status: "Hoạt động" },
  { id: 2, name: "Trần Mai Phương", email: "maiphuong@gmail.com", phone: "0988 776 655", joinDate: "20/04/2024", ordersCount: 2, totalSpent: 1380000, status: "Hoạt động" },
  { id: 3, name: "Lê Minh Tuấn", email: "minhtuan.le@vnn.vn", phone: "0971 223 344", joinDate: "02/05/2024", ordersCount: 1, totalSpent: 785000, status: "Hoạt động" },
  { id: 4, name: "Vũ Khánh Linh", email: "khanhlinh.vu@gmail.com", phone: "0934 556 789", joinDate: "11/01/2024", ordersCount: 5, totalSpent: 4250000, status: "Hoạt động" },
  { id: 5, name: "Hoàng Đức Thịnh", email: "thinh.hoang@company.com", phone: "0904 112 233", joinDate: "28/05/2024", ordersCount: 0, totalSpent: 0, status: "Hoạt động" }
];

export const initialReviews: Review[] = [
  {
    id: 1,
    productId: 1,
    productName: "Tân Cương Thượng Hạng",
    customerName: "Nguyễn Quốc Bảo",
    rating: 5,
    date: "14/06/2025",
    comment: "Trà rất thơm, chuẩn hương cốm non Tân Cương. Nước trà sánh, vị ngọt hậu rất sâu và giữ được hương đến nước thứ 4.",
    status: "Hiển thị"
  },
  {
    id: 2,
    productId: 2,
    productName: "Nõn Tôm Tiền Vua",
    customerName: "Đặng Thị Thảo",
    rating: 5,
    date: "10/06/2025",
    comment: "Mua làm quà tặng bố chồng, cụ khen nức nở. Búp nõn tôm đều đẹp, vị thanh dịu không bị chát xít.",
    status: "Hiển thị"
  },
  {
    id: 3,
    productId: 4,
    productName: "Hộp Quà Trà Việt Sơn Mài",
    customerName: "Phạm Hải Đăng",
    rating: 5,
    date: "02/06/2025",
    comment: "Hộp sơn mài rất chỉn chu, sang trọng. Đóng gói rất cẩn thận, giao nhanh đúng hẹn.",
    status: "Hiển thị"
  },
  {
    id: 4,
    productId: 3,
    productName: "Chè Móc Câu Truyền Thống",
    customerName: "Lê Văn Hùng",
    rating: 4,
    date: "28/05/2025",
    comment: "Vị đậm đà đúng chất chè Thái cổ truyền. Giá cả hợp lý để thưởng trà hằng ngày.",
    status: "Hiển thị"
  }
];
