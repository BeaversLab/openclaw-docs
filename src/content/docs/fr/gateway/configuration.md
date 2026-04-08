---
summary: "Présentation de la configuration : tâches courantes, configuration rapide et liens vers la référence complète"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "Configuration"
---

# Configuration

OpenClaw lit une configuration <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> facultative depuis `~/.openclaw/openclaw.json`.

Si le fichier est manquant, OpenClaw utilise des paramètres par défaut sûrs. Raisons courantes d'ajouter une configuration :

- Connecter des canaux et contrôler qui peut envoyer des messages au bot
- Définir les modèles, les outils, le sandboxing ou l'automatisation (cron, hooks)
- Ajuster les sessions, les médias, le réseau ou l'interface utilisateur

Voir la [référence complète](/en/gateway/configuration-reference) pour chaque champ disponible.

<Tip>**Nouveau dans la configuration ?** Commencez avec `openclaw onboard` pour une configuration interactive, ou consultez le guide [Exemples de configuration](/en/gateway/configuration-examples) pour des configurations complètes prêtes à copier-coller.</Tip>

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
  <Tab title="Interactive wizard">```bash openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLI (one-liners)">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">
    Ouvrez [http://127.0.0.1:18789](http://127.0.0.1:18789) et utilisez l'onglet **Config**. L'interface de contrôle génère un formulaire à partir du schéma de configuration en direct, incluant les métadonnées de documentation de champ `title` / `description` ainsi que les schémas de plugins et de canaux lorsque disponibles, avec un éditeur **Raw JSON** comme échappatoire. Pour les interfaces
    d'exploration et autres outils, la passerelle expose également `config.schema.lookup` pour récupérer un nœud de schéma délimité par un chemin ainsi que les résumés des enfants immédiats.
  </Tab>
  <Tab title="Direct edit">Modifiez `~/.openclaw/openclaw.json` directement. Le Gateway surveille le fichier et applique les modifications automatiquement (voir [hot reload](#config-hot-reload)).</Tab>
</Tabs>

## Validation stricte

<Warning>OpenClaw n'accepte que les configurations correspondant entièrement au schéma. Les clés inconnues, les types malformés ou les valeurs invalides font en sorte que le Gateway **refuse de démarrer**. La seule exception au niveau racine est `$schema` (chaîne), afin que les éditeurs puissent attacher des métadonnées JSON Schema.</Warning>

Notes sur les outils de schéma :

- `openclaw config schema` affiche la même famille de schémas JSON que celle utilisée par l'interface de contrôle
  et la validation de configuration.
- Les valeurs de champ `title` et `description` sont reportées dans la sortie du schéma pour
  les outils d'édition et de formulaire.
- Les entrées d'objet imbriqué, de caractère générique (`*`) et d'élément de tableau (`[]`) héritent des mêmes
  métadonnées de documentation là où existe la documentation du champ correspondant.
- `anyOf` / `oneOf` / `allOf` Les branches de composition héritent également des mêmes métadonnées de documentation, les variantes d'union/intersection conservant donc la même aide de champ.
- `config.schema.lookup` renvoie un chemin de configuration normalisé avec un nœud de schéma superficiel (`title`, `description`, `type`, `enum`, `const`, limites communes et champs de validation similaires), les métadonnées de correspondance de l'interface utilisateur et des résumés d'enfants immédiats pour les outils de forage.
- Les schémas de plugin/channel d'exécution sont fusionnés lorsque la passerelle peut charger le registre de manifeste actuel.

En cas d'échec de la validation :

- Le Gateway ne démarre pas
- Seules les commandes de diagnostic fonctionnent (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Exécutez `openclaw doctor` pour voir les problèmes exacts
- Exécutez `openclaw doctor --fix` (ou `--yes`) pour appliquer les réparations

## Tâches courantes

<AccordionGroup>
  <Accordion title="Configurer un canal (WhatsApp, Telegram, Discord, etc.)">
    Chaque canal possède sa propre section de configuration sous `channels.<provider>`. Consultez la page dédiée au canal pour les étapes de configuration :

    - [WhatsApp](/en/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/en/channels/telegram) — `channels.telegram`
    - [Discord](/en/channels/discord) — `channels.discord`
    - [Feishu](/en/channels/feishu) — `channels.feishu`
    - [Google Chat](/en/channels/googlechat) — `channels.googlechat`
    - [Microsoft Teams](/en/channels/msteams) — `channels.msteams`
    - [Slack](/en/channels/slack) — `channels.slack`
    - [Signal](/en/channels/signal) — `channels.signal`
    - [iMessage](/en/channels/imessage) — `channels.imessage`
    - [Mattermost](/en/channels/mattermost) — `channels.mattermost`

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

    - `agents.defaults.models` définit le catalogue de modèles et agit comme une liste d'autorisation pour `/model`.
    - Les références de modèle utilisent le format `provider/model` (par ex. `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` contrôle la réduction d'échelle des images de transcription/outils (par défaut `1200`) ; des valeurs plus faibles réduisent généralement l'utilisation des tokens de vision lors des exécutions avec de nombreuses captures d'écran.
    - Voir [Models CLI](/en/concepts/models) pour changer de modèle dans le chat et [Model Failover](/en/concepts/model-failover) pour la rotation d'authentification et le comportement de repli.
    - Pour les fournisseurs personnalisés/auto-hébergés, voir [Custom providers](/en/gateway/configuration-reference#custom-providers-and-base-urls) dans la référence.

  </Accordion>

  <Accordion title="Control who can message the bot">
    L'accès aux DM est contrôlé par canal via `dmPolicy` :

    - `"pairing"` (par défaut) : les expéditeurs inconnus reçoivent un code d'appariement unique à approuver
    - `"allowlist"` : seuls les expéditeurs dans `allowFrom` (ou le magasin d'autorisation apparié)
    - `"open"` : autoriser tous les DM entrants (nécessite `allowFrom: ["*"]`)
    - `"disabled"` : ignorer tous les DM

    Pour les groupes, utilisez `groupPolicy` + `groupAllowFrom` ou des listes d'autorisation spécifiques au canal.

    Consultez la [référence complète](/en/gateway/configuration-reference#dm-and-group-access) pour les détails par canal.

  </Accordion>

  <Accordion title="Set up group chat mention gating">
    Les messages de groupe nécessitent par défaut une **mention**. Configurez les motifs par agent :

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

    - **Mentions de métadonnées** : mentions @ natives (mention par appui sur WhatsApp, Telegram @bot, etc.)
    - **Motifs de texte** : motifs regex sûrs dans `mentionPatterns`
    - Consultez la [référence complète](/en/gateway/configuration-reference#group-chat-mention-gating) pour les remplacements par canal et le mode de chat personnel.

  </Accordion>

  <Accordion title="Restrict skills per agent">
    Utilisez `agents.defaults.skills` pour une base partagée, puis remplacez des agents spécifiques avec `agents.list[].skills` :

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
    - Voir [Compétences](/en/tools/skills), [Config des compétences](/en/tools/skills-config) et
      la [Référence de configuration](/en/gateway/configuration-reference#agentsdefaultsskills).

  </Accordion>

  <Accordion title="Régler la surveillance de l'état de santé des channels de la passerelle">
    Contrôlez l'agressivité avec laquelle la passerelle redémarre les channels qui semblent obsolètes :

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
    - Utilisez `channels.<provider>.healthMonitor.enabled` ou `channels.<provider>.accounts.<id>.healthMonitor.enabled` pour désactiver les redémarrages automatiques pour un channel ou un compte sans désactiver le moniteur global.
    - Voir [Contrôles de santé](/en/gateway/health) pour le débogage opérationnel et la [référence complète](/en/gateway/configuration-reference#gateway) pour tous les champs.

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
    - `threadBindings` : valeurs par défaut globales pour le routage des sessions liées aux fils (Discord prend en charge `/focus`, `/unfocus`, `/agents`, `/session idle` et `/session max-age`).
    - Voir [Gestion des sessions](/en/concepts/session) pour la portée, les liens d'identité et la politique d'envoi.
    - Voir la [référence complète](/en/gateway/configuration-reference#session) pour tous les champs.

  </Accordion>

  <Accordion title="Activer l'isolement (sandboxing)">
    Exécutez les sessions d'agent dans des conteneurs Docker isolés :

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

    Voir [Isolement (Sandboxing)](/en/gateway/sandboxing) pour le guide complet et la [référence complète](/en/gateway/configuration-reference#agentsdefaultssandbox) pour toutes les options.

  </Accordion>

  <Accordion title="Activer la push relayée pour les builds officiels iOS">
    La push relayée est configurée dans `openclaw.json`.

    Définissez ceci dans la config de la passerelle :

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

    - Permet à la passerelle d'envoyer des `push.test`, des notifications de réveil (wake nudges) et des réveils de reconnexion via le relais externe.
    - Utilise une autorisation d'envoi (send grant) limitée à l'enregistrement, transmise par l'application iOS appariée. La passerelle n'a pas besoin d'un jeton de relais à l'échelle du déploiement.
    - Lie chaque enregistrement relayé à l'identité de la passerelle avec laquelle l'application iOS a été appariée, empêchant ainsi une autre passerelle de réutiliser l'enregistrement stocké.
    - Conserve les builds locaux/manuels iOS sur les APNs directs. Les envois relayés s'appliquent uniquement aux builds distribués officiellement qui se sont enregistrés via le relais.
    - Doit correspondre à l'URL de base du relais intégrée dans le build officiel/TestFlight iOS, afin que le trafic d'enregistrement et d'envoi atteigne le même déploiement de relais.

    Flux de bout en bout :

    1. Installez un build officiel/TestFlight iOS qui a été compilé avec la même URL de base de relais.
    2. Configurez `gateway.push.apns.relay.baseUrl` sur la passerelle.
    3. Appariez l'application iOS à la passerelle et laissez les sessions de nœud et d'opérateur se connecter.
    4. L'application iOS récupère l'identité de la passerelle, s'enregistre auprès du relais à l'aide d'App Attest et du reçu de l'application, puis publie la charge utile relayée `push.apns.register` vers la passerelle appariée.
    5. La passerelle stocke le handle de relais et l'autorisation d'envoi, puis les utilise pour les `push.test`, les notifications de réveil et les réveils de reconnexion.

    Notes opérationnelles :

    - Si vous basculez l'application iOS vers une autre passerelle, reconnectez l'application afin qu'elle puisse publier un nouvel enregistrement de relais lié à cette passerelle.
    - Si vous publiez un nouveau build iOS pointant vers un déploiement de relais différent, l'application actualise son enregistrement de relais mis en cache au lieu de réutiliser l'ancienne origine du relais.

    Note de compatibilité :

    - `OPENCLAW_APNS_RELAY_BASE_URL` et `OPENCLAW_APNS_RELAY_TIMEOUT_MS` fonctionnent toujours comme substitutions d'environnement temporaires.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` reste une porte de sortie de développement en boucle uniquement (loopback-only) ; ne persistez pas les URL de relais HTTP dans la configuration.

    Voir [Application iOS](/en/platforms/ios#relay-backed-push-for-official-builds) pour le flux de bout en bout et [Flux d'authentification et de confiance](/en/platforms/ios#authentication-and-trust-flow) pour le modèle de sécurité du relais.

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

    - `every`: chaîne de durée (`30m`, `2h`). Définissez `0m` pour désactiver.
    - `target`: `last` | `none` | `<channel-id>` (par exemple `discord`, `matrix`, `telegram`, ou `whatsapp`)
    - `directPolicy`: `allow` (par défaut) ou `block` pour les cibles de heartbeat de style DM
    - Voir [Heartbeat](/en/gateway/heartbeat) pour le guide complet.

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

    - `sessionRetention`: nettoyer les sessions d'exécution isolées terminées de `sessions.json` (par défaut `24h`; définissez `false` pour désactiver).
    - `runLog`: nettoyer `cron/runs/<jobId>.jsonl` par taille et lignes conservées.
    - Voir [Cron jobs](/en/automation/cron-jobs) pour un aperçu des fonctionnalités et des exemples CLI.

  </Accordion>

  <Accordion title="Configurer les webhooks (hooks)">
    Activez les points de terminaison HTTP webhook sur le Gateway :

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
    - Traitez tout le contenu des payloads hook/webhook comme une entrée non fiable.
    - Utilisez un `hooks.token` dédié ; ne réutilisez pas le jeton partagé du Gateway.
    - L'authentification des hooks se fait uniquement via les en-têtes (`Authorization: Bearer ...` ou `x-openclaw-token`) ; les jetons de chaîne de requête sont rejetés.
    - `hooks.path` ne peut pas être `/` ; gardez l'ingress webhook sur un sous-chemin dédié tel que `/hooks`.
    - Gardez les indicateurs de contournement de contenu non sécurisé désactivés (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) sauf si vous effectuez un débogage étroitement délimité.
    - Si vous activez `hooks.allowRequestSessionKey`, définissez également `hooks.allowedSessionKeyPrefixes` pour limiter les clés de session choisies par l'appelant.
    - Pour les agents pilotés par des hooks, préférez les niveaux de modèle modernes et puissants et une stratégie d'outil stricte (par exemple, messagerie uniquement et sandboxing si possible).

    Voir la [référence complète](/en/gateway/configuration-reference#hooks) pour toutes les options de mappage et l'intégration Gmail.

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

    Voir [Multi-Agent](/en/concepts/multi-agent) et [référence complète](/en/gateway/configuration-reference#multi-agent-routing) pour les règles de liaison et les profils d'accès par agent.

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
    - **Clés frères** : fusionnées après les inclusions (remplacent les valeurs incluses)
    - **Inclusions imbriquées** : prises en charge jusqu'à 10 niveaux de profondeur
    - **Chemins relatifs** : résolus par rapport au fichier d'inclusion
    - **Gestion des erreurs** : erreurs claires pour les fichiers manquants, les erreurs d'analyse et les inclusions circulaires

  </Accordion>
</AccordionGroup>

## Rechargement à chaud de la configuration

Le Gateway surveille `~/.openclaw/openclaw.json` et applique les modifications automatiquement — aucun redémarrage manuel n'est nécessaire pour la plupart des paramètres.

### Modes de rechargement

| Mode                      | Comportement                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **`hybrid`** (par défaut) | Applique à chaud les modifications sûres instantanément. Redémarre automatiquement pour les modifications critiques.                         |
| **`hot`**                 | Applique à chaud uniquement les modifications sûres. Enregistre un avertissement lorsqu'un redémarrage est nécessaire — vous devez le gérer. |
| **`restart`**             | Redémarre le Gateway lors de toute modification de configuration, sûre ou non.                                                               |
| **`off`**                 | Désactive la surveillance des fichiers. Les modifications prennent effet au prochain redémarrage manuel.                                     |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Ce qui s'applique à chaud vs ce qui nécessite un redémarrage

La plupart des champs s'appliquent à chaud sans temps d'arrêt. En mode `hybrid`, les modifications nécessitant un redémarrage sont gérées automatiquement.

| Catégorie            | Champs                                                                   | Redémarrage nécessaire ? |
| -------------------- | ------------------------------------------------------------------------ | ------------------------ |
| Canaux               | `channels.*`, `web` (WhatsApp) — tous les canaux intégrés et d'extension | Non                      |
| Agent et modèles     | `agent`, `agents`, `models`, `routing`                                   | Non                      |
| Automatisation       | `hooks`, `cron`, `agent.heartbeat`                                       | Non                      |
| Sessions et messages | `session`, `messages`                                                    | Non                      |
| Outils et médias     | `tools`, `browser`, `skills`, `audio`, `talk`                            | Non                      |
| UI et divers         | `ui`, `logging`, `identity`, `bindings`                                  | Non                      |
| Serveur Gateway      | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP)                     | **Oui**                  |
| Infrastructure       | `discovery`, `canvasHost`, `plugins`                                     | **Oui**                  |

<Note>`gateway.reload` et `gateway.remote` sont des exceptions — les changer ne déclenche **pas** de redémarrage.</Note>

## Config RPC (mises à jour programmatiques)

<Note>Les RPC d'écriture du plan de contrôle (`config.apply`, `config.patch`, `update.run`) sont limités à **3 requêtes par 60 secondes** par `deviceId+clientIp`. En cas de limitation, le RPC renvoie `UNAVAILABLE` avec `retryAfterMs`.</Note>

Flux sécurisé/défaut :

- `config.schema.lookup` : inspecter un sous-arbre de configuration avec portée de chemin avec un nœud de schéma superficiel, les métadonnées d'indice correspondantes et les résumés des enfants immédiats
- `config.get` : récupérer l'instantané actuel + le hachage
- `config.patch` : chemin privilégié pour la mise à jour partielle
- `config.apply` : remplacement de la configuration complète uniquement
- `update.run` : mise à jour explicite + redémarrage

Lorsque vous ne remplacez pas la configuration entière, préférez `config.schema.lookup`
puis `config.patch`.

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    Valide + écrit la configuration complète et redémarre la Gateway en une seule étape.

    <Warning>
    `config.apply` remplace la **configuration entière**. Utilisez `config.patch` pour les mises à jour partielles, ou `openclaw config set` pour des clés uniques.
    </Warning>

    Paramètres :

    - `raw` (string) — charge utile JSON5 pour la configuration entière
    - `baseHash` (optionnel) — hachage de la configuration provenant de `config.get` (requis lorsque la configuration existe)
    - `sessionKey` (optionnel) — clé de session pour le ping de réveil après redémarrage
    - `note` (optionnel) — note pour la sentinelle de redémarrage
    - `restartDelayMs` (optionnel) — délai avant le redémarrage (par défaut 2000)

    Les demandes de redémarrage sont fusionnées lorsqu'une est déjà en cours/en transit, et un temps de refroidissement de 30 secondes s'applique entre les cycles de redémarrage.

    ```bash
    openclaw gateway call config.get --params '{}'  # capture payload.hash
    openclaw gateway call config.apply --params '{
      "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
      "baseHash": "<hash>",
      "sessionKey": "agent:main:whatsapp:direct:+15555550123"
    }'
    ```

  </Accordion>

  <Accordion title="config.patch (mise à jour partielle)">
    Fusionne une mise à jour partielle dans la configuration existante (sémantique JSON merge patch) :

    - Les objets fusionnent de manière récursive
    - `null` supprime une clé
    - Les tableaux sont remplacés

    Paramètres :

    - `raw` (chaîne) — JSON5 avec uniquement les clés à modifier
    - `baseHash` (requis) — hachage de la configuration provenant de `config.get`
    - `sessionKey`, `note`, `restartDelayMs` — identique à `config.apply`

    Le comportement de redémarrage correspond à `config.apply` : redémarrages en attente regroupés plus un temps de recharge de 30 secondes entre les cycles de redémarrage.

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

<Accordion title="Substitution de variable d'environnement dans les valeurs de config">
  Référencez les variables d'environnement dans n'importe quelle valeur de chaîne de configuration avec `${VAR_NAME}` :

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

Règles :

- Seuls les noms en majuscules correspondent : `[A-Z_][A-Z0-9_]*`
- Les variables manquantes ou vides génèrent une erreur au chargement
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

Les détails de SecretRef (y compris `secrets.providers` pour `env`/`file`/`exec`) se trouvent dans [Gestion des secrets](/en/gateway/secrets).
Les chemins d'identifiants pris en charge sont répertoriés dans [Surface des identifiants SecretRef](/en/reference/secretref-credential-surface).

</Accordion>

Voir [Environnement](/en/help/environment) pour la priorité complète et les sources.

## Référence complète

Pour la référence complète champ par champ, consultez **[Référence de configuration](/en/gateway/configuration-reference)**.

---

_Connexes : [Exemples de configuration](/en/gateway/configuration-examples) · [Référence de configuration](/en/gateway/configuration-reference) · [Doctor](/en/gateway/doctor)_
