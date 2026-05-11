---
summary: "ClawHub : registre public pour les compétences et plugins OpenClaw , flux d'installation natifs et le CLI clawhubCLI "
read_when:
  - Searching for, installing, or updating skills or plugins
  - Publishing skills or plugins to the registry
  - Configuring the clawhub CLI or its environment overrides
title: "ClawHub"
sidebarTitle: "ClawHub"
---

ClawHub est le registre public pour les **skills et plugins OpenClaw**.

- Utilisez les commandes natives `openclaw` pour rechercher, installer et mettre à jour des compétences, et pour installer des plugins depuis ClawHub.
- Utilisez le CLI `clawhub` séparé pour l'authentification au registre, la publication, la suppression/récupération et les workflows de synchronisation.

Site : [clawhub.ai](https://clawhub.ai)

## Quick start

<Steps>
  <Step title="Search">
    ```bash
    openclaw skills search "calendar"
    ```
  </Step>
  <Step title="Install">
    ```bash
    openclaw skills install <skill-slug>
    ```
  </Step>
  <Step title="Use">
    Démarrez une nouvelle session OpenClaw — elle détectera la nouvelle compétence.
  </Step>
  <Step title="Publish (optional)">
    Pour les workflows d'authentification au registre (publier, synchroniser, gérer), installez
    le CLI `clawhub` séparé :

    ```bash
    npm i -g clawhub
    # or
    pnpm add -g clawhub
    ```

  </Step>
</Steps>

## Flux natifs OpenClaw

<Tabs>
  <Tab title="Skills">
    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Les commandes natives `openclaw` s'installent dans votre espace de travail actif et
    conservent les métadonnées sources afin que les appels `update` ultérieurs puissent rester sur ClawHub.

  </Tab>
  <Tab title="Plugins">
    ```bash
    openclaw plugins install clawhub:<package>
    openclaw plugins update --all
    ```

    Les spécifications de plugin brutes compatibles npm sont également essayées sur ClawHub avant npm :

    ```bash
    openclaw plugins install openclaw-codex-app-server
    ```

    Utilisez `npm:<package>` lorsque vous souhaitez une résolution npm uniquement sans recherche
    sur ClawHub :

    ```bash
    openclaw plugins install npm:openclaw-codex-app-server
    ```

    Les installations de plugins valident la compatibilité `pluginApi` et
    `minGatewayVersion` annoncée avant l'exécution de l'installation de l'archive, donc
    les hôtes incompatibles échouent tôt de manière sécurisée au lieu d'installer partiellement
    le paquet.

  </Tab>
</Tabs>

<Note>
`openclaw plugins install clawhub:...` accepte uniquement les familles de plugins
installables. Si un paquet ClawHub est en réalité une compétence, OpenClaw s'arrête et
vous redirige vers `openclaw skills install <slug>` à la place.

Les installations anonymes de plugins ClawHub échouent également par défaut (fail closed) pour les paquets privés.
Les canaux communautaires ou autres non officiels peuvent toujours être installés, mais OpenClaw
avertit afin que les opérateurs puissent examiner la source et la vérification avant de les activer.

</Note>

## Qu'est-ce que ClawHub

- Un registre public pour les compétences et plugins OpenClaw.
- Un magasin versionné de bundles de compétences et de métadonnées.
- Une surface de découverte pour la recherche, les balises et les signaux d'utilisation.

Une compétence typique est un bundle versionné de fichiers qui comprend :

- Un fichier `SKILL.md` contenant la description principale et l'utilisation.
- Des configurations, scripts ou fichiers de support facultatifs utilisés par la compétence.
- Des métadonnées telles que les balises, le résumé et les exigences d'installation.

ClawHub utilise les métadonnées pour alimenter la découverte et exposer en toute sécurité les
capacités des compétences. Le registre suit les signaux d'utilisation (étoiles, téléchargements) pour
améliorer le classement et la visibilité. Chaque publication crée une nouvelle version semver,
et le registre conserve l'historique des versions afin que les utilisateurs puissent auditer les
modifications.

## Espace de travail et chargement des compétences

La CLI `clawhub` distincte installe également les compétences dans `./skills` sous
votre répertoire de travail actuel. Si un espace de travail OpenClaw est configuré,
`clawhub` revient à cet espace de travail sauf si vous remplacez `--workdir`
(ou `CLAWHUB_WORKDIR`). OpenClaw charge les compétences de l'espace de travail à partir de
`<workspace>/skills` et les récupère lors de la session **suivante**.

Si vous utilisez déjà `~/.openclaw/skills` ou des compétences groupées, les compétences de l'espace de travail
ont la priorité. Pour plus de détails sur la manière dont les compétences sont chargées,
partagées et filtrées, voir [Skills](/fr/tools/skills).

## Fonctionnalités du service

| Fonctionnalité             | Notes                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Navigation publique        | Les compétences et leur contenu `SKILL.md` sont visibles publiquement.                   |
| Recherche                  | Alimentée par l'intégration (recherche vectorielle), et pas seulement par des mots-clés. |
| Versionnage                | Semver, journaux des modifications et balises (y compris `latest`).                      |
| Téléchargements            | Zip par version.                                                                         |
| Étoiles et commentaires    | Retours de la communauté.                                                                |
| Modération                 | Approbations et audits.                                                                  |
| CLI conviviale pour la API | Convient pour l'automatisation et les scripts.                                           |

## Sécurité et modération

ClawHub est ouvert par défaut — tout le monde peut téléverser des compétences, mais un compte GitHub doit être **âgé d'au moins une semaine** pour publier. Cela ralentit les abus sans bloquer les contributeurs légitimes.

<AccordionGroup>
  <Accordion title="Signalement">- Tout utilisateur connecté peut signaler une compétence. - Les motifs de signalement sont requis et enregistrés. - Chaque utilisateur peut avoir jusqu'à 20 signalements actifs à la fois. - Les compétences ayant plus de 3 signalements uniques sont masquées automatiquement par défaut.</Accordion>
  <Accordion title="Modération">- Les modérateurs peuvent voir les compétences masquées, les révéler, les supprimer ou bannir des utilisateurs. - L'abus de la fonctionnalité de signalement peut entraîner des bannissements de compte. - Vous souhaitez devenir modérateur ? Demandez sur le OpenClaw Discord et contactez un modérateur ou un mainteneur.</Accordion>
</AccordionGroup>

## ClawHub CLI

Vous n'en avez besoin que pour les flux de travail authentifiés par le registre, tels que publish/sync.

### Options globales

<ParamField path="--workdir <dir>" type="string">
  Répertoire de travail. Par défaut : répertoire actuel ; revient à l'espace de travail OpenClaw.
</ParamField>
<ParamField path="--dir <dir>" type="string" default="skills">
  Répertoire des compétences, relatif au répertoire de travail.
</ParamField>
<ParamField path="--site <url>" type="string">
  URL de base du site (connexion navigateur).
</ParamField>
<ParamField path="--registry <url>" type="string">
  URL de base de l'API du registre.
</ParamField>
<ParamField path="--no-input" type="boolean">
  Désactiver les invites (non-interactif).
</ParamField>
<ParamField path="-V, --cli-version" type="boolean">
  Afficher la version du CLI.
</ParamField>

### Commandes

<AccordionGroup>
  <Accordion title="Auth (login / logout / whoami)">
    ```bash
    clawhub login              # browser flow
    clawhub login --token <token>
    clawhub logout
    clawhub whoami
    ```

    Options de connexion :

    - `--token <token>` — coller un jeton d'API.
    - `--label <label>` — libellé stocké pour les jetons de connexion navigateur (par défaut : `CLI token`).
    - `--no-browser` — ne pas ouvrir de navigateur (nécessite `--token`).

  </Accordion>
  <Accordion title="Recherche">
    ```bash
    clawhub search "query"
    ```

    - `--limit <n>` — résultats max.

  </Accordion>
  <Accordion title="Installer / mettre à jour / lister">
    ```bash
    clawhub install <slug>
    clawhub update <slug>
    clawhub update --all
    clawhub list
    ```

    Options :

    - `--version <version>` — installer ou mettre à jour vers une version spécifique (slug unique uniquement sur `update`).
    - `--force` — écraser si le dossier existe déjà, ou lorsque les fichiers locaux ne correspondent à aucune version publiée.
    - `clawhub list` lit `.clawhub/lock.json`.

  </Accordion>
  <Accordion title="Publier des compétences">
    ```bash
    clawhub skill publish <path>
    ```

    Options :

    - `--slug <slug>` — slug de la compétence.
    - `--name <name>` — nom d'affichage.
    - `--version <version>` — version semver.
    - `--changelog <text>` — texte du journal des modifications (peut être vide).
    - `--tags <tags>` — balises séparées par des virgules (par défaut : `latest`).

  </Accordion>
  <Accordion title="Publier des plugins">
    ```bash
    clawhub package publish <source>
    ```

    `<source>` peut être un dossier local, `owner/repo`, `owner/repo@ref`, ou une
    URL GitHub.

    Options :

    - `--dry-run` — construire le plan de publication exact sans rien télécharger.
    - `--json` — générer une sortie lisible par machine pour CI.
    - `--source-repo`, `--source-commit`, `--source-ref` — substitutions optionnelles lorsque la détection automatique ne suffit pas.

  </Accordion>
  <Accordion title="Supprimer / restaurer (propriétaire ou administrateur)">
    ```bash
    clawhub delete <slug> --yes
    clawhub undelete <slug> --yes
    ```
  </Accordion>
  <Accordion title="Sync (scan local + publish new or updated)">
    ```bash
    clawhub sync
    ```

    Options :

    - `--root <dir...>` — racines d'analyse supplémentaires.
    - `--all` — tout télécharger sans confirmation.
    - `--dry-run` — montrer ce qui serait téléchargé.
    - `--bump <type>` — `patch|minor|major` pour les mises à jour (par défaut : `patch`).
    - `--changelog <text>` — journal des modifications pour les mises à jour non interactives.
    - `--tags <tags>` — balises séparées par des virgules (par défaut : `latest`).
    - `--concurrency <n>` — vérifications du registre (par défaut : `4`).

  </Accordion>
</AccordionGroup>

## Workflows courants

<Tabs>
  <Tab title="Search">```bash clawhub search "postgres backups" ```</Tab>
  <Tab title="Install">```bash clawhub install my-skill-pack ```</Tab>
  <Tab title="Update all">```bash clawhub update --all ```</Tab>
  <Tab title="Publish a single skill">```bash clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest ```</Tab>
  <Tab title="Sync many skills">```bash clawhub sync --all ```</Tab>
  <Tab title="Publish a plugin from GitHub">```bash clawhub package publish your-org/your-plugin --dry-run clawhub package publish your-org/your-plugin clawhub package publish your-org/your-plugin@v1.0.0 clawhub package publish https://github.com/your-org/your-plugin ```</Tab>
</Tabs>

### Métadonnées du package de plugin

Les plugins de code doivent inclure les métadonnées requises OpenClaw dans
`package.json` :

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2",
      "minGatewayVersion": "2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2",
      "pluginSdkVersion": "2026.3.24-beta.2"
    }
  }
}
```

Les packages publiés doivent livrer du **JavaScript compilé** et faire pointer
`runtimeExtensions` vers cette sortie. Les installations via extraction Git peuvent toujours revenir
aux sources TypeScript lorsque aucun fichier compilé n'existe, mais les entrées d'exécution compilées évitent la
compilation TypeScript à l'exécution lors du démarrage, du diagnostic et des chemins de chargement de plugins.

## Versioning, lockfile, and telemetry

<AccordionGroup>
  <Accordion title="Versioning and tags">
    - Chaque publication crée une nouvelle version **semver** `SkillVersion`.
    - Les balises (comme `latest`) pointent vers une version ; déplacer les balises vous permet de revenir en arrière.
    - Les journaux des modifications sont attachés par version et peuvent être vides lors de la synchronisation ou de la publication de mises à jour.
  </Accordion>
  <Accordion title="Local changes vs registry versions">
    Les mises à jour comparent le contenu de la compétence locale aux versions du registre à l'aide d'un
    hachage de contenu. Si les fichiers locaux ne correspondent à aucune version publiée, la
    CLI demande confirmation avant d'écraser (ou nécessite `--force` dans
    les exécutions non interactives).
  </Accordion>
  <Accordion title="Sync scanning and fallback roots">
    `clawhub sync` analyse d'abord votre répertoire de travail actuel. Si aucune compétence n'est
    trouvée, elle revient aux emplacements hérités connus (par exemple
    `~/openclaw/skills` et `~/.openclaw/skills`). Ceci est conçu pour
    trouver les anciennes installations de compétences sans drapeaux supplémentaires.
  </Accordion>
  <Accordion title="Storage and lockfile">
    - Les compétences installées sont enregistrées dans `.clawhub/lock.json` sous votre répertoire de travail.
    - Les jetons d'authentification sont stockés dans le fichier de configuration de la ClawHub CLI (remplaçable via `CLAWHUB_CONFIG_PATH`).
  </Accordion>
  <Accordion title="Telemetry (install counts)">
    Lorsque vous exécutez `clawhub sync` alors que vous êtes connecté, la CLI envoie un
    instantané minimal pour calculer les nombres d'installations. Vous pouvez désactiver ceci entièrement :

    ```bash
    export CLAWHUB_DISABLE_TELEMETRY=1
    ```

  </Accordion>
</AccordionGroup>

## Variables d'environnement

| Variable                      | Effet                                                               |
| ----------------------------- | ------------------------------------------------------------------- |
| `CLAWHUB_SITE`                | Remplacer l'URL du site.                                            |
| `CLAWHUB_REGISTRY`            | Remplacer l'URL de l'API du registre.                               |
| `CLAWHUB_CONFIG_PATH`         | Remplacer l'emplacement où la CLI stocke le jeton/la configuration. |
| `CLAWHUB_WORKDIR`             | Remplacer le répertoire de travail par défaut.                      |
| `CLAWHUB_DISABLE_TELEMETRY=1` | Désactiver la télémétrie sur `sync`.                                |

## Connexes

- [Plugins communautaires](/fr/plugins/community)
- [Plugins](/fr/tools/plugin)
- [Compétences](/fr/tools/skills)
