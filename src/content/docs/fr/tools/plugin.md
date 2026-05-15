---
summary: "OpenClawInstaller, configurer et gérer les plugins OpenClaw"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Plugins"
sidebarTitle: "Installation et configuration"
---

Les plugins étendent OpenClaw avec de nouvelles capacités : canaux, fournisseurs de modèles, harnais d'agents, outils, compétences, synthèse vocale, transcription en temps réel, voix en temps réel, compréhension des médias, génération d'images, génération de vidéos, récupération web, recherche web, et plus encore. Certains plugins sont **principaux** (livrés avec OpenClaw), d'autres sont **externes**. La plupart des plugins externes sont publiés et découverts via [ClawHub](OpenClawOpenClawClawHub/en/clawhubOpenClaw). Npm reste pris en charge pour les installations directes et pour un ensemble temporaire de packages de plugins appartenant à OpenClaw pendant que cette migration se termine.

## Démarrage rapide

Pour des exemples d'installation, de liste, de désinstallation, de mise à jour et de publication par copier-coller, voir [Gérer les plugins](/fr/plugins/manage-plugins).

<Steps>
  <Step title="Voir ce qui est chargé">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="Installer un plugin">
    ```bash
    # Search ClawHub plugins
    openclaw plugins search "calendar"

    # From ClawHub
    openclaw plugins install clawhub:openclaw-codex-app-server

    # From npm
    openclaw plugins install npm:@acme/openclaw-plugin
    openclaw plugins install npm-pack:./openclaw-plugin-1.2.3.tgz

    # From git
    openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0

    # From a local directory or archive
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="GatewayRedémarrer la passerelle">
    ```bash
    openclaw gateway restart
    ```

    Configurez ensuite sous `plugins.entries.\<id\>.config` dans votre fichier de configuration.

  </Step>

  <Step title="Gestion native par chat"Gateway>
    Dans une passerelle en cours d'exécution, les commandes `/plugins enable` et `/plugins disable`GatewayGateway réservées au propriétaire
    déclenchent le rechargement de la configuration de la passerelle. La passerelle recharge les surfaces d'exécution des plugins en processus, et les nouveaux tours d'agent reconstruisent leur liste d'outils à partir du registre actualisé. `/plugins install`Gateway modifie le code source du plugin, donc la passerelle demande un redémarrage au lieu de prétendre que le processus actuel peut recharger en toute sécurité les modules déjà importés.

  </Step>

  <Step title="Verify the plugin">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json

    # If the plugin registered a CLI root, run one command from that root.
    openclaw <plugin-command> --help
    ```

    Utilisez `--runtime`CLI lorsque vous devez prouver les outils enregistrés, services, méthodes de
    gateway, hooks ou commandes CLI détenues par le plugin. `inspect` simple est une
    vérification froide de manifeste/registre et évite intentionnellement d'importer le runtime du plugin.

  </Step>
</Steps>

Si vous préférez un contrôle natif par chat, activez `commands.plugins: true` et utilisez :

```text
/plugin install clawhub:<package>
/plugin show <plugin-id>
/plugin enable <plugin-id>
```

Le chemin d'installation utilise le même résolveur que la CLI : chemin d'accès local/archive, explicite
`clawhub:<pkg>`, explicite `npm:<pkg>`, explicite `npm-pack:<path.tgz>`,
explicite `git:<repo>`, ou spécification de package nue via npm.

Si la configuration est invalide, l'installation échoue normalement de manière fermée et vous redirige vers
`openclaw doctor --fix`. La seule exception de récupération est un chemin étroit de réinstallation de
plugin groupé pour les plugins qui optent pour
`openclaw.install.allowInvalidConfigRecovery`.
Lors du démarrage de la Gateway, une configuration de plugin invalide échoue de manière fermée comme toute autre configuration
invalide. Exécutez `openclaw doctor --fix` pour mettre en quarantaine la mauvaise configuration du plugin en
désactivant cette entrée de plugin et en supprimant sa charge utile de configuration invalide ; la sauvegarde de
configuration normale conserve les valeurs précédentes.
Lorsqu'une configuration de canal fait référence à un plugin qui n'est plus découvrable mais que
le même identifiant de plugin périmé reste dans la configuration du plugin ou les enregistrements d'installation, le démarrage de la Gateway
enregistre des avertissements et ignore ce canal au lieu de bloquer tous les autres canaux.
Exécutez `openclaw doctor --fix` pour supprimer les entrées de canal/plugin périmées ; les clés de
canal inconnues sans preuve de plugin périmé échouent toujours à la validation, de sorte que les fautes de frappe restent
visibles.
Si `plugins.enabled: false` est défini, les références de plugins périmés sont traitées comme inertes :
le démarrage de la Gateway ignore le travail de découverte/chargement de plugin et `openclaw doctor` conserve
la configuration du plugin désactivé au lieu de la supprimer automatiquement. Réactivez les plugins avant
d'exécuter le nettoyage du doctor si vous souhaitez que les identifiants de plugins périmés soient supprimés.

L'installation des dépendances de plugins ne se produit que lors de flux d'installation/mise à jour explicites ou de réparation par doctor. Le démarrage du Gateway, le rechargement de la configuration et l'inspection d'exécution n'exécutent pas les gestionnaires de paquets ou ne réparent pas les arbres de dépendances. Les plugins locaux doivent déjà avoir leurs dépendances installées, tandis que les plugins npm, git et ClawHub sont installés sous les racines de plugins gérées par OpenClaw. Les dépendances npm peuvent être remontées dans la racine OpenClaw gérée par npm ; l'installation/mise à jour analyse cette racine gérée avant la vérification de confiance et la désinstallation supprime les paquets gérés par npm via npm. Les plugins externes et les chemins de chargement personnalisés doivent toujours être installés via `openclaw plugins install`.
Utilisez `openclaw plugins list --json` pour voir le `dependencyStatus` statique pour chaque
plugin visible sans importer le code d'exécution ni réparer les dépendances.
Voir [Résolution des dépendances de plugins](/fr/plugins/dependency-resolution) pour le
cycle de vie d'installation.

### Propriété du chemin de plugin bloquée

Si les diagnostics du plugin indiquent
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
et que la validation de la configuration suit avec `plugin present but blocked`, OpenClaw a
trouvé des fichiers de plugin appartenant à un utilisateur Unix différent de celui du processus qui les
charge. Conservez la configuration du plugin en place ; corrigez la propriété du système de fichiers ou exécutez
OpenClaw en tant que même utilisateur que celui qui possède le répertoire d'état.

Pour les installations Docker, l'image officielle s'exécute en tant que `node` (uid `1000`), donc les
répertoires de configuration et d'espace de travail OpenClaw montés en liaison sur l'hôte doivent normalement être
possédés par l'uid `1000` :

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

Si vous exécutez OpenClaw intentionnellement en tant que root, réparez la racine du plugin géré
pour la propriété root à la place :

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

Après avoir corrigé la propriété, relancez `openclaw doctor --fix` ou
`openclaw plugins registry --refresh` pour que le registre de plugins persistant corresponde
aux fichiers réparés.

Pour les installations npm, les sélecteurs modifiables tels que `latest` ou une dist-tag sont résolus
avant l'installation puis épinglés à la version exacte vérifiée dans la racine OpenClaw gérée par npm.
Une fois npm terminé, OpenClaw vérifie que l'entrée `package-lock.json` installée correspond toujours à la version et à l'intégrité résolues. Si
npm écrit des métadonnées de package différentes, l'installation échoue et le package géré
est restauré au lieu d'accepter un artefact de plugin différent.
Les racines npm gérées héritent également des OpenClaw `overrides` au niveau du package de npm, de sorte que
les goupilles de sécurité qui protègent l'hôte packagé s'appliquent également aux dépendances de plugin externes hissées.

Les extraits de source sont des espaces de travail pnpm. Si vous clonez OpenClaw pour modifier des plugins groupés,
exécutez `pnpm install` ; OpenClaw charge alors les plugins groupés à partir de
`extensions/<id>` afin que les modifications et les dépendances locales au package soient utilisées directement.
Les installations de racine npm classiques sont destinées à OpenClaw packagé, et non au développement à partir d'un extrait de source.

## Types de plugins

OpenClaw reconnaît deux formats de plugins :

| Format     | Fonctionnement                                                                   | Exemples                                               |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Natif**  | `openclaw.plugin.json` + module d'exécution ; s'exécute dans le processus        | Plugins officiels, packages communautaires npm         |
| **Bundle** | Mise en page compatible Codex/Claude/Cursor ; mappé aux fonctionnalités OpenClaw | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

Les deux apparaissent sous `openclaw plugins list`. Consultez [Plugin Bundles](/fr/plugins/bundles) pour plus de détails sur les bundles.

Si vous écrivez un plugin natif, commencez par [Building Plugins](/fr/plugins/building-plugins)
et la [Plugin SDK Overview](/fr/plugins/sdk-overview).

## Points d'entrée de package

Les packages de plugins natifs npm doivent déclarer npm`openclaw.extensions` dans `package.json`.
Chaque entrée doit rester à l'intérieur du répertoire du package et résoudre vers un fichier
runtime lisible, ou vers un fichier source TypeScript avec un homologue JavaScript construit déduit
tel que `src/index.ts` vers `dist/index.js`npm.
Les installations packagées doivent inclure cette sortie runtime JavaScript. Le repli sur la source
TypeScript est destiné aux checkouts de sources et aux chemins de développement local, et non pour
les packages npm installés dans la racine du plugin géré par OpenClaw.

Si un avertissement de package géré indique qu'il `requires compiled runtime output for
TypeScript entry ...`, c'est que le package a été publié sans les fichiers JavaScript
dont OpenClaw a besoin lors de l'exécution. Il s'agit d'un problème de packaging du plugin,
et non d'un problème de configuration locale. Mettez à jour ou réinstallez le plugin une fois que
l'éditeur a republié le JavaScript compilé, ou désinstallez ce plugin jusqu'à ce qu'un package corrigé
soit disponible.

Utilisez `openclaw.runtimeExtensions` lorsque les fichiers runtime publiés ne résident pas aux
mêmes chemins que les entrées source. Lorsqu'il est présent, `runtimeExtensions` doit contenir
exactement une entrée pour chaque entrée `extensions`. Des listes non concordantes entraînent
l'échec de l'installation et de la découverte du plugin plutôt que de revenir silencieusement aux
chemins source. Si vous publiez également `openclaw.setupEntry`, utilisez `openclaw.runtimeSetupEntry`
pour son homologue JavaScript construit ; ce fichier est requis lorsqu'il est déclaré.

```json
{
  "name": "@acme/openclaw-plugin",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"]
  }
}
```

## Plugins officiels

### Packages npm détenus par OpenClawnpm pendant la migration

ClawHub est le principal canal de distribution pour la plupart des plugins. Les versions
actuelles packagées de OpenClaw incluent déjà de nombreux plugins officiels, ceux-ci n'ont donc pas
besoin d'installations npm séparées dans les configurations normales. Jusqu'à ce que chaque
plugin détenu par OpenClaw ait migré vers ClawHub, OpenClaw livre encore
certains packages de plugins `@openclaw/*` sur npm pour les installations plus anciennes/personnalisées
et les workflows npm directs.

Si npm signale un paquet de plugin `@openclaw/*` comme obsolète, cette version du paquet provient d'un ancien train de paquets externe. Utilisez le plugin inclus dans la version actuelle de OpenClaw ou une extraction locale jusqu'à ce qu'un paquet npm plus récent soit publié.

| Plugin          | Paquet                     | Docs                                          |
| --------------- | -------------------------- | --------------------------------------------- |
| Discord         | `@openclaw/discord`        | [Discord](/fr/channels/discord)               |
| Feishu          | `@openclaw/feishu`         | [Feishu](/fr/channels/feishu)                 |
| Matrix          | `@openclaw/matrix`         | [Matrix](/fr/channels/matrix)                 |
| Mattermost      | `@openclaw/mattermost`     | [Mattermost](/fr/channels/mattermost)         |
| Microsoft Teams | `@openclaw/msteams`        | [Microsoft Teams](/fr/channels/msteams)       |
| Nextcloud Talk  | `@openclaw/nextcloud-talk` | [Nextcloud Talk](/fr/channels/nextcloud-talk) |
| Nostr           | `@openclaw/nostr`          | [Nostr](/fr/channels/nostr)                   |
| Synology Chat   | `@openclaw/synology-chat`  | [Synology Chat](/fr/channels/synology-chat)   |
| Tlon            | `@openclaw/tlon`           | [Tlon](/fr/channels/tlon)                     |
| WhatsApp        | `@openclaw/whatsapp`       | [WhatsApp](/fr/channels/whatsapp)             |
| Zalo            | `@openclaw/zalo`           | [Zalo](/fr/channels/zalo)                     |
| Zalo Personal   | `@openclaw/zalouser`       | [Zalo Personal](/fr/plugins/zalouser)         |

### Core (livré avec OpenClaw)

<AccordionGroup>
  <Accordion title="Fournisseurs de modèles (activés par défaut)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

  <Accordion title="Plugins de mémoire">
    - `memory-core` - recherche de mémoire intégrée (par défaut via `plugins.slots.memory`)
    - `memory-lancedb` - mémoire à long terme basée sur LanceDB avec rappel/capture automatiques (définir `plugins.slots.memory = "memory-lancedb"`)

    Voir [Memory LanceDB](/fr/plugins/memory-lancedb) pour la configuration des embeddings compatibles avec OpenAI,
    les exemples Ollama, les limites de rappel et le troubleshooting.

  </Accordion>

<Accordion title="Fournisseurs de synthèse vocale (activés par défaut)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Autre">
    - `browser` - plugin de navigateur intégré pour l'outil de navigateur, `openclaw browser` CLI, la méthode de passerelle `browser.request`, le runtime du navigateur et le service de contrôle du navigateur par défaut (activé par défaut ; désactiver avant de le remplacer)
    - `copilot-proxy` - pont proxy VS Code Copilot (désactivé par défaut)

  </Accordion>
</AccordionGroup>

Vous recherchez des plugins tiers ? Consultez [ClawHub](/fr/clawhub).

## Configuration

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| Champ              | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| `enabled`          | Interrupteur principal (par défaut : `true`)                               |
| `allow`            | Liste d'autorisation de plugins (facultatif)                               |
| `bundledDiscovery` | Mode de découverte des plugins groupés (`allowlist` par défaut)            |
| `deny`             | Liste de refus de plugins (facultatif ; la priorité est donnée au refus)   |
| `load.paths`       | Fichiers/répertoires de plugins supplémentaires                            |
| `slots`            | Sélecteurs d'emplacement exclusifs (par exemple `memory`, `contextEngine`) |
| `entries.\<id\>`   | Interrupteurs + configuration par plugin                                   |

`plugins.allow` est exclusif. Lorsqu'il n'est pas vide, seuls les plugins répertoriés peuvent être chargés
ou exposer des outils, même si `tools.allow` contient `"*"` ou un nom d'outil
détenu par un plugin spécifique. Si une liste d'autorisation d'outils référence des outils de plugin, ajoutez les identifiants des plugins propriétaires
à `plugins.allow` ou supprimez `plugins.allow` ; `openclaw doctor` avertit concernant cette
structure.

`plugins.bundledDiscovery` est défini par défaut sur `"allowlist"` pour les nouvelles configurations, donc un
inventaire `plugins.allow` restrictif bloque également les providers de plugins groupés omis,
y compris la découverte du provider de recherche web à l'exécution. Le Doctor appose un `"compat"` sur les anciennes configurations de liste d'autorisation restrictives lors de la migration afin que les mises à niveau conservent
le comportement hérité des providers groupés jusqu'à ce que l'opérateur opte pour le mode plus strict.
Un `plugins.allow` vide est toujours considéré comme non défini/ouvert.

Les modifications de configuration effectuées via `/plugins enable` ou `/plugins disable` déclenchent un
rechargement du plugin Gateway en cours de processus. Les nouveaux tours d'agent reconstruisent leur liste d'outils à partir du
registre de plugins actualisé. Les opérations modifiant la source telles que l'installation,
la mise à jour et la désinstallation redémarrent toujours le processus Gateway car les modules de plugin
déjà importés ne peuvent pas être remplacés en toute sécurité sur place.

`openclaw plugins list` est un instantané local du registre/de configuration des plugins. Un plugin `enabled`Gateway présent signifie que le registre persisté et la configuration actuelle autorisent la participation du plugin. Cela ne prouve pas qu'un Gateway distant déjà en cours d'exécution a rechargé ou redémarré avec le même code de plugin. Sur les configurations VPS/conteneur avec des processus wrappers, envoyez des redémarrages ou des écritures déclenchant un rechargement au processus `openclaw gateway run` réel, ou utilisez `openclaw gateway restart`Gateway contre le Gateway en cours d'exécution lorsque le rechargement signale un échec.

<Accordion title="Plugin states: disabled vs missing vs invalid"Gateway>
  - **Disabled** : le plugin existe mais les règles d'activation l'ont désactivé. La configuration est préservée.
  - **Missing** : la configuration fait référence à un id de plugin que la découverte n'a pas trouvé.
  - **Invalid** : le plugin existe mais sa configuration ne correspond pas au schéma déclaré. Le démarrage du Gateway ignore uniquement ce plugin ; `openclaw doctor --fix` peut mettre en quarantaine l'entrée invalide en la désactivant et en supprimant sa charge utile de configuration.

</Accordion>

## Discovery et précédence

OpenClaw recherche les plugins dans cet ordre (la première correspondance l'emporte) :

<Steps>
  <Step title="Config paths">
    `plugins.load.paths`OpenClaw - chemins de fichier ou de répertoire explicites. Les chemins qui pointent vers les propres répertoires de plugins groupés empaquetés d'OpenClaw sont ignorés ;
    exécutez `openclaw doctor --fix` pour supprimer ces alias obsolètes.
  </Step>

  <Step title="Workspace plugins">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` et `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Global plugins">
    `~/.openclaw/<plugin-root>/*.ts` et `~/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Bundled plugins"OpenClaw>
    Livré avec OpenClaw. Beaucoup sont activés par défaut (fournisseurs de modèle, synthèse vocale).
    D'autres nécessitent une activation explicite.
  </Step>
</Steps>

Les installations empaquetées et les images Docker résolvent généralement les plugins groupés à partir de l'arborescence Docker`dist/extensions` compilée. Si un répertoire source de plugin groupé est monté en liaison (bind-mounted) sur le chemin source empaqueté correspondant, par exemple `/app/extensions/synology-chat`OpenClaw, OpenClaw traite ce répertoire source monté comme une superposition de source groupée et le découvre avant le bundle `/app/dist/extensions/synology-chat` empaqueté. Cela permet aux boucles de conteneur des mainteneurs de fonctionner sans avoir à remettre chaque plugin groupé en source TypeScript. Définissez `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` pour forcer les bundles dist empaquetés même lorsque les montages de superposition de source sont présents.

### Règles d'activation

- `plugins.enabled: false` désactive tous les plugins et ignore le travail de découverte/chargement des plugins
- `plugins.deny` l'emporte toujours sur la permission (allow)
- `plugins.entries.\<id\>.enabled: false` désactive ce plugin
- Les plugins originaires de l'espace de travail sont **désactivés par défaut** (doivent être explicitement activés)
- Les plugins groupés suivent l'ensemble activé par défaut intégré, sauf s'ils sont remplacés
- Les créneaux exclusifs peuvent forcer l'activation du plugin sélectionné pour ce créneau
- Certains plugins groupés optionnels sont activés automatiquement lorsque la configuration nomme une surface détenue par un plugin, telle qu'une référence de modèle de fournisseur, une configuration de canal, ou un runtime de harnais
- La configuration obsolète du plugin est conservée tant que `plugins.enabled: false` est actif ; réactivez les plugins avant d'exécuter le nettoyage du docteur si vous souhaitez que les identifiants obsolètes soient supprimés
- Les routes Codex de la famille OpenAI conservent des limites de plugin séparées : OpenAI`openai-codex/*`OpenAI appartient au plugin OpenAI, tandis que le plugin de serveur d'application Codex groupé est sélectionné par des références d'agent `openai/*` canoniques, un fournisseur/modèle `agentRuntime.id: "codex"` explicite, ou des références de modèle `codex/*` héritées

## Dépannage des crochets d'exécution (runtime hooks)

Si un plugin apparaît dans `plugins list` mais que les effets secondaires ou les crochets `register(api)` ne s'exécutent pas dans le trafic de chat en direct, vérifiez d'abord ceci :

- Exécutez `openclaw gateway status --deep --require-rpc`Gateway et confirmez que l'URL Gateway active, le profil, le chemin de configuration et le processus sont ceux que vous modifiez.
- Redémarrez le Gateway en direct après l'installation, la configuration ou la modification du code d'un plugin. Dans les conteneurs d'encapsulation, PID 1 peut n'être qu'un superviseur ; redémarrez ou envoyez un signal au processus `openclaw gateway run`.
- Utilisez `openclaw plugins inspect <id> --runtime --json` pour confirmer les enregistrements de hooks et les diagnostics. Les hooks de conversation non regroupés tels que `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `llm_input`, `llm_output`, `before_agent_finalize` et `agent_end` nécessitent `plugins.entries.<id>.hooks.allowConversationAccess=true`.
- Pour le changement de modèle, préférez `before_model_resolve`. Il s'exécute avant la résolution du modèle pour les tours de l'agent ; `llm_output` ne s'exécute qu'après qu'une tentative de modèle a produit une sortie de l'assistant.
- Pour preuve du modèle de session effectif, utilisez `openclaw sessions` ou les surfaces de session/statut du Gateway et, lors du débogage des charges utiles du fournisseur, démarrez le Gateway avec `--raw-stream --raw-stream-path <path>`.

### Configuration lente des outils de plugin

Si les tours de l'agent semblent bloquer lors de la préparation des outils, activez la journalisation de trace et recherchez les lignes de synchronisation de la fabrique d'outils de plugin :

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

Recherchez :

```text
[trace:plugin-tools] factory timings ...
```

Le résumé indique le temps total de la fabrique et les fabriques d'outils de plugin les plus lentes, y compris l'identifiant du plugin, les noms des outils déclarés, la forme du résultat et si l'outil est facultatif. Les lignes lentes sont promues en avertissements lorsqu'une seule fabrique prend au moins 1 seconde ou lorsque la préparation totale de la fabrique d'outils de plugin prend au moins 5 secondes.

OpenClaw met en cache les résultats réussis de la fabrique d'outils de plugin pour les résolutions répétées avec le même contexte de requête effectif. La clé de cache inclut la configuration d'exécution effective, l'espace de travail, les identifiants d'agent/session, la stratégie de sandbox, les paramètres du navigateur, le contexte de livraison, l'identité du demandeur et l'état de propriété, de sorte que les fabriques qui dépendent de ces champs de confiance sont réexécutées lorsque le contexte change.

Si un plugin domine le timing, inspectez ses enregistrements d'exécution :

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

Ensuite, mettez à jour, réinstallez ou désactivez ce plugin. Les auteurs de plugins devraient déplacer le chargement des dépendances coûteuses derrière le chemin d'exécution de l'outil au lieu de le faire à l'intérieur de la fabrique d'outils.

### Duplication de la propriété de channel ou d'outil

Symptômes :

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

Cela signifie que plus d'un plugin activé essaie de posséder le même canal,
flux de configuration ou nom d'outil. La cause la plus fréquente est un plugin de
canal externe installé à côté d'un plugin groupé qui fournit désormais le même
identifiant de canal.

Étapes de débogage :

- Exécutez `openclaw plugins list --enabled --verbose` pour voir chaque plugin activé
  et son origine.
- Exécutez `openclaw plugins inspect <id> --runtime --json` pour chaque plugin suspect et
  comparez `channels`, `channelConfigs`, `tools` et les diagnostics.
- Exécutez `openclaw plugins registry --refresh` après l'installation ou la suppression
  de packages de plugins afin que les métadonnées persistantes reflètent
  l'installation actuelle.
- Redémarrez la Gateway après l'installation, des modifications du registre ou de la configuration.

Options de correction :

- Si un plugin remplace intentionnellement un autre pour le même identifiant de canal,
  le plugin préféré doit déclarer `channelConfigs.<channel-id>.preferOver` avec
  l'identifiant du plugin de priorité inférieure. Voir [/plugins/manifest#replacing-another-channel-plugin](/fr/plugins/manifest#replacing-another-channel-plugin).
- Si le doublon est accidentel, désactivez l'un des côtés avec
  `plugins.entries.<plugin-id>.enabled: false` ou supprimez l'installation
  du plugin obsolète.
- Si vous avez explicitement activé les deux plugins, OpenClaw conserve cette demande
  et signale le conflit. Choisissez un seul propriétaire pour le canal ou renommez
  les outils détenus par les plugins afin que la surface d'exécution soit sans ambiguïté.

## Emplacements de plugin (catégories exclusives)

Certaines catégories sont exclusives (une seule active à la fois) :

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable
      contextEngine: "legacy", // or a plugin id
    },
  },
}
```

| Emplacement     | Ce qu'il contrôle        | Par défaut         |
| --------------- | ------------------------ | ------------------ |
| `memory`        | Plugin de mémoire actif  | `memory-core`      |
| `contextEngine` | Moteur de contexte actif | `legacy` (intégré) |

## Référence de la CLI

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only enabled plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins search <query>            # search ClawHub plugin catalog
openclaw plugins inspect <id>              # static detail
openclaw plugins inspect <id> --runtime    # registered hooks/tools/CLI/gateway methods
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics
openclaw plugins registry                  # inspect persisted registry state
openclaw plugins registry --refresh        # rebuild persisted registry
openclaw doctor --fix                      # repair plugin registry state

openclaw plugins install <package>         # install from npm by default
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install npm:<pkg>         # install from npm only
openclaw plugins install git:<repo>        # install from git
openclaw plugins install git:<repo>@<ref>  # install from git ref
openclaw plugins install <spec> --force    # overwrite existing install
openclaw plugins install <path>            # install from local path
openclaw plugins install -l <path>         # link (no copy) for dev
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # record exact resolved npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id-or-npm-spec> # update one plugin
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config and plugin index records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

# Verify runtime registrations after install.
openclaw plugins inspect <id> --runtime --json

# Run plugin-owned CLI commands directly from the OpenClaw root CLI.
openclaw <plugin-command> --help

openclaw plugins enable <id>
openclaw plugins disable <id>
```

Les plugins groupés sont fournis avec OpenClaw. Beaucoup sont activés par défaut (par exemple,
les fournisseurs de modèles groupés, les fournisseurs de reconnaissance vocale groupés et le plugin de
navigateur groupé). D'autres plugins groupés nécessitent toujours `openclaw plugins enable <id>`.

`--force` remplace un plugin ou un pack de hooks installé existant sur place. Utilisez
`openclaw plugins update <id-or-npm-spec>` pour les mises à niveau de routine des plugins npm
suivis. Cela n'est pas pris en charge avec `--link`, qui réutilise le chemin source au lieu
de copier vers une cible d'installation gérée.

Lorsque `plugins.allow` est déjà défini, `openclaw plugins install` ajoute l'identifiant
du plugin installé à cette liste d'autorisation avant de l'activer. Si le même identifiant de plugin
est présent dans `plugins.deny`, l'installation supprime cette entrée de refus obsolète afin que
l'installation explicite soit immédiatement chargeable après redémarrage.

OpenClaw conserve un registre local persistant de plugins en tant que modèle de lecture à froid
pour l'inventaire des plugins, la propriété des contributions et la planification du démarrage. Les flux d'installation, de mise à jour,
de désinstallation, d'activation et de désactivation actualisent ce registre après modification de l'état du
plugin. Le même fichier `plugins/installs.json` conserve des métadonnées d'installation durables dans
`installRecords` de premier niveau et des métadonnées de manifeste reconstructibles dans `plugins`. Si
le registre est manquant, obsolète ou invalide, `openclaw plugins registry
--refresh` reconstruit sa vue de manifeste à partir des enregistrements d'installation, de la stratégie de configuration et
des métadonnées de manifeste/de package sans charger les modules d'exécution du plugin.

En mode Nix (Nix`OPENCLAW_NIX_MODE=1`Nix), les modificateurs de cycle de vie des plugins sont désactivés.
Gérez la sélection et la configuration des packages de plugins via la source Nix pour
l'installation à la place ; pour nix-openclaw, commencez par le guide de démarrage rapide
[Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) axé sur l'agent.
`openclaw plugins update <id-or-npm-spec>`npmnpmOpenClaw s'applique aux installations suivies. Le passage d'une
spécification de package npm avec un dist-tag ou une version exacte résout le nom du package
revenir à l'enregistrement du plugin suivi et enregistre la nouvelle spécification pour les futures mises à jour.
Passer le nom du package sans version ramène une installation épinglée exacte à la
ligne de publication par défaut du registre. Si le plugin npm installé correspond déjà à
la version résolue et à l'identité de l'artefact enregistré, OpenClaw ignore la mise à jour
sans télécharger, réinstaller ou réécrire la configuration.
Lorsque `openclaw update`npmClawHub s'exécute sur le canal bêta, les enregistrements de plugins npm et ClawHub
de la ligne par défaut essaient d'abord `@beta` et reviennent par défaut/dernière version (default/latest) si aucune version bêta
de plugin n'existe. Les versions exactes et les balises explicites restent épinglées.

`--pin`npm est réservé à npm. Il n'est pas pris en charge avec `--marketplace`npm, car
les installations de la marketplace persistent les métadonnées de source de la marketplace au lieu d'une spécification npm.

`--dangerously-force-unsafe-install` est une contremesure de rupture pour les faux
positifs du scanner de code dangereux intégré. Il permet aux installations et mises à jour de plugins
de continuer après les constatations `critical` intégrées, mais il ne contourne
pas pour autant les blocages de stratégie de plugin `before_install` ou le blocage en cas d'échec de l'analyse.
Les analyses d'installation ignorent les fichiers et répertoires de test courants tels que `tests/`,
`__tests__/`, `*.test.*` et `*.spec.*` pour éviter de bloquer les simulations de test empaquetées ;
les points d'entrée d'exécution de plugin déclarés sont toujours analysés même s'ils utilisent l'un de
ces noms.

Ce drapeau CLI s'applique uniquement aux flux d'installation/de mise à jour de plugins. Les installations de dépendances de compétences prises en charge par Gateway utilisent à la place la substitution de requête `dangerouslyForceUnsafeInstall` correspondante, tandis que `openclaw skills install` reste le flux de téléchargement/installation de compétences ClawHub distinct.

Si un plugin que vous avez publié sur ClawHub est masqué ou bloqué par une analyse, ouvrez le tableau de bord ClawHub ou exécutez `clawhub package rescan <name>` pour demander à ClawHub de le vérifier à nouveau. `--dangerously-force-unsafe-install` n'affecte que les installations sur votre propre machine ; il ne demande pas à ClawHub de réanalyser le plugin ou de rendre une version bloquée publique.

Les bundles compatibles participent au même flux de liste/inspection/activation/désactivation de plugins. La prise en charge de l'exécution actuelle inclut les compétences de bundle, les compétences de commande Claude, les valeurs par défaut `settings.json` de Claude, `.lsp.json` et les valeurs par défaut `lspServers` déclarées dans le manifeste, les compétences de commande Cursor et les répertoires de hooks Codex compatibles.

`openclaw plugins inspect <id>` signale également les capacités de bundle détectées ainsi que les entrées de serveur MCP et LSP prises en charge ou non prises en charge pour les plugins soutenus par un bundle.

Les sources de la place de marché peuvent être un nom de place de marché connue de Claude provenant de `~/.claude/plugins/known_marketplaces.json`, un chemin racine de place de marché local ou `marketplace.json`, une sténographie GitHub telle que `owner/repo`, une URL de dépôt GitHub ou une URL git. Pour les places de marché distantes, les entrées de plugins doivent rester à l'intérieur du dépôt de place de marché cloné et utiliser uniquement des sources de chemin relatif.

Consultez la [référence CLI `openclaw plugins`](/fr/cli/plugins) pour plus de détails.

## Aperçu de l'API des plugins

Les plugins natifs exportent un objet d'entrée qui expose `register(api)`. Les plugins plus anciens peuvent encore utiliser `activate(api)` comme un alias hérité, mais les nouveaux plugins devraient utiliser `register`.

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

OpenClaw charge l'objet d'entrée et appelle OpenClaw`register(api)` lors de l'activation du plugin. Le chargeur revient encore à `activate(api)` pour les plugins plus anciens, mais les plugins groupés et les nouveaux plugins externes devraient traiter `register` comme le contrat public.

`api.registrationMode` indique à un plugin pourquoi son entrée est chargée :

| Mode            | Signification                                                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`          | Activation de l'exécution. Enregistrez les outils, hooks, services, commandes, routes et autres effets secondaires en direct.                                                                   |
| `discovery`     | Découverte des capacités en lecture seule. Enregistrez les fournisseurs et les métadonnées ; le code d'entrée de plugin approuvé peut se charger, mais sautez les effets secondaires en direct. |
| `setup-only`    | Chargement des métadonnées de configuration de canal via une entrée de configuration légère.                                                                                                    |
| `setup-runtime` | Chargement de la configuration de canal qui nécessite également l'entrée d'exécution.                                                                                                           |
| `cli-metadata`  | Collection de métadonnées de commande CLI uniquement.                                                                                                                                           |

Les entrées de plugin qui ouvrent des sockets, des bases de données, des travailleurs en arrière-plan ou des clients à longue durée de vie doivent protéger ces effets secondaires avec `api.registrationMode === "full"`GatewayOpenClaw. Les chargements de découverte sont mis en cache séparément des chargements d'activation et ne remplacent pas le registre Gateway en cours d'exécution. La découverte est non-activante, et non sans importation : OpenClaw peut évaluer l'entrée de plugin approuvée ou le module de plugin de canal pour construire l'instantané. Gardez les niveaux supérieurs des modules légers et sans effets secondaires, et déplacez les clients réseau, les sous-processus, les écouteurs, les lectures d'identifiants et le démarrage des services derrière les chemins d'exécution complète.

Méthodes d'enregistrement courantes :

| Méthode                                 | Ce qu'elle enregistre                   |
| --------------------------------------- | --------------------------------------- |
| `registerProvider`                      | Fournisseur de modèle (LLM)             |
| `registerChannel`                       | Canal de chat                           |
| `registerTool`                          | Outil d'agent                           |
| `registerHook` / `on(...)`              | Hooks de cycle de vie                   |
| `registerSpeechProvider`                | Synthèse vocale / STT                   |
| `registerRealtimeTranscriptionProvider` | STT en continu                          |
| `registerRealtimeVoiceProvider`         | Voix en temps réel duplex               |
| `registerMediaUnderstandingProvider`    | Analyse d'image/audio                   |
| `registerImageGenerationProvider`       | Génération d'images                     |
| `registerMusicGenerationProvider`       | Génération de musique                   |
| `registerVideoGenerationProvider`       | Génération vidéo                        |
| `registerWebFetchProvider`              | Provider de récupération / scraping Web |
| `registerWebSearchProvider`             | Recherche Web                           |
| `registerHttpRoute`                     | Point de terminaison HTTP               |
| `registerCommand` / `registerCli`       | Commandes CLI                           |
| `registerContextEngine`                 | Moteur de contexte                      |
| `registerService`                       | Service d'arrière-plan                  |

Comportement de garde des hooks pour les hooks de cycle de vie typés :

- `before_tool_call` : `{ block: true }` est terminal ; les gestionnaires de moindre priorité sont ignorés.
- `before_tool_call` : `{ block: false }` est une opération vide et ne supprime pas un blocage antérieur.
- `before_install` : `{ block: true }` est terminal ; les gestionnaires de moindre priorité sont ignorés.
- `before_install` : `{ block: false }` est une opération vide et ne supprime pas un blocage antérieur.
- `message_sending` : `{ cancel: true }` est terminal ; les gestionnaires de moindre priorité sont ignorés.
- `message_sending` : `{ cancel: false }` est une opération vide et ne supprime pas une annulation antérieure.

Le serveur d'application Codex natif exécute un pont renvoyant les événements d'outils natifs Codex vers cette surface de hook. Les plugins peuvent bloquer les outils natifs Codex via `before_tool_call`, observer les résultats via `after_tool_call` et participer aux approbations Codex `PermissionRequest`. Le pont ne réécrit pas encore les arguments des outils natifs Codex. La limite exacte de support d'exécution Codex se trouve dans le [contrat de support du harnais Codex v1](/fr/plugins/codex-harness-runtime#v1-support-contract).

Pour le comportement complet des hooks typés, consultez [Aperçu du SDK](/fr/plugins/sdk-overview#hook-decision-semantics).

## Connexes

- [Création de plugins](/fr/plugins/building-plugins) - créer votre propre plugin
- [Bundles de plugins](/fr/plugins/bundles) - compatibilité des bundles Codex/Claude/Cursor
- [Manifeste de plugin](/fr/plugins/manifest) - schéma du manifeste
- [Enregistrement d'outils](/fr/plugins/building-plugins#registering-agent-tools) - ajouter des outils d'agent dans un plugin
- [Fonctionnement interne des plugins](/fr/plugins/architecture) - modèle de capacités et pipeline de chargement
- [ClawHub](ClawHub/en/clawhub) - découverte de plugins tiers
