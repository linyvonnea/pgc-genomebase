export interface PricingRule {
  minQuantity?: number;
  additionalUnitPrice?: number;
}

export function calculateItemTotal(
  quantity: number,
  basePrice: number,
  rule?: PricingRule
): number {
  if (!rule?.minQuantity || quantity <= rule.minQuantity) {
    return quantity * basePrice;
  }

  const minCost = rule.minQuantity * basePrice;
  const additionalUnits = quantity - rule.minQuantity;
  const additionalCost = additionalUnits * (rule.additionalUnitPrice || basePrice);

  return minCost + additionalCost;
}