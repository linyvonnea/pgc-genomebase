export interface PricingRule {
  minQuantity?: number;
  additionalUnitPrice?: number;
}

export function calculateItemTotal(
  quantity: number,
  basePrice: number,
  rule?: PricingRule
): number {
  // If no minimum or quantity is within minimum, charge base price once
  if (!rule?.minQuantity || quantity <= rule.minQuantity) {
    return basePrice;
  }

  // Charge base price once (for 1 unit) + additional price for samples above minimum
  const baseCost = basePrice;
  
  // For samples ABOVE minimum, charge the additional unit price per sample
  const additionalSamples = quantity - rule.minQuantity;
  const additionalCost = additionalSamples * (rule.additionalUnitPrice || basePrice);

  return baseCost + additionalCost;
}