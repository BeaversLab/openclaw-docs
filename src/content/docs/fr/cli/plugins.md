---
summary: "Référence CLI pour CLI`openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "Plugins"
sidebarTitle: "Plugins"
---

Gérer les plugins Gateway, les packs de hooks et les bundles compatibles.

<CardGroup cols={2}>
  <Card title="Système de plugins" href="/fr/tools/plugin">
    Guide de l'utilisateur final pour l'installation, l'activation et le troubleshooting des plugins.
  </Card>
  <Card title="Gérer les plugins" href="/fr/plugins/manage-plugins">
    Exemples rapides pour l'installation, la liste, la mise à jour, la désinstallation et la publication.
  </Card>
  <Card title="Plugins bundles" href="/fr/plugins/bundles">
    Modèle de compatibilité des bundles.
  </Card>
  <Card title="Manifeste de plugin" href="/fr/plugins/manifest">
    Champs du manifeste et schéma de configuration.
  </Card>
  <Card title="Sécurité" href="/fr/gateway/security">
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
```

Pour une investigation sur une installation, une inspection, une désinstallation ou un rafraîchissement de registre lents, exécutez la
commande avec `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1`. La trace écrit les chronométrages des phases
sur stderr et garde la sortie JSON analysable. Voir [Debugging](/fr/help/debugging#plugin-lifecycle-trace).

<Note>En mode Nix (`OPENCLAW_NIX_MODE=1`), les mutateurs du cycle de vie des plugins sont désactivés. Utilisez la source Nix pour cette installation au lieu de `plugins install`, `plugins update`, `plugins uninstall`, `plugins enable` ou `plugins disable` ; pour nix-openclaw, utilisez le [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) avec agent en premier.</Note>

<Note>
Les plugins fournis sont livrés avec OpenClaw. Certains sont activés par défaut (par exemple, les fournisseurs de modèles fournis, les fournisseurs de synthèse vocale fournis et le plugin de navigateur fourni) ; d'autres nécessitent OpenClaw`plugins enable`OpenClaw.

Les plugins natifs OpenClaw doivent livrer `openclaw.plugin.json` avec un schéma JSON en ligne (`configSchema`, même s'il est vide). Les bundles compatibles utilisent leurs propres manifestes de bundle à la place.

`plugins list` affiche `Format: openclaw` ou `Format: bundle`. La sortie de liste/info détaillée affiche également le sous-type de bundle (`codex`, `claude` ou `cursor`) ainsi que les capacités de bundle détectées.

</Note>

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

Les mainteneurs testant les installations au moment de la configuration peuvent remplacer les sources d'installation automatique de plugins par des variables d'environnement protégées. Voir
[Plugin install overrides](/fr/plugins/install-overrides).

<Warning>
Les noms de packages bruts s'installent à partir de npm par défaut lors du basculement au lancement. Utilisez npm`clawhub:<package>`ClawHub pour ClawHub. Traitez les installations de plugins comme l'exécution de code. Préférez les versions épinglées.
</Warning>

`plugins search`ClawHub interroge ClawHub pour les packages de plugins installables et affiche
les noms de packages prêts à l'installation. Il recherche les packages code-plugin et bundle-plugin,
mais pas les compétences. Utilisez `openclaw skills search`ClawHub pour les compétences ClawHub.

<Note>
  ClawHub est la surface principale de distribution et de découverte pour la plupart des plugins. Npm reste une solution de repli prise en charge et un chemin d'installation direct. Les packages de plugins ClawHubOpenClaw`@openclaw/*`npm appartenant à OpenClaw sont publiés à nouveau sur npm ; consultez la liste actuelle sur [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) ou
  l'[inventaire de plugins](/fr/plugins/plugin-inventory). Les installations stables utilisent `latest`npm. Les installations et mises à jour du canal bêta préfèrent le dist-tag `beta` de npm lorsque cette étiquette est disponible, puis reviennent à `latest`.
</Note>

<AccordionGroup>
  <Accordion title="Inclusions de configuration et réparation de configuration invalide">
    Si votre section `plugins` est sauvegardée dans un `$include` monofichier, `plugins install/update/enable/disable/uninstall` écrit directement dans ce fichier inclus et laisse `openclaw.json` intact. Les inclusions racines, les tableaux d'inclusions et les inclusions avec des remplacements de frères et sœurs échouent en mode fermé au lieu d'être aplaties. Consultez [Inclusions de configuration](/fr/gateway/configuration) pour les formes prises en charge.

    Si la configuration est invalide pendant l'installation, `plugins install` échoue normalement en mode fermé et vous demande d'exécuter d'abord `openclaw doctor --fix`. Pendant le démarrage de Gateway et le rechargement à chaud, la configuration invalide du plugin échoue en mode fermé comme toute autre configuration invalide ; `openclaw doctor --fix` peut mettre en quarantaine l'entrée de plugin invalide. La seule exception documentée au moment de l'installation est un chemin de récupération étroit pour les plugins groupés qui optent explicitement pour `openclaw.install.allowInvalidConfigRecovery`.

  </Accordion>
  <Accordion title="--force et réinstallation vs mise à jour">
    `--force` réutilise la cible d'installation existante et écrase un plugin ou un pack de hooks déjà installé sur place. Utilisez-le lorsque vous réinstallez intentionnellement le même identifiant à partir d'un nouveau chemin local, d'une archive, d'un package ClawHub ou d'un artefact npm. Pour les mises à jour de routine d'un plugin npm déjà suivi, préférez `openclaw plugins update <id-or-npm-spec>`.

    Si vous exécutez `plugins install` pour un identifiant de plugin déjà installé, OpenClaw s'arrête et vous dirige vers `plugins update <id-or-npm-spec>` pour une mise à niveau normale, ou vers `plugins install <package> --force` lorsque vous souhaitez réellement écraser l'installation actuelle à partir d'une source différente.

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` s'applique uniquement aux installations npm. Il n'est pas pris en charge avec les installations `git:` ; utilisez une référence git explicite telle que `git:github.com/acme/plugin@v1.2.3` lorsque vous souhaitez une source épinglée. Il n'est pas pris en charge avec `--marketplace`, car les installations à partir du marketplace persistent les métadonnées de la source du marketplace au lieu d'une spécification npm.
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` est une option de contournement pour les faux positifs dans l'analyseur de code dangereux intégré. Il permet à l'installation de se poursuivre même lorsque l'analyseur intégré signale des résultats `critical`, mais il ne contourne **pas** les blocs de stratégie de hook `before_install` du plugin et ne contourne **pas** les échecs de l'analyse.

    Cet indicateur CLI s'applique aux flux d'installation/de mise à jour de plugins. Les installations de dépendances de compétences prises en charge par Gateway utilisent la substitution de requête `dangerouslyForceUnsafeInstall` correspondante, tandis que `openclaw skills install` reste un flux de téléchargement/installation de compétences ClawHub distinct.

    Si un plugin que vous avez publié sur ClawHub est bloqué par une analyse de registre, utilisez les étapes de l'éditeur dans [ClawHub](/fr/clawhub/security).

  </Accordion>
  <Accordion title="npmHook packs et specs npm">
    `plugins install` est également la surface d'installation pour les hook packs qui exposent `openclaw.hooks` dans `package.json`. Utilisez `openclaw hooks` pour une visibilité filtrée des hooks et leur activation individuelle, et non pour l'installation de paquets.

    Les specs npm sont **uniquement de registre** (nom du paquet + **version exacte** facultative ou **dist-tag**). Les specs Git/URL/fichier et les plages semver sont rejetées. Les installations de dépendances s'exécutent localement au projet avec `--ignore-scripts`npmnpm pour la sécurité, même si votre shell possède des paramètres d'installation npm globaux. Les racines npm de plugin gérées héritent du npm au niveau du paquet d'OpenClawnpm `overrides`, donc les épingles de sécurité de l'hôte s'appliquent également aux dépendances de plugin hissées.

    Utilisez `npm:<package>`npmnpm lorsque vous souhaitez rendre la résolution npm explicite. Les specs de paquets nus s'installent également directement depuis npm lors du basculement de lancement.

    Les specs nues et `@latest` restent sur la voie stable. Les versions de correction datées d'OpenClaw telles que `2026.5.3-1`npm sont des versions stables pour cette vérification. Si npm résout l'une ou l'autre vers une pré-version, OpenClaw s'arrête et vous demande d'accepter explicitement avec une balise de pré-version telle que `@beta`/`@rc` ou une version de pré-version exacte telle que `@1.2.3-beta.4`.

    Si une spec d'installation nue correspond à un identifiant de plugin officiel (par exemple `diffs`), OpenClawnpm installe directement l'entrée du catalogue. Pour installer un paquet npm du même nom, utilisez une spec avec portée explicite (par exemple `@scope/diffs`).

  </Accordion>
  <Accordion title="Dépôts Git">
    Utilisez `git:<repo>` pour installer directement depuis un dépôt git. Les formes prises en charge incluent les URL de clone `git:github.com/owner/repo`, `git:owner/repo`, `https://` complet, `ssh://`, `git://`, `file://` et `git@host:owner/repo.git`. Ajoutez `@<ref>` ou `#<ref>` pour extraire une branche, une balise ou un commit avant l'installation.

    Les installations Git clonent dans un répertoire temporaire, extraient la référence demandée si elle est présente, puis utilisent le programme d'installation normal du répertoire de plugins. Cela signifie que la validation du manifeste, l'analyse de code dangereux, le travail d'installation du gestionnaire de paquets et les enregistrements d'installation se comportent comme les installations npm. Les installations git enregistrées incluent l'URL/référence source ainsi que le commit résolu afin que `openclaw plugins update` puisse re-résoudre la source ultérieurement.

    Après l'installation depuis git, utilisez `openclaw plugins inspect <id> --runtime --json` pour vérifier les enregistrements d'exécution tels que les méthodes de passerelle et les commandes CLI. Si le plugin a enregistré une racine CLI avec `api.registerCli`, exécutez cette commande directement via la racine OpenClaw CLI, par exemple `openclaw demo-plugin ping`.

  </Accordion>
  <Accordion title="Archives">
    Archives prises en charge : `.zip`, `.tgz`, `.tar.gz`, `.tar`. Les archives de plugins natives OpenClaw doivent contenir un `openclaw.plugin.json` valide à la racine du plugin extrait ; les archives qui ne contiennent que `package.json` sont rejetées avant qu'OpenClaw n'écrive les enregistrements d'installation.

    Utilisez `npm-pack:<path.tgz>` lorsque le fichier est une archive tar npm-pack et que vous souhaitez
    tester le même chemin d'installation géré de racine npm utilisé par les installations de registre,
    y compris la vérification `package-lock.json`, l'analyse des dépendances hissées (hoisted), et
    les enregistrements d'installation npm. Les chemins d'archive simples s'installent toujours en tant qu'archives locales
    sous la racine des extensions de plugin.

    Les installations depuis la place de marché Claude sont également prises en charge.

  </Accordion>
</AccordionGroup>

Les installations ClawHub utilisent un localisateur `clawhub:<package>` explicite :

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

Les spécifications de plugins bruts et sûrs pour npm s'installent à partir de npm par défaut lors du basculement au lancement :

```bash
openclaw plugins install openclaw-codex-app-server
```

Utilisez `npm:` pour rendre la résolution npm-only explicite :

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw vérifie l'API de plugin annoncée / la compatibilité minimale de la passerelle avant l'installation. Lorsque la version ClawHub sélectionnée publie un artefact ClawPack, OpenClaw télécharge le OpenClawAPIClawHubOpenClawnpm`.tgz`ClawHubClawHubClawHubnpmnpmClawHub npm-pack versionné, vérifie l'en-tête de digest ClawHub et le digest de l'artefact, puis l'installe via le chemin d'archive normal. Les anciennes versions de ClawHub sans métadonnées ClawPack s'installent toujours via le chemin de vérification d'archive de package hérité. Les installations enregistrées conservent leurs métadonnées source ClawHub, le type d'artefact, l'intégrité npm, le shasum npm, le nom de la tarball et les faits de digest ClawPack pour les mises à jour ultérieures.
Les installations ClawHub non versionnées conservent une spec enregistrée non versionnée pour que `openclaw plugins update`ClawHub puisse suivre les nouvelles versions de ClawHub ; les sélecteurs de version ou de balise explicites tels que `clawhub:pkg@1.2.3` et `clawhub:pkg@beta` restent épinglés à ce sélecteur.

#### Raccourci de la Marketplace

Utilisez le raccourci `plugin@marketplace` lorsque le nom de la marketplace existe dans le cache du registre local de Claude à `~/.claude/plugins/known_marketplaces.json` :

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Utilisez `--marketplace` lorsque vous souhaitez passer explicitement la source de la marketplace :

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Marketplace sources">
    - un nom de marketplace connue de Claude depuis `~/.claude/plugins/known_marketplaces.json`
    - un chemin racine de marketplace local ou `marketplace.json`GitHub
    - un raccourci de dépôt GitHub tel que `owner/repo`GitHub
    - une URL de dépôt GitHub telle que `https://github.com/owner/repo`
    - une URL git

  </Tab>
  <Tab title="Règles du marketplace distant">
    Pour les marketplaces distants chargés depuis GitHub ou git, les entrées de plugins doivent rester à l'intérieur du dépôt du marketplace cloné. OpenClaw accepte les sources de chemin relatif de ce dépôt et rejette les sources de plugins HTTP(S), chemin absolu, git, GitHub, et autres sources non-chemin depuis les manifestes distants.
  </Tab>
</Tabs>

Pour les chemins locaux et les archives, OpenClaw détecte automatiquement :

- plugins natifs OpenClaw (`openclaw.plugin.json`)
- bundles compatibles Codex (`.codex-plugin/plugin.json`)
- bundles compatibles Claude (`.claude-plugin/plugin.json` ou la disposition par défaut des composants Claude)
- bundles compatibles Cursor (`.cursor-plugin/plugin.json`)

<Note>
  Les bundles compatibles s'installent dans la racine des plugins normale et participent au même flux liste/info/activer/désactiver. Aujourd'hui, les compétences de bundle, les compétences de commande Claude, les valeurs par défaut Claude `settings.json`, les valeurs par défaut Claude `.lsp.json` / déclarées par manifeste `lspServers`, les compétences de commande Cursor, et les répertoires de
  hooks Codex compatibles sont pris en charge ; d'autres capacités de bundle détectées sont affichées dans les diagnostics/info mais ne sont pas encore connectées à l'exécution runtime.
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
  Passer de la vue tableau aux lignes de détail par plugin avec les métadonnées source/origine/version/activation.
</ParamField>
<ParamField path="--json" type="boolean">
  Inventaire lisible par machine plus diagnostics de registre et état d'installation des dépendances de paquets.
</ParamField>

<Note>
`plugins list` lit d'abord le registre local persistant des plugins, avec une alternative dérivée uniquement à partir du manifeste si le registre est manquant ou invalide. C'est utile pour vérifier si un plugin est installé, activé et visible pour la planification du démarrage à froid, mais ce n'est pas une sonde d'exécution en direct d'un processus Gateway déjà en cours d'exécution. Après avoir modifié le code du plugin, l'activation, la stratégie de hook ou `plugins.load.paths`, redémarrez le Gateway qui sert le channel avant de vous attendre à ce que le nouveau code `register(api)` ou les nouveaux hooks s'exécutent. Pour les déploiements distants/conteneurs, vérifiez que vous redémarrez l'enfant `openclaw gateway run` réel, et pas seulement un processus wrapper.

`plugins list --json` inclut les `dependencyStatus` de chaque plugin à partir de `package.json`
`dependencies` et `optionalDependencies`. OpenClaw vérifie si ces noms de
packages sont présents le long du chemin de recherche Node `node_modules` normal du plugin ; il
n'importe pas le code d'exécution du plugin, n'exécute pas de gestionnaire de packages, ni ne répare les dépendances manquantes.

</Note>

`plugins search` est une recherche distante dans le catalogue ClawHub. Il n'inspecte pas l'état
local, ne modifie pas la configuration, n'installe pas de packages, ni ne charge le code d'exécution du plugin. Les résultats de la
recherche incluent le nom du package ClawHub, la famille, le channel, la version, le résumé, et
une indication d'installation telle que `openclaw plugins install clawhub:<package>`.

Pour le travail sur des plugins groupés dans une image Docker packagée, montez en liaison (bind-mount) le répertoire source du plugin
sur le chemin source packagé correspondant, tel que
`/app/extensions/synology-chat`. OpenClaw découvrira cette superposition source
montée avant `/app/dist/extensions/synology-chat` ; un répertoire source copié simple
reste inerte, donc les installations packagées normales utilisent toujours la version compilée.

Pour le débogage des hooks d'exécution :

- `openclaw plugins inspect <id> --runtime --json` affiche les hooks enregistrés et les diagnostics d'une passe d'inspection par chargement de module. L'inspection d'exécution n'installe jamais les dépendances ; utilisez `openclaw doctor --fix` pour nettoyer l'état des dépendances héritées ou récupérer les plugins téléchargeables manquants qui sont référencés par la configuration.
- `openclaw gateway status --deep --require-rpc` confirme la Gateway accessible, les indices de service/processus, le chemin de configuration et l'état du RPC.
- Les hooks de conversation non groupés (`llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize`, `agent_end`) nécessitent `plugins.entries.<id>.hooks.allowConversationAccess=true`.

Utilisez `--link` pour éviter de copier un répertoire local (ajoute à `plugins.load.paths`) :

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` n'est pas pris en charge avec `--link` car les installations liées réutilisent le chemin source au lieu de copier vers une cible d'installation gérée.

Utilisez `--pin` sur les installations npm pour enregistrer la spécification exacte résolue (`name@version`) dans l'index de plugins géré tout en gardant le comportement par défaut non épinglé.

</Note>

### Index des plugins

Les métadonnées d'installation de plugins sont un état géré par la machine, pas une configuration utilisateur. Les installations et les mises à jour les écrivent dans `plugins/installs.json` sous le répertoire d'état OpenClaw actif. Sa carte `installRecords` de premier niveau est la source durable des métadonnées d'installation, y compris les enregistrements pour les manifestes de plugins cassés ou manquants. Le tableau `plugins` est le cache de registre à froid dérivé du manifeste. Le fichier inclut un avertissement de non-modification et est utilisé par `openclaw plugins update`, la désinstallation, les diagnostics et le registre de plugins à froid.

Lorsque OpenClaw détecte des enregistrements `plugins.installs` hérités livrés dans la configuration, les lectures à l'exécution les traitent comme une entrée de compatibilité sans réécrire `openclaw.json`. Les écritures explicites de plugins et `openclaw doctor --fix` déplacent ces enregistrements vers l'index des plugins et suppriment la clé de configuration lorsque les écritures de configuration sont autorisées ; si l'une ou l'autre des écritures échoue, les enregistrements de configuration sont conservés afin que les métadonnées d'installation ne soient pas perdues.

### Désinstaller

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` supprime les enregistrements de plugins de `plugins.entries`, l'index de plugins persisté, les entrées de la liste d'autorisation/d'interdiction de plugins, et les entrées `plugins.load.paths` liées, le cas échéant. Sauf si `--keep-files` est défini, la désinstallation supprime également le répertoire d'installation géré tracé lorsqu'il se trouve à la racine des extensions de plugins de OpenClaw. Pour les plugins en mémoire actifs, l'emplacement mémoire est réinitialisé à `memory-core`.

<Note>`--keep-config` est pris en charge en tant qu'alias obsolète pour `--keep-files`.</Note>

### Mettre à jour

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

Les mises à jour s'appliquent aux installations de plugins suivies dans l'index géré des plugins et aux installations de hook-packs suivies dans `hooks.internal.installs`.

<AccordionGroup>
  <Accordion title="Résolution de l'ID de plugin par rapport à la spécification npm">
    Lorsque vous transmettez un ID de plugin, OpenClaw réutilise la spécification d'installation enregistrée pour ce plugin. Cela signifie que les dist-tags précédemment stockés tels que `@beta` et les versions épinglées exactes continuent d'être utilisés lors des exécutions ultérieures de `update <id>`.

    Pour les installations npm, vous pouvez également transmettre une spécification de package npm explicite avec un dist-tag ou une version exacte. OpenClaw résout ce nom de package vers l'enregistrement de plugin suivi, met à jour ce plugin installé et enregistre la nouvelle spécification npm pour les futures mises à jour basées sur l'ID.

    Le fait de transmettre le nom du package npm sans version ni tag permet également de le résoudre vers l'enregistrement de plugin suivi. Utilisez ceci lorsqu'un plugin a été épinglé à une version exacte et que vous souhaitez le ramener à la ligne de publication par défaut du registre.

  </Accordion>
  <Accordion title="Mises à jour du canal bêta">
    `openclaw plugins update` réutilise la spécification de plugin suivie, sauf si vous passez une nouvelle spécification. `openclaw update` connaît également le canal de mise à jour OpenClawnpmClawHub actif : sur le canal bêta, les enregistrements de plugins npm et ClawHub en ligne par défaut essaient d'abord `@beta`, puis reviennent à la spécification par défaut/la plus récente enregistrée si aucune version bêta de plugin n'existe. Les versions exactes et les balises explicites restent épinglées à ce sélecteur.

  </Accordion>
  <Accordion title="Vérifications des versions et dérive de l'intégrité">
    Avant une mise à jour en direct de npm, OpenClaw vérifie la version du package installée par rapport aux métadonnées du registre npm. Si la version installée et l'identité de l'artefact enregistré correspondent déjà à la cible résolue, la mise à jour est ignorée sans téléchargement, réinstallation ou réécriture de `openclaw.json`.

    Lorsqu'un hachage d'intégrité stocké existe et que le hachage de l'artefact récupéré change, OpenClaw considère cela comme une dérive d'artefact npm. La commande interactive `openclaw plugins update` affiche les hachages attendus et réels et demande confirmation avant de procéder. Les assistants de mise à jour non interactifs échouent en mode fermé, sauf si l'appelant fournit une politique de continuation explicite.

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install lors de la mise à jour">
    `--dangerously-force-unsafe-install` est également disponible sur `plugins update` en tant que substitution de secours pour les faux positifs de l'analyse de code dangereux intégrée lors des mises à jour de plugins. Il ne contourne toujours pas les blocages de stratégie `before_install` des plugins ni le blocage en cas d'échec de l'analyse, et il ne s'applique qu'aux mises à jour de plugins, pas aux mises à jour des hook-packs.
  </Accordion>
</AccordionGroup>

### Inspecter

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspect affiche l'identité, l'état de chargement, la source, les capacités du manifeste, les indicateurs de stratégie, les diagnostics, les métadonnées d'installation, les capacités du bundle et toute prise en charge détectée des serveurs MCP ou LSP sans importer le runtime du plugin par défaut. Ajoutez `--runtime` pour charger le module du plugin et inclure les hooks, outils, commandes, services, méthodes de passerelle et routes HTTP enregistrés. L'inspection du runtime signale directement les dépendances de plugin manquantes ; les installations et les réparations restent dans `openclaw plugins install`, `openclaw plugins update` et `openclaw doctor --fix`.

Les commandes CLI appartenant au plugin sont généralement installées en tant que groupes de commandes racine `openclaw`, mais les plugins peuvent également enregistrer des commandes imbriquées sous un parent principal tel que `openclaw nodes`. Une fois que `inspect --runtime` affiche une commande sous `cliCommands`, exécutez-la au chemin répertorié ; par exemple, un plugin qui enregistre `demo-git` peut être vérifié avec `openclaw demo-git ping`.

Chaque plugin est classé en fonction de ce qu'il enregistre réellement au moment de l'exécution :

- **plain-capability** — un seul type de capacité (ex. un plugin de type provider uniquement)
- **hybrid-capability** — plusieurs types de capacités (ex. texte + parole + images)
- **hook-only** — uniquement des hooks, aucune capacité ou surface
- **non-capability** — outils/commandes/services mais aucune capacité

Consultez [Plugin shapes](/fr/plugins/architecture#plugin-shapes) pour en savoir plus sur le modèle de capacité.

<Note>L'indicateur `--json` génère un rapport lisible par machine adapté au scriptage et à l'audit. `inspect --all` affiche un tableau à l'échelle de la flotte avec des colonnes pour la forme, les types de capacités, les avis de compatibilité, les capacités du bundle et le résumé des hooks. `info` est un alias pour `inspect`.</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` signale les erreurs de chargement des plugins, les diagnostics de manifeste/découverte et les avis de compatibilité. Lorsque tout est propre, il imprime `No plugin issues detected.`

Si un plugin configuré est présent sur le disque mais bloqué par les vérifications de sécurité du chemin du chargeur, la validation de la configuration conserve l'entrée du plugin et le signale comme `present but blocked`. Corrigez le diagnostic précédent de plugin bloqué, tel que la propriété du chemin ou les permissions d'écriture pour tous, au lieu de supprimer la configuration `plugins.entries.<id>` ou `plugins.allow`.

Pour les échecs de forme de module tels que les exportations `register`/`activate` manquantes, réexécutez avec `OPENCLAW_PLUGIN_LOAD_DEBUG=1` pour inclure un résumé compact de la forme des exportations dans la sortie de diagnostic.

### Registre

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

Le registre local de plugins est le modèle de lecture à froid persistant d'OpenClaw pour l'identité des plugins installés, leur activation, les métadonnées source et la propriété des contributions. Le démarrage normal, la recherche du propriétaire du provider, la classification de la configuration du channel et l'inventaire des plugins peuvent le lire sans importer les modules d'exécution des plugins.

Utilisez `plugins registry` pour inspecter si le registre persistant est présent, à jour ou obsolète. Utilisez `--refresh` pour le reconstruire à partir de l'index persistant des plugins, de la stratégie de configuration et des métadonnées du manifeste/du package. Il s'agit d'un chemin de réparation, pas d'un chemin d'activation à l'exécution.

`openclaw doctor --fix` répare également la dérive gérée du npm adjacente au registre : si un package `@openclaw/*` orphelin ou récupéré sous la racine npm des plugins gérés masque un plugin groupé, le docteur supprime ce package obsolète et reconstruit le registre afin que le démarrage valide par rapport au manifeste groupé.

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` est un commutateur de compatibilité de secours déprécié pour les échecs de lecture du registre. Préférez `plugins registry --refresh` ou `openclaw doctor --fix` ; le repli d'environnement n'est destiné qu'à la récupération d'urgence au démarrage pendant le déploiement de la migration.</Warning>

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

La liste de la Marketplace accepte un chemin local vers une marketplace, un chemin `marketplace.json`, un raccourci GitHub comme `owner/repo`, une URL de dépôt GitHub, ou une URL git. `--json` affiche l'étiquette de source résolue ainsi que le manifeste de la marketplace analysé et les entrées des plugins.

## Connexes

- [Créer des plugins](/fr/plugins/building-plugins)
- [Référence de la CLI](/fr/cli)
- [ClawHub](/fr/clawhub)
