---
summary: "Surveillez l'expiration OAuth pour les model providers"
read_when:
  - Configuration de la surveillance ou des alertes d'expiration d'authentification
  - Automatisation des contrôles de rafraîchissement OAuth de Claude Code / Codex
title: "Surveillance d'authentification"
---

# Surveillance d'authentification

OpenClaw expose l'état de santé de l'expiration OAuth via `openclaw models status`. Utilisez-le pour
l'automatisation et les alertes ; les scripts sont des extras facultatifs pour les flux de travail téléphoniques.

## Préféré : vérification CLI (portable)

```bash
openclaw models status --check
```

Codes de sortie :

- `0` : OK
- `1` : identifiants expirés ou manquants
- `2` : expiration prochaine (dans 24h)

Cela fonctionne dans cron/systemd et ne nécessite aucun script supplémentaire.

## Scripts facultatifs (ops / flux de travail téléphoniques)

Ils se trouvent sous `scripts/` et sont **facultatifs**. Ils supposent un accès SSH à
l'hôte passerelle et sont réglés pour systemd + Termux.

- `scripts/claude-auth-status.sh` utilise désormais `openclaw models status --json` comme source
  de vérité (avec repli sur la lecture directe des fichiers si le CLI est indisponible),
  gardez donc `openclaw` sur `PATH` pour les minuteurs.
- `scripts/auth-monitor.sh` : cible de minuteur cron/systemd ; envoie des alertes (ntfy ou téléphone).
- `scripts/systemd/openclaw-auth-monitor.{service,timer}` : minuteur utilisateur systemd.
- `scripts/claude-auth-status.sh` : vérificateur d'authentification Claude Code + OpenClaw (complet//simple).
- `scripts/mobile-reauth.sh` : flux de réauthentification guidée via SSH.
- `scripts/termux-quick-auth.sh` : statut de widget en un appui + ouvrir l'URL d'authentification.
- `scripts/termux-auth-widget.sh` : flux de widget entièrement guidé.
- `scripts/termux-sync-widget.sh` : synchroniser les identifiants Claude Code → OpenClaw.

Si vous n'avez pas besoin d'automatisation téléphonique ou de minuteurs systemd, ignorez ces scripts.

import fr from "/components/footer/fr.mdx";

<fr />
