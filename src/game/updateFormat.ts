/** Taille lisible en français : « 540 Ko », « 5,9 Mo ». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.floor(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/** Avancement du téléchargement en pourcentage, toujours entre 0 et 100. */
export function progressPercent(progress: { doneBytes: number; totalBytes: number } | null): number {
  if (!progress || progress.totalBytes <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((progress.doneBytes / progress.totalBytes) * 100)));
}
