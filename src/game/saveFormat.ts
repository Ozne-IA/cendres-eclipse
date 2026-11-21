/**
 * Versions de sauvegarde et migrations, communes au navigateur et au lanceur PC.
 * Le lanceur (launcher/save-store.mjs) garde une copie de SAVE_VERSION ; un test vérifie qu'elles restent égales.
 */
export const SAVE_VERSION = 2;
export const MIN_SAVE_VERSION = 1;

export type SaveVersionVerdict =
  | { status: 'current'; version: number }
  | { status: 'older'; version: number }
  | { status: 'newer'; version: number }
  | { status: 'invalid' };

/** Une sauvegarde sans numéro est un ancien export : on la traite comme la version courante. */
export function inspectSaveVersion(version: unknown): SaveVersionVerdict {
  if (version === undefined) return { status: 'current', version: SAVE_VERSION };
  if (typeof version !== 'number' || !Number.isInteger(version) || version < MIN_SAVE_VERSION) {
    return { status: 'invalid' };
  }
  if (version > SAVE_VERSION) return { status: 'newer', version };
  return { status: version === SAVE_VERSION ? 'current' : 'older', version };
}

type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/**
 * Étapes de migration : la clé N transforme une sauvegarde de version N en version N + 1.
 * Pour une prochaine version : augmenter SAVE_VERSION (ici et dans le lanceur) et ajouter une étape.
 */
export const MIGRATIONS: Record<number, Migration> = {
  1: (save) => ({ ...save, version: 2 }),
};

export function migrateSave(raw: Record<string, unknown>): Record<string, unknown> {
  let current = raw;
  let version = typeof current.version === 'number' ? current.version : SAVE_VERSION;
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`Aucune migration depuis la version ${version}`);
    current = step(current);
    version += 1;
  }
  return current;
}
