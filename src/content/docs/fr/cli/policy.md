---
summary: "CLIRéférence CLI pour les vérifications de conformité `openclaw policy`"
read_when:
  - You want to check OpenClaw settings against an authored policy.jsonc
  - You want policy findings in doctor lint
  - You need a policy attestation hash for audit evidence
title: "Policy"
---

# `openclaw policy`

`openclaw policy`OpenClaw est fourni par le plugin Policy inclus. Policy est une
couche de conformité d'entreprise sur les paramètres OpenClaw existants. Il n'ajoute pas de
second système de configuration. `policy.jsonc`OpenClaw définit les exigences rédigées,
OpenClaw observe l'espace de travail actif comme preuve, et les contrôles de santé de la stratégie
signalent la dérive via `doctor --lint`. Le signal de conformité final est une exécution
propre de `doctor --lint` ; la stratégie contribue aux résultats sur cette surface de lint
partagée au lieu de créer une porte de santé distincte.

La stratégie gère actuellement les canaux configurés, les serveurs MCP, les fournisseurs de modèles,
la posture SSRF du réseau, la posture d'exposition Gateway, la posture de l'espace de travail de l'agent,
la posture du fournisseur de secrets/profil d'auth de la configuration OpenClaw, et les déclarations d'outils
gouvernés. Par exemple, l'informatique ou un opérateur d'espace de travail peut enregistrer que Telegram
n'est pas un fournisseur de canaux approuvé, restreindre les serveurs MCP et les références de modèles aux
entrées approuvées, exiger que l'accès au réseau privé de type récupération/navigateur reste
désactivé, exiger que l'exposition bind/auth/HTTP de Gateway reste dans des limites
révisées, exiger que l'accès à l'espace de travail de l'agent et les refus d'outils restent dans une posture
révisée, exiger que les SecretRefs de configuration OpenClaw utilisent des fournisseurs gérés, exiger
que les profils d'auth de configuration transportent les métadonnées de fournisseur/mode, exiger que les outils gouvernés
transportent des métadonnées de risque et de sensibilité, puis utiliser GatewayOpenClawTelegramGatewayOpenClaw`doctor --lint` comme porte de
conformité partagée.

Utilisez la stratégie lorsqu'un espace de travail a besoin d'une déclaration durable telle que « ces canaux
ne doivent pas être activés » ou « les outils gouvernés doivent déclarer des métadonnées d'approbation » et d'un
moyen reproductible de prouver qu'OpenClaw se conforme toujours à cette déclaration. Utilisez
la configuration régulière et la documentation de l'espace de travail seules lorsque vous avez uniquement besoin d'un comportement local et
que vous n'avez pas besoin de résultats de stratégie ou de sortie d'attestation.

## Quick start

Activez le plugin Policy fourni avant la première utilisation :

```bash
openclaw plugins enable policy
```

Lorsque la stratégie est activée, doctor peut charger les vérifications de santé de la stratégie sans activer de plugins arbitraires. Le plugin reste activé si `policy.jsonc` est manquant, afin que doctor puisse signaler l'artefact manquant.

La stratégie est rédigée, et non générée à partir des paramètres actuels de l'utilisateur. Une stratégie minimale pour les canaux, les serveurs MCP, les fournisseurs de modèles, la posture réseau, l'exposition Gateway, la posture de l'espace de travail de l'agent, la posture du fournisseur de secrets/profil d'authentification de la configuration OpenClaw, et les métadonnées des outils ressemble à ceci :

```jsonc
{
  "channels": {
    "denyRules": [
      {
        "id": "no-telegram",
        "when": { "provider": "telegram" },
        "reason": "Telegram is not approved for this workspace.",
      },
    ],
  },
  "mcp": {
    "servers": {
      "allow": ["docs"],
      "deny": ["untrusted"],
    },
  },
  "models": {
    "providers": {
      "allow": ["openai", "anthropic"],
      "deny": ["openrouter"],
    },
  },
  "network": {
    "privateNetwork": {
      "allow": false,
    },
  },
  "gateway": {
    "exposure": {
      "allowNonLoopbackBind": false,
      "allowTailscaleFunnel": false,
    },
    "auth": {
      "requireAuth": true,
      "requireExplicitRateLimit": true,
    },
    "controlUi": {
      "allowInsecure": false,
    },
    "remote": {
      "allow": false,
    },
    "http": {
      "denyEndpoints": ["chatCompletions", "responses"],
      "requireUrlAllowlists": true,
    },
  },
  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
      "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
    },
  },
  "secrets": {
    "requireManagedProviders": true,
    "denySources": ["exec"],
    "allowInsecureProviders": false,
  },
  "auth": {
    "profiles": {
      "requireMetadata": ["provider", "mode"],
      "allowModes": ["api_key", "token"],
    },
  },
  "tools": {
    "requireMetadata": ["risk", "sensitivity", "owner"],
    "profiles": {
      "allow": ["messaging", "minimal"],
    },
    "fs": {
      "requireWorkspaceOnly": true,
    },
    "exec": {
      "allowSecurity": ["deny", "allowlist"],
      "requireAsk": ["always"],
      "allowHosts": ["sandbox"],
    },
    "elevated": {
      "allow": false,
    },
    "denyTools": ["group:runtime", "group:fs"],
  },
}
```

Les règles font autorité. Un bloc de catégorie n'est qu'un espace de noms ; les vérifications s'exécutent lorsqu'une règle concrète est présente. OpenClaw lit les paramètres actuels OpenClaw`channels.*` `mcp.servers.*`, `models.providers.*`GatewayTailscaleOpenClaw, les références de modèle d'agent sélectionnées, les paramètres SSRF réseau, la posture de liaison/authentisation/Interface de contrôle/Tailscale/distant/HTTP de la Gateway, l'accès à l'espace de travail de la sandbox de l'agent de configuration OpenClaw et la posture de refus d'outil, la provenance du fournisseur de secrets et de SecretRef de la configuration, les métadonnées du profil d'authentification de la configuration, la posture d'outil globale/par agent configurée, et les déclarations `TOOLS.md`Gateway comme preuves, puis rapporte tout état observé non conforme. Si une stratégie refuse les liaisons Gateway non-bouclage, omettez `gateway.bind` uniquement lorsque vous êtes prêt à examiner la valeur par défaut d'exécution ; définissez `gateway.bind=loopback` pour une conformité stricte de la configuration. Pour une posture d'agent en lecture seule, configurez le mode sandbox sur les valeurs par défaut applicables ou sur l'agent et définissez `workspaceAccess` sur `none` ou `ro` ; un mode sandbox omis ou `off` ne satisfait pas une stratégie en lecture seule/sans écriture. `agents.workspace.denyTools` prend en charge `exec`, `process`, `write`, `edit` et `apply_patch`OpenClaw ; la configuration OpenClaw `group:fs` couvre les outils de mutation de fichiers et `group:runtime` couvre les outils de shell/processus. La stratégie de posture d'outil observe `tools.profile`, `tools.allow`, `tools.alsoAllow`, `tools.deny`, `tools.fs.workspaceOnly`, `tools.exec.security`, `tools.exec.ask`, `tools.exec.host`, `tools.elevated.enabled` et les mêmes substitutions `agents.list[].tools.*` par agent. Elle ne lit pas l'état d'approbation d'exécution/opérateur tel que exec-approvals., et elle n'applique pas les appels d'outils lors de l'exécution. Les preuves de secrets enregistrent la posture du fournisseur/source et les métadonnées SecretRef, jamais les valeurs brutes des secrets. La stratégie ne lit pas n'atteste pas les magasins d'informations d'identification par agent tels que `auth-profiles.json` ; ces magasins restent la propriété des flux d'authentification et d'informations d'identification existants.

### Référence des règles de stratégie

Chaque champ de stratégie ci-dessous est facultatif. Une vérification s'exécute uniquement lorsque la règle correspondante est
présente dans `policy.jsonc`. L'état observé est la configuration OpenClaw existante ou
les métadonnées de l'espace de travail ; la stratégie signale les divergences mais ne modifie pas le comportement d'exécution
à moins qu'un chemin de réparation ne soit explicitement disponible et activé.

#### Canaux

| Champ de stratégie                   | État observé                                                 | Utiliser quand                                                  |
| ------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `channels.denyRules[].when.provider` | provider `channels.*` et état activé                         | Refuser les canaux configurés d'un provider tel que `telegram`. |
| `channels.denyRules[].reason`        | Contexte du message de résultat et de l'indice de réparation | Expliquer pourquoi le provider est refusé.                      |

#### Serveurs MCP

| Champ de stratégie  | État observé        | Utiliser quand                                                           |
| ------------------- | ------------------- | ------------------------------------------------------------------------ |
| `mcp.servers.allow` | ids `mcp.servers.*` | Exiger que chaque serveur MCP configuré figure dans une liste autorisée. |
| `mcp.servers.deny`  | ids `mcp.servers.*` | Refuser les ids de serveurs MCP configurés spécifiques.                  |

#### Providers de modèle

| Champ de stratégie       | État observé                                            | Utiliser quand                                                                                            |
| ------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `models.providers.allow` | ids `models.providers.*` et refs de modèle sélectionnés | Exiger que les providers configurés et les refs de modèle sélectionnés utilisent des providers approuvés. |
| `models.providers.deny`  | ids `models.providers.*` et refs de modèle sélectionnés | Refuser les providers configurés et les refs de modèle sélectionnés par id de provider.                   |

#### Réseau

| Champ de stratégie             | État observé                         | Utiliser quand                                                               |
| ------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------- |
| `network.privateNetwork.allow` | Échappatoires SSRF pour réseau privé | Définir sur `false` pour exiger que l'accès au réseau privé reste désactivé. |

#### Gateway

| Champ de stratégie                      | État observé                                                                                         | Utiliser quand                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                                                                                       | Définir sur `false` pour exiger la liaison loopback du Gateway.                                                      |
| `gateway.exposure.allowTailscaleFunnel` | Posture du Tailscale Gateway serve/funnel                                                            | Définir sur `false` pour refuser l'exposition Tailscale Funnel.                                                      |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                                                                                  | Définir sur `true` pour rejeter l'authentification Gateway désactivée.                                               |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`                                                                             | Définissez sur `true` pour exiger une configuration explicite de la limite de débit d'authentification.              |
| `gateway.controlUi.allowInsecure`       | Contrôler les bascules d'authentification/appareil/origine non sécurisées de l'interface utilisateur | Définissez sur `false` pour refuser les bascules d'exposition de l'interface utilisateur de contrôle non sécurisées. |
| `gateway.remote.allow`                  | Mode/configuration du Gateway distant                                                                | Définissez sur `false`Gateway pour refuser le mode Gateway distant.                                                  |
| `gateway.http.denyEndpoints`            | Points de terminaison de l'API HTTP du Gateway                                                       | Refuser les ID de point de terminaison tels que `chatCompletions` ou `responses`.                                    |
| `gateway.http.requireUrlAllowlists`     | Entrées de récupération d'URL HTTP du Gateway                                                        | Définissez sur `true` pour exiger des listes d'autorisation d'URL sur les entrées de récupération d'URL.             |

#### Espace de travail de l'agent

| Champ de stratégie               | État observé                                                                         | Utiliser quand                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` et `agents.list[].sandbox.workspaceAccess` | Autoriser uniquement les valeurs d'accès à l'espace de travail de type bac à sable telles que `none` ou `ro`.                                   |
| `agents.workspace.denyTools`     | Configuration de refus d'outil global et par agent                                   | Exiger que les outils de mutation de l'espace de travail/exécution tels que `exec`, `process`, `write`, `edit` ou `apply_patch` soient refusés. |

#### Secrets

| Champ de stratégie                | État observé                                                   | Utiliser quand                                                                                  |
| --------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `secrets.requireManagedProviders` | Config SecretRefs et déclarations `secrets.providers.*`        | Définissez sur `true` pour exiger que les SecretRefs pointent vers des fournisseurs déclarés.   |
| `secrets.denySources`             | Sources de fournisseurs de secrets et sources SecretRef        | Refuser les sources telles que `exec`, `file` ou un autre nom de source configuré.              |
| `secrets.allowInsecureProviders`  | Indicateurs de posture de fournisseur de secrets non sécurisés | Définissez sur `false` pour rejeter les fournisseurs qui optent pour une posture non sécurisée. |

#### Profils d'authentification

| Champ de stratégie              | État observé                                         | Utiliser quand                                                                                                                |
| ------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `auth.profiles.requireMetadata` | `auth.profiles.*` métadonnées du provider et du mode | Exiger des clés de métadonnées telles que `provider` et `mode` sur les profils d'authentification de configuration.           |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`                               | Autoriser uniquement les modes de profil d'authentification pris en charge tels que `api_key`, `aws-sdk`, `oauth` ou `token`. |

#### Métadonnées de l'outil

| Champ de stratégie      | État observé                       | Utiliser quand                                                                                                 |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `tools.requireMetadata` | Déclarations `TOOLS.md` gouvernées | Exiger que les outils gouvernés déclarent des clés de métadonnées telles que `risk`, `sensitivity` ou `owner`. |

#### Posture de l'outil

| Champ de stratégie              | État observé                                                   | Utiliser quand                                                                                                                                |
| ------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools.profiles.allow`          | `tools.profile` et `agents.list[].tools.profile`               | Autoriser uniquement les ID de profil d'outil tels que `minimal`, `messaging` ou `coding`.                                                    |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` et remplacements par agent `tools.fs` | Définir sur `true` pour exiger une posture de l'outil de système de fichiers uniquement pour l'espace de travail.                             |
| `tools.exec.allowSecurity`      | `tools.exec.security` et sécurité exec par agent               | Autoriser uniquement les modes de sécurité exec tels que `deny` ou `allowlist`.                                                               |
| `tools.exec.requireAsk`         | `tools.exec.ask` et mode de demande exec par agent             | Exiger une posture d'approbation telle que `always`.                                                                                          |
| `tools.exec.allowHosts`         | `tools.exec.host` et routage de l'hôte exec par agent          | Autoriser uniquement les modes de routage de l'hôte exec tels que `sandbox`.                                                                  |
| `tools.elevated.allow`          | `tools.elevated.enabled` et posture élevée par agent           | Définir sur `false` pour exiger que le mode d'outil élevé reste désactivé.                                                                    |
| `tools.denyTools`               | `tools.deny` et `agents.list[].tools.deny`                     | Exiger que les listes de refus de tools configurées incluent des identifiants ou des groupes de tools tels que `group:runtime` et `group:fs`. |

Exécuter les vérifications de stratégie uniquement lors de la rédaction :

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` exécute uniquement l'ensemble de vérifications de stratégie et émet des preuves, des résultats et des hachages d'attestation. Les mêmes résultats apparaissent également dans `openclaw doctor --lint`
lorsque le plugin de stratégie est activé.

L'exemple de sortie JSON propre inclut des hachages stables qui peuvent être enregistrés par un
opérateur ou un superviseur :

```json
{
  "ok": true,
  "attestation": {
    "policy": {
      "path": "policy.jsonc",
      "hash": "sha256:..."
    },
    "workspace": {
      "scope": "policy",
      "hash": "sha256:..."
    },
    "findingsHash": "sha256:...",
    "attestationHash": "sha256:..."
  },
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": []
}
```

## Configurer la stratégie

La configuration de la stratégie se trouve sous `plugins.entries.policy.config`.

```jsonc
{
  "plugins": {
    "entries": {
      "policy": {
        "enabled": true,
        "config": {
          "enabled": true,
          "path": "policy.jsonc",
          "workspaceRepairs": false,
          "expectedHash": "sha256:...",
          "expectedAttestationHash": "sha256:...",
        },
      },
    },
  },
}
```

| Paramètre                 | Objectif                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `enabled`                 | Activer les vérifications de stratégie même avant que `policy.jsonc` n'existe.                    |
| `workspaceRepairs`        | Autoriser `doctor --fix` à modifier les paramètres de l'espace de travail gérés par la stratégie. |
| `expectedHash`            | Verrouillage de hachage facultatif pour l'artefact de stratégie approuvé.                         |
| `expectedAttestationHash` | Verrouillage de hachage facultatif pour la dernière vérification de stratégie propre acceptée.    |
| `path`                    | Emplacement relatif à l'espace de travail de l'artefact de stratégie.                             |

Définissez `plugins.entries.policy.config.enabled` sur `false` pour désactiver les vérifications de stratégie
pour un espace de travail tout en laissant le plugin installé.

Les exigences relatives aux métadonnées de tools sont rédigées dans `policy.jsonc` avec
`tools.requireMetadata`, par exemple `["risk", "sensitivity", "owner"]`.

## Accepter l'état de la stratégie

Exemple de sortie JSON :

```json
{
  "ok": true,
  "attestation": {
    "checkedAt": "2026-05-10T20:00:00.000Z",
    "policy": {
      "path": "policy.jsonc",
      "hash": "sha256:..."
    },
    "workspace": {
      "scope": "policy",
      "hash": "sha256:..."
    },
    "findingsHash": "sha256:...",
    "attestationHash": "sha256:..."
  },
  "evidence": {
    "channels": [
      {
        "id": "telegram",
        "provider": "telegram",
        "source": "oc://openclaw.config/channels/telegram",
        "enabled": false
      }
    ],
    "mcpServers": [
      {
        "id": "docs",
        "transport": "stdio",
        "source": "oc://openclaw.config/mcp/servers/docs",
        "command": "npx"
      }
    ],
    "modelProviders": [
      {
        "id": "openai",
        "source": "oc://openclaw.config/models/providers/openai"
      }
    ],
    "modelRefs": [
      {
        "ref": "openai/gpt-5.5",
        "provider": "openai",
        "model": "gpt-5.5",
        "source": "oc://openclaw.config/agents/defaults/model"
      }
    ],
    "network": [
      {
        "id": "browser-private-network",
        "source": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
        "value": false
      }
    ],
    "gatewayExposure": [
      {
        "id": "gateway-bind",
        "kind": "bind",
        "source": "oc://openclaw.config/gateway/bind",
        "value": "loopback",
        "nonLoopback": false,
        "explicit": true
      }
    ],
    "agentWorkspace": [
      {
        "id": "agents-defaults-workspace-access",
        "kind": "workspaceAccess",
        "source": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
        "scope": "defaults",
        "value": "ro",
        "sandboxMode": "all",
        "sandboxModeSource": "oc://openclaw.config/agents/defaults/sandbox/mode",
        "sandboxEnabled": true,
        "explicit": true
      },
      {
        "id": "agents-defaults-tool-exec",
        "kind": "toolDeny",
        "source": "oc://openclaw.config/tools/deny",
        "scope": "defaults",
        "tool": "exec",
        "denied": true,
        "explicit": true
      }
    ],
    "secrets": [
      {
        "id": "vault",
        "kind": "provider",
        "source": "oc://openclaw.config/secrets/providers/vault",
        "providerSource": "env"
      },
      {
        "id": "oc://openclaw.config/models/providers/openai/apiKey",
        "kind": "input",
        "source": "oc://openclaw.config/models/providers/openai/apiKey",
        "provenance": "secretRef",
        "refSource": "env",
        "refProvider": "vault"
      }
    ],
    "authProfiles": [
      {
        "id": "github",
        "source": "oc://openclaw.config/auth/profiles/github",
        "validMetadata": true,
        "provider": "github",
        "mode": "token"
      }
    ],
    "tools": [
      {
        "id": "deploy",
        "source": "oc://TOOLS.md/tools/deploy",
        "line": 12,
        "risk": "critical",
        "sensitivity": "restricted",
        "capabilities": ["IRREVERSIBLE_EXTERNAL"]
      }
    ]
  },
  "checksRun": 30,
  "checksSkipped": 0,
  "findings": []
}
```

Le hachage de stratégie identifie l'artefact de règle rédigé. Le bloc de preuves
enregistre l'état observé d'OpenClaw utilisé par les vérifications de stratégie. La
valeur `workspace.hash` identifie cette charge utile de preuve pour la portée vérifiée.
Le hachage des résultats identifie l'ensemble exact des résultats renvoyés par la vérification.
`checkedAt` enregistre le moment où l'évaluation a été exécutée. Le hachage d'attestation identifie
la déclaration stable : hachage de stratégie, hachage de preuve, hachage des résultats et si le
résultat était propre. Il n'inclut pas intentionnellement `checkedAt`, de sorte que le même
état de stratégie produit la même attestation lors de vérifications répétées. Ensemble,
ces éléments forment le tuple d'audit pour cette vérification de stratégie.

Si une passerelle ou un superviseur ultérieur utilise la stratégie pour bloquer, approuver ou annoter une action d'exécution, il doit enregistrer le hachage d'attestation provenant de la dernière vérification de stratégie propre. `checkedAt` reste dans la sortie JSON pour les journaux d'audit, mais ne fait pas partie du hachage d'attestation stable.

Utilisez ce cycle de vie lors de l'acceptation de l'état de la stratégie :

1. Rédigez ou révisez `policy.jsonc`.
2. Exécutez `openclaw policy check --json`.
3. Si le résultat est propre, enregistrez `attestation.policy.hash` en tant que `expectedHash`.
4. Enregistrez `attestation.attestationHash` en tant que `expectedAttestationHash`.
5. Réexécutez `openclaw doctor --lint` dans l' intégration continue (CI) ou aux portes de publication.

Si les règles de stratégie changent intentionnellement, mettez à jour les deux hachages acceptés à partir d'une vérification propre. Si les paramètres de l'espace de travail changent intentionnellement mais que la stratégie reste la même, seul `expectedAttestationHash` change généralement.

L'activation ou la mise à niveau des règles `agents.workspace` ajoute des éléments de preuve `agentWorkspace` au hachage de l'espace de travail et au hachage d'attestation. Les opérateurs doivent examiner les nouveaux éléments de preuve et actualiser les hachages d'attestation acceptés après avoir activé ces règles. L'activation ou la mise à niveau des règles de posture d'outil ajoute des éléments de preuve `toolPosture` de la même manière.

`openclaw policy watch` exécute la même vérification de manière répétée et signale lorsque les éléments de preuve actuels ne correspondent plus à `expectedAttestationHash` :

```bash
openclaw policy watch --json
```

Utilisez `--once` dans l' intégration continue ou les scripts qui n'ont besoin que d'une seule évaluation de dérive. Sans `--once`, la commande interroge toutes les deux secondes par défaut ; utilisez `--interval-ms` pour choisir un intervalle différent.

## Constatations

La stratégie vérifie actuellement :

| ID de vérification                           | Constatation                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                | La stratégie est activée mais `policy.jsonc` est manquant.                                                                   |
| `policy/policy-jsonc-invalid`                | La stratégie ne peut pas être analysée ou contient des entrées de règles malformées.                                         |
| `policy/policy-hash-mismatch`                | La stratégie ne correspond pas au `expectedHash` configuré.                                                                  |
| `policy/attestation-hash-mismatch`           | Les éléments de preuve actuels de la stratégie ne correspondent plus à l'attestation acceptée.                               |
| `policy/channels-denied-provider`            | Un channel activé correspond à une règle de refus de channel.                                                                |
| `policy/mcp-denied-server`                   | Un serveur MCP configuré est refusé par la stratégie.                                                                        |
| `policy/mcp-unapproved-server`               | Un serveur MCP configuré est en dehors de la liste d'autorisation.                                                           |
| `policy/models-denied-provider`              | Un fournisseur de modèle ou une référence de modèle configuré utilise un fournisseur refusé.                                 |
| `policy/models-unapproved-provider`          | Un fournisseur de modèle ou une référence de modèle configuré est en dehors de la liste d'autorisation.                      |
| `policy/network-private-access-enabled`      | Une trappe d'échappement SSRF de réseau privé est activée alors que la stratégie l'interdit.                                 |
| `policy/gateway-non-loopback-bind`           | La posture de liaison Gateway permet une exposition non bouclée alors que la stratégie l'interdit.                           |
| `policy/gateway-auth-disabled`               | L'authentification Gateway est désactivée alors que la stratégie exige une authentification.                                 |
| `policy/gateway-rate-limit-missing`          | La posture de limite de taux d'authentification Gateway n'est pas explicite alors que la stratégie l'exige.                  |
| `policy/gateway-control-ui-insecure`         | Les commutateurs d'exposition non sécurisée de l'interface utilisateur de contrôle Gateway sont activés.                     |
| `policy/gateway-tailscale-funnel`            | L'exposition via Gateway Funnel du Tailscale est activée alors que la stratégie l'interdit.                                  |
| `policy/gateway-remote-enabled`              | Le mode distant Gateway est actif alors que la stratégie l'interdit.                                                         |
| `policy/gateway-http-endpoint-enabled`       | Un point de terminaison HTTP Gateway API est activé alors qu'il est refusé par la stratégie.                                 |
| `policy/gateway-http-url-fetch-unrestricted` | L'entrée de récupération d'URL HTTP Gateway manque d'une liste d'autorisation d'URL requise.                                 |
| `policy/agents-workspace-access-denied`      | Le mode de bac à sable de l'agent ou l'accès à l'espace de travail est en dehors de la liste d'autorisation de la stratégie. |
| `policy/agents-tool-not-denied`              | Un agent ou une configuration par défaut n'interdit pas un outil requis par la stratégie.                                    |
| `policy/tools-profile-unapproved`            | Un profil d'outil global ou par agent configuré est en dehors de la liste d'autorisation.                                    |
| `policy/tools-fs-workspace-only-required`    | Les outils de système de fichiers ne sont pas configurés avec une posture de chemin d'accès réservée à l'espace de travail.  |
| `policy/tools-exec-security-unapproved`      | Le mode de sécurité d'exécution est en dehors de la liste d'autorisation de la stratégie.                                    |
| `policy/tools-exec-ask-unapproved`           | Le mode de confirmation d'exécution est en dehors de la liste d'autorisation de la stratégie.                                |
| `policy/tools-exec-host-unapproved`          | Le routage d'hôte d'exécution est en dehors de la liste d'autorisation de la stratégie.                                      |
| `policy/tools-elevated-enabled`              | Le mode d'outil élevé est activé alors que la stratégie l'interdit.                                                          |
| `policy/tools-required-deny-missing`         | Une liste de refus de tool globale ou par agent n'inclut pas un tool refusé requis.                                          |
| `policy/secrets-unmanaged-provider`          | Un SecretRef de configuration fait référence à un provider non déclaré sous `secrets.providers`.                             |
| `policy/secrets-denied-provider-source`      | Un provider de secret de configuration ou un SecretRef utilise une source refusée par la stratégie.                          |
| `policy/secrets-insecure-provider`           | Un provider de secrets opte pour une posture non sécurisée alors que la stratégie le refuse.                                 |
| `policy/auth-profile-invalid-metadata`       | Un profil d'authentification de configuration manque des métadonnées de provider ou de mode valides.                         |
| `policy/auth-profile-unapproved-mode`        | Un mode de profil d'authentification de configuration est en dehors de la liste autorisée par la stratégie.                  |
| `policy/tools-missing-risk-level`            | Une déclaration de tool gouvernée manque des métadonnées de risque.                                                          |
| `policy/tools-unknown-risk-level`            | Une déclaration de tool gouvernée utilise une valeur de risque inconnue.                                                     |
| `policy/tools-missing-sensitivity-token`     | Une déclaration de tool gouvernée manque des métadonnées de sensibilité.                                                     |
| `policy/tools-missing-owner`                 | Une déclaration de tool gouvernée manque des métadonnées de propriétaire.                                                    |
| `policy/tools-unknown-sensitivity-token`     | Une déclaration de tool gouvernée utilise une valeur de sensibilité inconnue.                                                |

Les résultats de stratégie peuvent inclure à la fois `target` et `requirement`. `target` est l'élément de l'espace de travail observé qui n'est pas conforme. `requirement` est la règle de stratégie rédigée qui en a fait un résultat. Les deux valeurs sont des adresses aujourd'hui, généralement des chemins `oc://`, mais les noms des champs décrivent leur rôle de stratégie plutôt que le format de l'adresse.

Exemple de résultat JSON :

```json
{
  "checkId": "policy/channels-denied-provider",
  "severity": "error",
  "message": "Channel 'telegram' uses denied provider 'telegram'.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/channels/telegram",
  "target": "oc://openclaw.config/channels/telegram",
  "requirement": "oc://policy.jsonc/channels/denyRules/#0",
  "fixHint": "Telegram is not approved for this workspace."
}
```

Exemple de résultat de tool :

```json
{
  "checkId": "policy/tools-missing-risk-level",
  "severity": "error",
  "message": "TOOLS.md tool 'deploy' has no explicit risk classification.",
  "source": "policy",
  "path": "TOOLS.md",
  "line": 12,
  "ocPath": "oc://TOOLS.md/tools/deploy",
  "target": "oc://TOOLS.md/tools/deploy",
  "requirement": "oc://policy.jsonc/tools/requireMetadata"
}
```

Exemple de résultat MCP :

```json
{
  "checkId": "policy/mcp-unapproved-server",
  "severity": "error",
  "message": "MCP server 'remote' is not in the policy allowlist.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/mcp/servers/remote",
  "target": "oc://openclaw.config/mcp/servers/remote",
  "requirement": "oc://policy.jsonc/mcp/servers/allow"
}
```

Exemple de résultat de model-provider :

```json
{
  "checkId": "policy/models-unapproved-provider",
  "severity": "error",
  "message": "Model ref 'anthropic/claude-sonnet-4.7' uses unapproved provider 'anthropic'.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/model/fallbacks/#0",
  "target": "oc://openclaw.config/agents/defaults/model/fallbacks/#0",
  "requirement": "oc://policy.jsonc/models/providers/allow"
}
```

Exemple de résultat réseau :

```json
{
  "checkId": "policy/network-private-access-enabled",
  "severity": "error",
  "message": "Network setting 'browser-private-network' allows private-network access.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
  "target": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
  "requirement": "oc://policy.jsonc/network/privateNetwork/allow"
}
```

Exemple de résultat d'exposition Gateway :

```json
{
  "checkId": "policy/gateway-non-loopback-bind",
  "severity": "error",
  "message": "Gateway bind setting 'gateway-bind' permits non-loopback exposure.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/gateway/bind",
  "target": "oc://openclaw.config/gateway/bind",
  "requirement": "oc://policy.jsonc/gateway/exposure/allowNonLoopbackBind"
}
```

Exemple de résultat d'espace de travail d'agent :

```json
{
  "checkId": "policy/agents-workspace-access-denied",
  "severity": "error",
  "message": "agents.defaults sandbox workspaceAccess 'rw' is not allowed by policy.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "target": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "requirement": "oc://policy.jsonc/agents/workspace/allowedAccess"
}
```

## Réparation

`doctor --lint` et `policy check` sont en lecture seule.

`doctor --fix` ne modifie les paramètres de l'espace de travail gérés par la stratégie que lorsque `workspaceRepairs` est explicitement activé. Sans cette option, les contrôles de stratégie signalent ce qu'ils répareraient et laissent les paramètres inchangés.

Dans cette version, repair peut désactiver les canaux qui sont activés dans la configuration OpenClaw
mais refusés par OpenClaw`channels.denyRules`. N'activez `workspaceRepairs` qu'après avoir
examiné le fichier de stratégie, car une règle de refus valide peut désactiver un
canal configuré :

```jsonc
{
  "plugins": {
    "entries": {
      "policy": {
        "config": {
          "workspaceRepairs": true,
        },
      },
    },
  },
}
```

## Codes de sortie

| Commande       | `0`                                             | `1`                                                           | `2`                              |
| -------------- | ----------------------------------------------- | ------------------------------------------------------------- | -------------------------------- |
| `policy check` | Aucun constat au seuil.                         | Un ou plusieurs constats ont atteint le seuil.                | Échec d'argument ou d'exécution. |
| `policy watch` | Aucun constat et le hachage accepté est à jour. | Des constats existent ou l'attestation acceptée est obsolète. | Échec d'argument ou d'exécution. |

## Connexes

- [Mode Doctor lint](/fr/cli/doctor#lint-mode)
- [CLI Path](CLI/en/cli/path)
