---
summary: "Gateway lifecycle on macOS (launchd)"
read_when:
  - Intégration de l'application Mac avec le cycle de vie de la passerelle
title: "Gateway Lifecycle"
---

# Cycle de vie de la Gateway sur macOS

L'application macOS **gère la Gateway via launchd** par défaut et ne lance pas
la Gateway en tant que processus enfant. Elle essaie d'abord de se connecter à une Gateway déjà en cours d'exécution
sur le port configuré ; si aucune n'est accessible, elle active le service launchd
via la CLI externe `openclaw` (pas d'exécution intégré). Cela vous offre
un démarrage automatique fiable à la connexion et un redémarrage après des plantages.

Le mode processus enfant (Gateway lancé directement par l'application) n'est **plus utilisé** aujourd'hui.
Si vous avez besoin d'un couplage plus étroit avec l'interface utilisateur, lancez la Gateway manuellement dans un terminal.

## Comportement par défaut (launchd)

- L'application installe un LaunchAgent par utilisateur étiqueté `ai.openclaw.gateway`
  (ou `ai.openclaw.<profile>` lors de l'utilisation de `--profile`/`OPENCLAW_PROFILE` ; l'ancien `com.openclaw.*` est pris en charge).
- Lorsque le mode Local est activé, l'application s'assure que le LaunchAgent est chargé et
  démarre la Gateway si nécessaire.
- Les journaux sont écrits dans le chemin du journal launchd de la passerelle (visible dans les paramètres de débogage).

Commandes courantes :

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

Remplacez l'étiquette par `ai.openclaw.<profile>` lors de l'exécution d'un profil nommé.

## Versions de développement non signées

`scripts/restart-mac.sh --no-sign` est destiné aux compilations locales rapides lorsque vous ne disposez pas
de clés de signature. Pour empêcher launchd de pointer vers un binaire de relais non signé, il :

- Écrit `~/.openclaw/disable-launchagent`.

Les exécutions signées de `scripts/restart-mac.sh` effacent ce remplacement si le marqueur est
présent. Pour réinitialiser manuellement :

```bash
rm ~/.openclaw/disable-launchagent
```

## Mode attachement uniquement

Pour forcer l'application macOS à **ne jamais installer ou gérer launchd**, lancez-la avec
`--attach-only` (ou `--no-launchd`). Cela définit `~/.openclaw/disable-launchagent`,
l'application se contente donc de se connecter à une Gateway déjà en cours d'exécution. Vous pouvez activer le même
comportement dans les paramètres de débogage.

## Mode distant

Le mode distant ne démarre jamais de Gateway locale. L'application utilise un tunnel SSH vers l'hôte
distant et se connecte via ce tunnel.

## Pourquoi nous préférons launchd

- Démarrage automatique à la connexion.
- Sémantique intégrée de redémarrage/KeepAlive.
- Journaux et supervision prévisibles.

Si un véritable mode processus enfant est nécessaire à nouveau, il doit être documenté comme un
mode distinct, explicite et réservé aux développeurs.

import fr from "/components/footer/fr.mdx";

<fr />
