---
summary: "Cycle de vie de la Gateway sur macOS (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "GatewaymacOSCycle de vie du Gateway sur macOS"
---

Par défaut, l'application macOS **gère le Gateway via launchd** et ne génère pas
le Gateway en tant que processus enfant. Elle essaie d'abord de s'attacher à un Gateway
déjà en cours d'exécution sur le port configuré ; si aucun n'est accessible, elle active le service
launchd via le macOSGatewayGatewayGateway`openclaw`CLI CLI externe (pas d'exécution intégrée). Cela vous offre
un démarrage automatique fiable à la connexion et un redémarrage en cas de plantage.

Le mode processus enfant (Gateway généré directement par l'application) n'est **pas utilisé**
aujourd'hui. Si vous avez besoin d'un couplage plus étroit avec l'interface utilisateur,
lancez le Gateway manuellement dans un terminal.

## Comportement par défaut (launchd)

- L'application installe un LaunchAgent par utilisateur étiqueté `ai.openclaw.gateway`
  (ou `ai.openclaw.<profile>` lors de l'utilisation de `--profile`/`OPENCLAW_PROFILE` ; `com.openclaw.*` hérité est pris en charge).
- Lorsque le mode Local est activé, l'application s'assure que le LaunchAgent est chargé et
  démarre le Gateway si nécessaire.
- Les journaux sont écrits dans le chemin du journal launchd du gateway (visible dans Debug Settings).

Commandes courantes :

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

Remplacez l'étiquette par `ai.openclaw.<profile>` lors de l'exécution d'un profil nommé.

## Versions de développement non signées

`scripts/restart-mac.sh --no-sign` est destiné aux versions locales rapides lorsque vous ne possédez pas
de clés de signature. Pour empêcher launchd de pointer vers un binaire de relais non signé, il :

- Écrit `~/.openclaw/disable-launchagent`.

Les exécutions signées de `scripts/restart-mac.sh` effacent ce remplacement si le marqueur est
présent. Pour réinitialiser manuellement :

```bash
rm ~/.openclaw/disable-launchagent
```

## Mode Attach uniquement

Pour forcer l'application macOS à **ne jamais installer ou gérer launchd**, lancez-la avec
macOS`--attach-only` (ou `--no-launchd`). Cela définit `~/.openclaw/disable-launchagent`Gateway,
c'est pourquoi l'application s'attache uniquement à un Gateway déjà en cours d'exécution. Vous pouvez activer ou
désactiver le même comportement dans Debug Settings.

## Mode distant

Le mode distant ne démarre jamais de Gateway local. L'application utilise un tunnel SSH vers l'hôte
distant et se connecte via ce tunnel.

## Pourquoi nous préférons launchd

- Démarrage automatique à la connexion.
- Sémantique de redémarrage/KeepAlive intégrée.
- Journaux et supervision prévisibles.

Si un véritable mode de processus enfant est à nouveau nécessaire, il doit être documenté comme un
mode distinct et explicite réservé aux développeurs.

## Connexes

- [Application macOS](/fr/platforms/macos)
- [Guide du Gateway](/fr/gateway)
