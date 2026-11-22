export type TrainingExerciseId = 'parry' | 'riposte' | 'reflect' | 'dodge' | 'movement' | 'art';

export const TRAINING_EXERCISES: ReadonlyArray<{
  id: TrainingExerciseId;
  title: string;
  instruction: string;
  goal: string;
}> = [
  {
    id: 'parry',
    title: 'Parade',
    instruction: 'Attendez la charge du Pénitent. Parez juste avant que son coup vous touche.',
    goal: 'Réussir une parade parfaite contre le Pénitent.',
  },
  {
    id: 'riposte',
    title: 'Riposte',
    instruction: 'Parez le coup du Pénitent, puis frappez-le pendant que sa posture est brisée.',
    goal: 'Toucher le Pénitent avec une riposte après une parade parfaite.',
  },
  {
    id: 'reflect',
    title: 'Renvoi',
    instruction: 'Laissez le Veilleur de Suie tirer. Parez quand son projectile arrive sur vous.',
    goal: 'Renvoyer un projectile du Veilleur de Suie.',
  },
  {
    id: 'dodge',
    title: 'Esquive',
    instruction: 'Quand le Pénitent charge, déclenchez l’esquive au moment où son coup vous atteindrait.',
    goal: 'Réussir une esquive parfaite.',
  },
  {
    id: 'movement',
    title: 'Déplacement',
    instruction: 'Courez et sautez. Vous pouvez faire les deux dans le même mouvement.',
    goal: 'Sauter et courir sur au moins trois largeurs de personnage.',
  },
  {
    id: 'art',
    title: 'Art d’Éclipse',
    instruction: 'Déclenchez l’Art d’Éclipse de votre arme équipée pendant que vous avez assez d’endurance.',
    goal: 'Exécuter un Art d’Éclipse.',
  },
];
