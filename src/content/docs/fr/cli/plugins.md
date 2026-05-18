---
summary: "CLIRéférence CLI pour `openclaw plugins` (init, build, validate, list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to scaffold or validate a simple tool plugin
  - You want to debug plugin load failures
title: "Plugins"
sidebarTitle: "Plugins"
---

Gérer les plugins Gateway, les packs de hooks et les bundles compatibles.

<CardGroup cols={2}>
  <Card title="Plugin system" href="/fr/tools/plugin">
    Guide de l'utilisateur final pour l'installation, l'activation et le troubleshooting des plugins.
  </Card>
  <Card title="Manage plugins" href="/fr/plugins/manage-plugins">
    Exemples rapides pour l'installation, la liste, la mise à jour, la désinstallation et la publication.
  </Card>
  <Card title="Plugin bundles" href="/fr/plugins/bundles">
    Modèle de compatibilité des bundles.
  </Card>
  <Card title="Plugin manifest" href="/fr/plugins/manifest">
    Champs du manifeste et schéma de configuration.
  </Card>
  <Card title="Security" href="/fr/gateway/security">
    Renforcement de la sécurité pour l'installation des plugins.
  </Card>
</CardGroup>

## Commandes

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
openclaw plugins init <id>
openclaw plugins init <id> --directory ./my-plugin --name "My Plugin"
openclaw plugins build --entry ./dist/index.js
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
```

Pour une investigation lente lors de l'installation, de l'inspection, de la désinstallation ou de l'actualisation du registre, exécutez la
commande avec `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1`. Le traceur écrit les timings de phase
vers stderr et maintient la sortie JSON analysable. Voir [Debugging](/fr/help/debugging#plugin-lifecycle-trace).

<Note>En mode Nix (`OPENCLAW_NIX_MODE=1`), les mutateurs du cycle de vie des plugins sont désactivés. Utilisez la source Nix pour cette installation au lieu de `plugins install`, `plugins update`, `plugins uninstall`, `plugins enable`, ou `plugins disable` ; pour nix-openclaw, utilisez le [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) avec agent en premier.</Note>

<Note>
Les plugins groupés sont fournis avec OpenClaw. Certains sont activés par défaut (par exemple les fournisseurs de modèle groupés, les fournisseurs de synthèse vocale groupés et le plugin de navigateur groupé) ; d'autres nécessitent OpenClaw`plugins enable`OpenClaw.

Les plugins natifs OpenClaw doivent être fournis `openclaw.plugin.json` avec un schéma JSON en ligne (`configSchema`, même s'il est vide). Les bundles compatibles utilisent leurs propres manifestes de bundle à la place.

`plugins list` affiche `Format: openclaw` ou `Format: bundle`. La sortie de liste/info détaillée affiche également le sous-type de bundle (`codex`, `claude` ou `cursor`) ainsi que les capacités du bundle détectées.

</Note>

### Auteur

```bash
openclaw plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm run plugin:build
npm run plugin:validate
```

`plugins init` crée un plugin d'outil TypeScript minimal qui utilise
`defineToolPlugin`. `plugins build` importe cette entrée, lit ses métadonnées d'outil
statiques, écrit `openclaw.plugin.json` et maintient `package.json`
`openclaw.extensions` alignés. `plugins validate` vérifie que le manifeste
généré, les métadonnées du package et l'exportation de l'entrée actuelle sont toujours en accord. Voir
[Tool Plugins](/fr/plugins/tool-plugins) pour le flux de travail complet de création.

L'échafaudage écrit le source TypeScript mais génère les métadonnées à partir de l'entrée construite
`./dist/index.js`CLI, donc le flux de travail fonctionne également avec le CLI publié. Utilisez
`--entry <path>` lorsque l'entrée n'est pas l'entrée par défaut du package. Utilisez
`plugins build --check` dans CI pour échouer lorsque les métadonnées générées sont obsolètes sans
réécrire les fichiers.

### Installer

```bash
openclaw plugins search "calendar"                   # search ClawHub plugins
openclaw plugins install <package>                      # npm by default
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install npm:<package>                  # npm only
openclaw plugins install npm-pack:<path.tgz>            # local npm pack through npm install semantics
openclaw plugins install git:github.com/<owner>/<repo>  # git repo
openclaw plugins install git:github.com/<owner>/<repo>@<ref>
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

Les mainteneurs testant les installations au moment de la configuration peuvent remplacer les sources d'installation automatique des plugins par des variables d'environnement protégées. Voir
[Plugin install overrides](/fr/plugins/install-overrides).

<Warning>
Les noms de packages simples s'installent à partir de npm par défaut lors du basculement de lancement. Utilisez npm`clawhub:<package>`ClawHub pour ClawHub. Traitez les installations de plugins comme l'exécution de code. Préférez les versions épinglées.
</Warning>

`plugins search` interroge ClawHub pour trouver des packages de plugins installables et affiche
les noms des packages prêts à l'installation. Il recherche les packages code-plugin et bundle-plugin,
mais pas les compétences. Utilisez `openclaw skills search` pour les compétences ClawHub.

<Note>
  ClawHub est la surface principale de distribution et de découverte pour la plupart des plugins. OpenClaw reste une solution de repli prise en charge et un chemin d'installation directe. Les packages de plugins `@openclaw/*` détenus par npm sont à nouveau publiés sur npm ; consultez la liste actuelle sur [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) ou l'[inventaire de
  plugins](/fr/plugins/plugin-inventory). Les installations stables utilisent `latest`. Les installations et mises à jour de la version bêta préfèrent le dist-tag `beta` de npm lorsque cette étiquette est disponible, puis reviennent à `latest`.
</Note>

<AccordionGroup>
  <Accordion title="Config includes and invalid-config repair">
    Si votre section `plugins` est sauvegardée par un `$include` à fichier unique, `plugins install/update/enable/disable/uninstall` écrit directement dans ce fichier inclus et laisse `openclaw.json` intact. Les inclusions racines, les tableaux d'inclusions et les inclusions avec des remplacements frères échouent en mode fermé au lieu de s'aplatir. Voir [Config includes](/fr/gateway/configuration) pour les formes prises en charge.

    Si la configuration est invalide lors de l'installation, `plugins install` échoue normalement en mode fermé et vous demande d'exécuter d'abord `openclaw doctor --fix`. Lors du démarrage et du rechargement à chaud de Gateway, la configuration invalide du plugin échoue en mode fermé comme toute autre configuration invalide ; `openclaw doctor --fix` peut mettre en quarantaine l'entrée de plugin invalide. La seule exception documentée au moment de l'installation est un chemin de récupération étroit pour les plugins groupés qui ont explicitement opté pour `openclaw.install.allowInvalidConfigRecovery`.

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` réutilise la cible d'installation existante et écrase un plugin ou un pack de hooks déjà installé sur place. Utilisez-le lorsque vous réinstallez intentionnellement le même identifiant depuis un nouveau chemin local, une archive, un package ClawHub ou un artefact npm. Pour les mises à niveau de routine d'un plugin npm déjà suivi, préférez `openclaw plugins update <id-or-npm-spec>`.

    Si vous exécutez `plugins install` pour un identifiant de plugin déjà installé, OpenClaw s'arrête et vous dirige vers `plugins update <id-or-npm-spec>` pour une mise à niveau normale, ou vers `plugins install <package> --force` lorsque vous souhaitez vraiment écraser l'installation actuelle à partir d'une source différente.

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` s'applique uniquement aux installations npm. Il n'est pas pris en charge avec les installations `git:` ; utilisez une référence git explicite telle que `git:github.com/acme/plugin@v1.2.3` lorsque vous souhaitez une source épinglée. Il n'est pas pris en charge avec `--marketplace`, car les installations à partir de la marketplace persistent les métadonnées de source de la marketplace au lieu d'une spécification npm.
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` est une option de dernier recours pour les faux positifs dans l'analyseur de code dangereux intégré. Elle permet à l'installation de se poursuivre même lorsque l'analyseur intégré signale des résultats `critical`, mais elle ne contourne **pas** les blocages de stratégie de hook de plugin `before_install` et ne contourne **pas** les échecs d'analyse.

    Les analyses d'installation ignorent les fichiers de test et les répertoires courants tels que `tests/`, `__tests__/`, `*.test.*` et `*.spec.*` pour éviter de bloquer les simulations de test empaquetées ; les points d'entrée d'exécution de plugin déclarés sont toujours analysés même s'ils utilisent l'un de ces noms.

    Cet indicateur de CLI s'applique aux flux d'installation/de mise à jour de plugin. Les installations de dépendances de compétences prises en charge par Gateway utilisent la substitution de requête correspondante `dangerouslyForceUnsafeInstall`, tandis que `openclaw skills install` reste un flux de téléchargement/installation de compétences distinct pour ClawHub.

    Si un plugin que vous avez publié sur ClawHub est masqué ou bloqué par une analyse de registre, suivez les étapes de publication dans [ClawHub publishing](/fr/clawhub/publishing). `--dangerously-force-unsafe-install` n'affecte que les installations sur votre propre machine ; il ne demande pas à ClawHub de réanalyser le plugin ni de rendre une version bloquée publique.

  </Accordion>
  <Accordion title="Hook packs et spécifications npm">
    `plugins install` est également la surface d'installation pour les hook packs qui exposent `openclaw.hooks` dans `package.json`. Utilisez `openclaw hooks` pour la visibilité filtrée des hooks et l'activation par hook, et non pour l'installation de packages.

    Les spécifications npmnpm sont **uniquement de registre** (nom du package + **version exacte** facultative ou **dist-tag**). Les spécifications Git/URL/fichier et les plages semver sont rejetées. Les installations de dépendances s'exécutent localement dans le projet avec `--ignore-scripts` pour la sécurité, même si votre shell dispose de paramètres d'installation OpenClaw globaux. Les racines npm des plugins gérés héritent des `overrides` npm au niveau du package de npmOpenClaw, donc les épingles de sécurité de l'hôte s'appliquent également aux dépendances de plugins hissées.

    Utilisez `npm:<package>`npmOpenClaw lorsque vous souhaitez rendre la résolution OpenClaw explicite. Les spécifications de package nues installent également directement depuis npm lors du basculement de lancement.

    Les spécifications nues et `@latest` restent sur la voie stable. Les versions de correction datées de npm telles que `2026.5.3-1`npm sont des versions stables pour cette vérification. Si npm résout l'une ou l'autre vers une préversion, npm s'arrête et vous demande d'accepter explicitement avec une balise de préversion telle que `@beta`/`@rc` ou une version de préversion exacte telle que `@1.2.3-beta.4`.

    Si une spécification d'installation nue correspond à un identifiant de plugin officiel (par exemple `diffs`), npmnpm installe directement l'entrée du catalogue. Pour installer un package npm du même nom, utilisez une spécification délimitée explicite (par exemple `@scope/diffs`).

  </Accordion>
  <Accordion title="Dépôts Git">
    Utilisez `git:<repo>` pour installer directement depuis un dépôt git. Les formats pris en charge incluent `git:github.com/owner/repo`, `git:owner/repo`, le `https://` complet, `ssh://`, `git://`, `file://` et les URL de clone `git@host:owner/repo.git`. Ajoutez `@<ref>` ou `#<ref>` pour extraire une branche, une balise ou un commit avant l'installation.

    Les installations Git clonent dans un répertoire temporaire, extraient la référence demandée si elle est présente, puis utilisent le programme d'installation normal du répertoire de plugins. Cela signifie que la validation du manifeste, l'analyse de code dangereux, le travail d'installation du gestionnaire de packages et les enregistrements d'installation se comportent comme les installations npm. Les installations git enregistrées incluent l'URL/référence source plus le commit résolu afin que `openclaw plugins update` puisse résoudre à nouveau la source plus tard.

    Après l'installation depuis git, utilisez `openclaw plugins inspect <id> --runtime --json` pour vérifier les enregistrements d'exécution tels que les méthodes de passerelle et les commandes CLI. Si le plugin a enregistré une racine CLI avec `api.registerCli`, exécutez cette commande directement via la racine OpenClaw de CLI, par exemple `openclaw demo-plugin ping`.

  </Accordion>
  <Accordion title="Archives">
    Archives prises en charge : `.zip`, `.tgz`, `.tar.gz`, `.tar`. Les archives de plugins natifs OpenClaw doivent contenir un `openclaw.plugin.json` valide à la racine du plugin extrait ; les archives qui ne contiennent que `package.json` sont rejetées avant que OpenClaw n'écrive les enregistrements d'installation.

    Utilisez `npm-pack:<path.tgz>` lorsque le fichier est une archive tar npm et que vous souhaitez
    tester le même chemin d'installation géré à la racine npm utilisé par les installations de registre,
    y compris la vérification `package-lock.json`, l'analyse des dépendances hissées et
    les enregistrements d'installation npm. Les chemins d'archives simples s'installent toujours en tant qu'archives locales
    sous la racine des extensions de plugins.

    Les installations à partir du marketplace Claude sont également prises en charge.

  </Accordion>
</AccordionGroup>

Les installations ClawHub utilisent un localisateur `clawhub:<package>` explicite :

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

Les spécifications de plugins nues et npm-safe s'installent à partir de npm par défaut lors du basculement au lancement :

```bash
openclaw plugins install openclaw-codex-app-server
```

Utilisez `npm:` pour rendre la résolution npm-only explicite :

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw vérifie l'API de plugin annoncée / la compatibilité minimale de la passerelle avant l'installation. Lorsque la version ClawHub sélectionnée publie un artefact ClawPack, OpenClaw télécharge le npm-pack versionné OpenClawAPIClawHubOpenClawnpm`.tgz`ClawHubClawHubClawHubnpmnpmClawHub, vérifie l'en-tête de digest ClawHub et le digest de l'artefact, puis l'installe via le chemin d'archive normal. Les anciennes versions ClawHub sans métadonnées ClawPack s'installent toujours via le chemin de vérification d'archive de package hérité. Les installations enregistrées conservent leurs métadonnées source ClawHub, le type d'artefact, l'intégrité npm, le shasum npm, le nom de la tarball et les faits de digest ClawPack pour les mises à jour ultérieures.
Les installations ClawHub non versionnées conservent une spécification enregistrée non versionnée pour que `openclaw plugins update`ClawHub puisse suivre les nouvelles versions ClawHub ; les sélecteurs de version ou de balise explicites tels que `clawhub:pkg@1.2.3` et `clawhub:pkg@beta` restent épinglés à ce sélecteur.

#### Abréviation de la marketplace

Utilisez l'abréviation `plugin@marketplace` lorsque le nom de la marketplace existe dans le cache du registre local de Claude à `~/.claude/plugins/known_marketplaces.json` :

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Utilisez `--marketplace` lorsque vous souhaitez transmettre explicitement la source de la marketplace :

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Sources de la marketplace">
    - un nom de marketplace connue de Claude provenant de `~/.claude/plugins/known_marketplaces.json`
    - un chemin racine de marketplace local ou `marketplace.json`GitHub
    - une abréviation de dépôt GitHub telle que `owner/repo`GitHub
    - une URL de dépôt GitHub telle que `https://github.com/owner/repo`
    - une URL git

  </Tab>
  <Tab title="Règles de place de marché distante"GitHubOpenClawGitHub>
    Pour les places de marché distantes chargées depuis GitHub ou git, les entrées de plugins doivent rester à l'intérieur du dépôt de la place de marché cloné. OpenClaw accepte les sources de chemin relatif de ce dépôt et rejette les sources de plugins HTTP(S), chemin absolu, git, GitHub et d'autres sources non chemin à partir de manifestes distants.
  </Tab>
</Tabs>

Pour les chemins locaux et les archives, OpenClaw détecte automatiquement :

- plugins natifs OpenClaw (OpenClaw`openclaw.plugin.json`)
- bundles compatibles Codex (`.codex-plugin/plugin.json`)
- bundles compatibles Claude (`.claude-plugin/plugin.json` ou la disposition par défaut des composants Claude)
- bundles compatibles Cursor (`.cursor-plugin/plugin.json`)

<Note>
  Les bundles compatibles s'installent dans la racine normale des plugins et participent au même flux de liste/info/activation/désactivation. Aujourd'hui, les compétences de bundle, les compétences de commande Claude, les valeurs par défaut Claude `settings.json`, les valeurs par défaut Claude `.lsp.json` / `lspServers` déclarées dans le manifeste, les compétences de commande Cursor et les
  répertoires de hooks Codex compatibles sont pris en charge ; d'autres capacités de bundle détectées sont affichées dans les diagnostics/info mais ne sont pas encore intégrées à l'exécution runtime.
</Note>

### Liste

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
```

<ParamField path="--enabled" type="boolean">
  Afficher uniquement les plugins activés.
</ParamField>
<ParamField path="--verbose" type="boolean">
  Passer de la vue tableau à des lignes de détail par plugin avec les métadonnées source/origine/version/activation.
</ParamField>
<ParamField path="--json" type="boolean">
  Inventaire lisible par machine ainsi que diagnostics de registre et état d'installation des dépendances de package.
</ParamField>

<Note>
`plugins list`Gateway lit d'abord le registre local persistant des plugins, avec un repli dérivé uniquement à partir du manifeste lorsque le registre est manquant ou non valide. C'est utile pour vérifier si un plugin est installé, activé et visible pour la planification du démarrage à froid, mais ce n'est pas une sonde d'exécution en direct d'un processus Gateway déjà en cours d'exécution. Après avoir modifié le code du plugin, l'activation, la stratégie de hook ou `plugins.load.paths`Gateway, redémarrez le Gateway qui sert le channel avant de vous attendre à ce que le nouveau code `register(api)` ou les nouveaux hooks s'exécutent. Pour les déploiements distants/conteneurisés, vérifiez que vous redémarrez bien le processus enfant `openclaw gateway run` réel, et non seulement un processus enveloppe.

`plugins list --json` inclut les `dependencyStatus` de chaque plugin à partir de `package.json`
`dependencies` et `optionalDependencies`OpenClaw. OpenClaw vérifie si ces noms de
packages sont présents le long du chemin de recherche Node `node_modules` normal du plugin ; il
n'importe pas le code d'exécution du plugin, n'exécute pas un gestionnaire de packages, et ne répare pas les
dépendances manquantes.

</Note>

`plugins search`ClawHubClawHub est une recherche distante dans le catalogue ClawHub. Il n'inspecte pas l'état
local, ne mute pas la configuration, n'installe pas de packages, ni ne charge le code d'exécution du plugin. Les résultats de
recherche incluent le nom du package ClawHub, la famille, le channel, la version, le résumé, et
une indication d'installation telle que `openclaw plugins install clawhub:<package>`.

Pour le travail sur des plugins groupés dans une image Docker empaquetée, montez en bind le répertoire source du
plugin par-dessus le chemin source empaqueté correspondant, tel que
Docker`/app/extensions/synology-chat`OpenClaw. OpenClaw découvrira cette superposition source
montée avant `/app/dist/extensions/synology-chat` ; un répertoire source copié
simplement reste inerte, donc les installations empaquetées normales utilisent toujours le dist compilé.

Pour le débogage des hooks d'exécution :

- `openclaw plugins inspect <id> --runtime --json` affiche les hooks enregistrés et les diagnostics à partir d'une passe d'inspection par chargement de module. L'inspection d'exécution n'installe jamais les dépendances ; utilisez `openclaw doctor --fix` pour nettoyer l'état des dépendances héritées ou récupérer les plugins téléchargeables manquants qui sont référencés par la configuration.
- `openclaw gateway status --deep --require-rpc` confirme l'URL/le profil Gateway accessible, les indices de service/processus, le chemin de configuration et l'état de santé RPC.
- Les hooks de conversation non regroupés (`llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize`, `agent_end`) nécessitent `plugins.entries.<id>.hooks.allowConversationAccess=true`.

Utilisez `--link` pour éviter de copier un répertoire local (ajoute à `plugins.load.paths`) :

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` n'est pas pris en charge avec `--link` car les installations liées réutilisent le chemin source au lieu de copier vers une cible d'installation gérée.

Utilisez `--pin` sur les installations npm pour enregistrer la spécification exacte résolue (`name@version`) dans l'index de plugins géré tout en gardant le comportement par défaut non épinglé.

</Note>

### Index des plugins

Les métadonnées d'installation des plugins sont un état géré par la machine, et non une configuration utilisateur. Les installations et les mises à jour les écrivent dans `plugins/installs.json` sous le répertoire d'état OpenClaw actif. Sa carte `installRecords` de niveau supérieur est la source durable des métadonnées d'installation, y compris les enregistrements pour les manifestes de plugin cassés ou manquants. Le tableau `plugins` est le cache de registre à froid dérivé du manifeste. Le fichier comprend un avertissement de ne pas modifier et est utilisé par `openclaw plugins update`, la désinstallation, les diagnostics et le registre de plugins à froid.

Lorsque OpenClaw détecte des enregistrements `plugins.installs` hérités livrés dans la configuration, les lectures à l'exécution les traitent comme des entrées de compatibilité sans réécrire `openclaw.json`. Les écritures explicites de plugins et `openclaw doctor --fix` déplacent ces enregistrements vers l'index des plugins et suppriment la clé de configuration lorsque les écritures de configuration sont autorisées ; si l'une ou l'autre des écritures échoue, les enregistrements de configuration sont conservés afin que les métadonnées d'installation ne soient pas perdues.

### Désinstaller

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` supprime les enregistrements de plugins de `plugins.entries`, de l'index persistant des plugins, des entrées de la liste d'autorisation/d'interdiction de plugins, et des entrées `plugins.load.paths` liées le cas échéant. Sauf si `--keep-files` est défini, la désinstallation supprime également le répertoire d'installation géré suivi lorsqu'il se trouve à la racine des extensions de plugin de OpenClaw. Pour les plugins à mémoire active, l'emplacement mémoire est réinitialisé à `memory-core`.

<Note>`--keep-config` est pris en charge en tant qu'alias obsolète pour `--keep-files`.</Note>

### Mettre à jour

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

Les mises à jour s'appliquent aux installations de plugins suivies dans l'index géré des plugins et aux installations de packs de hooks suivies dans `hooks.internal.installs`.

<AccordionGroup>
  <Accordion title="Résolution de l'id de plugin vs spec npm">
    Lorsque vous passez un id de plugin, OpenClaw réutilise la spécification d'installation enregistrée pour ce plugin. Cela signifie que les balises de distribution (dist-tags) précédemment stockées telles que `@beta` et les versions épinglées exactes continuent d'être utilisées lors des exécutions ultérieures de `update <id>`.

    Pour les installations npm, vous pouvez également passer une spécification explicite de package npm avec une balise de distribution ou une version exacte. OpenClaw résout ce nom de package vers l'enregistrement de plugin suivi, met à jour ce plugin installé, et enregistre la nouvelle spécification npm pour les futures mises à jour basées sur l'id.

    Passer le nom du package npm sans version ni balise résout également vers l'enregistrement de plugin suivi. Utilisez ceci lorsqu'un plugin a été épinglé à une version exacte et que vous souhaitez le ramener à la ligne de publication par défaut du registre.

  </Accordion>
  <Accordion title="Mises à jour du canal bêta">
    `openclaw plugins update` réutilise la spécification du plugin suivie, sauf si vous passez une nouvelle spécification. `openclaw update` connaît également le canal de mise à jour OpenClaw actif : sur le canal bêta, les enregistrements de plugins par défaut de npm et ClawHub essaient `@beta` en premier. Ils reviennent à la spécification par défaut/dernière enregistrée si aucune version bêta du plugin n'existe ; les plugins npm reviennent également lorsque le paquet bêta existe mais échoue à la validation de l'installation. Ce retour est signalé comme un avertissement et n'échoue pas la mise à jour principale. Les versions exactes et les balises explicites restent épinglées à ce sélecteur.

  </Accordion>
  <Accordion title="Vérifications des versions et dérive de l'intégrité">
    Avant une mise à jour en direct npm, OpenClaw vérifie la version du paquet installé par rapport aux métadonnées du registre npm. Si la version installée et l'identité de l'artefact enregistré correspondent déjà à la cible résolue, la mise à jour est ignorée sans téléchargement, réinstallation ou réécriture de `openclaw.json`.

    Lorsqu'un hachage d'intégrité stocké existe et que le hachage de l'artefact récupéré change, OpenClaw considère cela comme une dérive de l'artefact npm. La commande interactive `openclaw plugins update` imprime les hachages attendus et réels et demande une confirmation avant de procéder. Les assistants de mise à jour non interactifs échouent en mode fermé, sauf si l'appelant fournit une politique de continuation explicite.

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install lors de la mise à jour">
    `--dangerously-force-unsafe-install` est également disponible sur `plugins update` en tant que substitution de secours pour les faux positifs de l'analyse de code dangereux intégrée lors des mises à jour de plugins. Il ne contourne toujours pas les blocs de stratégie `before_install` du plugin ou le blocage en cas d'échec de l'analyse, et il s'applique uniquement aux mises à jour de plugins, pas aux mises à jour des hook-packs.
  </Accordion>
</AccordionGroup>

### Inspecter

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspect affiche l'identité, l'état de chargement, la source, les capacités du manifeste, les indicateurs de stratégie, les diagnostics, les métadonnées d'installation, les capacités du bundle, et toute prise en charge détectée des serveurs MCP ou LSP sans importer le runtime du plugin par défaut. Ajoutez `--runtime` pour charger le module du plugin et inclure les hooks, outils, commandes, services, méthodes de passerelle et routes HTTP enregistrés. L'inspection du runtime signale directement les dépendances manquantes du plugin ; les installations et les réparations restent dans `openclaw plugins install`, `openclaw plugins update` et `openclaw doctor --fix`.

Les commandes CLI appartenant au plugin sont généralement installées en tant que groupes de commandes racine CLI`openclaw`, mais les plugins peuvent également enregistrer des commandes imbriquées sous un parent principal tel que `openclaw nodes`. Une fois que `inspect --runtime` affiche une commande sous `cliCommands`, exécutez-la sur le chemin indiqué ; par exemple, un plugin qui enregistre `demo-git` peut être vérifié avec `openclaw demo-git ping`.

Chaque plugin est classé selon ce qu'il enregistre réellement au moment de l'exécution :

- **plain-capability** — un seul type de capacité (ex: un plugin uniquement provider)
- **hybrid-capability** — plusieurs types de capacités (ex: texte + parole + images)
- **hook-only** — uniquement des hooks, aucune capacité ou surface
- **non-capability** — outils/commandes/services mais aucune capacité

Voir [Plugin shapes](/fr/plugins/architecture#plugin-shapes) pour plus d'informations sur le modèle de capacité.

<Note>L'indicateur `--json` génère un rapport lisible par machine adapté au scriptage et à l'audit. `inspect --all` affiche un tableau à l'échelle de la flotte avec des colonnes pour la forme, les types de capacités, les avis de compatibilité, les capacités du bundle et le résumé des hooks. `info` est un alias pour `inspect`.</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` signale les erreurs de chargement de plugins, les diagnostics de manifeste/découverte, les avis de compatibilité et les références de configuration de plugin obsolètes telles que les emplacements de plugin manquants. Lorsque l'arbre d'installation et la configuration du plugin sont propres, il imprime `No plugin issues detected.` Si une configuration obsolète reste mais que l'arbre d'installation est par ailleurs sain, le résumé l'indique au lieu d'impliquer une santé complète du plugin.

Si un plugin configuré est présent sur le disque mais bloqué par les vérifications de sécurité du chemin du chargeur, la validation de la configuration conserve l'entrée du plugin et le signale comme `present but blocked`. Corrigez le diagnostic de plugin bloqué précédent, tel que la propriété du chemin ou les autorisations d'écriture mondiale, au lieu de supprimer la configuration `plugins.entries.<id>``plugins.allow` ou %%PH:INLINE_CODE:261:b591d8c%%.

Pour les échecs de forme de module tels que les exportations `register`/`activate` manquantes, relancez avec `OPENCLAW_PLUGIN_LOAD_DEBUG=1` pour inclure un résumé compact de la forme des exportations dans la sortie de diagnostic.

### Registre

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

Le registre local de plugins est le modèle de lecture à froid persistant d'OpenClaw pour l'identité des plugins installés, leur activation, les métadonnées source et la propriété des contributions. Le démarrage normal, la recherche du propriétaire du provider, la classification de la configuration du canal et l'inventaire des plugins peuvent le lire sans importer les modules d'exécution des plugins.

Utilisez `plugins registry` pour inspecter si le registre persistant est présent, à jour ou obsolète. Utilisez `--refresh` pour le reconstruire à partir de l'index de plugins persistant, de la stratégie de configuration et des métadonnées de manifeste/de package. Il s'agit d'un chemin de réparation, et non d'un chemin d'activation d'exécution.

`openclaw doctor --fix` répare également la dérive gérée npm adjacente au registre : si un package `@openclaw/*` orphelin ou récupéré sous la racine npm du plugin géré masque un plugin groupé, le docteur supprime ce package périmé et reconstruit le registre pour que le démarrage valide par rapport au manifeste groupé. Le docteur relie également le package hôte `openclaw` dans les plugins gérés npm qui déclarent `peerDependencies.openclaw`, afin que les importations d'exécution locales au package telles que `openclaw/plugin-sdk/*` soient résolues après les mises à jour ou les réparations npm.

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` est un commutateur de compatibilité de secours déconseillé pour les échecs de lecture du registre. Préférez `plugins registry --refresh` ou `openclaw doctor --fix` ; le repli de variable d'environnement (env) est uniquement destiné à la récupération d'urgence au démarrage pendant le déploiement de la migration.</Warning>

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

La liste Marketplace accepte un chemin local vers la marketplace, un chemin `marketplace.json`, un raccourci GitHub tel que `owner/repo`, une URL de dépôt GitHub ou une URL git. `--json` imprime l'étiquette source résolue ainsi que le manifeste de la marketplace analysé et les entrées de plugin.

## Connexes

- [Création de plugins](/fr/plugins/building-plugins)
- [Référence CLI](/fr/cli)
- [ClawHub](/fr/clawhub)
