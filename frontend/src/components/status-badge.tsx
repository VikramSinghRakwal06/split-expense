import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExpenseStatus, SettlementStatus } from "@/lib/types";

const EXPENSE_STATUS: Record<
  ExpenseStatus,
  { label: string; variant: "success" | "outline" | "destructive"; icon: typeof Clock }
> = {
  INITIATED: { label: "Recording", variant: "outline", icon: Clock },
  COMPLETED: { label: "Recorded", variant: "success", icon: CheckCircle2 },
  FAILED: { label: "Failed", variant: "destructive", icon: XCircle },
  VOIDED: { label: "Voided", variant: "outline", icon: RotateCcw },
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const { label, variant, icon: Icon } = EXPENSE_STATUS[status];
  return (
    <Badge variant={variant} className="gap-1">
      <Icon />
      {label}
    </Badge>
  );
}

const SETTLEMENT_STATUS: Record<
  SettlementStatus,
  { label: string; variant: "success" | "outline" | "destructive"; icon: typeof Clock }
> = {
  INITIATED: { label: "Recording", variant: "outline", icon: Clock },
  COMPLETED: { label: "Recorded", variant: "success", icon: CheckCircle2 },
  FAILED: { label: "Failed", variant: "destructive", icon: XCircle },
};

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  const { label, variant, icon: Icon } = SETTLEMENT_STATUS[status];
  return (
    <Badge variant={variant} className="gap-1">
      <Icon />
      {label}
    </Badge>
  );
}
