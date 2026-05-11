---
summary: "Référence de la CLI pour `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
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
  <Card title="Bundles de plugins" href="/fr/plugins/bundles">
    Modèle de compatibilité des bundles.
  </Card>
  <Card title="Manifeste de plugin" href="/fr/plugins/manifest">
    Champs du manifeste et schéma de configuration.
  </Card>
  <Card title="Sécurité" href="/fr/gateway/security">
    Durcissement de la sécurité pour l'installation de plugins.
  </Card>
</CardGroup>

## Commandes

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
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

<Note>
Les plugins fournis (bundled) sont livrés avec OpenClaw. Certains sont activés par défaut (par exemple les fournisseurs de modèles fournis, les fournisseurs de reconnaissance vocale fournis et le plugin de navigateur fourni) ; d'autres nécessitent `plugins enable`.

Les plugins natifs OpenClaw doivent être livrés avec `openclaw.plugin.json` accompagné d'un Schéma JSON en ligne (`configSchema`, même s'il est vide). Les bundles compatibles utilisent leurs propres manifestes de bundle à la place.

`plugins list` affiche `Format: openclaw` ou `Format: bundle`. La sortie détaillée de liste/info affiche également le sous-type de bundle (`codex`, `claude` ou `cursor`) ainsi que les capacités de bundle détectées.

</Note>

### Installer

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install npm:<package>                  # npm only
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

<Warning>Les noms de packages bruts sont d'abord vérifiés sur ClawHub, puis sur npm. Traitez l'installation de plugins comme l'exécution de code. Préférez les versions épinglées.</Warning>

<AccordionGroup>
  <Accordion title="Inclusions de configuration et récupération de configuration invalide">
    Si votre section `plugins` est sauvegardée par un fichier unique `$include`, `plugins install/update/enable/disable/uninstall` écrit directement dans ce fichier inclus et laisse `openclaw.json` intact. Les inclusions racine, les tableaux d'inclusions et les inclusions avec des remplacements de frères et sœurs échouent en mode fermé (fail closed) au lieu d'être aplatis. Voir [Config includes](/fr/gateway/configuration) pour les formats pris en charge.

    Si la configuration est invalide lors de l'installation, `plugins install` échoue normalement en mode fermé et vous invite à exécuter `openclaw doctor --fix` d'abord. Lors du démarrage de Gateway, la configuration invalide d'un plugin est isolée à ce plugin afin que les autres canaux et plugins puissent continuer à fonctionner ; `openclaw doctor --fix` peut mettre en quarantaine l'entrée du plugin invalide. La seule exception documentée au moment de l'installation est un chemin de récupération étroit pour les plugins groupés qui optent explicitement pour `openclaw.install.allowInvalidConfigRecovery`.

  </Accordion>
  <Accordion title="--force et réinstallation vs mise à jour">
    `--force` réutilise la cible d'installation existante et écrase un plugin ou un pack de hooks déjà installé sur place. Utilisez-le lorsque vous réinstallez intentionnellement le même identifiant depuis un nouveau chemin local, une archive, un package ClawHub ou un artefact npm. Pour les mises à niveau de routine d'un plugin npm déjà suivi, préférez `openclaw plugins update <id-or-npm-spec>`.

    Si vous exécutez `plugins install` pour un identifiant de plugin déjà installé, OpenClaw s'arrête et vous redirige vers `plugins update <id-or-npm-spec>` pour une mise à niveau normale, ou vers `plugins install <package> --force` lorsque vous souhaitez réellement écraser l'installation actuelle à partir d'une source différente.

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` s'applique uniquement aux installations npm. Il n'est pas pris en charge avec `--marketplace`, car les installations de la place de marché (marketplace) conservent les métadonnées de source de la place de marché au lieu d'une spécification npm.
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` est une option de dernier recours pour les faux positifs dans l'analyseur de code dangereux intégré. Elle permet à l'installation de se poursuivre même lorsque l'analyseur intégré signale des résultats `critical`, mais elle ne contourne **pas** les blocages de stratégie de hook de plugin `before_install` et ne contourne **pas** les échecs d'analyse.

    Ce drapeau CLI s'applique aux flux d'installation/de mise à jour de plugins. Les installations de dépendances de compétences prises en charge par Gateway utilisent la substitution de demande correspondante `dangerouslyForceUnsafeInstall`, tandis que `openclaw skills install` reste un flux de téléchargement/installation de compétences distinct sur ClawHub.

  </Accordion>
  <Accordion title="Hook packs et spécifications npm">
    `plugins install` est également la surface d'installation pour les hook packs qui exposent `openclaw.hooks` dans `package.json`. Utilisez `openclaw hooks` pour la visibilité filtrée des hooks et leur activation individuelle, et non pour l'installation de packages.

    Les spécifications npm sont **uniquement de registre** (nom du package + **version exacte** facultative ou **dist-tag**). Les spécifications Git/URL/fichier et les plages semver sont rejetées. Les installations de dépendances s'exécutent localement dans le projet avec `--ignore-scripts` pour des raisons de sécurité, même lorsque votre shell dispose de paramètres d'installation ClawHub globaux.

    Utilisez `npm:<package>` lorsque vous souhaitez ignorer la recherche sur npm et installer directement depuis ClawHub. Les spécifications nues de packages privilégient toujours npm et ne reviennent à ClawHub que lorsque npm ne dispose pas de ce package ou de cette version.

    Les spécifications nues et `@latest` restent sur la voie stable. Si OpenClaw résout l'une ou l'autre vers une préversion, OpenClaw s'arrête et vous demande d'accepter explicitement avec une balise de préversion telle que `@beta`/`@rc` ou une version de préversion exacte telle que `@1.2.3-beta.4`.

    Si une spécification d'installation nue correspond à un ID de plugin groupé (par exemple `diffs`), npm installe directement le plugin groupé. Pour installer un package npm portant le même nom, utilisez une spécification délimitée explicite (par exemple `@scope/diffs`).

  </Accordion>
  <Accordion title="Archives">
    Archives prises en charge : `.zip`, `.tgz`, `.tar.gz`, `.tar`. Les archives de plugins natives OpenClaw doivent contenir un `openclaw.plugin.json` valide à la racine du plugin extrait ; les archives qui ne contiennent que `package.json` sont rejetées avant qu'OpenClaw n'écrive les enregistrements d'installation.

    Les installations depuis la marketplace Claude sont également prises en charge.

  </Accordion>
</AccordionGroup>

Les installations ClawHub utilisent un localisateur explicite `clawhub:<package>` :

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw préfère désormais également ClawHub pour les spécifications de plugins nues compatibles avec npm. Il ne revient à npm que si ClawHub ne possède pas ce package ou cette version :

```bash
openclaw plugins install openclaw-codex-app-server
```

Utilisez `npm:` pour forcer une résolution exclusivement via npm, par exemple lorsque ClawHub est inaccessible ou si vous savez que le package existe uniquement sur npm :

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw télécharge l'archive du package depuis ClawHub, vérifie la API du plugin annoncée / la compatibilité minimale de la passerelle, puis l'installe via le chemin d'archive normal. Les installations enregistrées conservent leurs métadonnées de source ClawHub pour les mises à jour ultérieures.
Les installations non versionnées de ClawHub conservent une spécification enregistrée non versionnée afin que `openclaw plugins update` puisse suivre les nouvelles versions de ClawHub ; les sélecteurs de version ou d'étiquette explicites tels que `clawhub:pkg@1.2.3` et `clawhub:pkg@beta` restent épinglés à ce sélecteur.

#### Raccourci Marketplace

Utilisez le raccourci `plugin@marketplace` lorsque le nom de la marketplace existe dans le cache du registre local de Claude à `~/.claude/plugins/known_marketplaces.json` :

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
  <Tab title="Marketplace sources">- un nom de marketplace connue de Claude depuis `~/.claude/plugins/known_marketplaces.json` - un chemin racine vers une marketplace locale ou `marketplace.json` - un raccourci de dépôt GitHub tel que `owner/repo` - une URL de dépôt GitHub telle que `https://github.com/owner/repo` - une URL git</Tab>
  <Tab title="Remote marketplace rules">
    Pour les places de marché distantes chargées depuis GitHub ou git, les entrées de plugins doivent rester dans le dépôt cloné de la place de marché. OpenClaw accepte les sources de chemin relatif de ce dépôt et rejette les sources de plugins HTTP(S), de chemin absolu, git, GitHub et autres sources non basées sur un chemin provenant de manifests distants.
  </Tab>
</Tabs>

Pour les chemins locaux et les archives, OpenClaw détecte automatiquement :

- plugins natifs OpenClaw (`openclaw.plugin.json`)
- bundles compatibles Codex (`.codex-plugin/plugin.json`)
- bundles compatibles Claude (`.claude-plugin/plugin.json` ou la disposition par défaut des composants Claude)
- bundles compatibles Cursor (`.cursor-plugin/plugin.json`)

<Note>
  Les bundles compatibles s'installent dans la racine normale des plugins et participent au même flux de liste/info/activation/désactivation. Aujourd'hui, les compétences de bundle, les compétences de commande Claude, les valeurs par défaut `settings.json` Claude, les valeurs par défaut `.lsp.json` Claude / déclarées dans le manifeste `lspServers`, les compétences de commande Cursor et les
  répertoires de hooks Codex compatibles sont pris en charge ; les autres capacités de bundle détectées sont affichées dans les diagnostics/info mais ne sont pas encore intégrées à l'exécution runtime.
</Note>

### Liste

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

<ParamField path="--enabled" type="boolean">
  Afficher uniquement les plugins activés.
</ParamField>
<ParamField path="--verbose" type="boolean">
  Passer de la vue tableau à des lignes de détails par plugin avec des métadonnées de source/origine/version/activation.
</ParamField>
<ParamField path="--json" type="boolean">
  Inventaire lisible par la machine plus diagnostics de registre.
</ParamField>

<Note>
  `plugins list` lit d'abord le registre local persistant des plugins, avec une solution de repli dérivée uniquement du manifeste lorsque le registre est manquant ou invalide. Cela est utile pour vérifier si un plugin est installé, activé et visible pour la planification du démarrage à froid, mais ce n'est pas une sonde d'exécution en direct d'un processus Gateway déjà en cours d'exécution. Après
  avoir modifié le code du plugin, l'activation, la stratégie de hook ou `plugins.load.paths`, redémarrez le Gateway qui sert le canal avant de vous attendre à ce que le nouveau code `register(api)` ou les nouveaux hooks s'exécutent. Pour les déploiements distants/conteneurs, vérifiez que vous redémarrez l'enfant `openclaw gateway run` réel, et non seulement un processus enveloppe.
</Note>

Pour le travail sur les plugins groupés dans une image Docker empaquetée, montez en liaison (bind-mount) le répertoire source du plugin sur le chemin source empaqueté correspondant, tel que `/app/extensions/synology-chat`. OpenClaw découvrira cette superposition de source montée avant `/app/dist/extensions/synology-chat` ; un répertoire source copié de manière simple reste inerte, donc les installations empaquetées normales utilisent toujours la version compilée (dist).

Pour le débogage des hooks d'exécution :

- `openclaw plugins inspect <id> --json` affiche les hooks enregistrés et les diagnostics d'une passe d'inspection par chargement de module.
- `openclaw gateway status --deep --require-rpc` confirme le Gateway joignable, les indices de service/processus, le chemin de configuration et l'état de santé RPC.
- Les hooks de conversation non groupés (`llm_input`, `llm_output`, `before_agent_finalize`, `agent_end`) nécessitent `plugins.entries.<id>.hooks.allowConversationAccess=true`.

Utilisez `--link` pour éviter de copier un répertoire local (ajoute à `plugins.load.paths`) :

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` n'est pas pris en charge avec `--link` car les installations liées réutilisent le chemin source au lieu de copier vers une cible d'installation gérée.

Utilisez `--pin` sur les installations npm pour enregistrer la spécification exacte résolue (`name@version`) dans l'index de plugins géré tout en gardant le comportement par défaut non épinglé.

</Note>

### Index des plugins

Les métadonnées d'installation des plugins sont un état géré par la machine, et non une configuration utilisateur. Les installations et les mises à jour les écrivent dans `plugins/installs.json` sous le répertoire d'état OpenClaw actif. Sa carte `installRecords` de premier niveau est la source durable des métadonnées d'installation, y compris les enregistrements pour les manifestes de plugins cassés ou manquants. Le tableau `plugins` est le cache de registre froid dérivé du manifeste. Le fichier inclut un avertissement de non-modification et est utilisé par `openclaw plugins update`, la désinstallation, les diagnostics et le registre de plugins froid.

Lorsque OpenClaw détecte des enregistrements `plugins.installs` hérités livrés dans la configuration, il les déplace dans l'index de plugins et supprime la clé de configuration ; si l'une ou l'autre des écritures échoue, les enregistrements de configuration sont conservés afin que les métadonnées d'installation ne soient pas perdues.

### Désinstaller

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` supprime les enregistrements de plugins de `plugins.entries`, l'index de plugins persisté, les entrées de la liste d'autorisation/d'interdiction de plugins, et les entrées `plugins.load.paths` liées le cas échéant. Sauf si `--keep-files` est défini, la désinstallation supprime également le répertoire d'installation géré suivi lorsqu'il se trouve à la racine des extensions de plugins de OpenClaw. Pour les plugins de mémoire actifs, l'emplacement mémoire est réinitialisé à `memory-core`.

<Note>`--keep-config` est pris en charge comme un alias obsolète pour `--keep-files`.</Note>

### Mise à jour

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

Les mises à jour s'appliquent aux installations de plugins suivies dans l'index de plugins géré et aux installations de packs de hooks suivies dans `hooks.internal.installs`.

<AccordionGroup>
  <Accordion title="Résolution de l'id de plugin par rapport à la spécification npm">
    Lorsque vous passez un id de plugin, OpenClaw réutilise la spécification d'installation enregistrée pour ce plugin. Cela signifie que les dist-tags précédemment stockés tels que `@beta` et les versions épinglées exactes continuent d'être utilisées lors des exécutions ultérieures de `update <id>`.

    Pour les installations npm, vous pouvez également passer une spécification de package npm explicite avec un dist-tag ou une version exacte. OpenClaw résout ce nom de package pour revenir à l'enregistrement du plugin suivi, met à jour ce plugin installé et enregistre la nouvelle spécification npm pour les futures mises à jour basées sur l'id.

    Le fait de passer le nom du package npm sans version ni balise permet également de revenir à l'enregistrement du plugin suivi. Utilisez cette option lorsqu'un plugin a été épinglé à une version exacte et que vous souhaitez le ramener à la ligne de publication par défaut du registre.

  </Accordion>
  <Accordion title="Vérifications de version et dérive d'intégrité">
    Avant une mise à jour en direct npm, OpenClaw vérifie la version du package installée par rapport aux métadonnées du registre npm. Si la version installée et l'identité de l'artefact enregistré correspondent déjà à la cible résolue, la mise à jour est ignorée sans téléchargement, réinstallation ou réécriture de `openclaw.json`.

    Lorsqu'un hachage d'intégrité stocké existe et que le hachage de l'artefact récupéré change, OpenClaw le considère comme une dérive d'artefact npm. La commande interactive `openclaw plugins update` affiche les hachages attendus et réels et demande confirmation avant de procéder. Les assistants de mise à jour non interactifs échouent en mode fermé, sauf si l'appelant fournit une stratégie de continuation explicite.

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install lors de la mise à jour">
    `--dangerously-force-unsafe-install` est également disponible sur `plugins update` en tant que substitut de secours pour les faux positifs de l'analyse de code dangereux intégrée lors des mises à jour de plugins. Il ne contourne toujours pas les blocs de stratégie `before_install` du plugin ni le blocage en cas d'échec de l'analyse, et il ne s'applique qu'aux mises à jour de plugins, pas aux mises à jour des hook-packs.
  </Accordion>
</AccordionGroup>

### Inspecter

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspection approfondie pour un seul plugin. Affiche l'identité, l'état de chargement, la source, les capacités enregistrées, les hooks, les outils, les commandes, les services, les méthodes de la passerelle, les routes HTTP, les indicateurs de stratégie, les diagnostics, les métadonnées d'installation, les capacités du bundle, et tout support détecté de serveur MCP ou LSP.

Chaque plugin est classé selon ce qu'il enregistre réellement lors de l'exécution :

- **plain-capability** — un seul type de capacité (ex. un plugin fournisseur uniquement)
- **hybrid-capability** — plusieurs types de capacités (ex. texte + parole + images)
- **hook-only** — uniquement des hooks, aucune capacité ou surface
- **non-capability** — outils/commandes/services mais aucune capacité

Voir [Plugin shapes](/fr/plugins/architecture#plugin-shapes) pour plus d'informations sur le modèle de capacité.

<Note>The `--json` flag outputs a machine-readable report suitable for scripting and auditing. `inspect --all` renders a fleet-wide table with shape, capability kinds, compatibility notices, bundle capabilities, and hook summary columns. `info` is an alias for `inspect`.</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` signale les erreurs de chargement de plugins, les diagnostics de manifeste/découverte et les avis de compatibilité. Lorsque tout est propre, il imprime `No plugin issues detected.`

Pour les échecs de forme de module tels que des exportations `register`/`activate` manquantes, réexécutez avec `OPENCLAW_PLUGIN_LOAD_DEBUG=1` pour inclure un résumé compact de la forme d'exportation dans la sortie de diagnostic.

### Registry

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

Le registre local de plugins est le modèle de lecture à froid persistant d'OpenClaw pour l'identité des plugins installés, leur activation, les métadonnées source et la propriété des contributions. Le démarrage normal, la recherche du propriétaire du fournisseur, la classification de la configuration du canal et l'inventaire des plugins peuvent le lire sans importer les modules d'exécution des plugins.

Utilisez `plugins registry` pour inspecter si le registre persistant est présent, à jour ou périmé. Utilisez `--refresh` pour le reconstruire à partir de l'index persistant des plugins, de la stratégie de configuration et des métadonnées de manifeste/package. Il s'agit d'un chemin de réparation, non d'un chemin d'activation à l'exécution.

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` est un commutateur de compatité brise-glace obsolète pour les échecs de lecture du registre. Privilégiez `plugins registry --refresh` ou `openclaw doctor --fix` ; le repli de l'environnement (env fallback) est uniquement destiné à la récupération d'urgence au démarrage pendant le déploiement de la migration.</Warning>

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

La liste Marketplace accepte un chemin de marketplace local, un chemin `marketplace.json`, un raccourci GitHub tel que `owner/repo`, une URL de dépôt GitHub, ou une URL git. `--json` affiche l'étiquette de source résolue ainsi que le manifeste de marketplace analysé et les entrées de plugins.

## Connexes

- [Création de plugins](/fr/plugins/building-plugins)
- [Référence CLI](/fr/cli)
- [Plugins communautaires](/fr/plugins/community)
