import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCarbonFootprintActionEstimates } from '../lib/carbon-footprint-estimates';

test('zero activity does not claim carbon or financial savings', () => {
  const estimates = calculateCarbonFootprintActionEstimates({
    mobilityCo2Kg: 0,
    annualMobilityCostLocal: 0,
    energyCo2Kg: 0,
    annualEnergyCostLocal: 0,
    dietCo2Kg: 0,
    aviationCo2Kg: 0,
  });

  assert.deepEqual(estimates, {
    smartCommute: { co2SavedKg: 0, moneySavedLocal: 0 },
    acAndLed: { co2SavedKg: 0, moneySavedLocal: 0 },
    ecoDietShift: { co2SavedKg: 0, moneySavedLocal: 0 },
    flightOptimize: { co2SavedKg: 0, moneySavedLocal: 0 },
  });
});

test('estimates reductions from the matching sector and known costs only', () => {
  const estimates = calculateCarbonFootprintActionEstimates({
    mobilityCo2Kg: 1000,
    annualMobilityCostLocal: 2000,
    energyCo2Kg: 500,
    annualEnergyCostLocal: 1200,
    dietCo2Kg: 1000,
    aviationCo2Kg: 1000,
  });

  assert.deepEqual(estimates, {
    smartCommute: { co2SavedKg: 250, moneySavedLocal: 500 },
    acAndLed: { co2SavedKg: 110, moneySavedLocal: 264 },
    ecoDietShift: { co2SavedKg: 240, moneySavedLocal: 0 },
    flightOptimize: { co2SavedKg: 280, moneySavedLocal: 0 },
  });
});

test('large estimates remain finite and proportional', () => {
  const estimates = calculateCarbonFootprintActionEstimates({
    mobilityCo2Kg: 4_000_000_000_000,
    annualMobilityCostLocal: 8_000_000_000_000,
    energyCo2Kg: 1_000_000_000,
    annualEnergyCostLocal: 2_000_000_000,
    dietCo2Kg: 3_000_000_000,
    aviationCo2Kg: 5_000_000_000,
  });

  assert.deepEqual(estimates, {
    smartCommute: {
      co2SavedKg: 1_000_000_000_000,
      moneySavedLocal: 2_000_000_000_000,
    },
    acAndLed: { co2SavedKg: 220_000_000, moneySavedLocal: 440_000_000 },
    ecoDietShift: { co2SavedKg: 720_000_000, moneySavedLocal: 0 },
    flightOptimize: { co2SavedKg: 1_400_000_000, moneySavedLocal: 0 },
  });
});

test('negative and non-finite estimates cannot produce claimed savings', () => {
  const estimates = calculateCarbonFootprintActionEstimates({
    mobilityCo2Kg: -10,
    annualMobilityCostLocal: Number.POSITIVE_INFINITY,
    energyCo2Kg: Number.NaN,
    annualEnergyCostLocal: -20,
    dietCo2Kg: Number.NEGATIVE_INFINITY,
    aviationCo2Kg: 0,
  });

  assert.deepEqual(estimates, {
    smartCommute: { co2SavedKg: 0, moneySavedLocal: 0 },
    acAndLed: { co2SavedKg: 0, moneySavedLocal: 0 },
    ecoDietShift: { co2SavedKg: 0, moneySavedLocal: 0 },
    flightOptimize: { co2SavedKg: 0, moneySavedLocal: 0 },
  });
});
