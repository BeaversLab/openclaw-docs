---
summary: "Fonctionnement du bac à sable OpenClaw : modes, portées, accès à l'espace de travail et images"
title: Sandboxing
read_when: "You want a dedicated explanation of sandboxing or need to tune agents.defaults.sandbox."
status: active
---

# Sandboxing

OpenClaw peut exécuter des **tools inside sandbox backends** pour réduire le rayon d'impact.
Ceci est **optional** et contrôlé par la configuration (`agents.defaults.sandbox` ou
`agents.list[].sandbox`). Si le sandboxing est désactivé, les outils s'exécutent sur l'hôte.
Le Gateway reste sur l'hôte ; l'exécution des outils s'effectue dans un bac à sable isolé
lorsqu'elle est activée.

Ceci n'est pas une limite de sécurité parfaite, mais cela limite matériellement l'accès au système de fichiers
et aux processus lorsque le model fait quelque chose d'inhabituel.

## What gets sandboxed

- Tool execution (`exec`, `read`, `write`, `edit`, `apply_patch`, `process`, etc.).
- Optional sandboxed browser (`agents.defaults.sandbox.browser`).
  - By default, the sandbox browser auto-starts (ensures CDP is reachable) when the browser tool needs it.
    Configure via `agents.defaults.sandbox.browser.autoStart` and `agents.defaults.sandbox.browser.autoStartTimeoutMs`.
  - By default, sandbox browser containers use a dedicated Docker network (`openclaw-sandbox-browser`) instead of the global `bridge` network.
    Configure with `agents.defaults.sandbox.browser.network`.
  - Optional `agents.defaults.sandbox.browser.cdpSourceRange` restricts container-edge CDP ingress with a CIDR allowlist (for example `172.21.0.1/32`).
  - noVNC observer access is password-protected by default; OpenClaw emits a short-lived token URL that serves a local bootstrap page and opens noVNC with password in URL fragment (not query/header logs).
  - `agents.defaults.sandbox.browser.allowHostControl` lets sandboxed sessions target the host browser explicitly.
  - Optional allowlists gate `target: "custom"`: `allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`.

Not sandboxed:

- The Gateway process itself.
- Any tool explicitly allowed to run on the host (e.g. `tools.elevated`).
  - **Elevated exec runs on the host and bypasses sandboxing.**
  - Si le sandboxing est désactivé, `tools.elevated` ne modifie pas l'exécution (déjà sur l'hôte). Voir [Mode élevé](/fr/tools/elevated).

## Modes

`agents.defaults.sandbox.mode` contrôle **quand** le sandboxing est utilisé :

- `"off"` : pas de sandboxing.
- `"non-main"` : sandbox uniquement pour les sessions **non principales** (par défaut si vous voulez des discussions normales sur l'hôte).
- `"all"` : chaque session s'exécute dans un sandbox.
  Remarque : `"non-main"` est basé sur `session.mainKey` (par défaut `"main"`), et non sur l'ID de l'agent.
  Les sessions de groupe/canal utilisent leurs propres clés, elles comptent donc comme non principales et seront sandboxées.

## Portée

`agents.defaults.sandbox.scope` contrôle **combien de conteneurs** sont créés :

- `"session"` (par défaut) : un conteneur par session.
- `"agent"` : un conteneur par agent.
- `"shared"` : un conteneur partagé par toutes les sessions sandboxées.

## Backend

`agents.defaults.sandbox.backend` contrôle **quel runtime** fournit le sandbox :

- `"docker"` (par défaut) : runtime de sandbox local pris en charge par Docker.
- `"ssh"` : runtime de sandbox distant générique pris en charge par SSH.
- `"openshell"` : runtime de sandbox pris en charge par OpenShell.

La configuration spécifique à SSH se trouve sous `agents.defaults.sandbox.ssh`.
La configuration spécifique à OpenShell se trouve sous `plugins.entries.openshell.config`.

### Backend SSH

Utilisez `backend: "ssh"` lorsque vous voulez que OpenClaw place `exec`, les outils de fichiers et les lectures de média dans
un sandbox sur une machine accessible arbitrairement par SSH.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        scope: "session",
        workspaceAccess: "rw",
        ssh: {
          target: "user@gateway-host:22",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // Or use SecretRefs / inline contents instead of local files:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

Fonctionnement :

- OpenClaw crée une racine distante par portée sous `sandbox.ssh.workspaceRoot`.
- Lors de la première utilisation après création ou recréation, OpenClaw alimente cet espace de travail distant à partir de l'espace de travail local une seule fois.
- Ensuite, `exec`, `read`, `write`, `edit`, `apply_patch`, les lectures de média de prompt et la mise en zone de transit des médias entrants s'exécutent directement contre l'espace de travail distant via SSH.
- OpenClaw ne synchronise pas automatiquement les modifications distantes vers l'espace de travail local.

Matériel d'authentification :

- `identityFile`, `certificateFile`, `knownHostsFile` : utilisez les fichiers locaux existants et transmettez-les via la configuration OpenSSH.
- `identityData`, `certificateData`, `knownHostsData` : utilisez des chaînes en ligne ou des SecretRefs. OpenClaw les résout via l'instantané d'exécution normal des secrets, les écrit dans des fichiers temporaires avec `0600` et les supprime à la fin de la session SSH.
- Si `*File` et `*Data` sont tous deux définis pour le même élément, `*Data` l'emporte pour cette session SSH.

Il s'agit d'un modèle **à autorité distante**. L'espace de travail SSH distant devient l'état réel du bac à sable après l'amorçage initial.

Conséquences importantes :

- Les modifications locales effectuées en dehors de OpenClaw après l'étape d'amorçage ne sont pas visibles à distance tant que vous n'avez pas recréé le bac à sable.
- `openclaw sandbox recreate` supprime la racine distante par portée et réamorce depuis le local à la prochaine utilisation.
- Le bac à sable de navigateur n'est pas pris en charge sur le backend SSH.
- Les paramètres `sandbox.docker.*` ne s'appliquent pas au backend SSH.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote", // mirror | remote
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
        },
      },
    },
  },
}
```

Modes OpenShell :

- `mirror` (par défaut) : l'espace de travail local reste canonique. OpenClaw synchronise les fichiers locaux dans OpenShell avant l'exécution et synchronise l'espace de travail distant après l'exécution.
- `remote` : l'espace de travail OpenShell est canonique après la création du bac à sable. OpenClaw amorce l'espace de travail distant une fois depuis l'espace de travail local, puis les outils de fichiers et l'exécution s'exécutent directement sur le bac à sable distant sans synchroniser les modifications en retour.

OpenShell réutilise le même transport SSH de base et le même pont de système de fichiers distant que le backend SSH générique.
Le plugin ajoute un cycle de vie spécifique à OpenShell (`sandbox create/get/delete`, `sandbox ssh-config`) et le mode `mirror` en option.

Détails du transport distant :

- OpenClaw demande à OpenShell une configuration SSH spécifique au bac à sable via `openshell sandbox ssh-config <name>`.
- Le cœur écrit cette configuration SSH dans un fichier temporaire, ouvre la session SSH et réutilise le même pont de système de fichiers distant que celui utilisé par `backend: "ssh"`.
- En mode `mirror`, seul le cycle de vie diffère : synchronisation du local vers le distant avant l'exécution, puis retour vers le local après l'exécution.

Limitations actuelles d'OpenShell :

- le navigateur bac à sable n'est pas encore pris en charge
- `sandbox.docker.binds` n'est pas pris en charge sur le backend OpenShell
- Les paramètres d'exécution spécifiques à Docker sous `sandbox.docker.*` s'appliquent toujours uniquement au backend Docker

## Modes d'espace de travail OpenShell

OpenShell propose deux modèles d'espace de travail. C'est la partie qui compte le plus en pratique.

### `mirror`

Utilisez `plugins.entries.openshell.config.mode: "mirror"` lorsque vous souhaitez que l'**espace de travail local reste canonique**.

Comportement :

- Avant `exec`, OpenClaw synchronise l'espace de travail local dans le bac à sable OpenShell.
- Après `exec`, OpenClaw synchronise l'espace de travail distant vers l'espace de travail local.
- Les outils de fichiers fonctionnent toujours via le pont du bac à sable, mais l'espace de travail local reste la source de vérité entre les tours.

Utilisez ceci lorsque :

- vous modifiez des fichiers localement en dehors de OpenClaw et souhaitez que ces modifications apparaissent automatiquement dans le bac à sable
- vous souhaitez que le bac à sable OpenShell se comporte autant que possible comme le backend Docker
- vous souhaitez que l'espace de travail de l'hôte reflète les écritures du bac à sable après chaque tour d'exécution

Compromis :

- coût de synchronisation supplémentaire avant et après l'exécution

### `remote`

Utilisez `plugins.entries.openshell.config.mode: "remote"` lorsque vous souhaitez que l'**espace de travail OpenShell devienne canonique**.

Comportement :

- Lorsque le bac à sable est créé pour la première fois, OpenClaw ensemence l'espace de travail distant à partir de l'espace de travail local une seule fois.
- Ensuite, `exec`, `read`, `write`, `edit` et `apply_patch` opèrent directement sur l'espace de travail distant OpenShell.
- OpenClaw ne synchronise **pas** les modifications distantes dans l'espace de travail local après l'exécution.
- Les lectures de média au moment de l'invite fonctionnent toujours car les outils de fichiers et de médias lisent via le pont du bac à sable au lieu de supposer un chemin d'hôte local.
- Le transport est SSH dans le bac à sable OpenShell renvoyé par `openshell sandbox ssh-config`.

Conséquences importantes :

- Si vous modifiez des fichiers sur l'hôte en dehors de OpenClaw après l'étape d'ensemencement, le bac à sable distant ne verra **pas** automatiquement ces modifications.
- Si le bac à sable est recréé, l'espace de travail distant est de nouveau ensemencé à partir de l'espace de travail local.
- Avec `scope: "agent"` ou `scope: "shared"`, cet espace de travail distant est partagé à cette même portée.

Utilisez ceci lorsque :

- le bac à sable doit résider principalement du côté distant OpenShell
- vous souhaitez réduire la charge de synchronisation à chaque tour
- vous ne voulez pas que les modifications locales écrasent silencieusement l'état distant du bac à sable

Choisissez `mirror` si vous considérez le bac à sable comme un environnement d'exécution temporaire.
Choisissez `remote` si vous considérez le bac à sable comme l'espace de travail réel.

## Cycle de vie OpenShell

Les bacs à sable OpenShell sont toujours gérés via le cycle de vie normal des bacs à sable :

- `openclaw sandbox list` affiche les runtimes OpenShell ainsi que les runtimes Docker
- `openclaw sandbox recreate` supprime le runtime actuel et permet à OpenClaw de le recréer à la prochaine utilisation
- la logique de nettoyage est également consciente du backend

Pour le mode `remote`, la recréation est particulièrement importante :

- la recréation supprime l'espace de travail distant canonique pour cette portée
- la prochaine utilisation initialise un nouvel espace de travail distant à partir de l'espace de travail local

Pour le mode `mirror`, la recréation réinitialise principalement l'environnement d'exécution distant
car l'espace de travail local reste de toute façon canonique.

## Accès à l'espace de travail

`agents.defaults.sandbox.workspaceAccess` contrôle **ce que le bac à sable peut voir** :

- `"none"` (par défaut) : les outils voient un espace de travail de bac à sable sous `~/.openclaw/sandboxes`.
- `"ro"` : monte l'espace de travail de l'agent en lecture seule sous `/agent` (désactive `write`/`edit`/`apply_patch`).
- `"rw"` : monte l'espace de travail de l'agent en lecture/écriture sous `/workspace`.

Avec le backend OpenShell :

- le mode `mirror` utilise toujours l'espace de travail local comme source canonique entre les tours d'exécution
- le mode `remote` utilise l'espace de travail distant OpenShell comme source canonique après l'initialisation initiale
- `workspaceAccess: "ro"` et `"none"` restreignent toujours le comportement en écriture de la même manière

Les supports entrants sont copiés dans l'espace de travail du sandbox actif (`media/inbound/*`).
Note Skills : l'outil `read` est raciné dans le sandbox. Avec `workspaceAccess: "none"`,
OpenClaw reflète les skills éligibles dans l'espace de travail du sandbox (`.../skills`) afin
qu'ils puissent être lus. Avec `"rw"`, les skills de l'espace de travail sont lisibles depuis
`/workspace/skills`.

## Montages de liaison personnalisés

`agents.defaults.sandbox.docker.binds` monte des répertoires hôtes supplémentaires dans le conteneur.
Format : `host:container:mode` (par exemple, `"/home/user/source:/source:rw"`).

Les liaisons globales et par agent sont **fusionnées** (et non remplacées). Sous `scope: "shared"`, les liaisons par agent sont ignorées.

`agents.defaults.sandbox.browser.binds` monte des répertoires hôtes supplémentaires uniquement dans le conteneur du **sandbox navigateur**.

- Lorsqu'il est défini (y compris `[]`), il remplace `agents.defaults.sandbox.docker.binds` pour le conteneur du navigateur.
- En cas d'omission, le conteneur du navigateur revient à `agents.defaults.sandbox.docker.binds` (rétrocompatible).

Exemple (source en lecture seule + un répertoire de données supplémentaire) :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: ["/home/user/source:/source:ro", "/var/data/myapp:/data:ro"],
        },
      },
    },
    list: [
      {
        id: "build",
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"],
          },
        },
      },
    ],
  },
}
```

Notes de sécurité :

- Les liaisons contournent le système de fichiers du sandbox : elles exposent les chemins de l'hôte avec le mode que vous avez défini (`:ro` ou `:rw`).
- OpenClaw bloque les sources de liaison dangereuses (par exemple : `docker.sock`, `/etc`, `/proc`, `/sys`, `/dev` et les montages parents qui les exposeraient).
- Les montages sensibles (secrets, clés SSH, identifiants de service) doivent être `:ro` sauf nécessité absolue.
- Combinez avec `workspaceAccess: "ro"` si vous n'avez besoin que d'un accès en lecture à l'espace de travail ; les modes de liaison restent indépendants.
- Voir [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) pour savoir comment les liaisons interagissent avec la stratégie d'outils et l'exécution élevée.

## Images + configuration

Image Docker par défaut : `openclaw-sandbox:bookworm-slim`

Construisez-la une fois :

```bash
scripts/sandbox-setup.sh
```

Remarque : l'image par défaut n'inclut **pas** Node. Si une compétence a besoin de Node (ou
d'autres environnements d'exécution), créez une image personnalisée ou installez-le via
`sandbox.docker.setupCommand` (nécessite un accès réseau sortant + un système de fichiers racine accessible en écriture +
utilisateur root).

Si vous souhaitez une image de sandbox plus fonctionnelle avec des outils courants (par exemple
`curl`, `jq`, `nodejs`, `python3`, `git`), générez-la :

```bash
scripts/sandbox-common-setup.sh
```

Définissez ensuite `agents.defaults.sandbox.docker.image` sur
`openclaw-sandbox-common:bookworm-slim`.

Image de navigateur isolée :

```bash
scripts/sandbox-browser-setup.sh
```

Par défaut, les conteneurs de sandbox Docker s'exécutent **sans réseau**.
Remplacez cela avec `agents.defaults.sandbox.docker.network`.

L'image de navigateur sandbox fournie applique également des paramètres de démarrage Chromium conservateurs
pour les charges de travail conteneurisées. Les paramètres de conteneur actuels incluent :

- `--remote-debugging-address=127.0.0.1`
- `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
- `--user-data-dir=${HOME}/.chrome`
- `--no-first-run`
- `--no-default-browser-check`
- `--disable-3d-apis`
- `--disable-gpu`
- `--disable-dev-shm-usage`
- `--disable-background-networking`
- `--disable-extensions`
- `--disable-features=TranslateUI`
- `--disable-breakpad`
- `--disable-crash-reporter`
- `--disable-software-rasterizer`
- `--no-zygote`
- `--metrics-recording-only`
- `--renderer-process-limit=2`
- `--no-sandbox` et `--disable-setuid-sandbox` lorsque `noSandbox` est activé.
- Les trois indicateurs de durcissement graphique (`--disable-3d-apis`,
  `--disable-software-rasterizer`, `--disable-gpu`) sont facultatifs et sont utiles
  lorsque les conteneurs ne prennent pas en charge le GPU. Définissez `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`
  si votre charge de travail nécessite WebGL ou d'autres fonctionnalités 3D/navigateur.
- `--disable-extensions` est activé par défaut et peut être désactivé avec
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` pour les flux dépendants des extensions.
- `--renderer-process-limit=2` est contrôlé par
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`, où `0` conserve la valeur par défaut de Chromium.

Si vous avez besoin d'un profil d'exécution différent, utilisez une image de navigateur personnalisée et fournissez votre propre point d'entrée. Pour les profils Chromium locaux (non conteneurisés), utilisez `browser.extraArgs` pour ajouter des indicateurs de démarrage supplémentaires.

Paramètres de sécurité par défaut :

- `network: "host"` est bloqué.
- `network: "container:<id>"` est bloqué par défaut (risque de contournement de la jointure d'espace de noms).
- Contournement de secours (break-glass) : `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.

Les installations Docker et la passerelle conteneurisée se trouvent ici :
[Docker](/fr/install/docker)

Pour les déploiements de passerelle Docker, `docker-setup.sh` peut amorcer la configuration du bac à sable.
Définissez `OPENCLAW_SANDBOX=1` (ou `true`/`yes`/`on`) pour activer ce chemin. Vous pouvez
remplacer l'emplacement du socket par `OPENCLAW_DOCKER_SOCKET`. Configuration complète et référence de l'environnement :
[Docker](/fr/install/docker#enable-agent-sandbox-for-docker-gateway-opt-in).

## setupCommand (configuration unique du conteneur)

`setupCommand` s'exécute **une seule fois** après la création du conteneur de bac à sable (pas à chaque exécution).
Il est exécuté à l'intérieur du conteneur via `sh -lc`.

Chemins :

- Global : `agents.defaults.sandbox.docker.setupCommand`
- Par agent : `agents.list[].sandbox.docker.setupCommand`

Pièges courants :

- Le `docker.network` par défaut est `"none"` (pas de trafic sortant), donc les installations de packages échoueront.
- `docker.network: "container:<id>"` nécessite `dangerouslyAllowContainerNamespaceJoin: true` et est réservé au contournement de secours (break-glass).
- `readOnlyRoot: true` empêche les écritures ; définissez `readOnlyRoot: false` ou créez une image personnalisée.
- `user` doit être root pour les installations de packages (omettez `user` ou définissez `user: "0:0"`).
- L'exécution dans le bac à sable n'hérite **pas** du `process.env` de l'hôte. Utilisez
  `agents.defaults.sandbox.docker.env` (ou une image personnalisée) pour les clés d'API de compétence.

## Stratégie d'outil + échappatoires

Les stratégies d'autorisation/refus d'outils s'appliquent toujours avant les règles du bac à sable. Si un outil est refusé
globalement ou par agent, le bac à sable ne le rétablira pas.

`tools.elevated` est une échappatoire explicite qui exécute `exec` sur l'hôte.
Les directives `/exec` ne s'appliquent que pour les expéditeurs autorisés et persistent par session ; pour désactiver `exec` de manière stricte, utilisez le refus de la stratégie de tool (voir [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)).

Débogage :

- Utilisez `openclaw sandbox explain` pour inspecter le mode de sandbox effectif, la stratégie de tool et les clés de configuration de réparation.
- Consultez [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) pour le modèle mental « pourquoi ceci est-il bloqué ? ».
  Gardez-le verrouillé.

## Remplacements multi-agent

Chaque agent peut remplacer le sandbox + les tools :
`agents.list[].sandbox` et `agents.list[].tools` (ainsi que `agents.list[].tools.sandbox.tools` pour la stratégie de tool du sandbox).
Consultez [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) pour la priorité.

## Exemple d'activation minimale

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
      },
    },
  },
}
```

## Documentation connexe

- [Sandbox Configuration](/fr/gateway/configuration#agentsdefaults-sandbox)
- [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools)
- [Security](/fr/gateway/security)

import fr from "/components/footer/fr.mdx";

<fr />
