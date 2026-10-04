export type Page =
  | "home"
  | "explore"
  | "product"
  | "cart"
  | "checkout"
  | "ai"
  | "leaf"
  | "account"
  | "admin"
  | "tea-regions"
  | "tea-region-detail"
  | "shops"
  | "shop-detail"
  | "about"
  | "policy"
  | "login"
  | "register";

export interface User {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  role: "USER" | "ADMIN";
  joinDate?: string;
}

export type AdminSubView =
  | "Dashboard"
  | "Products"
  | "Categories"
  | "Orders"
  | "Customers"
  | "Reviews"
  | "TeaRegions"
  | "Shops"
  | "Statistics";

export interface Product {
  id: number;
  name: string;
  type: string; // "Chè Tân Cương" | "Chè xanh" | "Chè đặc sản" | "Quà tặng"
  taste: string[];
  note: string;
  price: number;
  weight: string;
  rating: number;
  reviewsCount?: number;
  image: string;
  gallery?: string[];
  regionId?: string; // "tan-cuong" | "trai-cai" | "la-bang" | "khe-coc"
  regionName?: string;
  description?: string;
  story?: string;
  intensity?: number; // 1-5
  astringency?: number; // 1-5 (độ chát)
  sweetness?: number; // 1-5 (hậu vị ngọt)
  aroma?: number; // 1-5 (hương thơm)
  qualityCommitment?: {
    origin: string;
    altitude?: string;
    harvestMethod: string;
    standard: string; // e.g. "Tiêu chuẩn VietGAP / OCOP 4 sao"
    packagingDate?: string;
    shelfLife?: string;
    safetyCertificate?: string; // "Chứng nhận VSATTP số 24/2023/NNPTNT-TN"
  };
  brewGuide?: {
    temp: string;
    amount: string;
    time: string;
    notes: string;
  };
}

export interface TeaRegion {
  id: string; // e.g. "tan-cuong", "trai-cai", "la-bang", "khe-coc"
  name: string;
  district: string;
  altitude: string;
  soilType: string;
  climate: string;
  tagline: string;
  shortDesc: string;
  fullDesc: string;
  heritageStory: string;
  features: string[];
  specialtyTea: string;
  heroImage: string;
  gallery: string[];
  youtubeVideoId?: string;
  videoTitle?: string;
  mapCoords: { lat: number; lng: number; xPercent: number; yPercent: number };
}

export interface TeaShop {
  id: string;
  name: string;
  brandTitle: string;
  regionId: string;
  regionName: string;
  address: string;
  phone: string;
  email: string;
  established: string;
  founder: string;
  logo: string;
  coverImage: string;
  description: string;
  specialties: string[];
  certifications: string[];
  youtubeVideoId?: string;
  mapCoords: { xPercent: number; yPercent: number };
}

export interface OrderItem {
  product: Product;
  qty: number;
}

export interface Order {
  id: string; // e.g. "#TS240608"
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  items: OrderItem[];
  total: number;
  date: string;
  status: "Chờ xử lý" | "Đã xác nhận" | "Đang giao" | "Đã giao" | "Đã hủy";
  paymentMethod: string;
}

export interface Review {
  id: number;
  productId: number;
  productName: string;
  customerName: string;
  rating: number;
  date: string;
  comment: string;
  status: "Hiển thị" | "Đã ẩn";
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  ordersCount: number;
  totalSpent: number;
  status: "Hoạt động" | "Tạm khóa";
}

export interface Category {
  id: string;
  name: string;
  description: string;
  productsCount: number;
}
