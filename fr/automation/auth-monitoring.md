---
summary: "Surveillez l'expiration OAuth pour les fournisseurs de modèles"
read_when:
  - Setting up auth expiry monitoring or alerts
  - Automating Claude Code / Codex OAuth refresh checks
title: "Surveillance de l'auth"
---

# Surveillance de l'auth

OpenClaw expose l'état d'expiration OAuth via `openclaw models status`. Utilisez-le pour
l'automatisation et les alertes ; les scripts sont des extras facultatifs pour les flux de travail sur téléphone.

## Préféré : vérification CLI (portable)

```bash
openclaw models status --check
```

Codes de sortie :

- `0` : OK
- `1` : identifiants expirés ou manquants
- `2` : expiration proche (dans les 24h)

Cela fonctionne dans cron/systemd et ne nécessite aucun script supplémentaire.

## Scripts facultatifs (ops / flux de travail téléphoniques)

Ils se trouvent sous `scripts/` et sont **facultatifs**. Ils supposent un accès SSH à l'hôte
de la passerelle et sont réglés pour systemd + Termux.

- `scripts/claude-auth-status.sh` utilise maintenant `openclaw models status --json` comme
  source de vérité (revenant aux lectures directes de fichiers si le CLI est indisponible),
  alors gardez `openclaw` sur `PATH` pour les minuteries.
- `scripts/auth-monitor.sh` : cible de minuterie cron/systemd ; envoie des alertes (ntfy ou téléphone).
- `scripts/systemd/openclaw-auth-monitor.{service,timer}` : minuterie utilisateur systemd.
- `scripts/claude-auth-status.sh` : vérificateur d'auth Claude Code + OpenClaw (complet//simple).
- `scripts/mobile-reauth.sh` : flux guidé de réauthentification via SSH.
- `scripts/termux-quick-auth.sh` : statut de widget en un appui + ouvrir l'URL d'auth.
- `scripts/termux-auth-widget.sh` : flux complet guidé de widget.
- `scripts/termux-sync-widget.sh` : synchroniser les identifiants Claude Code → OpenClaw.

Si vous n'avez pas besoin d'automatisation sur téléphone ou de minuteries systemd, ignorez ces scripts.

import fr from '/components/footer/fr.mdx';

<fr />
