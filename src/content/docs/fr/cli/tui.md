---
summary: "Référence CLI pour `openclaw tui` (interface utilisateur terminal basée sur le Gateway ou intégrée localement)"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
  - You want to run the TUI in local embedded mode without a Gateway
  - You want to use openclaw chat or openclaw tui --local
title: "tui"
---

# `openclaw tui`

Ouvrez l'interface utilisateur terminal connectée au Gateway, ou exécutez-la en mode
intégré local.

Connexes :

- Guide TUI : [TUI](/fr/web/tui)

Notes :

- `chat` et `terminal` sont des alias de `openclaw tui --local`.
- `--local` ne peut pas être combiné avec `--url`, `--token` ou `--password`.
- `tui` résout les SecretRefs d'authentification de passerelle configurés pour l'authentification par jeton/mot de passe lorsque cela est possible (fournisseurs `env`/`file`/`exec`).
- Lorsqu'il est lancé depuis un répertoire de workspace d'agent configuré, la TUI sélectionne automatiquement cet agent pour la valeur par défaut de la clé de session (sauf si `--session` est explicitement `agent:<id>:...`).
- Le mode local utilise directement le runtime de l'agent intégré. La plupart des outils locaux fonctionnent, mais les fonctionnalités exclusives au Gateway ne sont pas disponibles.
- Le mode local ajoute `/auth [provider]` à la surface de commande de la TUI.
- Les portes d'approbation des plugins s'appliquent toujours en mode local. Les outils nécessitant une approbation demandent une décision dans le terminal ; rien n'est approuvé automatiquement en silence car le Gateway n'est pas impliqué.

## Exemples

```bash
openclaw chat
openclaw tui --local
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
openclaw chat --message "Compare my config to the docs and tell me what to fix"
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

## Boucle de réparation de la configuration

Utilisez le mode local lorsque la configuration actuelle est déjà validée et que vous souhaitez que
l'agent intégré l'inspecte, la compare à la documentation et aide à la réparer
à partir du même terminal :

Si `openclaw config validate` échoue déjà, utilisez `openclaw configure` ou
`openclaw doctor --fix` en premier. `openclaw chat` ne contourne pas la barrière de
configuration invalide.

```bash
openclaw chat
```

Ensuite à l'intérieur de la TUI :

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

Appliquez des correctifs ciblés avec `openclaw config set` ou `openclaw configure`, puis
relancez `openclaw config validate`. Voir [TUI](/fr/web/tui) et [Config](/fr/cli/config).
