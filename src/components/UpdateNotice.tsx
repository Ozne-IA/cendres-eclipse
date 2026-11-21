import { useCallback, useEffect, useState } from 'react';
import { formatBytes, progressPercent } from '../game/updateFormat';

interface UpdateStatus {
  enabled: boolean;
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'installed';
  current: { version: string } | null;
  latest: { version: string; url: string } | null;
  available: boolean;
  fullDownloadRequired: boolean;
  downloadBytes: number;
  progress: { doneBytes: number; totalBytes: number } | null;
  installedVersion: string | null;
  error: string | null;
}

/** Seul le lanceur PC propose les mises à jour : il ajoute ?pc_launcher=1 à l'adresse du jeu. */
const isPcLauncher = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pc_launcher') === '1';

async function request(path: string, method: 'GET' | 'POST' = 'GET') {
  const response = await fetch(path, { method, cache: 'no-store' });
  return { ok: response.ok, body: await response.json().catch(() => ({})) };
}

const box =
  'fixed bottom-4 right-4 z-40 max-w-[360px] bg-[#140f19]/95 border border-[#d4a853] px-4 py-3 text-[13px] text-[#e8e1d5] shadow-[0_8px_32px_rgba(0,0,0,0.88)]';
const button =
  'px-3 py-1.5 text-xs font-display uppercase tracking-wider border border-[#d4a853] text-[#ffd470] bg-[#1e1712] hover:bg-[#2a2018] cursor-pointer';

/** Bandeau de l'écran titre : signale une nouvelle version et l'installe en un clic, sans tout retélécharger. */
export function UpdateNotice() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const active = isPcLauncher();

  const refresh = useCallback(async () => {
    try {
      const { ok, body } = await request('/api/update/status');
      if (ok) setStatus(body as UpdateStatus);
    } catch {
      // Hors ligne ou serveur occupé : on réessaie au prochain passage.
    }
  }, []);

  // Le lanceur vérifie au démarrage : on relit l'état quelques fois, puis pendant le téléchargement.
  useEffect(() => {
    if (!active) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), status?.state === 'downloading' ? 700 : 4000);
    return () => window.clearInterval(timer);
  }, [active, refresh, status?.state]);

  const install = async () => {
    setFailure(null);
    setStatus((current) => (current ? { ...current, state: 'downloading', progress: { doneBytes: 0, totalBytes: 0 } } : current));
    try {
      const { ok, body } = await request('/api/update/apply', 'POST');
      if (!ok) setFailure(typeof body.error === 'string' ? body.error : "La mise à jour n'a pas pu être installée.");
    } catch {
      setFailure("La mise à jour n'a pas pu être installée. Le jeu reste dans sa version actuelle.");
    }
    await refresh();
  };

  if (!active || !status || !status.enabled || dismissed) return null;

  if (status.state === 'installed') {
    return (
      <div className={box} data-testid="update-notice" role="status">
        <div className="mb-2">Version {status.installedVersion} installée. Recharge le jeu pour en profiter.</div>
        <button type="button" data-gamepad-ignore className={button} onClick={() => window.location.reload()}>
          Recharger le jeu
        </button>
      </div>
    );
  }

  if (status.state === 'downloading') {
    const percent = progressPercent(status.progress);
    return (
      <div className={box} data-testid="update-notice" role="status">
        <div className="mb-2">Téléchargement de la mise à jour… {percent} %</div>
        <div className="h-1.5 bg-[#17121b] border border-[#3a2e25] overflow-hidden">
          <div className="h-full bg-[#ffd470]" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  if (!status.available || !status.latest) return null;

  return (
    <div className={box} data-testid="update-notice" role="status">
      <div className="mb-1 font-display uppercase tracking-wider text-[#ffd470] text-xs">
        Mise à jour {status.latest.version} disponible
      </div>
      {status.fullDownloadRequired ? (
        <>
          <div className="mb-2 text-[#b8afa2]">
            Cette version demande de télécharger le jeu complet (vous avez la {status.current?.version}).
          </div>
          <a className={button + ' inline-block'} href={status.latest.url} target="_blank" rel="noopener noreferrer" data-gamepad-ignore>
            Ouvrir la page de téléchargement
          </a>
        </>
      ) : (
        <>
          <div className="mb-2 text-[#b8afa2]">
            Vous avez la {status.current?.version}. Seuls les fichiers modifiés sont téléchargés
            ({formatBytes(status.downloadBytes)}). Votre sauvegarde n'est pas touchée.
          </div>
          {(failure || status.error) && <div className="mb-2 text-[#ff8a97]">{failure || status.error}</div>}
          <div className="flex gap-2">
            <button type="button" data-gamepad-ignore className={button} onClick={() => void install()}>
              {failure || status.error ? 'Réessayer' : 'Installer'}
            </button>
            <button type="button" data-gamepad-ignore className={button + ' border-[#4a3b2c] text-[#b8afa2]'} onClick={() => setDismissed(true)}>
              Plus tard
            </button>
          </div>
        </>
      )}
    </div>
  );
}
