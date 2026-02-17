
import React from 'react';
import { UtensilsCrossed, Scale, Factory } from 'lucide-react';
import { RecipePreset, ProductionScale } from './types';

export const PRESETS: RecipePreset[] = [
  { name: 'Napolitaine (AVPN)', hydration: 60, salt: 3, yeast: 0.1, oil: 0, sugar: 0 },
  { name: 'Napolitaine Contemporaine', hydration: 70, salt: 2.8, yeast: 0.2, oil: 0, sugar: 0 },
  { name: 'Romaine', hydration: 56, salt: 2.5, yeast: 0.2, oil: 3, sugar: 0 },
  { name: 'New York Style', hydration: 62, salt: 2, yeast: 0.4, oil: 2, sugar: 2 },
  { name: 'Detroit/Chicago', hydration: 70, salt: 2.5, yeast: 0.5, oil: 4, sugar: 0 },
];

export const PRODUCTION_SCALES: ProductionScale[] = [
  {
    id: 'artisanal',
    name: 'Artisanal',
    icon: <UtensilsCrossed className="w-4 h-4" />,
    pizzas: 4,
    weightPerBall: 250,
    description: 'Petite production',
    notes: 'Testez et affinez votre recette'
  },
  {
    id: 'unit-a',
    name: 'Unité A',
    icon: <Scale className="w-4 h-4" />,
    pizzas: 45,
    weightPerBall: 250,
    description: 'Moyenne Échelle (~45 unités)',
    notes: 'Vérifier la capacité du pétrin'
  },
  {
    id: 'unit-b',
    name: 'Unité B',
    icon: <Factory className="w-4 h-4" />,
    pizzas: 300,
    weightPerBall: 250,
    description: 'Grande Échelle (~300 unités)',
    notes: 'Vérifier la capacité du silo/pétrin'
  }
];
