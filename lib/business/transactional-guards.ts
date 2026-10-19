type InventoryQuantities = {
  onHand: number;
  reserved: number;
  incoming: number;
  damaged: number;
  returned: number;
  quarantined: number;
  available: number;
};

export class BusinessInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessInvariantError";
  }
}

export function moneyToCents(value: number) {
  if (!Number.isFinite(value)) throw new BusinessInvariantError("The monetary value is invalid.");
  return Math.round(value * 100);
}

export function allocateManualPayment(total: number, alreadyPaid: number, payment: number) {
  const totalCents = Math.max(0, moneyToCents(total));
  const paidCents = Math.max(0, moneyToCents(alreadyPaid));
  const paymentCents = moneyToCents(payment);
  if (paymentCents <= 0) throw new BusinessInvariantError("The payment must be greater than zero.");
  const balanceCents = Math.max(0, totalCents - paidCents);
  if (balanceCents <= 0) throw new BusinessInvariantError("The invoice has already been paid.");
  if (paymentCents > balanceCents) throw new BusinessInvariantError("The payment exceeds the outstanding balance.");
  const amountPaidCents = paidCents + paymentCents;
  return {
    amountPaid: amountPaidCents / 100,
    balanceDue: Math.max(0, totalCents - amountPaidCents) / 100,
    paidInFull: amountPaidCents === totalCents,
  };
}

function quantity(value: number) {
  if (!Number.isFinite(value)) throw new BusinessInvariantError("The inventory quantity is invalid.");
  return Math.round(value * 1_000) / 1_000;
}

export function changeReservedInventory(
  current: InventoryQuantities,
  delta: number,
): InventoryQuantities {
  const normalizedDelta = quantity(delta);
  if (normalizedDelta === 0) throw new BusinessInvariantError("The reservation change cannot be zero.");
  if (normalizedDelta > 0 && current.available < normalizedDelta) {
    throw new BusinessInvariantError("There is not enough available inventory.");
  }
  const reserved = quantity(current.reserved + normalizedDelta);
  if (reserved < 0) throw new BusinessInvariantError("Reserved inventory cannot become negative.");
  const next = { ...current, reserved, available: 0 };
  next.available = Math.max(0, quantity(next.onHand - next.reserved - next.damaged - next.returned - next.quarantined));
  return next;
}
