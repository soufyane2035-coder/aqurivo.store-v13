export interface CarbonFootprintActionEstimatesInput {
  mobilityCo2Kg: number;
  annualMobilityCostLocal: number;
  energyCo2Kg: number;
  annualEnergyCostLocal: number;
  dietCo2Kg: number;
  aviationCo2Kg: number;
}

export interface CarbonFootprintActionEstimate {
  co2SavedKg: number;
  moneySavedLocal: number;
}

export interface CarbonFootprintActionEstimates {
  smartCommute: CarbonFootprintActionEstimate;
  acAndLed: CarbonFootprintActionEstimate;
  ecoDietShift: CarbonFootprintActionEstimate;
  flightOptimize: CarbonFootprintActionEstimate;
}

function safeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateCarbonFootprintActionEstimates(
  input: CarbonFootprintActionEstimatesInput
): CarbonFootprintActionEstimates {
  const mobilityCo2Kg = safeNonNegative(input.mobilityCo2Kg);
  const annualMobilityCostLocal = safeNonNegative(input.annualMobilityCostLocal);
  const energyCo2Kg = safeNonNegative(input.energyCo2Kg);
  const annualEnergyCostLocal = safeNonNegative(input.annualEnergyCostLocal);
  const dietCo2Kg = safeNonNegative(input.dietCo2Kg);
  const aviationCo2Kg = safeNonNegative(input.aviationCo2Kg);

  return {
    smartCommute: {
      co2SavedKg: Math.round(mobilityCo2Kg * 0.25),
      moneySavedLocal: Math.round(annualMobilityCostLocal * 0.25),
    },
    acAndLed: {
      co2SavedKg: Math.round(energyCo2Kg * 0.22),
      moneySavedLocal: Math.round(annualEnergyCostLocal * 0.22),
    },
    ecoDietShift: {
      co2SavedKg: Math.round(dietCo2Kg * 0.24),
      moneySavedLocal: 0,
    },
    flightOptimize: {
      co2SavedKg: Math.round(aviationCo2Kg * 0.28),
      moneySavedLocal: 0,
    },
  };
}
