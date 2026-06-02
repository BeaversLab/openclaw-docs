---
summary: "Présentation de la configuration : tâches courantes, configuration rapide et liens vers la référence complète"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "Configuration"
---

OpenClaw lit une configuration optionnelle <TooltipOpenClaw tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> à partir de `~/.openclaw/openclaw.json`.
Le chemin de configuration actif doit être un fichier régulier. Les dispositions `openclaw.json`OpenClaw
liées par un lien symbolique ne sont pas prises en charge pour les écritures appartenant à OpenClaw ; une écriture atomique peut remplacer
le chemin au lieu de préserver le lien symbolique. Si vous conservez la configuration en dehors du
répertoire d'état par défaut, pointez `OPENCLAW_CONFIG_PATH` directement vers le fichier réel.

Si le fichier est manquant, OpenClaw utilise des valeurs par défaut sûres. Raisons courantes d'ajouter une configuration :

- Connecter des canaux et contrôler qui peut envoyer des messages au bot
- Définir les modèles, outils, sandboxing ou automatisation (cron, hooks)
- Ajuster les sessions, médias, réseau ou interface utilisateur

Consultez la [référence complète](/fr/gateway/configuration-reference) pour chaque champ disponible.

Les agents et l'automatisation doivent utiliser `config.schema.lookup` pour obtenir une documentation exacte au niveau du champ avant de modifier la configuration. Utilisez cette page pour des conseils orientés tâches et [Configuration reference](/fr/gateway/configuration-reference) pour la cartographie globale des champs et les valeurs par défaut.

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
    Ouvrez [http://127.0.0.1:18789](http://127.0.0.1:18789) et utilisez l'onglet **Config**. L'interface de contrôle génère un formulaire à partir du schéma de configuration en direct, incluant les métadonnées de documentation `title` / `description` des champs ainsi que les schémas de plugins et de canaux (channel) lorsque disponibles, avec un éditeur **Raw JSON** en cas de besoin. Pour les
    interfaces d'exploration et d'autres outils, la passerelle expose également `config.schema.lookup` pour récupérer un nœud de schéma délimité par un chemin ainsi que les résumés des enfants immédiats.
  </Tab>
  <Tab title="Direct edit">Modifiez `~/.openclaw/openclaw.json` directement. Le Gateway surveille le fichier et applique les modifications automatiquement (voir [hot reload](#config-hot-reload)).</Tab>
</Tabs>

## Validation stricte

<Warning>OpenClaw n'accepte que les configurations qui correspondent entièrement au schéma. Les clés inconnues, les types malformés ou les valeurs invalides font en sorte que la passerelle **refuse de démarrer**. La seule exception au niveau racine est OpenClawGateway`$schema` (chaîne), afin que les éditeurs puissent attacher des métadonnées JSON Schema.</Warning>

`openclaw config schema` imprime le Schéma JSON canonique utilisé par l'interface utilisateur de contrôle et la validation. `config.schema.lookup` récupère un nœud unique délimité par un chemin ainsi que des résumés enfants pour les outils de forage. Les métadonnées de documentation du champ `title`/`description` sont transmises à travers les objets imbriqués, les caractères génériques (`*`), les éléments de tableau (`[]`) et les branches `anyOf`/`oneOf`/`allOf`. Les schémas des plugins d'exécution et des canaux sont fusionnés lors du chargement du registre des manifestes.

En cas d'échec de la validation :

- Le Gateway ne démarre pas
- Seules les commandes de diagnostic fonctionnent (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Exécutez `openclaw doctor` pour voir les problèmes exacts
- Exécutez `openclaw doctor --fix` (ou `--yes`) pour appliquer les réparations

Le Gateway conserve une copie de confiance du dernier état connu après chaque démarrage réussi, mais le démarrage et le rechargement à chaud ne la restaurent pas automatiquement. Si `openclaw.json` échoue à la validation (y compris la validation locale des plugins), le démarrage du Gateway échoue ou le rechargement est ignoré et l'exécution actuelle conserve la dernière configuration acceptée. Exécutez `openclaw doctor --fix` (ou `--yes`) pour réparer la configuration préfixée/écrasée ou restaurer la copie du dernier état connu. La promotion vers le dernier état connu est ignorée lorsqu'un candidat contient des espaces réservés de secrets expurgés tels que `***`.

## Tâches courantes

<AccordionGroup>
  <Accordion title="Configurer un canal (WhatsApp, Telegram, Discord, etc.)">
    Chaque canal possède sa propre section de configuration sous `channels.<provider>`. Consultez la page dédiée au canal pour les étapes de configuration :

    - [WhatsApp](/fr/channels/whatsapp) - `channels.whatsapp`
    - [Telegram](/fr/channels/telegram) - `channels.telegram`
    - [Discord](/fr/channels/discord) - `channels.discord`
    - [Feishu](/fr/channels/feishu) - `channels.feishu`
    - [Google Chat](/fr/channels/googlechat) - `channels.googlechat`
    - [Microsoft Teams](/fr/channels/msteams) - `channels.msteams`
    - [Slack](/fr/channels/slack) - `channels.slack`
    - [Signal](/fr/channels/signal) - `channels.signal`
    - [iMessage](/fr/channels/imessage) - `channels.imessage`
    - [Mattermost](/fr/channels/mattermost) - `channels.mattermost`

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

    - `agents.defaults.models` définit le catalogue de modèles et agit comme la liste d'autorisation pour `/model` ; les entrées `provider/*` filtrent `/model`, `/models` et les sélecteurs de modèles vers les fournisseurs sélectionnés tout en utilisant toujours la découverte dynamique de modèles.
    - Utilisez `openclaw config set agents.defaults.models '<json>' --strict-json --merge` pour ajouter des entrées à la liste d'autorisation sans supprimer les modèles existants. Les remplacements simples qui supprimeraient des entrées sont rejetés à moins que vous ne passiez `--replace`.
    - Les références de modèles utilisent le format `provider/model` (par ex. `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` contrôle la réduction d'échelle des images de transcription/tool (par défaut `1200`) ; des valeurs plus basses réduisent généralement l'utilisation des jetons de vision lors des exécutions avec de nombreuses captures d'écran.
    - Voir [Modèles CLI](/fr/concepts/models) pour changer de modèles dans le chat et [Échec de modèle (Failover)](/fr/concepts/model-failover) pour la rotation de l'authentification et le comportement de repli.
    - Pour les fournisseurs personnalisés/auto-hébergés, voir [Fournisseurs personnalisés](/fr/gateway/config-tools#custom-providers-and-base-urls) dans la référence.

  </Accordion>

  <Accordion title="Contrôler qui peut envoyer un message au bot">
    L'accès DM est contrôlé par canal via `dmPolicy` :

    - `"pairing"` (par défaut) : les expéditeurs inconnus reçoivent un code d'appariement à usage unique pour approuver
    - `"allowlist"` : uniquement les expéditeurs dans `allowFrom` (ou le magasin d'autorisation apparié)
    - `"open"` : autoriser tous les DM entrants (nécessite `allowFrom: ["*"]`)
    - `"disabled"` : ignorer tous les DM

    Pour les groupes, utilisez `groupPolicy` + `groupAllowFrom` ou des listes d'autorisation spécifiques au canal.

    Voir la [référence complète](/fr/gateway/config-channels#dm-and-group-access) pour les détails par canal.

  </Accordion>

  <Accordion title="Configurer le filtrage par mention pour les chats de groupe">
    Les messages de groupe nécessitent par défaut une **mention**. Configurez les motifs de déclenchement par agent. Les réponses normales de groupe/canal sont publiées automatiquement ; optez pour le chemin de l'outil de message (message-tool) pour les salons partagés où l'agent doit décider quand intervenir :

    ```json5
    {
      messages: {
        visibleReplies: "automatic", // set "message_tool" to require message-tool sends everywhere
        groupChat: {
          visibleReplies: "message_tool", // opt-in; visible output requires message(action=send)
          unmentionedInbound: "room_event", // unmentioned always-on group chatter is quiet context
        },
      },
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

    - **Métadonnées de mention** : mentions natives @ (appuyer pour mentionner sur WhatsApp, @bot sur Telegram, etc.)
    - **Motifs de texte** : motifs regex sûrs dans `mentionPatterns`
    - **Réponses visibles** : `messages.visibleReplies` peut exiger l'envoi via message-tool globalement ; `messages.groupChat.visibleReplies` remplace cela pour les groupes/canaux.
    - Voir la [référence complète](/fr/gateway/config-channels#group-chat-mention-gating) pour les modes de réponse visible, les remplacements par canal, et le mode d'auto-discussion.

  </Accordion>

  <Accordion title="Restreindre les compétences par agent">
    Utilisez `agents.defaults.skills` pour une base de référence partagée, puis remplacez pour des
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
    - Définissez `agents.list[].skills: []` pour aucune compétence.
    - Voir [Compétences](/fr/tools/skills), [Configuration des compétences](/fr/tools/skills-config), et
      la [Référence de configuration](/fr/gateway/config-agents#agents-defaults-skills).

  </Accordion>

  <Accordion title="Ajuster la surveillance de santé des canaux de passerelle">
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

    - Définissez `gateway.channelHealthCheckMinutes: 0` pour désactiver globalement les redémarrages de surveillance de santé.
    - `channelStaleEventThresholdMinutes` doit être supérieur ou égal à l'intervalle de vérification.
    - Utilisez `channels.<provider>.healthMonitor.enabled` ou `channels.<provider>.accounts.<id>.healthMonitor.enabled` pour désactiver les redémarrages automatiques pour un canal ou un compte spécifique sans désactiver le moniteur global.
    - Voir [Vérifications de santé](/fr/gateway/health) pour le débogage opérationnel et la [référence complète](/fr/gateway/configuration-reference#gateway) pour tous les champs.

  </Accordion>

  <Accordion title="Régler le délai d'expiration de la poignée de main WebSocket de la passerelle">
    Donnez aux clients locaux plus de temps pour compléter la poignée de main WebSocket pré-auth sur
    les hôtes surchargés ou peu puissants :

    ```json5
    {
      gateway: {
        handshakeTimeoutMs: 30000,
      },
    }
    ```

    - La valeur par défaut est `15000` millisecondes.
    - `OPENCLAW_HANDSHAKE_TIMEOUT_MS` prend toujours le pas pour les substitutions ponctuelles de service ou de shell.
    - Préférez corriger d'abord les blocages au démarrage/de boucle d'événements ; ce bouton est pour les hôtes sains mais lents lors du préchauffage.

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
    - Consultez [Gestion des sessions](/fr/concepts/session) pour la portée, les liens d'identité et la politique d'envoi.
    - Consultez [référence complète](/fr/gateway/config-agents#session) pour tous les champs.

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

    Construisez d'abord l'image - à partir d'une source exécutée, lancez `scripts/sandbox-setup.sh`, ou à partir d'une installation npm, consultez la commande `docker build` en ligne dans [Sandboxing § Images et configuration](/fr/gateway/sandboxing#images-and-setup).

    Consultez [Sandboxing](/fr/gateway/sandboxing) pour le guide complet et [référence complète](/fr/gateway/config-agents#agentsdefaultssandbox) pour toutes les options.

  </Accordion>

  <Accordion title="iOSActiver la push relayée pour les versions iOS officielles"OpenClaw>
    La push relayée utilise par défaut le relais OpenClaw hébergé : `https://ios-push-relay.openclaw.ai`.

    Pour utiliser un relais personnalisé, définissez ceci dans la configuration de la passerelle :

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
    ```CLI

    Équivalent CLI :

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    Ce que cela fait :

    - Permet à la passerelle d'envoyer des `push.test`iOSiOSiOSiOSiOS, des notifications de réveil et des réveils de reconnexion via le relais externe.
    - Utilise un droit d'envoi délimité par l'enregistrement, transféré par l'application iOS jumelée. La passerelle n'a pas besoin de jeton de relai à l'échelle du déploiement.
    - Lie chaque enregistrement relayé à l'identité de la passerelle avec laquelle l'application iOS est jumelée, empêchant ainsi une autre passerelle de réutiliser l'enregistrement stocké.
    - Conserve les versions iOS locales/manuelles sur les APNs directs. Les envois relayés s'appliquent uniquement aux versions distribuées officielles qui se sont enregistrées via le relais.
    - Doit correspondre à l'URL de base du relais intégrée dans la version iOS officielle/TestFlight, afin que le trafic d'enregistrement et d'envoi atteigne le même déploiement de relais.

    Flux de bout en bout :

    1. Installez une version iOS officielle/TestFlight.
    2. Optionnel : configurez `gateway.push.apns.relay.baseUrl`iOSiOS sur la passerelle uniquement lors de l'utilisation d'un déploiement de relais personnalisé.
    3. Associez l'application iOS à la passerelle et laissez les sessions nœud et opérateur se connecter.
    4. L'application iOS récupère l'identité de la passerelle, s'inscrit auprès du relais à l'aide d'App Attest et du reçu de l'application, puis publie la charge utile `push.apns.register` relayée vers la passerelle associée.
    5. La passerelle stocke le gestionnaire de relais et le droit d'envoi, puis les utilise pour les `push.test`iOSiOS, les notifications de réveil et les réveils de reconnexion.

    Notes opérationnelles :

    - Si vous basculez l'application iOS vers une autre passerelle, reconnectez l'application afin qu'elle puisse publier un nouvel enregistrement de relais lié à cette passerelle.
    - Si vous publiez une nouvelle version iOS pointant vers un déploiement de relais différent, l'application actualise son enregistrement de relais mis en cache au lieu de réutiliser l'origine de l'ancien relais.

    Note de compatibilité :

    - `OPENCLAW_APNS_RELAY_BASE_URL` et `OPENCLAW_APNS_RELAY_TIMEOUT_MS`iOS fonctionnent toujours comme des substitutions temporaires d'environnement.
    - Les URL de relais de passerelle personnalisées doivent correspondre à l'URL de base du relais intégrée dans la version iOS officielle/TestFlight.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`iOS reste une échappatoire de développement en boucle locale uniquement ; ne persistez pas les URL de relais HTTP dans la configuration.

    Voir [Application iOS](/fr/platforms/ios#relay-backed-push-for-official-builds) pour le flux de bout en bout et [Flux d'authentification et de confiance](/fr/platforms/ios#authentication-and-trust-flow) pour le modèle de sécurité du relais.

  </Accordion>

  <Accordion title="Configurer le battement de cœur (points de contrôle périodiques)">
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

    - `every`: chaîne de durée (`30m`, `2h`). Définissez `0m` pour désactiver.
    - `target`: `last` | `none` | `<channel-id>` (par exemple `discord`, `matrix`, `telegram` ou `whatsapp`)
    - `directPolicy`: `allow` (par défaut) ou `block` pour les cibles de battement de cœur de style DM
    - Voir [Heartbeat](/fr/gateway/heartbeat) pour le guide complet.

  </Accordion>

  <Accordion title="Configurer les tâches cron">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 8, // default; cron dispatch + isolated cron agent-turn execution
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention` : éliminer les sessions d'exécution isolées terminées de `sessions.json` (défaut `24h` ; définir `false` pour désactiver).
    - `runLog` : éliminer les lignes d'historique d'exécution cron conservées par tâche. `maxBytes` reste accepté pour les anciens journaux d'exécution basés sur des fichiers.
    - Voir [Cron jobs](/fr/automation/cron-jobs) pour un aperçu des fonctionnalités et des exemples CLI.

  </Accordion>

  <Accordion title="Configurer les webhooks (hooks)">
    Activer les points de terminaison HTTP de webhook sur le Gateway :

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
    - Traitez tout le contenu des payloads de hook/webhook comme une entrée non fiable.
    - Utilisez un `hooks.token` dédié ; ne réutilisez pas les secrets d'authentification actifs du Gateway (`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` ou `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`).
    - L'authentification des hooks se fait uniquement via l'en-tête (`Authorization: Bearer ...` ou `x-openclaw-token`) ; les jetons de chaîne de requête sont rejetés.
    - `hooks.path` ne peut pas être `/` ; maintenez l'entrée webhook sur un sous-chemin dédié tel que `/hooks`.
    - Gardez les indicateurs de contournement de contenu non sécurisé désactivés (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) sauf si vous effectuez un débogage étroitement délimité.
    - Si vous activez `hooks.allowRequestSessionKey`, définissez également `hooks.allowedSessionKeyPrefixes` pour limiter les clés de session sélectionnées par l'appelant.
    - Pour les agents pilotés par hooks, préférez les niveaux de  modernes et solides ainsi qu'une stricte politique de  (par exemple, messagerie uniquement plus  si possible).

    Voir la [référence complète](/fr/gateway/configuration-reference#hooks) pour toutes les options de mappage et l'intégration Gmail.

  </Accordion>

  <Accordion title="Configurer le routage multi-agent">
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
    - **Tableau de fichiers** : fusionné en profondeur dans l'ordre (le dernier l'emporte)
    - **Clés frères** : fusionnées après les inclusions (remplacement des valeurs incluses)
    - **Inclusions imbriquées** : prises en charge jusqu'à 10 niveaux de profondeur
    - **Chemins relatifs** : résolus par rapport au fichier incluant
    - **Format du chemin** : les chemins d'inclusion ne doivent pas contenir d'octets nuls et doivent être strictement inférieurs à 4096 caractères avant et après résolution
    - **Écritures possédées par OpenClaw** : lorsqu'une écriture ne modifie qu'une seule section de premier niveau
      soutenue par une inclusion à fichier unique telle que `plugins: { $include: "./plugins.json5" }`,
      OpenClaw met à jour ce fichier inclus et laisse `openclaw.json` intact
    - **Écriture-transfert non prise en charge** : les inclusions racines, les tableaux d'inclusions et les inclusions
      avec des remplacements frères échouent de manière fermée pour les écritures possédées par OpenClaw au lieu de
      platifier la configuration
    - **Confinement** : les chemins `$include` doivent être résolus sous le répertoire contenant
      `openclaw.json`. Pour partager une arborescence entre machines ou utilisateurs, définissez
      `OPENCLAW_INCLUDE_ROOTS` sur une liste de chemins (`:` sur POSIX, `;` sur Windows) de
      répertoires supplémentaires que les inclusions peuvent référencer. Les liens symboliques sont résolus
      et revérifiés, donc un chemin qui vit lexicalement dans un répertoire de configuration mais dont
      la cible réelle s'échappe de chaque racine autorisée est toujours rejeté.
    - **Gestion des erreurs** : erreurs claires pour les fichiers manquants, les erreurs d'analyse, les inclusions circulaires, le format de chemin invalide et la longueur excessive

  </Accordion>
</AccordionGroup>

## Rechargement à chaud de la configuration

Le Gateway surveille `~/.openclaw/openclaw.json` et applique les modifications automatiquement — aucun redémarrage manuel n'est nécessaire pour la plupart des paramètres.

Les modifications directes du fichier sont considérées comme non fiables jusqu'à ce qu'elles soient validées. L'observateur attend que l'activité d'écriture temporaire/de renommage de l'éditeur se stabilise, lit le fichier final et rejette les modifications externes non valides sans réécrire `openclaw.json`OpenClaw. Les écritures de configuration propriétaires d'OpenClaw utilisent la même porte de validation de schéma avant l'écriture ; les écrasements destructeurs tels que la suppression de `gateway.mode` ou la réduction du fichier de plus de moitié sont rejetés et enregistrés sous `.rejected.*` pour inspection.

Si vous voyez `config reload skipped (invalid config)` ou si les rapports de démarrage indiquent `Invalid
config`, inspect the config, run `openclaw config validate`, then run `openclaw
doctor --fix` pour réparation. Consultez [Gateway troubleshooting](/fr/gateway/troubleshooting#gateway-rejected-invalid-config)
pour la liste de contrôle.

### Modes de rechargement

| Mode                      | Comportement                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **`hybrid`** (par défaut) | Applique à chaud les modifications sûres instantanément. Redémarre automatiquement pour les modifications critiques.                          |
| **`hot`**                 | Applique à chaud uniquement les modifications sûres. Enregistre un avertissement lorsqu'un redémarrage est nécessaire - vous vous en chargez. |
| **`restart`**             | Redémarre le Gateway lors de toute modification de configuration, sûre ou non.                                                                |
| **`off`**                 | Désactive la surveillance des fichiers. Les modifications prennent effet au prochain redémarrage manuel.                                      |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Ce qui est appliqué à chaud vs ce qui nécessite un redémarrage

La plupart des champs s'appliquent à chaud sans temps d'arrêt. En mode `hybrid`, les modifications nécessitant un redémarrage sont gérées automatiquement.

| Catégorie           | Champs                                                               | Redémarrage nécessaire ? |
| ------------------- | -------------------------------------------------------------------- | ------------------------ |
| Canaux              | `channels.*`, `web` (WhatsApp) - tous les canaux intégrés et plugins | Non                      |
| Agent & modèles     | `agent`, `agents`, `models`, `routing`                               | Non                      |
| Automatisation      | `hooks`, `cron`, `agent.heartbeat`                                   | Non                      |
| Sessions & messages | `session`, `messages`                                                | Non                      |
| Outils & médias     | `tools`, `browser`, `skills`, `mcp`, `audio`, `talk`                 | Non                      |
| UI et divers        | `ui`, `logging`, `identity`, `bindings`                              | Non                      |
| Gateway serveur     | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP)                 | **Oui**                  |
| Infrastructure      | `discovery`, `plugins`                                               | **Oui**                  |

<Note>`gateway.reload` et `gateway.remote` sont des exceptions - les modifier ne déclenche **pas** de redémarrage.</Note>

### Planification du rechargement

Lorsque vous modifiez un fichier source référencé via `$include`, OpenClaw planifie
le rechargement à partir de la disposition définie par la source, et non de la vue aplatie en mémoire.
Cela rend les décisions de rechargement à chaud (application à chaud vs redémarrage) prévisibles, même lorsqu'une
section de premier niveau unique réside dans son propre fichier inclus, tel que
`plugins: { $include: "./plugins.json5" }`. La planification du rechargement échoue en mode fermé si la
layout source est ambigu.

## Config RPC (mises à jour programmatiques)

Pour les outils qui écrivent la configuration via l'API de la passerelle, privilégiez ce flux :

- `config.schema.lookup` pour inspecter un sous-arbre (nœud de schéma superficiel + résumés
  enfants)
- `config.get` pour récupérer l'instantané actuel plus `hash`
- `config.patch` pour les mises à jour partielles (correctif de fusion JSON : fusion d'objets, `null`
  supprime, les tableaux remplacent)
- `config.apply` uniquement lorsque vous avez l'intention de remplacer l'intégralité de la configuration
- `update.run` pour une mise à jour explicite suivie d'un redémarrage ; incluez `continuationMessage` lorsque la session post-redémarrage doit exécuter un tour de suite
- `update.status` pour inspecter la dernière sentinelle de redémarrage de mise à jour et vérifier la version en cours d'exécution après un redémarrage

Les agents doivent traiter `config.schema.lookup` comme la première étape pour la documentation exacte
au niveau du champ et les contraintes. Utilisez [Référence de configuration](/fr/gateway/configuration-reference)
lorsqu'ils ont besoin de la carte de configuration plus large, des valeurs par défaut ou des liens vers des références
de sous-systèmes dédiés.

<Note>
  Les écritures du plan de contrôle (`config.apply`, `config.patch`, `update.run`) sont limitées à 3 requêtes par 60 secondes par `deviceId+clientIp`. Les demandes de redémarrage sont fusionnées puis appliquent un temps de recharge de 30 secondes entre les cycles de redémarrage. `update.status` est en lecture seule mais délimitée au niveau administrateur car la sentinelle de redémarrage peut
  inclure des résumés des étapes de mise à jour et les fins de sortie de commande.
</Note>

Exemple de correctif partiel :

```bash
openclaw gateway call config.get --params '{}'  # capture payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

`config.apply` et `config.patch` acceptent tous deux `raw`, `baseHash`, `sessionKey`,
`note` et `restartDelayMs`. `baseHash` est requis pour les deux méthodes lorsqu'une
configuration existe déjà.

## Variables d'environnement

OpenClaw lit les variables d'environnement du processus parent ainsi que :

- `.env` à partir du répertoire de travail actuel (si présent)
- `~/.openclaw/.env` (solution de repli globale)

Aucun de ces fichiers ne remplace les variables d'environnement existantes. Vous pouvez également définir des variables d'environnement en ligne dans la configuration :

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Import d'environnement Shell (optionnel)">
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
- Les variables manquantes ou vides provoquent une erreur au chargement
- Échappez avec `$${VAR}` pour une sortie littérale
- Fonctionne dans les fichiers `$include`
- Substitution en ligne : `"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Références de secrets (env, fichier, exec)">
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

Les détails de SecretRef (y compris `secrets.providers` pour `env`/`file`/`exec`) se trouvent dans [Gestion des secrets](/fr/gateway/secrets).
Les chemins d'identification pris en charge sont répertoriés dans [Surface d'identification SecretRef](/fr/reference/secretref-credential-surface).

</Accordion>

Voir [Environnement](/fr/help/environment) pour la priorité complète et les sources.

## Référence complète

Pour la référence complète champ par champ, voir **[Référence de configuration](/fr/gateway/configuration-reference)**.

---

_Connexes : [Exemples de configuration](/fr/gateway/configuration-examples) · [Référence de configuration](/fr/gateway/configuration-reference) · [Doctor](/fr/gateway/doctor)_

## En lien

- [Référence de configuration](/fr/gateway/configuration-reference)
- [Exemples de configuration](/fr/gateway/configuration-examples)
- [Guide de procédures Gateway](/fr/gateway)
