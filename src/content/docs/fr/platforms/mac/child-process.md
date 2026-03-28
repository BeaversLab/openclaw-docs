---
summary: "Cycle de vie de la Gateway sur macOS (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "Cycle de vie de la Gateway"
---

# Cycle de vie de la Gateway sur macOS

L'application macOS **gère la Gateway via launchd** par défaut et ne génère pas
la Gateway en tant que processus enfant. Elle essaie d'abord de se connecter à une Gateway
déjà en cours d'exécution sur le port configuré ; si aucune n'est accessible, elle active le service
launchd via la CLI externe `openclaw` (pas d'exécution intégrée). Cela vous offre
un démarrage automatique fiable à la connexion et un redémarrage en cas de plantage.

Le mode processus enfant (Gateway générée directement par l'application) n'est **pas utilisé**
à l'heure actuelle. Si vous avez besoin d'un couplage plus étroit avec l'interface utilisateur,
exécutez la Gateway manuellement dans un terminal.

## Comportement par défaut (launchd)

- L'application installe un LaunchAgent par utilisateur nommé `ai.openclaw.gateway`
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

`scripts/restart-mac.sh --no-sign` est destiné aux builds locaux rapides lorsque vous ne possédez pas
de clés de signature. Pour empêcher launchd de pointer vers un binaire de relais non signé, il :

- Écrit `~/.openclaw/disable-launchagent`.

Les exécutions signées de `scripts/restart-mac.sh` effacent ce remplacement si le marqueur est
présent. Pour réinitialiser manuellement :

```bash
rm ~/.openclaw/disable-launchagent
```

## Mode attachement uniquement

Pour forcer l'application macOS à **ne jamais installer ni gérer launchd**, lancez-la avec
`--attach-only` (ou `--no-launchd`). Cela définit `~/.openclaw/disable-launchagent`,
de sorte que l'application se connecte uniquement à une Gateway déjà en cours d'exécution. Vous pouvez activer
le même comportement dans les paramètres de débogage.

## Mode distant

Le mode distant ne démarre jamais de Gateway local. L'application utilise un tunnel SSH vers l'hôte distant et se connecte via ce tunnel.

## Pourquoi nous préférons launchd

- Démarrage automatique à la connexion.
- Sémantique intégrée de redémarrage/KeepAlive.
- Journaux et supervision prévisibles.

Si un véritable mode processus enfant est un jour nécessaire à nouveau, il doit être documenté comme un mode distinct et explicite réservé aux développeurs.
