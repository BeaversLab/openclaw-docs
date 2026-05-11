---
summary: "Aperçu de la configuration : tâches courantes, configuration rapide et liens vers la référence complète"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "Configuration"
---

OpenClaw lit une configuration optionnelle <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> à partir de `~/.openclaw/openclaw.json`.
Le chemin de configuration actif doit être un fichier régulier. Les configurations `openclaw.json` liées par lien symbolique ne sont pas prises en charge pour les écritures owned par OpenClaw ; une écriture atomique peut remplacer
le chemin au lieu de préserver le lien symbolique. Si vous conservez la configuration en dehors du
dossier d'état par défaut, pointez `OPENCLAW_CONFIG_PATH` directement vers le fichier réel.

Si le fichier est manquant, OpenClaw utilise des valeurs par défaut sûres. Raisons courantes d'ajouter une configuration :

- Connecter des canaux et contrôler qui peut envoyer des messages au bot
- Définir les modèles, outils, sandboxing ou automatisation (cron, hooks)
- Ajuster les sessions, médias, réseau ou interface utilisateur

Voir la [référence complète](/fr/gateway/configuration-reference) pour chaque champ disponible.

Les agents et l'automatisation doivent utiliser `config.schema.lookup` pour une documentation exacte au niveau des champs
avant de modifier la configuration. Utilisez cette page pour une guidance orientée tâche et
la [Référence de configuration](/fr/gateway/configuration-reference) pour la carte des champs plus large et les valeurs par défaut.

<Tip>**Nouveau dans la configuration ?** Commencez avec `openclaw onboard` pour une configuration interactive, ou consultez le guide [Exemples de configuration](/fr/gateway/configuration-examples) pour des configurations complètes copier-coller.</Tip>

## Configuration minimale

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## Modification de la configuration

<Tabs>
  <Tab title="Assistant interactif">```bash openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLI (one-liners)">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Interface de contrôle">
    Ouvrez [http://127.0.0.1:18789](http://127.0.0.1:18789) et utilisez l'onglet **Config**. L'interface de contrôle génère un formulaire à partir du schéma de configuration en direct, incluant les métadonnées de documentation des champs `title` / `description` ainsi que les schémas de plugin et de channel lorsque disponibles, avec un éditeur **JSON brut** comme échappatoire. Pour les interfaces
    d'exploration et d'autres outils, la passerelle expose également `config.schema.lookup` pour récupérer un nœud de schéma délimité par un chemin plus les résumés des enfants immédiats.
  </Tab>
  <Tab title="Édition directe">Modifiez `~/.openclaw/openclaw.json` directement. Le Gateway surveille le fichier et applique les modifications automatiquement (voir [hot reload](#config-hot-reload)).</Tab>
</Tabs>

## Validation stricte

<Warning>OpenClaw n'accepte que les configurations correspondant entièrement au schéma. Les clés inconnues, les types malformés ou les valeurs non valides font que le Gateway **refuse de démarrer**. La seule exception au niveau racine est `$schema` (chaîne), afin que les éditeurs puissent attacher des métadonnées JSON Schema.</Warning>

`openclaw config schema` affiche le schéma JSON canonique utilisé par l'interface de contrôle et la validation. `config.schema.lookup` récupère un seul nœud délimité par un chemin ainsi que les résumés des enfants pour les outils d'exploration. Les métadonnées de documentation des champs `title`/`description` se propagent à travers les objets imbriqués, les caractères génériques (`*`), les éléments de tableau (`[]`) et les branches `anyOf`/
`oneOf`/`allOf`. Les schémas de plugin et de channel d'exécution sont fusionnés lors du chargement du registre des manifestes.

En cas d'échec de la validation :

- Le Gateway ne démarre pas
- Seules les commandes de diagnostic fonctionnent (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Exécutez `openclaw doctor` pour voir les problèmes exacts
- Exécutez `openclaw doctor --fix` (ou `--yes`) pour appliquer les réparations

Le Gateway conserve une copie de confiance saine connue après chaque démarrage réussi.
Si `openclaw.json` échoue ultérieurement à la validation (ou perd `gateway.mode`, diminue
brusquement, ou a une ligne de journal parasite ajoutée au début), OpenClaw conserve le fichier cassé
sous `.clobbered.*`, restaure la copie saine connue et consigne la raison de la récupération.
Le prochain tour de l'agent reçoit également un avertissement d'événement système afin que l'agent principal
ne réécrive pas aveuglément la configuration restaurée. La promotion vers le statut sain connue
est ignorée lorsqu'un candidat contient des espaces réservés de secrets rédactés tels que `***`.
Lorsque chaque problème de validation est limité à `plugins.entries.<id>...`, OpenClaw
n'effectue pas de récupération de fichier entier. Il maintient la configuration actuelle active
et expose l'échec local au plug-in afin qu'une inadéquation du schéma de plug-in ou de la version de l'hôte
ne puisse pas annuler les paramètres utilisateur non liés.

## Tâches courantes

<AccordionGroup>
  <Accordion title="Configurer un canal (WhatsApp, Telegram, Discord, etc.)">
    Chaque canal possède sa propre section de configuration sous `channels.<provider>`. Consultez la page dédiée au canal pour les étapes de configuration :

    - [WhatsApp](/fr/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/fr/channels/telegram) — `channels.telegram`
    - [Discord](/fr/channels/discord) — `channels.discord`
    - [Feishu](/fr/channels/feishu) — `channels.feishu`
    - [Google Chat](/fr/channels/googlechat) — `channels.googlechat`
    - [Microsoft Teams](/fr/channels/msteams) — `channels.msteams`
    - [Slack](/fr/channels/slack) — `channels.slack`
    - [Signal](/fr/channels/signal) — `channels.signal`
    - [iMessage](/fr/channels/imessage) — `channels.imessage`
    - [Mattermost](/fr/channels/mattermost) — `channels.mattermost`

    Tous les canaux partagent le même modèle de stratégie DM :

    ```json5
    {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:abc",
          dmPolicy: "pairing",   // pairing | allowlist | open | disabled
          allowFrom: ["tg:123"], // only for allowlist/open
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Choose and configure models">
    Définissez le modèle principal et les replis optionnels :

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-5.4"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.4": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` définit le catalogue de modèles et agit comme la liste d'autorisation pour `/model`.
    - Utilisez `openclaw config set agents.defaults.models '<json>' --strict-json --merge` pour ajouter des entrées à la liste d'autorisation sans supprimer les modèles existants. Les remplacements simples qui supprimeraient des entrées sont rejetés, sauf si vous passez `--replace`.
    - Les références de modèle utilisent le format `provider/model` (ex. `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` contrôle la réduction d'échelle des images de transcription/outils (défaut `1200`) ; des valeurs plus faibles réduisent généralement l'utilisation des jetons de vision lors des exécutions avec de nombreuses captures d'écran.
    - Voir [Models CLI](/fr/concepts/models) pour changer de modèles dans le chat et [Model Failover](/fr/concepts/model-failover) pour la rotation de l'authentification et le comportement de repli.
    - Pour les fournisseurs personnalisés/auto-hébergés, voir [Custom providers](/fr/gateway/config-tools#custom-providers-and-base-urls) dans la référence.

  </Accordion>

  <Accordion title="Control who can message the bot">
    L'accès aux RPC est contrôlé par canal via `dmPolicy` :

    - `"pairing"` (défaut) : les expéditeurs inconnus reçoivent un code d'appariement unique à approuver
    - `"allowlist"` : uniquement les expéditeurs dans `allowFrom` (ou le stockage d'autorisation apparié)
    - `"open"` : autoriser tous les RPC entrants (nécessite `allowFrom: ["*"]`)
    - `"disabled"` : ignorer tous les RPC

    Pour les groupes, utilisez `groupPolicy` + `groupAllowFrom` ou des listes d'autorisation spécifiques au canal.

    Voir la [référence complète](/fr/gateway/config-channels#dm-and-group-access) pour les détails par canal.

  </Accordion>

  <Accordion title="Configurer le filtrage des mentions dans les conversations de groupe">
    Par défaut, les messages de groupe **nécessitent une mention**. Configurez les modèles par agent :

    ```json5
    {
      agents: {
        list: [
          {
            id: "main",
            groupChat: {
              mentionPatterns: ["@openclaw", "openclaw"],
            },
          },
        ],
      },
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```

    - **Mentions de métadonnées** : mentions natives @ (appuyer pour mentionner sur WhatsApp, @bot sur Telegram, etc.)
    - **Modèles de texte** : modèles d'expressions régulières sûrs dans `mentionPatterns`
    - Consultez la [référence complète](/fr/gateway/config-channels#group-chat-mention-gating) pour les substitutions par canal et le mode de chat avec soi-même.

  </Accordion>

  <Accordion title="Restreindre les compétences par agent">
    Utilisez `agents.defaults.skills` pour une base de référence partagée, puis remplacez les paramètres pour des agents spécifiques avec `agents.list[].skills` :

    ```json5
    {
      agents: {
        defaults: {
          skills: ["github", "weather"],
        },
        list: [
          { id: "writer" }, // inherits github, weather
          { id: "docs", skills: ["docs-search"] }, // replaces defaults
          { id: "locked-down", skills: [] }, // no skills
        ],
      },
    }
    ```

    - Omettez `agents.defaults.skills` pour des compétences illimitées par défaut.
    - Omettez `agents.list[].skills` pour hériter des valeurs par défaut.
    - Définissez `agents.list[].skills: []` pour aucune compétence.
    - Consultez [Skills](/fr/tools/skills), [Configuration des Skills](/fr/tools/skills-config) et la
      [Référence de configuration](/fr/gateway/config-agents#agents-defaults-skills).

  </Accordion>

  <Accordion title="Ajuster la surveillance de l'état de santé des canaux de la passerelle">
    Contrôlez la fréquence à laquelle la passerelle redémarre les canaux qui semblent obsolètes :

    ```json5
    {
      gateway: {
        channelHealthCheckMinutes: 5,
        channelStaleEventThresholdMinutes: 30,
        channelMaxRestartsPerHour: 10,
      },
      channels: {
        telegram: {
          healthMonitor: { enabled: false },
          accounts: {
            alerts: {
              healthMonitor: { enabled: true },
            },
          },
        },
      },
    }
    ```

    - Définissez `gateway.channelHealthCheckMinutes: 0` pour désactiver les redémarrages du moniteur de santé globalement.
    - `channelStaleEventThresholdMinutes` doit être supérieur ou égal à l'intervalle de vérification.
    - Utilisez `channels.<provider>.healthMonitor.enabled` ou `channels.<provider>.accounts.<id>.healthMonitor.enabled` pour désactiver les redémarrages automatiques pour un canal ou un compte sans désactiver le moniteur global.
    - Consultez [Contrôles de santé](/fr/gateway/health) pour le débogage opérationnel et la [référence complète](/fr/gateway/configuration-reference#gateway) pour tous les champs.

  </Accordion>

  <Accordion title="Configurer les sessions et les réinitialisations">
    Les sessions contrôlent la continuité et l'isolement des conversations :

    ```json5
    {
      session: {
        dmScope: "per-channel-peer",  // recommended for multi-user
        threadBindings: {
          enabled: true,
          idleHours: 24,
          maxAgeHours: 0,
        },
        reset: {
          mode: "daily",
          atHour: 4,
          idleMinutes: 120,
        },
      },
    }
    ```

    - `dmScope` : `main` (partagé) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings` : valeurs globales par défaut pour le routage des sessions liées aux fils (Discord prend en charge `/focus`, `/unfocus`, `/agents`, `/session idle` et `/session max-age`).
    - Voir [Gestion des sessions](/fr/concepts/session) pour la portée, les liens d'identité et la politique d'envoi.
    - Voir [référence complète](/fr/gateway/config-agents#session) pour tous les champs.

  </Accordion>

  <Accordion title="Activer le sandboxing">
    Exécuter les sessions d'agent dans des environnements de sandbox isolés :

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // off | non-main | all
            scope: "agent",    // session | agent | shared
          },
        },
      },
    }
    ```

    Construisez d'abord l'image : `scripts/sandbox-setup.sh`

    Voir [Sandboxing](/fr/gateway/sandboxing) pour le guide complet et [référence complète](/fr/gateway/config-agents#agentsdefaultssandbox) pour toutes les options.

  </Accordion>

  <Accordion title="Activer la push relayée pour les builds officiels iOS">
    La push relayée est configurée dans `openclaw.json`.

    Définissez ceci dans la configuration de la passerelle :

    ```json5
    {
      gateway: {
        push: {
          apns: {
            relay: {
              baseUrl: "https://relay.example.com",
              // Optional. Default: 10000
              timeoutMs: 10000,
            },
          },
        },
      },
    }
    ```

    Équivalent CLI :

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    Ce que cela fait :

    - Permet à la passerelle d'envoyer des `push.test`, des notifications de réveil et des réveils de reconnexion via le relais externe.
    - Utilise une autorisation d'envoi limitée à l'inscription, transmise par l'application iOS associée. La passerelle n'a pas besoin d'un jeton de relais à l'échelle du déploiement.
    - Lie chaque inscription relayée à l'identité de la passerelle avec laquelle l'application iOS a été associée, empêchant ainsi une autre passerelle de réutiliser l'inscription stockée.
    - Conserve les builds locaux/manuels iOS sur APNs directs. Les envois relayés s'appliquent uniquement aux builds distribués officiellement qui se sont inscrits via le relais.
    - Doit correspondre à l'URL de base du relais intégrée dans le build officiel/TestFlight iOS, afin que le trafic d'inscription et d'envoi atteigne le même déploiement de relais.

    Flux de bout en bout :

    1. Installez un build officiel/TestFlight iOS qui a été compilé avec la même URL de base de relais.
    2. Configurez `gateway.push.apns.relay.baseUrl` sur la passerelle.
    3. Associez l'application iOS à la passerelle et laissez les sessions de nœud et d'opérateur se connecter.
    4. L'application iOS récupère l'identité de la passerelle, s'inscrit auprès du relais à l'aide d'App Attest et du reçu de l'application, puis publie la charge utile `push.apns.register` relayée vers la passerelle associée.
    5. La passerelle stocke le handle de relais et l'autorisation d'envoi, puis les utilise pour les `push.test`, les notifications de réveil et les réveils de reconnexion.

    Notes opérationnelles :

    - Si vous basculez l'application iOS vers une autre passerelle, reconnectez l'application afin qu'elle puisse publier une nouvelle inscription de relais liée à cette passerelle.
    - Si vous publiez un nouveau build iOS pointant vers un déploiement de relais différent, l'application actualise son inscription de relais mise en cache au lieu de réutiliser l'origine de l'ancien relais.

    Note de compatibilité :

    - `OPENCLAW_APNS_RELAY_BASE_URL` et `OPENCLAW_APNS_RELAY_TIMEOUT_MS` fonctionnent toujours en tant que substitutions d'environnement temporaires.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` reste une échappatoire de développement en boucle uniquement ; ne persistez pas les URL de relais HTTP dans la configuration.

    Voir [Application iOS](/fr/platforms/ios#relay-backed-push-for-official-builds) pour le flux de bout en bout et [Flux d'authentification et de confiance](/fr/platforms/ios#authentication-and-trust-flow) pour le modèle de sécurité du relais.

  </Accordion>

  <Accordion title="Configurer le heartbeat (points de contrôle périodiques)">
    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "30m",
            target: "last",
          },
        },
      },
    }
    ```

    - `every` : chaîne de durée (`30m`, `2h`). Définissez `0m` pour désactiver.
    - `target` : `last` | `none` | `<channel-id>` (par exemple `discord`, `matrix`, `telegram` ou `whatsapp`)
    - `directPolicy` : `allow` (par défaut) ou `block` pour les cibles de heartbeat de style DM
    - Voir [Heartbeat](/fr/gateway/heartbeat) pour le guide complet.

  </Accordion>

  <Accordion title="Configurer les tâches cron">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2, // cron dispatch + isolated cron agent-turn execution
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention` : supprimer les sessions d'exécution isolées terminées de `sessions.json` (par défaut `24h` ; définissez `false` pour désactiver).
    - `runLog` : nettoyer `cron/runs/<jobId>.jsonl` par taille et lignes conservées.
    - Voir [Cron jobs](/fr/automation/cron-jobs) pour un aperçu des fonctionnalités et des exemples CLI.

  </Accordion>

  <Accordion title="Configurer les webhooks (hooks)">
    Activez les points de terminaison HTTP de webhook sur le Gateway :

    ```json5
    {
      hooks: {
        enabled: true,
        token: "shared-secret",
        path: "/hooks",
        defaultSessionKey: "hook:ingress",
        allowRequestSessionKey: false,
        allowedSessionKeyPrefixes: ["hook:"],
        mappings: [
          {
            match: { path: "gmail" },
            action: "agent",
            agentId: "main",
            deliver: true,
          },
        ],
      },
    }
    ```

    Note de sécurité :
    - Traitez tout le contenu de payload hook/webhook comme une entrée non fiable.
    - Utilisez un `hooks.token` dédié ; ne réutilisez pas le jeton partagé du Gateway.
    - L'authentification des hooks se fait uniquement via l'en-tête (`Authorization: Bearer ...` ou `x-openclaw-token`) ; les jetons de chaîne de requête sont rejetés.
    - `hooks.path` ne peut pas être `/` ; gardez l'ingress webhook sur un sous-chemin dédié tel que `/hooks`.
    - Gardez les indicateurs de contournement de contenu non sécurisé désactivés (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) sauf si vous effectuez un débogage étroitement délimité.
    - Si vous activez `hooks.allowRequestSessionKey`, définissez également `hooks.allowedSessionKeyPrefixes` pour délimiter les clés de session choisies par l'appelant.
    - Pour les agents pilotés par hooks, préférez les niveaux de modèle modernes et robustes ainsi qu'une stratégie d'outil stricte (par exemple, messagerie uniquement et sandboxing si possible).

    Voir la [référence complète](/fr/gateway/configuration-reference#hooks) pour toutes les options de mappage et l'intégration Gmail.

  </Accordion>

  <Accordion title="Configurer le routage multi-agent">
    Exécutez plusieurs agents isolés avec des espaces de travail et des sessions distincts :

    ```json5
    {
      agents: {
        list: [
          { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
          { id: "work", workspace: "~/.openclaw/workspace-work" },
        ],
      },
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
      ],
    }
    ```

    Voir [Multi-Agent](/fr/concepts/multi-agent) et [référence complète](/fr/gateway/config-agents#multi-agent-routing) pour les règles de liaison et les profils d'accès par agent.

  </Accordion>

  <Accordion title="Diviser la configuration en plusieurs fichiers ($include)">
    Utilisez `$include` pour organiser les configurations volumineuses :

    ```json5
    // ~/.openclaw/openclaw.json
    {
      gateway: { port: 18789 },
      agents: { $include: "./agents.json5" },
      broadcast: {
        $include: ["./clients/a.json5", "./clients/b.json5"],
      },
    }
    ```

    - **Fichier unique** : remplace l'objet conteneur
    - **Tableau de fichiers** : fusionné en profondeur dans l'ordre (le dernier gagne)
    - **Clés frères** : fusionnées après les inclusions (remplacement des valeurs incluses)
    - **Inclusions imbriquées** : prises en charge jusqu'à 10 niveaux de profondeur
    - **Chemins relatifs** : résolus par rapport au fichier inclus
    - **Écritures propriétaires d'OpenClaw** : lorsqu'une écriture modifie une seule section de premier niveau
      soutenue par une inclusion de fichier unique telle que `plugins: { $include: "./plugins.json5" }`,
      OpenClaw met à jour ce fichier inclus et laisse `openclaw.json` intact
    - **Écriture透明 non prise en charge** : les inclusions racines, les tableaux d'inclusions et les inclusions
      avec des remplacements de frères échouent en mode fermé pour les écritures propriétaires d'OpenClaw au lieu de
      lisser la configuration
    - **Gestion des erreurs** : erreurs claires pour les fichiers manquants, les erreurs d'analyse et les inclusions circulaires

  </Accordion>
</AccordionGroup>

## Rechargement à chaud de la configuration

Le Gateway surveille `~/.openclaw/openclaw.json` et applique les modifications automatiquement — aucun redémarrage manuel n'est nécessaire pour la plupart des paramètres.

Les modifications directes du fichier sont considérées comme non fiables jusqu'à ce qu'elles soient validées. L'observateur attend que l'activité d'écriture temporaire/de renommage de l'éditeur se calme, lit le fichier final et rejette les modifications externes non valides en restaurant la dernière configuration connue valide. Les écritures de configuration propriétaires OpenClaw utilisent la même porte de schéma avant l'écriture ; les écrasements destructeurs tels que la suppression de `gateway.mode` ou la réduction du fichier de plus de moitié sont rejetés et sauvegardés sous `.rejected.*` pour inspection.

Les échecs de validation locaux aux plugins font exception : si tous les problèmes se trouvent sous `plugins.entries.<id>...`, le rechargement conserve la configuration actuelle et signale le problème du plugin au lieu de restaurer `.last-good`.

Si vous voyez `Config auto-restored from last-known-good` ou
`config reload restored last-known-good config` dans les journaux, inspectez le fichier
`.clobbered.*` correspondant à côté de `openclaw.json`, corrigez la charge utile rejetée, puis exécutez
`openclaw config validate`. Consultez le dépannage du Gateway (/en/gateway/troubleshooting#gateway-restored-last-known-good-config)
pour la liste de contrôle de récupération.

### Modes de rechargement

| Mode                      | Comportement                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **`hybrid`** (par défaut) | Applique à chaud les modifications sûres instantanément. Redémarre automatiquement pour les modifications critiques.                   |
| **`hot`**                 | Applique à chaud uniquement les modifications sûres. Enregistre un avertissement lorsqu'un redémarrage est nécessaire — vous le gérez. |
| **`restart`**             | Redémarre le Gateway lors de toute modification de configuration, sûre ou non.                                                         |
| **`off`**                 | Désactive la surveillance des fichiers. Les modifications prennent effet au prochain redémarrage manuel.                               |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Ce qui est appliqué à chaud vs ce qui nécessite un redémarrage

La plupart des champs s'appliquent à chaud sans interruption de service. En mode `hybrid`, les modifications nécessitant un redémarrage sont gérées automatiquement.

| Catégorie           | Champs                                                                  | Redémarrage nécessaire ? |
| ------------------- | ----------------------------------------------------------------------- | ------------------------ |
| Canaux              | `channels.*`, `web` (WhatsApp) — tous les canaux intégrés et par plugin | Non                      |
| Agent & modèles     | `agent`, `agents`, `models`, `routing`                                  | Non                      |
| Automatisation      | `hooks`, `cron`, `agent.heartbeat`                                      | Non                      |
| Sessions & messages | `session`, `messages`                                                   | Non                      |
| Outils & médias     | `tools`, `browser`, `skills`, `mcp`, `audio`, `talk`                    | Non                      |
| UI et divers        | `ui`, `logging`, `identity`, `bindings`                                 | Non                      |
| Gateway serveur     | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP)                    | **Oui**                  |
| Infrastructure      | `discovery`, `canvasHost`, `plugins`                                    | **Oui**                  |

<Note>`gateway.reload` et `gateway.remote` sont des exceptions — les modifier ne déclenche **pas** un redémarrage.</Note>

### Planification du rechargement

Lorsque vous modifiez un fichier source référencé via `$include`, OpenClaw planifie
le rechargement à partir de la disposition source, et non de la vue aplatie en mémoire.
Cela permet de garder les décisions de rechargement à chaud (application à chaud vs redémarrage) prévisibles, même lorsqu'une
section de premier niveau unique réside dans son propre fichier inclus, tel que
`plugins: { $include: "./plugins.json5" }`. La planification du rechargement échoue fermement si la
structure source est ambiguë.

## Config RPC (mises à jour programmatiques)

Pour les outils qui écrivent la configuration via l'API de la passerelle, privilégiez ce flux :

- `config.schema.lookup` pour inspecter un sous-arbre (nœud de schéma superficiel + résumés
  enfants)
- `config.get` pour récupérer l'instantané actuel plus `hash`
- `config.patch` pour des mises à jour partielles (correctif de fusion JSON : les objets fusionnent, `null`
  supprime, les tableaux remplacent)
- `config.apply` uniquement lorsque vous avez l'intention de remplacer la configuration entière
- `update.run` pour une mise à jour explicite de soi-même suivie d'un redémarrage
- `update.status` pour inspecter la sentinelle de redémarrage de la dernière mise à jour et vérifier la version en cours d'exécution après un redémarrage

Les agents doivent considérer `config.schema.lookup` comme la première ressource pour la documentation
et les contraintes exactes au niveau du champ. Utilisez [Référence de configuration](/fr/gateway/configuration-reference)
lorsqu'ils ont besoin de la carte de configuration globale, des valeurs par défaut ou des liens vers des
références de sous-systèmes dédiés.

<Note>
  Les écritures du plan de contrôle (`config.apply`, `config.patch`, `update.run`) sont limitées à 3 requêtes par 60 secondes par `deviceId+clientIp`. Les demandes de redémarrage sont fusionnées puis appliquent un temps de recharge de 30 secondes entre les cycles de redémarrage. `update.status` est en lecture seule mais de portée administrateur car la sentinelle de redémarrage peut inclure des
  résumés des étapes de mise à jour et les fins de sortie des commandes.
</Note>

Exemple de correctif partiel :

```bash
openclaw gateway call config.get --params '{}'  # capture payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

Les `config.apply` et `config.patch` acceptent `raw`, `baseHash`, `sessionKey`,
`note` et `restartDelayMs`. `baseHash` est requis pour les deux méthodes lorsqu'une
configuration existe déjà.

## Variables d'environnement

OpenClaw lit les variables d'environnement du processus parent ainsi que :

- `.env` à partir du répertoire de travail actuel (si présent)
- `~/.openclaw/.env` (secours global)

Aucun de ces fichiers ne remplace les variables d'environnement existantes. Vous pouvez également définir des variables d'environnement en ligne dans la configuration :

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Import de l'environnement du shell (optionnel)">
  Si activé et que les clés attendues ne sont pas définies, OpenClaw exécute votre shell de connexion et importe uniquement les clés manquantes :

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

Équivalent de la var d'environnement : `OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="Substitution de variables d'environnement dans les valeurs de configuration">
  Référencez les variables d'environnement dans n'importe quelle valeur de chaîne de configuration avec `${VAR_NAME}` :

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

Règles :

- Seuls les noms en majuscules correspondent : `[A-Z_][A-Z0-9_]*`
- Les variables manquantes/vides génèrent une erreur au chargement
- Échappez avec `$${VAR}` pour une sortie littérale
- Fonctionne dans les fichiers `$include`
- Substitution en ligne : `"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Références de secrets (env, file, exec)">
  Pour les champs qui prennent en charge les objets SecretRef, vous pouvez utiliser :

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
  skills: {
    entries: {
      "image-lab": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/image-lab/apiKey",
        },
      },
    },
  },
  channels: {
    googlechat: {
      serviceAccountRef: {
        source: "exec",
        provider: "vault",
        id: "channels/googlechat/serviceAccount",
      },
    },
  },
}
```

Les détails de SecretRef (y compris `secrets.providers` pour `env`/`file`/`exec`) se trouvent dans [Secrets Management](/fr/gateway/secrets).
Les chemins d'identification pris en charge sont répertoriés dans [SecretRef Credential Surface](/fr/reference/secretref-credential-surface).

</Accordion>

Voir [Environment](/fr/help/environment) pour la priorité complète et les sources.

## Référence complète

Pour la référence complète champ par champ, consultez **[Configuration Reference](/fr/gateway/configuration-reference)**.

---

_En lien : [Exemples de configuration](/fr/gateway/configuration-examples) · [Référence de configuration](/fr/gateway/configuration-reference) · [Doctor](/fr/gateway/doctor)_

## En lien

- [Référence de configuration](/fr/gateway/configuration-reference)
- [Exemples de configuration](/fr/gateway/configuration-examples)
- [Guide de procédures Gateway](/fr/gateway)
