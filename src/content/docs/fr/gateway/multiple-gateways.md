---
summary: "Exécuter plusieurs passerelles OpenClaw sur un même hôte (isolement, ports et profils)"
read_when:
  - Running more than one Gateway on the same machine
  - You need isolated config/state/ports per Gateway
title: "Passerelles multiples"
---

La plupart des configurations devraient utiliser un seul Gateway car un seul Gateway peut gérer plusieurs connexions de messagerie et agents. Si vous avez besoin d'un isolement ou d'une redondance plus forts (par exemple, un bot de secours), exécutez des passerelles distinctes avec des profils/ports isolés.

## Meilleure configuration recommandée

Pour la plupart des utilisateurs, la configuration la plus simple pour un bot de secours est :

- garder le bot principal sur le profil par défaut
- exécuter le bot de secours sur `--profile rescue`
- utiliser un bot Telegram totalement distinct pour le compte de secours
- garder le bot de secours sur un port de base différent, tel que `19789`

Cela permet de garder le bot de secours isolé du bot principal afin qu'il puisse déboguer ou appliquer des
changements de configuration si le bot principal est en panne. Laissez au moins 20 ports entre
les ports de base afin que les ports dérivés navigateur/toile/CDP n'entrent jamais en collision.

## Démarrage rapide du bot de secours

Utilisez ceci comme chemin par défaut à moins que vous n'ayez une forte raison de faire autre
chose :

```bash
# Rescue bot (separate Telegram bot, separate profile, port 19789)
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

Si votre bot principal est déjà en cours d'exécution, c'est généralement tout ce dont vous avez besoin.

Pendant `openclaw --profile rescue onboard` :

- utiliser le jeton de bot Telegram distinct
- garder le profil `rescue`
- utiliser un port de base au moins 20 supérieur à celui du bot principal
- accepter l'espace de travail de secours par défaut à moins que vous n'en gériez déjà un vous-même

Si l'intégration a déjà installé le service de secours pour vous, le dernier
`gateway install` n'est pas nécessaire.

## Pourquoi cela fonctionne

Le bot de secours reste indépendant car il possède son propre :

- profil/configuration
- répertoire d'état
- espace de travail
- port de base (plus les ports dérivés)
- jeton de bot Telegram

Pour la plupart des configurations, utilisez un bot Telegram totalement distinct pour le profil de secours :

- facile à garder pour les opérateurs uniquement
- jeton et identité de bot distincts
- indépendant de l'installation channel/application du bot principal
- chemin de récupération simple basé sur DM lorsque le bot principal est cassé

## Ce que `--profile rescue onboard` modifie

`openclaw --profile rescue onboard` utilise le processus d'intégration normal, mais il
écrit tout dans un profil distinct.

En pratique, cela signifie que le bot de secours obtient son propre :

- fichier de configuration
- répertoire d'état
- espace de travail (par défaut `~/.openclaw/workspace-rescue`)
- nom du service géré

Les invites sont par ailleurs les mêmes que pour l'intégration normale.

## Configuration multi-passerelle générale

La disposition du rescue-bot ci-dessus est l'option par défaut la plus simple, mais le même modèle d'isolation fonctionne pour n'importe quelle paire ou groupe de Gateways sur un seul hôte.

Pour une configuration plus générale, donnez à chaque Gateway supplémentaire son propre profil nommé et son propre port de base :

```bash
# main (default profile)
openclaw setup
openclaw gateway --port 18789

# extra gateway
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

Si vous souhaitez que les deux Gateways utilisent des profils nommés, cela fonctionne également :

```bash
openclaw --profile main setup
openclaw --profile main gateway --port 18789

openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

Les services suivent le même modèle :

```bash
openclaw gateway install
openclaw --profile ops gateway install --port 19789
```

Utilisez le démarrage rapide rescue-bot lorsque vous souhaitez une voie de secours pour l'opérateur. Utilisez le modèle de profil général lorsque vous souhaitez plusieurs Gateways à longue durée de vie pour différents canaux, locataires, espaces de travail ou rôles opérationnels.

## Liste de contrôle pour l'isolation

Gardez ces éléments uniques par instance de Gateway :

- `OPENCLAW_CONFIG_PATH` — fichier de configuration par instance
- `OPENCLAW_STATE_DIR` — sessions, identifiants et caches par instance
- `agents.defaults.workspace` — racine de l'espace de travail par instance
- `gateway.port` (ou `--port`) — unique par instance
- ports dérivés pour navigateur/canevas/CDP

S'ils sont partagés, vous rencontrerez des conflits de configuration et de ports.

## Mappage des ports (dérivé)

Port de base = `gateway.port` (ou `OPENCLAW_GATEWAY_PORT` / `--port`).

- port du service de contrôle du navigateur = base + 2 (boucle locale uniquement)
- l'hôte du canevas est servi sur le serveur HTTP du Gateway (même port que `gateway.port`)
- Les ports CDP du profil du navigateur sont alloués automatiquement à partir de `browser.controlPort + 9 .. + 108`

Si vous remplacez l'un de ces éléments dans la configuration ou l'environnement, vous devez les garder uniques par instance.

## Notes sur le navigateur/CDP (piège courant)

- Ne **pas** fixer `browser.cdpUrl` aux mêmes valeurs sur plusieurs instances.
- Chaque instance a besoin de son propre port de contrôle du navigateur et de sa propre plage CDP (dérivée de son port de passerelle).
- Si vous avez besoin de ports CDP explicites, définissez `browser.profiles.<name>.cdpPort` par instance.
- Chrome distant : utilisez `browser.profiles.<name>.cdpUrl` (par profil, par instance).

## Exemple d'environnement manuel

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19789
```

## Vérifications rapides

```bash
openclaw gateway status --deep
openclaw --profile rescue gateway status --deep
openclaw --profile rescue gateway probe
openclaw status
openclaw --profile rescue status
openclaw --profile rescue browser status
```

Interprétation :

- `gateway status --deep` permet d'identifier les services launchd/systemd/schtasks obsolètes des anciennes installations.
- Le texte d'avertissement `gateway probe` tel que `multiple reachable gateways detected` est attendu uniquement lorsque vous exécutez intentionnellement plus d'une passerelle isolée.

## Connexes

- [Manuel d'exploitation du Gateway](/fr/gateway)
- [Gateway lock](/fr/gateway/gateway-lock)
- [Configuration](/fr/gateway/configuration)
