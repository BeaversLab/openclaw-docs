---
summary: "Présentation de la configuration : tâches courantes, configuration rapide et liens vers la référence complète"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "Configuration"
---

# Configuration

OpenClaw lit une configuration optionnelle <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> à partir de `~/.openclaw/openclaw.json`.
Le chemin de configuration actif doit être un fichier régulier. Les configurations `openclaw.json`
liées par lien symbolique ne sont pas prises en charge pour les écritures owned par OpenClaw ; une écriture atomique peut remplacer
le chemin au lieu de préserver le lien symbolique. Si vous conservez la configuration en dehors du
dossier d'état par défaut, pointez `OPENCLAW_CONFIG_PATH` directement vers le fichier réel.

Si le fichier est manquant, OpenClaw utilise des paramètres par défaut sûrs. Raisons courantes d'ajouter une configuration :

- Connecter des canaux et contrôler qui peut envoyer des messages au bot
- Définir les modèles, les outils, le sandboxing ou l'automatisation (cron, hooks)
- Ajuster les sessions, les médias, le réseau ou l'interface utilisateur

Consultez la [référence complète](/fr/gateway/configuration-reference) pour chaque champ disponible.

<Tip>**Nouveau dans la configuration ?** Commencez avec `openclaw onboard` pour une configuration interactive, ou consultez le guide [Configuration Examples](/fr/gateway/configuration-examples) pour des configurations complètes prêtes à copier-coller.</Tip>

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
  <Tab title="Control UI">
    Ouvrez [http://127.0.0.1:18789](http://127.0.0.1:18789) et utilisez l'onglet **Config**. L'interface de contrôle (Control UI) affiche un formulaire basé sur le schéma de configuration en direct, incluant les métadonnées de documentation `title` / `description` ainsi que les schémas de plugins et de canaux (channels) lorsqu'ils sont disponibles, avec un éditeur **Raw JSON** en solution de
    repli. Pour les interfaces utilisateur d'exploration et d'autres outils, la passerelle expose également `config.schema.lookup` pour récupérer un nœud de schéma délimité par un chemin ainsi que les résumés des enfants immédiats.
  </Tab>
  <Tab title="Direct edit">Modifiez `~/.openclaw/openclaw.json` directement. La Gateway surveille le fichier et applique les modifications automatiquement (voir [hot reload](#config-hot-reload)).</Tab>
</Tabs>

## Validation stricte

<Warning>OpenClaw n'accepte que les configurations correspondant entièrement au schéma. Les clés inconnues, les types malformés ou les valeurs invalides empêchent la Gateway de **demarrer**. La seule exception au niveau racine est `$schema` (chaîne), permettant aux éditeurs d'attacher des métadonnées de Schéma JSON.</Warning>

Notes sur les outils de schéma :

- `openclaw config schema` affiche la même famille de Schémas JSON utilisée par l'interface de contrôle
  et la validation de configuration.
- Considérez cette sortie de schéma comme le contrat lisible par machine canonique pour
  `openclaw.json` ; cette vue d'ensemble et la référence de configuration la résument.
- Les valeurs `title` et `description` sont transmises dans la sortie du schéma pour les outils d'éditeur et de formulaire.
- Les entrées d'objet imbriqué, de caractère générique (`*`) et d'élément de tableau (`[]`) héritent des mêmes métadonnées de documentation là où une documentation de champ correspondante existe.
- Les branches de composition `anyOf` / `oneOf` / `allOf` héritent également des mêmes métadonnées de documentation, de sorte que les variantes d'union/intersection conservent la même aide de champ.
- `config.schema.lookup` renvoie un chemin de configuration normalisé avec un nœud de schéma superficiel (`title`, `description`, `type`, `enum`, `const`, limites communes et champs de validation similaires), les métadonnées d'indicateur d'interface utilisateur correspondantes et des résumés des enfants immédiats pour les outils de forage.
- Les schémas de plugin/channel d'exécution sont fusionnés lorsque la passerelle peut charger le registre de manifeste actuel.
- `pnpm config:docs:check` détecte la dérive entre les artefacts de base de configuration orientés documentation et la surface du schéma actuel.

Lorsque la validation échoue :

- Le Gateway ne démarre pas
- Seules les commandes de diagnostic fonctionnent (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Exécutez `openclaw doctor` pour voir les problèmes exacts
- Exécutez `openclaw doctor --fix` (ou `--yes`) pour appliquer les réparations

Le Gateway conserve également une copie de confiance de la dernière bonne configuration connue après un démarrage réussi. Si `openclaw.json` est modifié ultérieurement en dehors de OpenClaw et ne valide plus, le démarrage et le rechargement à chaud préservent le fichier cassé sous la forme d'un instantané `.clobbered.*` horodaté, restaurent la copie de la dernière bonne configuration et consignent un avertissement prononcé avec la raison de la récupération. La récupération en lecture au démarrage traite également les baisses brutales de taille, les métadonnées de configuration manquantes et un `gateway.mode` manquant comme des signatures de clobberage critique lorsque la copie de la dernière bonne configuration comportait ces champs. Si une ligne de statut/journal est ajoutée par inadvertance avant une configuration JSON par ailleurs valide, le démarrage de la passerelle et `openclaw doctor --fix` peuvent supprimer le préfixe, conserver le fichier pollué en tant que `.clobbered.*` et continuer avec le JSON récupéré. Le prochain tour de l'agent principal reçoit également un avertissement d'événement système lui indiquant que la configuration a été restaurée et qu'elle ne doit pas être réécrite aveuglément. La promotion de la dernière bonne configuration est mise à jour après un démarrage validé et après les rechargements à chaud acceptés, y compris les écritures de configuration possédées par OpenClaw dont le hachage de fichier persisté correspond toujours à l'écriture acceptée. La promotion est ignorée lorsque le candidat contient des espaces réservés de secrets rédactionnés tels que `***` ou des valeurs de jetons raccourcies.

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

    Tous les canaux partagent le même modèle de politique DM :

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

  <Accordion title="Choisir et configurer les modèles">
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

    - `agents.defaults.models` définit le catalogue de modèles et agit comme une liste d'autorisation pour `/model`.
    - Utilisez `openclaw config set agents.defaults.models '<json>' --strict-json --merge` pour ajouter des entrées à la liste d'autorisation sans supprimer les modèles existants. Les remplacements simples qui supprimeraient des entrées sont rejetés, sauf si vous passez `--replace`.
    - Les références de modèles utilisent le format `provider/model` (par exemple `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` contrôle la réduction d'échelle des images de transcription/d'outil (par défaut `1200`) ; des valeurs plus faibles réduisent généralement l'utilisation des jetons de vision lors des exécutions avec de nombreuses captures d'écran.
    - Voir [Modèles CLI](/fr/concepts/models) pour changer de modèle dans le chat et [Échec de secours du modèle](/fr/concepts/model-failover) pour la rotation de l'authentification et le comportement de repli.
    - Pour les fournisseurs personnalisés/auto-hébergés, voir [Fournisseurs personnalisés](/fr/gateway/configuration-reference#custom-providers-and-base-urls) dans la référence.

  </Accordion>

  <Accordion title="Contrôler qui peut envoyer un message au bot">
    L'accès DM est contrôlé par canal via `dmPolicy` :

    - `"pairing"` (par défaut) : les expéditeurs inconnus reçoivent un code de couplage unique à approuver
    - `"allowlist"` : uniquement les expéditeurs dans `allowFrom` (ou le stockage d'autorisation couplé)
    - `"open"` : autoriser tous les DM entrants (nécessite `allowFrom: ["*"]`)
    - `"disabled"` : ignorer tous les DM

    Pour les groupes, utilisez `groupPolicy` + `groupAllowFrom` ou des listes d'autorisation spécifiques au canal.

    Voir la [référence complète](/fr/gateway/configuration-reference#dm-and-group-access) pour les détails par canal.

  </Accordion>

  <Accordion title="Configurer le filtrage des mentions dans les conversations de groupe">
    Les messages de groupe nécessitent par défaut une **mention**. Configurez les modèles par agent :

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

    - **Métadonnées de mentions** : mentions @ natives (appuyer pour mentionner sur WhatsApp, @bot sur Telegram, etc.)
    - **Modèles de texte** : modèles d'expression régulière sécurisés dans `mentionPatterns`
    - Consultez la [référence complète](/fr/gateway/configuration-reference#group-chat-mention-gating) pour les remplacements par canal et le mode de chat avec soi-même.

  </Accordion>

  <Accordion title="Restreindre les compétences par agent">
    Utilisez `agents.defaults.skills` pour une base partagée, puis remplacez les valeurs pour des
    agents spécifiques avec `agents.list[].skills` :

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

    - Omettez `agents.defaults.skills` pour des compétences non restreintes par défaut.
    - Omettez `agents.list[].skills` pour hériter des valeurs par défaut.
    - Définissez `agents.list[].skills: []` pour n'avoir aucune compétence.
    - Consultez [Compétences](/fr/tools/skills), [Config Compétences](/fr/tools/skills-config) et
      la [Référence de configuration](/fr/gateway/configuration-reference#agents-defaults-skills).

  </Accordion>

  <Accordion title="Ajuster la surveillance de santé des canaux de la passerelle">
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
    - `threadBindings` : paramètres globaux par défaut pour le routage des sessions liées aux fils (Discord prend en charge `/focus`, `/unfocus`, `/agents`, `/session idle` et `/session max-age`).
    - Voir [Gestion des sessions](/fr/concepts/session) pour la portée, les liens d'identité et la politique d'envoi.
    - Voir [référence complète](/fr/gateway/configuration-reference#session) pour tous les champs.

  </Accordion>

  <Accordion title="Activer le sandboxing">
    Exécuter les sessions de l'agent dans des environnements de bac à sable isolés :

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

    Voir [Sandboxing](/fr/gateway/sandboxing) pour le guide complet et [référence complète](/fr/gateway/configuration-reference#agentsdefaultssandbox) pour toutes les options.

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

    - Permet à la passerelle d'envoyer des `push.test`, des rappels de réveil (wake nudges) et des réveils de reconnexion via le relais externe.
    - Utilise un octroi d'envoi (send grant) délimité par l'enregistrement, transmis par l'app iOS appariée. La passerelle n'a pas besoin d'un jeton de relai à l'échelle du déploiement.
    - Lie chaque enregistrement relayé à l'identité de la passerelle avec laquelle l'app iOS a été appariée, empêchant ainsi une autre passerelle de réutiliser l'enregistrement stocké.
    - Maintient les builds locaux/manuels iOS sur les APNs directs. Les envois relayés s'appliquent uniquement aux builds distribués officiellement qui se sont enregistrés via le relais.
    - Doit correspondre à l'URL de base du relais intégrée dans le build officiel/TestFlight iOS, afin que le trafic d'enregistrement et d'envoi atteigne le même déploiement de relais.

    Flux de bout en bout :

    1. Installez un build officiel/TestFlight iOS qui a été compilé avec la même URL de base de relais.
    2. Configurez `gateway.push.apns.relay.baseUrl` sur la passerelle.
    3. Appariez l'app iOS à la passerelle et laissez les sessions de nœud et d'opérateur se connecter.
    4. L'app iOS récupère l'identité de la passerelle, s'enregistre auprès du relais à l'aide d'App Attest et du reçu de l'application, puis publie la charge utile `push.apns.register` relayée vers la passerelle appariée.
    5. La passerelle stocke le gestionnaire de relais et l'octroi d'envoi, puis les utilise pour les `push.test`, les rappels de réveil et les réveils de reconnexion.

    Notes opérationnelles :

    - Si vous basculez l'app iOS vers une autre passerelle, reconnectez l'application pour qu'elle puisse publier un nouvel enregistrement de relais lié à cette passerelle.
    - Si vous diffusez un nouveau build iOS pointant vers un déploiement de relais différent, l'application actualise son enregistrement de relais mis en cache au lieu de réutiliser l'ancienne origine du relais.

    Note de compatibilité :

    - `OPENCLAW_APNS_RELAY_BASE_URL` et `OPENCLAW_APNS_RELAY_TIMEOUT_MS` fonctionnent toujours comme substitutions temporaires d'env.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` reste une échappatoire de développement uniquement en boucle locale (loopback-only) ; ne persistez pas les URLs de relais HTTP dans la configuration.

    Voir [App iOS](/fr/platforms/ios#relay-backed-push-for-official-builds) pour le flux de bout en bout et [Flux d'authentification et de confiance](/fr/platforms/ios#authentication-and-trust-flow) pour le modèle de sécurité du relais.

  </Accordion>

  <Accordion title="Configurer le battement de cœur (check-ins périodiques)">
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
    - `directPolicy` : `allow` (par défaut) ou `block` pour les cibles de battement de cœur style DM
    - Voir [Heartbeat](/fr/gateway/heartbeat) pour le guide complet.

  </Accordion>

  <Accordion title="Configurer les tâches cron">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2,
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention` : nettoyer les sessions d'exécution isolées terminées de `sessions.json` (par défaut `24h` ; définissez `false` pour désactiver).
    - `runLog` : nettoyer `cron/runs/<jobId>.jsonl` par taille et lignes conservées.
    - Voir [Cron jobs](/fr/automation/cron-jobs) pour un aperçu des fonctionnalités et des exemples CLI.

  </Accordion>

  <Accordion title="Set up webhooks (hooks)">
    Activer les points de terminaison de webhook HTTP sur le Gateway :

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
    - Traitez tout le contenu des payload hook/webhook comme une entrée non fiable.
    - Utilisez un `hooks.token` dédié ; ne réutilisez pas le jeton partagé du Gateway.
    - L'authentification des hooks se fait uniquement via l'en-tête (`Authorization: Bearer ...` ou `x-openclaw-token`) ; les jetons de chaîne de requête sont rejetés.
    - `hooks.path` ne peut pas être `/` ; maintenez l'ingress webhook sur un sous-chemin dédié tel que `/hooks`.
    - Gardez les indicateurs de contournement de contenu non sécurisé désactivés (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) sauf si vous effectuez un débogage étroitement délimité.
    - Si vous activez `hooks.allowRequestSessionKey`, définissez également `hooks.allowedSessionKeyPrefixes` pour limiter les clés de session sélectionnées par l'appelant.
    - Pour les agents pilotés par des hooks, privilégiez les niveaux de modèle modernes et robustes ainsi qu'une stratégie d'outil stricte (par exemple, messagerie uniquement plus bac à sable si possible).

    Voir [référence complète](/fr/gateway/configuration-reference#hooks) pour toutes les options de mappage et l'intégration Gmail.

  </Accordion>

  <Accordion title="Configure multi-agent routing">
    Exécuter plusieurs agents isolés avec des espaces de travail et des sessions séparés :

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

    Voir [Multi-Agent](/fr/concepts/multi-agent) et [référence complète](/fr/gateway/configuration-reference#multi-agent-routing) pour les règles de liaison et les profils d'accès par agent.

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
    - **Clés frères** : fusionnées après les inclusions (remplace les valeurs incluses)
    - **Inclusions imbriquées** : prises en charge jusqu'à 10 niveaux de profondeur
    - **Chemins relatifs** : résolus par rapport au fichier incluant
    - **Écritures propriétaires d'OpenClaw** : lorsqu'une écriture modifie une seule section de premier niveau
      sauvegardée par une inclusion de fichier unique telle que `plugins: { $include: "./plugins.json5" }`,
      OpenClaw met à jour ce fichier inclus et laisse `openclaw.json` intact
    - **Écriture transitive non prise en charge** : les inclusions racines, les tableaux d'inclusions et les inclusions
      avec des remplacements de frères échouent en mode fermé pour les écritures propriétaires d'OpenClaw au lieu de
      aplatir la configuration
    - **Gestion des erreurs** : erreurs claires pour les fichiers manquants, les erreurs d'analyse et les inclusions circulaires

  </Accordion>
</AccordionGroup>

## Rechargement à chaud de la configuration

Le Gateway surveille `~/.openclaw/openclaw.json` et applique les modifications automatiquement — aucun redémarrage manuel n'est nécessaire pour la plupart des paramètres.

Les modifications directes des fichiers sont traitées comme non fiables jusqu'à validation. L'observateur attend
que les temporisations d'écriture/renommage de l'éditeur se calment, lit le fichier final et rejette
les modifications externes invalides en restaurant la dernière configuration valide connue. Les écritures de configuration
propriétaires d'OpenClaw utilisent la même porte de schéma avant l'écriture ; les écrasements destructeurs tels
que la suppression de `gateway.mode` ou la réduction du fichier de plus de la moitié sont rejetés
et sauvegardés sous `.rejected.*` pour inspection.

Si vous voyez `Config auto-restored from last-known-good` ou
`config reload restored last-known-good config` dans les journaux, inspectez le fichier `.clobbered.*` correspondant à côté de `openclaw.json`, corrigez la charge utile rejetée, puis exécutez
`openclaw config validate`. Consultez le Gateway troubleshooting](/fr/gateway/troubleshooting#gateway-restored-last-known-good-config)
pour la liste de contrôle de récupération.

### Modes de rechargement

| Mode                      | Comportement                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **`hybrid`** (par défaut) | Applique à chaud les modifications sûres instantanément. Redémarre automatiquement pour les modifications critiques.                          |
| **`hot`**                 | Applique à chaud uniquement les modifications sûres. Enregistre un avertissement lorsqu'un redémarrage est nécessaire — vous vous en chargez. |
| **`restart`**             | Redémarre le Gateway lors de toute modification de configuration, sûre ou non.                                                                |
| **`off`**                 | Désactive la surveillance des fichiers. Les modifications prennent effet au prochain redémarrage manuel.                                      |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Ce qui s'applique à chaud vs ce qui nécessite un redémarrage

La plupart des champs s'appliquent à chaud sans interruption de service. En mode `hybrid`, les modifications nécessitant un redémarrage sont gérées automatiquement.

| Catégorie            | Champs                                                                   | Redémarrage nécessaire ? |
| -------------------- | ------------------------------------------------------------------------ | ------------------------ |
| Canaux               | `channels.*`, `web` (WhatsApp) — tous les canaux intégrés et les plugins | Non                      |
| Agent et modèles     | `agent`, `agents`, `models`, `routing`                                   | Non                      |
| Automatisation       | `hooks`, `cron`, `agent.heartbeat`                                       | Non                      |
| Sessions et messages | `session`, `messages`                                                    | Non                      |
| Outils et médias     | `tools`, `browser`, `skills`, `audio`, `talk`                            | Non                      |
| UI & divers          | `ui`, `logging`, `identity`, `bindings`                                  | Non                      |
| Gateway serveur      | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP)                     | **Oui**                  |
| Infrastructure       | `discovery`, `canvasHost`, `plugins`                                     | **Oui**                  |

<Note>`gateway.reload` et `gateway.remote` sont des exceptions — les modifier ne déclenche **pas** de redémarrage.</Note>

### Planification du rechargement

Lorsque vous modifiez un fichier source référencé via `$include`, OpenClaw planifie
le rechargement à partir de la layout définie par la source, et non de la vue aplatie en mémoire.
Cela permet de garder les décisions de rechargement à chaud (application à chaud vs redémarrage) prévisibles, même quand
une seule section de premier niveau vit dans son propre fichier inclus, tel que
`plugins: { $include: "./plugins.json5" }`.

Si un rechargement ne peut pas être planifié en toute sécurité — par exemple, parce que le layout source
combine des inclusions racine avec des remplacements au même niveau — OpenClaw échoue de manière fermée, enregistre la
raison, et laisse la configuration actuelle en cours d'exécution en place afin que vous puissiez corriger la forme de la source
au lieu de revenir silencieusement à un rechargement aplati.

## Config RPC (mises à jour programmatiques)

<Note>Les RPC d'écriture du plan de contrôle (`config.apply`, `config.patch`, `update.run`) sont limités à **3 requêtes par 60 secondes** par `deviceId+clientIp`. Lorsqu'ils sont limités, le RPC renvoie `UNAVAILABLE` avec `retryAfterMs`.</Note>

Flux sécurisé par défaut :

- `config.schema.lookup` : inspecter un sous-arbre de configuration délimité par un chemin avec un nœud de schéma superficiel, les métadonnées de correspondance d'indices et les résumés des enfants immédiats
- `config.get` : récupérer l'instantané + le hachage actuel
- `config.patch` : chemin de mise à jour partielle préféré
- `config.apply` : remplacement de la configuration complète uniquement
- `update.run` : mise à jour explicite + redémarrage

Lorsque vous ne remplacez pas la configuration entière, préférez `config.schema.lookup`
alors `config.patch`.

<AccordionGroup>
  <Accordion title="config.apply (remplacement complet)">
    Valide + écrit la configuration complète et redémarre le Gateway en une seule étape.

    <Warning>
    `config.apply` remplace la **configuration entière**. Utilisez `config.patch` pour les mises à jour partielles, ou `openclaw config set` pour des clés uniques.
    </Warning>

    Paramètres :

    - `raw` (chaîne) — charge utile JSON5 pour la configuration entière
    - `baseHash` (facultatif) — hachage de configuration issu de `config.get` (requis lorsque la configuration existe)
    - `sessionKey` (facultatif) — clé de session pour le signal de réveil post-redémarrage
    - `note` (facultatif) — note pour la sentinelle de redémarrage
    - `restartDelayMs` (facultatif) — délai avant redémarrage (par défaut 2000)

    Les demandes de redémarrage sont fusionnées tant qu'une autre est déjà en attente/en cours, et un temps de refroidissement de 30 secondes s'applique entre les cycles de redémarrage.

    ```bash
    openclaw gateway call config.get --params '{}'  # capture payload.hash
    openclaw gateway call config.apply --params '{
      "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
      "baseHash": "<hash>",
      "sessionKey": "agent:main:whatsapp:direct:+15555550123"
    }'
    ```

  </Accordion>

  <Accordion title="config.patch (partial update)">
    Fusionne une mise à jour partielle dans la configuration existante (sémantique de fusion JSON) :

    - Les objets fusionnent récursivement
    - `null` supprime une clé
    - Les tableaux sont remplacés

    Paramètres :

    - `raw` (chaîne) — JSON5 contenant uniquement les clés à modifier
    - `baseHash` (requis) — hachage de configuration provenant de `config.get`
    - `sessionKey`, `note`, `restartDelayMs` — identique à `config.apply`

    Le comportement de redémarrage correspond à `config.apply` : redémarrages en attente regroupés plus un temps de refroidissement de 30 secondes entre les cycles de redémarrage.

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## Variables d'environnement

OpenClaw lit les variables d'environnement du processus parent ainsi que :

- `.env` à partir du répertoire de travail actuel (si présent)
- `~/.openclaw/.env` (repli global)

Aucun de ces fichiers ne remplace les variables d'environnement existantes. Vous pouvez également définir des variables d'environnement en ligne dans la configuration :

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell env import (optional)">
  Si activé et que les clés attendues ne sont pas définies, OpenClaw exécute votre shell de connexion et importe uniquement les clés manquantes :

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

Équivalent de variable d'environnement : `OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="Env var substitution in config values">
  Référencez les variables d'environnement dans n'importe quelle valeur de chaîne de configuration avec `${VAR_NAME}` :

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

Règles :

- Seuls les noms en majuscules sont correspondus : `[A-Z_][A-Z0-9_]*`
- Les variables manquantes/vides génèrent une erreur au chargement
- Échappez avec `$${VAR}` pour une sortie littérale
- Fonctionne à l'intérieur des fichiers `$include`
- Substitution en ligne : `"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret refs (env, file, exec)">
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

Les détails sur SecretRef (y compris `secrets.providers` pour `env`/`file`/`exec`) se trouvent dans [Secrets Management](/fr/gateway/secrets).
Les chemins d'identification pris en charge sont répertoriés dans [SecretRef Credential Surface](/fr/reference/secretref-credential-surface).

</Accordion>

Voir [Environment](/fr/help/environment) pour l'ordre de priorité complet et les sources.

## Référence complète

Pour la référence complète champ par champ, consultez **[Configuration Reference](/fr/gateway/configuration-reference)**.

---

_Connexe : [Configuration Examples](/fr/gateway/configuration-examples) · [Configuration Reference](/fr/gateway/configuration-reference) · [Doctor](/fr/gateway/doctor)_
