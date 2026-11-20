import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLaunchUrl,
  generatePcLauncherReadme,
  generatePowerShellLauncher,
  generateUnixShLauncher,
  generateWindowsBat,
  sanitizePort,
  type PcLauncherConfig,
} from './pcLauncher';

test('sanitizePort accepts valid unprivileged ports and falls back to 4173', () => {
  assert.equal(sanitizePort(3000), 3000);
  assert.equal(sanitizePort(8080), 8080);
  assert.equal(sanitizePort(80), 4173);
  assert.equal(sanitizePort(99999), 4173);
  assert.equal(sanitizePort(Number.NaN), 4173);
});

test('buildLaunchUrl appends optional launch query flags cleanly', () => {
  const baseCfg: PcLauncherConfig = {
    port: 4173,
    appMode: true,
    fullscreen: false,
    autostart: false,
    fogQuality: 'high',
    showFps: false,
  };
  assert.equal(buildLaunchUrl(baseCfg), 'http://127.0.0.1:4173/');

  const customCfg: PcLauncherConfig = {
    port: 5123,
    appMode: true,
    fullscreen: true,
    autostart: true,
    fogQuality: 'medium',
    showFps: true,
  };
  const url = buildLaunchUrl(customCfg);
  assert.ok(url.startsWith('http://127.0.0.1:5123/?'));
  assert.ok(url.includes('autostart=1'));
  assert.ok(url.includes('fullscreen=1'));
  assert.ok(url.includes('fog=medium'));
  assert.ok(url.includes('fps=1'));
});

test('PC launcher script generators embed configured port, app mode, and fullscreen flags', () => {
  const cfg: PcLauncherConfig = {
    port: 4888,
    appMode: true,
    fullscreen: true,
    autostart: true,
    fogQuality: 'off',
    showFps: true,
  };

  const bat = generateWindowsBat(cfg);
  assert.ok(bat.includes('--port=4888'));
  assert.ok(bat.includes('--app="http://127.0.0.1:4888/?'));
  assert.ok(bat.includes('--start-fullscreen'));

  const ps1 = generatePowerShellLauncher(cfg);
  assert.ok(ps1.includes('[int]$Port = 4888'));
  assert.ok(ps1.includes('--app=$Url'));
  assert.ok(ps1.includes('--start-fullscreen'));

  const sh = generateUnixShLauncher(cfg);
  assert.ok(sh.startsWith('#!/usr/bin/env bash'));
  assert.ok(sh.includes('--port=4888'));
  assert.ok(sh.includes('--start-fullscreen'));

  const readme = generatePcLauncherReadme(cfg);
  assert.ok(readme.includes('Port local : 4888'));
  assert.ok(readme.includes('Brouillard volumetrique : off'));
});
