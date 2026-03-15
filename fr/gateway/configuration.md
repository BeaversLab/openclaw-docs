---
summary: "Aperçu de la configuration : tâches courantes, configuration rapide et liens vers la référence complète"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "Configuration"
---

# Configuration

OpenClaw lit une configuration facultative <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> depuis `~/.openclaw/openclaw.json`.

Si le fichier est manquant, OpenClaw utilise des paramètres par défaut sûrs. Raisons courantes d'ajouter une configuration :

- Connecter des canaux et contrôler qui peut envoyer des messages au bot
- Définir les modèles, les outils, le sandboxing ou l'automatisation (cron, hooks)
- Ajuster les sessions, les médias, le réseau ou l'interface utilisateur

Consultez la [référence complète](/fr/gateway/configuration-reference) pour chaque champ disponible.

<Tip>
  **Nouveau dans la configuration ?** Commencez avec `openclaw onboard` pour une configuration
  interactive, ou consultez le guide [Exemples de configuration](/fr/gateway/configuration-examples)
  pour des configurations complètes à copier-coller.
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
    openclaw onboard # full setup wizard
    openclaw configure # config wizard
    ```
  </Tab>
  <Tab title="CLI (one-liners)">
    ```bash
    openclaw config get agents.defaults.workspace
    openclaw config set agents.defaults.heartbeat.every "2h"
    openclaw config unset tools.web.search.apiKey
    ```
  </Tab>
  <Tab title="Interface de contrôle">
    Ouvrez [http://127.0.0.1:18789](http://127.0.0.1:18789) et utilisez l'onglet **Config**.
    L'interface de contrôle affiche un formulaire basé sur le schéma de configuration, avec un
    éditeur **JSON brut** en solution de secours.
  </Tab>
  <Tab title="Édition directe">
    Modifiez `~/.openclaw/openclaw.json` directement. Le Gateway surveille le fichier et applique
    les modifications automatiquement (voir [rechargement à chaud](#config-hot-reload)).
  </Tab>
</Tabs>

## Validation stricte

<Warning>
  OpenClaw n'accepte que les configurations correspondant entièrement au schéma. Les clés inconnues,
  les types malformés, ou les valeurs invalides empêchent le Gateway de **démarrer**. La seule
  exception au niveau racine est `$schema` (chaîne), pour que les éditeurs puissent attacher des
  métadonnées de schéma JSON.
</Warning>

En cas d'échec de la validation :

- Le Gateway ne démarre pas
- Seules les commandes de diagnostic fonctionnent (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Exécutez `openclaw doctor` pour voir les problèmes exacts
- Exécutez `openclaw doctor --fix` (ou `--yes`) pour appliquer les réparations

## Tâches courantes

<AccordionGroup>
  <Accordion title="Configurer un channel (WhatsApp, Telegram, Discord, etc.)">
    Chaque channel possède sa propre section de configuration sous `channels.<provider>`. Consultez la page dédiée au channel pour connaître les étapes de configuration :

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

  <Accordion title="Choose and configure models">
    Définissez le modèle principal et les secours facultatifs :

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

    - `agents.defaults.models` définit le catalogue de modèles et agit comme la liste d'autorisation pour `/model`.
    - Les références de modèle utilisent le format `provider/model` (par ex. `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` contrôle la réduction d'échelle des images de transcription/outils (par défaut `1200`) ; des valeurs plus faibles réduisent généralement l'utilisation des jetons de vision lors des exécutions avec de nombreuses captures d'écran.
    - Voir [Models CLI](/fr/concepts/models) pour changer de modèles dans le chat et [Model Failover](/fr/concepts/model-failover) pour la rotation de l'authentification et le comportement de secours.
    - Pour les fournisseurs personnalisés/auto-hébergés, voir [Custom providers](/fr/gateway/configuration-reference#custom-providers-and-base-urls) dans la référence.

  </Accordion>

  <Accordion title="Control who can message the bot">
    L'accès aux DM est contrôlé par canal via `dmPolicy` :

    - `"pairing"` (par défaut) : les expéditeurs inconnus reçoivent un code d'appariement à usage unique pour approuver
    - `"allowlist"` : seuls les expéditeurs dans `allowFrom` (ou le magasin d'autorisation apparié)
    - `"open"` : autoriser tous les DM entrants (nécessite `allowFrom: ["*"]`)
    - `"disabled"` : ignorer tous les DM

    Pour les groupes, utilisez `groupPolicy` + `groupAllowFrom` ou des listes d'autorisation spécifiques au canal.

    Consultez la [référence complète](/fr/gateway/configuration-reference#dm-and-group-access) pour les détails par canal.

  </Accordion>

  <Accordion title="Configurer le filtrage des mentions dans les chats de groupe">
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

    - **Métadonnées de mentions** : mentions natives @ (mention par appui sur WhatsApp, @bot Telegram, etc.)
    - **Modèles de texte** : modèles regex dans `mentionPatterns`
    - Voir la [référence complète](/fr/gateway/configuration-reference#group-chat-mention-gating) pour les remplacements par canal et le mode de discussion avec soi-même.

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
    - `threadBindings` : valeurs globales par défaut pour le routage des sessions liées aux fils de discussion (Discord prend en charge `/focus`, `/unfocus`, `/agents`, `/session idle` et `/session max-age`).
    - Voir [Gestion des sessions](/fr/concepts/session) pour la portée, les liens d'identité et la politique d'envoi.
    - Voir la [référence complète](/fr/gateway/configuration-reference#session) pour tous les champs.

  </Accordion>

  <Accordion title="Activer le bac à sable">
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

    Voir [Bac à sable](/fr/gateway/sandboxing) pour le guide complet et la [référence complète](/fr/gateway/configuration-reference#sandbox) pour toutes les options.

  </Accordion>

  <Accordion title="Activer la push relayée pour les versions officielles iOS">
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
    - Utilise un droit d'envoi délimité par l'enregistrement, transmis par l'application iOS appariée. La passerelle n'a pas besoin d'un jeton de relais à l'échelle du déploiement.
    - Lie chaque enregistrement relayé à l'identité de la passerelle avec laquelle l'application iOS a été appariée, empêchant ainsi une autre passerelle de réutiliser l'enregistrement stocké.
    - Conserve les versions locales/manuelles iOS sur les APNs directs. Les envois relayés s'appliquent uniquement aux versions distribuées officielles qui se sont enregistrées via le relais.
    - Doit correspondre à l'URL de base du relais intégrée dans la version officielle/TestFlight iOS, afin que l'enregistrement et le trafic d'envoi atteignent le même déploiement de relais.

    Flux de bout en bout :

    1. Installez une version officielle/TestFlight iOS qui a été compilée avec la même URL de base de relais.
    2. Configurez `gateway.push.apns.relay.baseUrl` sur la passerelle.
    3. Appariez l'application iOS à la passerelle et laissez les sessions du nœud et de l'opérateur se connecter.
    4. L'application iOS récupère l'identité de la passerelle, s'enregistre auprès du relais à l'aide d'App Attest et du reçu de l'application, puis publie la charge utile `push.apns.register` relayée vers la passerelle appariée.
    5. La passerelle stocke le gestionnaire de relais et le droit d'envoi, puis les utilise pour les `push.test`, les notifications de réveil et les réveils de reconnexion.

    Notes opérationnelles :

    - Si vous basculez l'application iOS vers une autre passerelle, reconnectez l'application afin qu'elle puisse publier un nouvel enregistrement de relais lié à cette passerelle.
    - Si vous publiez une nouvelle version iOS pointant vers un déploiement de relais différent, l'application actualise son enregistrement de relais mis en cache au lieu de réutiliser l'origine de l'ancien relais.

    Note de compatibilité :

    - `OPENCLAW_APNS_RELAY_BASE_URL` et `OPENCLAW_APNS_RELAY_TIMEOUT_MS` fonctionnent toujours comme substitutions temporaires d'env.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` reste une porte de sortie de développement en boucle uniquement (loopback-only) ; ne conservez pas les URL de relais HTTP dans la configuration.

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
    - `target` : `last` | `whatsapp` | `telegram` | `discord` | `none`
    - `directPolicy` : `allow` (par défaut) ou `block` pour les cibles de heartbeat style DM
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

    - `sessionRetention` : supprimer les sessions d'exécution isolées terminées de `sessions.json` (par défaut `24h` ; définissez `false` pour désactiver).
    - `runLog` : supprimer `cron/runs/<jobId>.jsonl` par taille et lignes conservées.
    - Voir [Cron jobs](/fr/automation/cron-jobs) pour un aperçu des fonctionnalités et des exemples CLI.

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
    - Traitez tout le contenu des payloads hook/webhook comme une entrée non fiable.
    - Gardez les indicateurs de contournement de contenu non sécurisé désactivés (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) sauf si vous effectuez un débogage étroitement délimité.
    - Pour les agents pilotés par hook, privilégiez les niveaux de modèles modernes robustes et une politique d'outil stricte (par exemple, messagerie uniquement plus sandboxing si possible).

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

    - **Fichier unique** : remplace l'objet contenant
    - **Tableau de fichiers** : fusionné en profondeur dans l'ordre (le dernier gagne)
    - **Clés frères** : fusionnées après les inclusions (remplacent les valeurs incluses)
    - **Inclusions imbriquées** : prises en charge jusqu'à 10 niveaux de profondeur
    - **Chemins relatifs** : résolus par rapport au fichier inclus
    - **Gestion des erreurs** : erreurs claires pour les fichiers manquants, les erreurs d'analyse et les inclusions circulaires

  </Accordion>
</AccordionGroup>

## Rechargement à chaud de la configuration

Le Gateway surveille `~/.openclaw/openclaw.json` et applique les modifications automatiquement — aucun redémarrage manuel n'est nécessaire pour la plupart des paramètres.

### Modes de rechargement

| Mode                      | Comportement                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **`hybrid`** (par défaut) | Applique à chaud les modifications sûres instantanément. Redémarre automatiquement pour les modifications critiques.                          |
| **`hot`**                 | Applique à chaud uniquement les modifications sûres. Enregistre un avertissement lorsqu'un redémarrage est nécessaire — vous vous en chargez. |
| **`restart`**             | Redémarre le Gateway lors de tout changement de configuration, sûr ou non.                                                                    |
| **`off`**                 | Désactive la surveillance des fichiers. Les modifications prennent effet au prochain redémarrage manuel.                                      |

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

<Note>
  `gateway.reload` et `gateway.remote` sont des exceptions — leur modification ne déclenche **pas**
  un redémarrage.
</Note>

## Config RPC (mises à jour programmatiques)

<Note>
  Les RPC d'écriture du plan de contrôle (`config.apply`, `config.patch`, `update.run`) sont
  limitées à **3 requêtes par 60 secondes** par `deviceId+clientIp`. Lorsqu'elles sont limitées, le
  RPC renvoie `UNAVAILABLE` avec `retryAfterMs`.
</Note>

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    Valide et écrit la configuration complète et redémarre le Gateway en une seule étape.

    <Warning>
    `config.apply` remplace la **configuration entière**. Utilisez `config.patch` pour des mises à jour partielles, ou `openclaw config set` pour des clés uniques.
    </Warning>

    Paramètres :

    - `raw` (chaîne) — Payload JSON5 pour la configuration entière
    - `baseHash` (optionnel) — hachage de configuration depuis `config.get` (requis lorsque la configuration existe)
    - `sessionKey` (optionnel) — clé de session pour le ping de réveil après redémarrage
    - `note` (optionnel) — note pour la sentinelle de redémarrage
    - `restartDelayMs` (optionnel) — délai avant le redémarrage (par défaut 2000)

    Les demandes de redémarrage sont fusionnées alors qu'une est déjà en attente/en cours, et un temps de recharge de 30 secondes s'applique entre les cycles de redémarrage.

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
    Fusionne une mise à jour partielle dans la configuration existante (sémantique de correctif de fusion JSON) :

    - Les objets fusionnent récursivement
    - `null` supprime une clé
    - Les tableaux sont remplacés

    Paramètres :

    - `raw` (chaîne) — JSON5 avec uniquement les clés à modifier
    - `baseHash` (requis) — hachage de configuration depuis `config.get`
    - `sessionKey`, `note`, `restartDelayMs` — identiques à `config.apply`

    Le comportement de redémarrage correspond à `config.apply` : redémarrages en attente fusionnés plus un temps de recharge de 30 secondes entre les cycles de redémarrage.

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

<Accordion title="Import d'environnement shell (optionnel)">
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
- Les variables manquantes/vides lancent une erreur au chargement
- Échappez avec `$${VAR}` pour une sortie littérale
- Fonctionne dans les fichiers `$include`
- Substitution en ligne : `"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Références secrètes (env, file, exec)">
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
      "nano-banana-pro": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/nano-banana-pro/apiKey",
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

_Connexe : [Exemples de configuration](/fr/gateway/configuration-examples) · [Référence de configuration](/fr/gateway/configuration-reference) · [Doctor](/fr/gateway/doctor)_

import fr from '/components/footer/fr.mdx';

<fr />
