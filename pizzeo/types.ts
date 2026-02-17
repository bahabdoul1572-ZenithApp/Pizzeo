
import { ReactNode } from 'react';

export type YeastType = 'dry' | 'fresh';

export interface RecipePreset {
  name: string;
  hydration: number;
  salt: number;
  yeast: number;
  oil: number;
  sugar: number;
}

export interface ProductionScale {
  id: string;
  name: string;
  icon: ReactNode;
  pizzas: number;
  weightPerBall: number;
  description: string;
  notes: string;
}

export interface DoughCalculatorState {
  numberOfPizzas: number;
  doughWeightPerBall: number;
  hydration: number;
  salt: number;
  yeast: number;
  yeastType: YeastType; // 'dry' or 'fresh'
  oil: number;
  sugar: number;
  includeResidue: boolean;
  ambientTemp: number;
  flourTemp: number;
  baseTemp: number;
  targetDinnerTime: string; // HH:mm
  totalFermentationHours: number;
}

export interface Ingredient {
  ingredient: string;
  quantite: number;
  pourcentage: number;
  note: string;
}

export interface CalculationResults {
  totalDoughWeight: number;
  totalPercentage: number;
  facteur: number;
  flourWeight: number;
  waterWeight: number;
  waterVolume: number;
  saltWeight: number;
  dryYeastWeight: number;
  freshYeastWeight: number;
  oilWeight: number;
  sugarWeight: number;
  useKg: boolean;
  productionNote: string;
  idealWaterTemp: number;
  startTime: string;
  takeOutTime: string;
  debugInfo: {
    nombrePizzas: number;
    poidsBoule: number;
    poidsTotal: number;
    hydratation: number;
    sel: number;
    levure: number;
    huile: number;
    sucre: number;
    facteur: number;
  };
  ingredientsTable: Ingredient[];
}
