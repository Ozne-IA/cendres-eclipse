export type TrainingExerciseId = 'parry' | 'riposte' | 'reflect' | 'dodge' | 'movement' | 'art';

export interface TrainingExerciseSnapshot {
  id: TrainingExerciseId;
  complete: boolean;
  progress?: number;
  target?: number;
  remainingSeconds?: number;
  failed?: boolean;
  parryWindowOpen?: boolean;
  riposteSeconds?: number;
  criticalReady?: boolean;
  artCost?: number;
}

export const TRAINING_EXERCISES: ReadonlyArray<{
  id: TrainingExerciseId;
  title: string;
  instruction: string;
  goal: string;
  target: number;
}> = [
  {
    id: 'parry',
    title: 'Parade',
    instruction: 'Parez au moment où chaque frappe du Pénitent vous atteint.',
    goal: 'Parer trois frappes consécutives.',
    target: 3,
  },
  {
    id: 'riposte',
    title: 'Riposte',
    instruction: 'Parez, puis frappez le Pénitent dans les quatre secondes, pendant que sa posture est brisée.',
    goal: 'Réussir deux ripostes après deux parades sans encaisser de coup.',
    target: 2,
  },
  {
    id: 'reflect',
    title: 'Renvoi',
    instruction: 'Parez le projectile du Veilleur de Suie pour le renvoyer vers lui.',
    goal: 'Toucher une cible avec deux projectiles renvoyés.',
    target: 2,
  },
  {
    id: 'dodge',
    title: 'Esquive',
    instruction: 'Traversez les deux projectiles du Veilleur de Suie dans une même roulade.',
    goal: 'Réussir une esquive parfaite et armer le prochain coup critique.',
    target: 1,
  },
  {
    id: 'movement',
    title: 'Déplacement',
    instruction: 'Touchez les repères dans l’ordre. Sautez sur la plateforme pour atteindre le deuxième.',
    goal: 'Toucher les trois repères dans l’ordre en moins de 20 secondes.',
    target: 3,
  },
  {
    id: 'art',
    title: 'Art d’Éclipse',
    instruction: 'Touchez la cible avec l’Art d’Éclipse de votre arme quand vous avez assez de Souffle.',
    goal: 'Toucher une cible avec un Art d’Éclipse.',
    target: 1,
  },
];
