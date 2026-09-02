export interface AuthUser {
  id: string;
  kind: 'guest' | 'registered';
  displayName: string;
  email: string | null;
  instaPayHandle: string | null;
  emailVerifiedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ErrorEnvelope {
  success: false;
  error: ApiErrorBody;
  requestId?: string;
}

export interface MessageResponse {
  message: string;
}

export interface Restaurant {
  id: string;
  name: string;
  phone: string;
  image: string;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  menu?: MenuItem[];
}

export interface RestaurantList {
  items: Restaurant[];
  page: number;
  limit: number;
  total: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  referencePrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LobbyMember {
  id: string;
  lobbyId: string;
  userId: string;
  role: 'admin' | 'member';
  displayName: string;
  createdAt: string;
}

export interface Lobby {
  id: string;
  restaurantId: string;
  code: string;
  status: 'open' | 'locked' | 'billed' | string;
  maxMembers: number | null;
  expiresAt: string | null;
  instaPayHandle: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  restaurant?: { id: string; name: string; isActive: boolean };
  members: LobbyMember[];
}

export interface JoinLobbyResult {
  lobby: Lobby;
  membership: LobbyMember;
  alreadyMember: boolean;
}

export interface BillMember {
  id: string;
  userId: string;
  displayName: string;
  role?: string;
  paymentStatus?: string;
  itemsSubtotal?: string;
  feesShare?: string;
  total?: string;
}

export interface BillLine {
  id: string;
  memberId: string;
  qty: number;
  actualPrice: string | null;
  delivered: boolean;
  suggestedActual?: string;
}

export interface BillGroup {
  menuItemId: string;
  name: string;
  referencePrice: string;
  lines: BillLine[];
}

export interface BillDraft {
  lobbyId: string;
  status: string;
  members: BillMember[];
  groups: BillGroup[];
}

export interface BillPreview {
  subtotal: string;
  deliveryFee: string;
  serviceFee: string;
  discount: string;
  netFees: string;
  tax: string;
  total: string;
  members: BillMember[];
  status?: string;
  reconciliation?: {
    receiptTotal: string | null;
    computedTotal: string;
    difference: string | null;
    warns: boolean;
  };
}

export interface HealthPayload {
  status: string;
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export interface OrderItem {
  id: string;
  lobbyId: string;
  lobbyMemberId: string;
  menuItemId: string;
  restaurantId: string;
  qty: number;
  actualPrice: string;
  lineTotal: string;
  createdAt: string;
  menuItem?: { id: string; name: string; category: string };
  lobbyMember?: { id: string; displayName: string };
}

export interface MemberOrderSummary {
  items: OrderItem[];
  subtotal: string;
}

export interface LobbyOrdersSummary {
  lobbyId: string;
  items: OrderItem[];
  subtotal: string;
}

export interface KitchenSummaryItem {
  menuItemId: string;
  name: string;
  category: string;
  totalQty: number;
  unitPrice: string;
  totalPrice: string;
}

export interface KitchenSummary {
  lobbyId: string;
  totalItemsCount: number;
  grandTotal: string;
  items: KitchenSummaryItem[];
}

export interface OverridePriceResult {
  lobbyId: string;
  menuItemId: string;
  updatedCount: number;
  newPrice: string;
}
