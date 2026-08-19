/**
 * Types mirroring the backend DTOs exactly, read from source rather than guessed:
 *   auth-service/src/main/java/com/splitexpense/auth/dto/**
 *   group-service/src/main/java/com/splitexpense/group/dto/**
 *   expense-service/src/main/java/com/splitexpense/expense/dto/**
 *   notification-service/src/main/java/com/splitexpense/notification/dto/**
 *
 * All four services (and the gateway) share one ErrorResponse shape by design —
 * see each service's GlobalExceptionHandler.
 */

// ---- auth-service -----------------------------------------------------------

export type Role = "USER" | "ADMIN";

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  role: Role;
  enabled: boolean;
  createdAt: string;
}

/** Another account's public-facing identity — see auth-service's PublicProfileResponse
 *  for why this is deliberately narrower than UserResponse. */
export interface PublicProfileResponse {
  id: string;
  fullName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: UserResponse;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ---- group-service -----------------------------------------------------------

export type GroupStatus = "ACTIVE" | "ARCHIVED";
export type GroupMemberRole = "OWNER" | "MEMBER";

export interface GroupMemberResponse {
  userId: string;
  role: GroupMemberRole;
  joinedAt: string;
}

export interface GroupResponse {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  createdBy: string;
  status: GroupStatus;
  members: GroupMemberResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  currency?: string;
}

export interface AddMemberRequest {
  userId: string;
}

/** A member's overall standing across every pair balance in one group. */
export interface MemberNetPositionResponse {
  userId: string;
  net: number;
}

/** An outstanding debt between two members, always a positive amount. */
export interface PairBalanceResponse {
  debtorId: string;
  creditorId: string;
  amount: number;
}

export interface GroupBalancesResponse {
  groupId: string;
  currency: string;
  pairs: PairBalanceResponse[];
  netPositions: MemberNetPositionResponse[];
}

export type BalanceEntryReason = "EXPENSE" | "EXPENSE_VOID" | "SETTLEMENT";

export interface BalanceEntryResponse {
  id: string;
  groupId: string;
  debtorId: string;
  creditorId: string;
  amount: number;
  reason: BalanceEntryReason;
  referenceId: string;
  description: string | null;
  createdAt: string;
}

// ---- expense-service -----------------------------------------------------------

export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";
export type ExpenseStatus = "INITIATED" | "COMPLETED" | "FAILED" | "VOIDED";
export type SettlementStatus = "INITIATED" | "COMPLETED" | "FAILED";

/**
 * One participant's share input for {@link CreateExpenseRequest}. `value` means
 * something different per split type — see SplitCalculator.ParticipantInput on the
 * backend: ignored for EQUAL, the exact share for EXACT, the percentage (0-100) for
 * PERCENTAGE, the integer weight for SHARES.
 */
export interface SplitParticipantRequest {
  userId: string;
  value?: number;
}

export interface CreateExpenseRequest {
  groupId: string;
  payerUserId: string;
  amount: number;
  description: string;
  splitType: SplitType;
  participants: SplitParticipantRequest[];
}

export interface ExpenseSplitResponse {
  userId: string;
  shareAmount: number;
}

export interface ExpenseResponse {
  id: string;
  groupId: string;
  payerUserId: string;
  amount: number;
  currency: string;
  description: string;
  splitType: SplitType;
  status: ExpenseStatus;
  failureReason: string | null;
  splits: ExpenseSplitResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSettlementRequest {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note?: string;
}

export interface SettlementResponse {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  status: SettlementStatus;
  failureReason: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- notification-service -----------------------------------------------------------

export type NotificationType =
  | "EXPENSE_ADDED"
  | "EXPENSE_VOIDED"
  | "SETTLEMENT_RECEIVED";

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId: string | null;
  read: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAllReadResponse {
  updated: number;
}

// ---- shared -----------------------------------------------------------

/**
 * Spring Data's default (legacy, non-"page"-wrapped) JSON shape for a
 * Page<T> — confirmed against a running instance, not guessed. Only the
 * fields this app actually reads are declared; `pageable`, `sort`, etc.
 * are omitted.
 */
export interface PageResponse<T> {
  content: T[];
  number: number;
  totalPages: number;
  totalElements: number;
  size: number;
}

/** The single error shape returned by the gateway and every downstream service. */
export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors?: Record<string, string>;
}
