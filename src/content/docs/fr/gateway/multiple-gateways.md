---
summary: "Exécuter plusieurs OpenClaw Gateways sur un même hôte (isolement, ports et profils)"
read_when:
  - Running more than one Gateway on the same machine
  - You need isolated config/state/ports per Gateway
title: "Gateways multiples"
---

# Gateways multiples (même hôte)

La plupart des configurations devraient utiliser un seul Gateway car un seul Gateway peut gérer plusieurs connexions de messagerie et agents. Si vous avez besoin d'un isolement plus fort ou d'une redondance (par exemple, un robot de secours), exécutez des Gateways distincts avec des profils/ports isolés.

## Liste de contrôle d'isolement (requis)

- `OPENCLAW_CONFIG_PATH` — fichier de configuration par instance
- `OPENCLAW_STATE_DIR` — sessions, identifiants, caches par instance
- `agents.defaults.workspace` — racine de l'espace de travail par instance
- `gateway.port` (ou `--port`) — unique par instance
- Les ports dérivés (navigateur/canvas) ne doivent pas se chevaucher

S'ils sont partagés, vous rencontrerez des conflits de configuration et de ports.

## Recommandé : profils (`--profile`)

Les profils délimitent automatiquement `OPENCLAW_STATE_DIR` + `OPENCLAW_CONFIG_PATH` et suffixent les noms de service.

```bash
# main
openclaw --profile main setup
openclaw --profile main gateway --port 18789

# rescue
openclaw --profile rescue setup
openclaw --profile rescue gateway --port 19001
```

Services par profil :

```bash
openclaw --profile main gateway install
openclaw --profile rescue gateway install
```

## Guide du robot de secours

Exécutez un deuxième Gateway sur le même hôte avec son propre :

- profil/configuration
- répertoire d'état
- espace de travail
- port de base (plus les ports dérivés)

Cela maintient le robot de secours isolé du robot principal afin qu'il puisse déboguer ou appliquer des modifications de configuration si le robot principal est en panne.

Espacement des ports : laissez au moins 20 ports entre les ports de base afin que les ports dérivés navigateur/canvas/CDP ne se heurtent jamais.

### Comment installer (robot de secours)

```bash
# Main bot (existing or fresh, without --profile param)
# Runs on port 18789 + Chrome CDC/Canvas/... Ports
openclaw onboard
openclaw gateway install

# Rescue bot (isolated profile + ports)
openclaw --profile rescue onboard
# Notes:
# - workspace name will be postfixed with -rescue per default
# - Port should be at least 18789 + 20 Ports,
#   better choose completely different base port, like 19789,
# - rest of the onboarding is the same as normal

# To install the service (if not happened automatically during setup)
openclaw --profile rescue gateway install
```

## Mappage des ports (dérivé)

Port de base = `gateway.port` (ou `OPENCLAW_GATEWAY_PORT` / `--port`).

- port du service de contrôle du navigateur = base + 2 (boucle locale uniquement)
- l'hôte canvas est servi sur le serveur HTTP du Gateway (même port que `gateway.port`)
- Les ports CDP du profil du navigateur s'allouent automatiquement à partir de `browser.controlPort + 9 .. + 108`

Si vous remplacez l'un d'eux dans la configuration ou l'environnement, vous devez les garder uniques par instance.

## Notes sur le navigateur/CDP (piège courant)

- Ne **pas** attribuer `browser.cdpUrl` aux mêmes valeurs sur plusieurs instances.
- Chaque instance a besoin de son propre port de contrôle du navigateur et de sa propre plage CDP (dérivée de son port de passerelle).
- Si vous avez besoin de ports CDP explicites, définissez `browser.profiles.<name>.cdpPort` par instance.
- Chrome distant : utilisez `browser.profiles.<name>.cdpUrl` (par profil, par instance).

## Exemple d'environnement manuel

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw-main \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19001
```

## Vérifications rapides

```bash
openclaw --profile main status
openclaw --profile rescue status
openclaw --profile rescue browser status
```
