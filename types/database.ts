export type UserRole = "pelanggan" | "staf" | "admin";

export type ReservationStatus =
  | "menunggu_validasi"
  | "dikonfirmasi"
  | "ditolak"
  | "check_in"
  | "selesai"
  | "dibatalkan"
  | "tidak_hadir";

export type OrderStatus =
  | "menunggu"
  | "disiapkan"
  | "disajikan"
  | "selesai"
  | "dibatalkan";

export type InvoiceStatus =
  | "belum_dibayar"
  | "dp_dibayar"
  | "lunas"
  | "dibatalkan";

export type PaymentType = "dp" | "pelunasan";

export type PaymentMethod = "tunai" | "transfer" | "qris" | "kartu_debit";

export type PaymentRecordStatus = "menunggu" | "berhasil" | "gagal";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantProfile {
  id: number;
  name: string;
  tagline: string | null;
  description: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  logo_path: string | null;
  cover_photo_path: string | null;
  min_order_amount: number;
  dp_percentage: number;
  tax_percentage: number;
  pending_timeout_minutes: number;
  updated_at: string;
}

export interface OperatingHour {
  id: number;
  day_of_week: number; // 0 = Minggu ... 6 = Sabtu
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface MenuCategory {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  photo_path: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  menu_categories?: MenuCategory;
}

export interface DiningTable {
  id: number;
  code: string;
  capacity: number;
  area: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  reservation_code: string;
  customer_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  reservation_date: string;
  start_time: string;
  duration_minutes: number;
  guest_count: number;
  table_id: number;
  status: ReservationStatus;
  validated_by: string | null;
  validated_at: string | null;
  checked_in_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  dining_tables?: DiningTable;
  profiles?: Profile;
}

export interface ReservationItem {
  id: number;
  reservation_id: string;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  menu_items?: MenuItem;
}

export interface ReservationStatusLog {
  id: number;
  reservation_id: string;
  from_status: ReservationStatus | null;
  to_status: ReservationStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
  profiles?: { full_name: string; role: UserRole } | null;
}

export interface Order {
  id: string;
  reservation_id: string;
  status: OrderStatus;
  handled_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  reservation_id: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  dp_amount: number;
  payment_status: InvoiceStatus;
  issued_by: string | null;
  issued_at: string;
  updated_at: string;
  reservations?: Reservation;
}

export interface Payment {
  id: string;
  invoice_id: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  status: PaymentRecordStatus;
  reference_no: string | null;
  idempotency_key: string | null;
  paid_at: string;
  recorded_by: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}
