---
summary: "Aperçu de la configuration : tâches courantes, configuration rapide et liens vers la référence complète"
read_when:
  - Configuration d'OpenClaw pour la première fois
  - Recherche de modèles de configuration courants
  - Navigation vers des sections de configuration spécifiques
title: "Configuration"
---

# Configuration

OpenClaw lit une configuration <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> facultative depuis `~/.openclaw/openclaw.json`.

Si le fichier est manquant, OpenClaw utilise des valeurs par défaut sûres. Raisons courantes d'ajouter une configuration :

- Connecter les canaux et contrôler qui peut envoyer des messages au bot
- Définir les modèles, les outils, le sandboxing ou l'automatisation (cron, hooks)
- Ajuster les sessions, les médias, le réseau ou l'interface utilisateur

Voir la [référence complète](/fr/gateway/configuration-reference) pour chaque champ disponible.

<Tip>
**Nouveau dans la configuration ?** Commencez avec `openclaw onboard` pour une configuration interactive, ou consultez le guide [Exemples de configuration](/fr/gateway/configuration-examples) pour des configurations complètes prêtes à copier-coller.
</Tip>

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
  <Tab title="Interactive wizard">
    ```bash
    openclaw onboard       # full onboarding flow
    openclaw configure     # config wizard
    ```
  </Tab>
  <Tab title="CLI (one-liners)">
    ```bash
    openclaw config get agents.defaults.workspace
    openclaw config set agents.defaults.heartbeat.every "2h"
    openclaw config unset plugins.entries.brave.config.webSearch.apiKey
    ```
  </Tab>
  <Tab title="Interface de contrôle">
    Ouvrez [http://127.0.0.1:18789](http://127.0.0.1:18789) et utilisez l'onglet **Config**.
    L'interface de contrôle génère un formulaire à partir du schéma de configuration, avec un éditeur **JSON brut** comme échappatoire.
  </Tab>
  <Tab title="Édition directe">
    Modifiez `~/.openclaw/openclaw.json` directement. Le Gateway surveille le fichier et applique les modifications automatiquement (voir [rechargement à chaud](#config-hot-reload)).
  </Tab>
</Tabs>

## Validation stricte

<Warning>
OpenClaw n'accepte que les configurations correspondant entièrement au schéma. Les clés inconnues, les types malformés ou les valeurs invalides empêchent le Gateway de **démarrer**. La seule exception au niveau racine est `$schema` (chaîne), afin que les éditeurs puissent attacher des métadonnées de schéma JSON.
</Warning>

Lorsque la validation échoue :

- Le Gateway ne démarre pas
- Seules les commandes de diagnostic fonctionnent (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Exécutez `openclaw doctor` pour voir les problèmes exacts
- Exécutez `openclaw doctor --fix` (ou `--yes`) pour appliquer les réparations

## Tâches courantes

<AccordionGroup>
  <Accordion title="Configurer un channel (WhatsApp, Telegram, Discord, etc.)">
    Chaque channel possède sa propre section de configuration sous `channels.<provider>`. Consultez la page dédiée au channel pour les étapes de configuration :

    - [WhatsApp](/fr/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/fr/channels/telegram) — `channels.telegram`
    - [Discord](/fr/channels/discord) — `channels.discord`
    - [Slack](/fr/channels/slack) — `channels.slack`
    - [Signal](/fr/channels/signal) — `channels.signal`
    - [iMessage](/fr/channels/imessage) — `channels.imessage`
    - [Google Chat](/fr/channels/googlechat) — `channels.googlechat`
    - [Mattermost](/fr/channels/mattermost) — `channels.mattermost`
    - [MS Teams](/fr/channels/msteams) — `channels.msteams`

    Tous les channels partagent le même modèle de politique DM :

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
            primary: "anthropic/claude-sonnet-4-5",
            fallbacks: ["openai/gpt-5.2"],
          },
          models: {
            "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
            "openai/gpt-5.2": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` définit le catalogue de modèles et agit comme une liste d'autorisation pour `/model`.
    - Les références de modèle utilisent le format `provider/model` (par ex. `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` contrôle la réduction d'échelle des images de transcript/tool (par défaut `1200`) ; des valeurs plus faibles réduisent généralement l'utilisation des jetons de vision lors des exécutions avec de nombreuses captures d'écran.
    - Voir [Models CLI](/fr/concepts/models) pour changer de modèle dans le chat et [Model Failover](/fr/concepts/model-failover) pour la rotation d'authentification et le comportement de repli.
    - Pour les fournisseurs personnalisés/auto-hébergés, voir [Custom providers](/fr/gateway/configuration-reference#custom-providers-and-base-urls) dans la référence.

  </Accordion>

  <Accordion title="Contrôler qui peut envoyer des messages au bot">
    L'accès aux DM est contrôlé par channel via `dmPolicy` :

    - `"pairing"` (par défaut) : les expéditeurs inconnus reçoivent un code d'appariement unique à approuver
    - `"allowlist"` : uniquement les expéditeurs dans `allowFrom` (ou le stockage d'autorisation apparié)
    - `"open"` : autoriser tous les DM entrants (nécessite `allowFrom: ["*"]`)
    - `"disabled"` : ignorer tous les DM

    Pour les groupes, utilisez `groupPolicy` + `groupAllowFrom` ou des listes d'autorisation spécifiques au channel.

    Consultez la [référence complète](/fr/gateway/configuration-reference#dm-and-group-access) pour les détails par channel.

  </Accordion>

  <Accordion title="Configurer le filtrage par mention dans les chats de groupe">
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

    - **Mentions de métadonnées** : mentions @ natives (tapoter pour mentionner sur WhatsApp, @bot sur Telegram, etc.)
    - **Modèles de texte** : modèles regex sûrs dans `mentionPatterns`
    - Consultez la [référence complète](/fr/gateway/configuration-reference#group-chat-mention-gating) pour les substitutions par channel et le mode self-chat.

  </Accordion>

  <Accordion title="Ajuster la surveillance de santé des channels de la passerelle">
    Contrôlez la fréquence à laquelle la passerelle redémarre les channels qui semblent obsolètes :

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

    - Définissez `gateway.channelHealthCheckMinutes: 0` pour désactiver globalement les redémarrages du moniteur de santé.
    - `channelStaleEventThresholdMinutes` doit être supérieur ou égal à l'intervalle de vérification.
    - Utilisez `channels.<provider>.healthMonitor.enabled` ou `channels.<provider>.accounts.<id>.healthMonitor.enabled` pour désactiver les redémarrages automatiques pour un channel ou un compte sans désactiver le moniteur global.
    - Consultez [Health Checks](/fr/gateway/health) pour le débogage opérationnel et la [référence complète](/fr/gateway/configuration-reference#gateway) pour tous les champs.

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
    - `threadBindings` : paramètres globaux par défaut pour le routage des sessions liées aux fils de discussion (Discord prend en charge `/focus`, `/unfocus`, `/agents`, `/session idle` et `/session max-age`).
    - Voir [Gestion des sessions](/fr/concepts/session) pour la portée, les liens d'identité et la stratégie d'envoi.
    - Voir [référence complète](/fr/gateway/configuration-reference#session) pour tous les champs.

  </Accordion>

  <Accordion title="Activer le sandboxing">
    Exécuter les sessions d'agent dans des conteneurs Docker isolés :

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

    Voir [Sandboxing](/fr/gateway/sandboxing) pour le guide complet et [référence complète](/fr/gateway/configuration-reference#sandbox) pour toutes les options.

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

    - Permet à la passerelle d'envoyer des `push.test`, des signaux de réveil (wake nudges) et des réveils de reconnexion via le relais externe.
    - Utilise une autorisation d'envoi limitée à l'enregistrement, transmise par l'app iOS jumelée. La passerelle n'a pas besoin d'un jeton de relais à l'échelle du déploiement.
    - Lie chaque enregistrement relayé à l'identité de la passerelle avec laquelle l'app iOS a été jumelée, empêchant ainsi une autre passerelle de réutiliser l'enregistrement stocké.
    - Maintient les builds locaux/manuels iOS sur les APNs directs. Les envois relayés ne s'appliquent qu'aux builds distribués officiellement qui se sont enregistrés via le relais.
    - Doit correspondre à l'URL de base du relais intégrée dans le build officiel/TestFlight iOS, afin que le trafic d'enregistrement et d'envoi atteigne le même déploiement de relais.

    Flux de bout en bout :

    1. Installez un build officiel/TestFlight iOS qui a été compilé avec la même URL de base de relais.
    2. Configurez `gateway.push.apns.relay.baseUrl` sur la passerelle.
    3. Jumelez l'app iOS à la passerelle et laissez les sessions de nœud et d'opérateur se connecter.
    4. L'app iOS récupère l'identité de la passerelle, s'enregistre auprès du relais à l'aide d'App Attest et du reçu de l'application, puis publie la payload `push.apns.register` relayée vers la passerelle jumelée.
    5. La passerelle stocke le handle de relais et l'autorisation d'envoi, puis les utilise pour les `push.test`, les signaux de réveil et les réveils de reconnexion.

    Notes opérationnelles :

    - Si vous basculez l'app iOS vers une passerelle différente, reconnectez l'application pour qu'elle puisse publier un nouvel enregistrement de relais lié à cette passerelle.
    - Si vous publiez un nouveau build iOS pointant vers un déploiement de relais différent, l'application actualise son enregistrement de relais mis en cache au lieu de réutiliser l'ancienne origine du relais.

    Note de compatibilité :

    - `OPENCLAW_APNS_RELAY_BASE_URL` et `OPENCLAW_APNS_RELAY_TIMEOUT_MS` fonctionnent toujours comme des substitutions d'environnement temporaires.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` reste une échappatoire de développement en boucle locale uniquement ; ne persistez pas les URL de relais HTTP dans la configuration.

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

    - `every`: chaîne de durée (`30m`, `2h`). Définissez `0m` pour désactiver.
    - `target`: `last` | `whatsapp` | `telegram` | `discord` | `none`
    - `directPolicy`: `allow` (par défaut) ou `block` pour les cibles de battement de cœur de style DM
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

    - `sessionRetention`: supprimer les sessions d'exécution isolées terminées de `sessions.json` (par défaut `24h`; définissez `false` pour désactiver).
    - `runLog`: nettoyer `cron/runs/<jobId>.jsonl` par taille et lignes conservées.
    - Voir [Cron jobs](/fr/automation/cron-jobs) pour un aperçu des fonctionnalités et les exemples CLI.

  </Accordion>

  <Accordion title="Configurer les webhooks (hooks)">
    Activer les points de terminaison HTTP webhook sur le Gateway :

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
    - Traitez tout le contenu de la charge utile du hook/webhook comme une entrée non fiable.
    - Gardez les indicateurs de contournement de contenu non sécurisé désactivés (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) sauf si vous effectuez un débogage étroitement délimité.
    - Pour les agents pilotés par des hooks, préférez les niveaux de modèle modernes et puissants et une politique d'outil stricte (par exemple, messagerie uniquement plus sandboxing si possible).

    Voir [référence complète](/fr/gateway/configuration-reference#hooks) pour toutes les options de mappage et l'intégration Gmail.

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
    - **Clés frères** : fusionnées après les inclusions (remplacent les valeurs incluses)
    - **Inclusions imbriquées** : prises en charge jusqu'à 10 niveaux de profondeur
    - **Chemins relatifs** : résolus par rapport au fichier d'inclusion
    - **Gestion des erreurs** : erreurs claires pour les fichiers manquants, les erreurs d'analyse et les inclusions circulaires

  </Accordion>
</AccordionGroup>

## Rechargement à chaud de la configuration

Le Gateway surveille `~/.openclaw/openclaw.json` et applique les modifications automatiquement — aucun redémarrage manuel n'est nécessaire pour la plupart des paramètres.

### Modes de rechargement

| Mode                   | Comportement                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **`hybrid`** (par défaut) | Applique instantanément les modifications sûres. Redémarre automatiquement pour celles qui sont critiques.           |
| **`hot`**              | Applique uniquement les modifications sûres. Enregistre un avertissement lorsqu'un redémarrage est nécessaire — vous le gérez. |
| **`restart`**          | Redémarre le Gateway lors de toute modification de configuration, sûre ou non.                                 |
| **`off`**              | Désactive la surveillance des fichiers. Les modifications prennent effet au prochain redémarrage manuel.                 |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Ce qui s'applique à chaud vs ce qui nécessite un redémarrage

La plupart des champs s'appliquent à chaud sans interruption de service. En mode `hybrid`, les modifications nécessitant un redémarrage sont gérées automatiquement.

| Catégorie            | Champs                                                               | Redémarrage nécessaire ? |
| ------------------- | -------------------------------------------------------------------- | --------------- |
| Canaux            | `channels.*`, `web` (WhatsApp) — tous les canaux intégrés et d'extension | Non              |
| Agent & modèles      | `agent`, `agents`, `models`, `routing`                               | Non              |
| Automatisation          | `hooks`, `cron`, `agent.heartbeat`                                   | Non              |
| Sessions & messages | `session`, `messages`                                                | Non              |
| Outils & médias       | `tools`, `browser`, `skills`, `audio`, `talk`                        | Non              |
| Interface utilisateur & divers           | `ui`, `logging`, `identity`, `bindings`                              | Non              |
| Gateway server      | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP)                 | **Oui**         |
| Infrastructure      | `discovery`, `canvasHost`, `plugins`                                 | **Oui**         |

<Note>
`gateway.reload` et `gateway.remote` sont des exceptions — leur modification ne **déclenche pas** de redémarrage.
</Note>

## Config RPC (programmatic updates)

<Note>
Les RPC d'écriture du plan de contrôle (`config.apply`, `config.patch`, `update.run`) sont limitées à **3 requêtes par 60 secondes** par `deviceId+clientIp`. Lorsque la limite est atteinte, le RPC renvoie `UNAVAILABLE` avec `retryAfterMs`.
</Note>

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    Valide + écrit la configuration complète et redémarre le Gateway en une seule étape.

    <Warning>
    `config.apply` remplace **l'intégralité de la configuration**. Utilisez `config.patch` pour des mises à jour partielles, ou `openclaw config set` pour des clés uniques.
    </Warning>

    Paramètres :

    - `raw` (string) — Payload JSON5 pour l'intégralité de la configuration
    - `baseHash` (optionnel) — hachage de la configuration provenant de `config.get` (requis lorsque la configuration existe)
    - `sessionKey` (optionnel) — clé de session pour le ping de réveil post-redémarrage
    - `note` (optionnel) — note pour la sentinelle de redémarrage
    - `restartDelayMs` (optionnel) — délai avant le redémarrage (par défaut 2000)

    Les demandes de redémarrage sont fusionnées lorsqu'une est déjà en cours/en transit, et un temps de recharge de 30 secondes s'applique entre les cycles de redémarrage.

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

    - Les objets fusionnent récursivement
    - `null` supprime une clé
    - Les tableaux remplacent

    Paramètres :

    - `raw` (chaîne) — JSON5 avec uniquement les clés à modifier
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

OpenClaw lit les env vars du processus parent ainsi que :

- `.env` à partir du répertoire de travail actuel (si présent)
- `~/.openclaw/.env` (solution de repli globale)

Aucun de ces fichiers ne remplace les env vars existantes. Vous pouvez également définir des env vars en ligne dans la configuration :

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Importation de l'environnement Shell (optionnel)">
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

<Accordion title="Substitution de variable d'environnement dans les valeurs de configuration">
  Référencez les env vars dans n'importe quelle valeur de chaîne de configuration avec `${VAR_NAME}` :

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

Règles :

- Seuls les noms en majuscules correspondent : `[A-Z_][A-Z0-9_]*`
- Les vars manquantes/vides génèrent une erreur au chargement
- Échappez avec `$${VAR}` pour une sortie littérale
- Fonctionne dans les fichiers `$include`
- Substitution en ligne : `"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret refs (env, file, exec)">
  Pour les champs prenant en charge les objets SecretRef, vous pouvez utiliser :

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
Les chemins d'identification pris en charge sont répertoriés dans [Surface des identifiants SecretRef](/fr/reference/secretref-credential-surface).
</Accordion>

Consultez [Environnement](/fr/help/environment) pour obtenir la priorité et les sources complètes.

## Référence complète

Pour la référence complète champ par champ, consultez la **[Référence de configuration](/fr/gateway/configuration-reference)**.

---

_Connexes : [Exemples de configuration](/fr/gateway/configuration-examples) · [Référence de configuration](/fr/gateway/configuration-reference) · [Doctor](/fr/gateway/doctor)_

import fr from "/components/footer/fr.mdx";

<fr />
