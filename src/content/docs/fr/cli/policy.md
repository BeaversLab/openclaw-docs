---
summary: "CLIRéférence CLI pour les vérifications de conformité `openclaw policy`"
read_when:
  - You want to check OpenClaw settings against an authored policy.jsonc
  - You want policy findings in doctor lint
  - You need a policy attestation hash for audit evidence
title: "Policy"
---

# `openclaw policy`

`openclaw policy` est fourni par le plugin Policy inclus. Policy est une
couche de conformité d'entreprise par rapport aux paramètres OpenClaw existants. Elle n'ajoute pas un
second système de configuration. `policy.jsonc` définit les exigences rédigées,
OpenClaw observe l'espace de travail actif comme preuve, et les contrôles de santé de la stratégie
signalent la dérive via `doctor --lint`. Le signal de conformité final est une exécution
`doctor --lint` propre ; la stratégie contribue aux résultats via cette surface lint partagée
au lieu de créer une porte de santé séparée.

La stratégie gère actuellement les canaux configurés, les serveurs MCP, les fournisseurs de modèle,
la posture SSRF du réseau, la posture d'accès ingress/canal, la posture d'exposition Gateway, la posture de l'espace de travail de l'agent,
la posture du fournisseur de secrets/profil d'auth de configuration OpenClaw, et les déclarations d'outil
gouvernées. Par exemple, les services informatiques ou un opérateur d'espace de travail peuvent enregistrer que Telegram
n'est pas un fournisseur de canal approuvé, restreindre les serveurs MCP et les références de modèle aux
entrées approuvées, exiger que l'accès fetch/privé-network au navigateur reste
désactivé, exiger que l'isolation de session de message direct et la posture d'ingress de canal
rester dans les limites révisées, exiger que l'exposition bind/auth/HTTP du Gateway reste dans les limites révisées,
exiger que l'accès à l'espace de travail de l'agent et les refus d'outil restent dans une posture
révisée, exiger que les SecretRefs de configuration OpenClaw utilisent des fournisseurs gérés, exiger
que les profils d'auth de configuration transportent les métadonnées fournisseur/mode, exiger que les outils gouvernés
transportent les métadonnées de risque et de sensibilité, puis utiliser `doctor --lint` comme porte de
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

Lorsque la stratégie est activée, doctor peut charger les contrôles de santé de la stratégie sans activer
des plugins arbitraires. Le plugin reste activé si `policy.jsonc` est manquant, afin que
doctor puisse signaler l'artefact manquant.

La stratégie est rédigée, et non générée à partir des paramètres actuels de l'utilisateur. Une stratégie minimale pour les channels, les serveurs MCP, les providers de modèle, la posture réseau, l'accès ingress/channel, l'exposition Gateway, la posture de l'espace de travail de l'agent, la posture du runtime sandbox configuré, la posture du provider secret de configuration/profil d'authentification OpenClaw et les métadonnées des outils ressemble à ceci :

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
  "ingress": {
    "session": {
      "requireDmScope": "per-channel-peer",
    },
    "channels": {
      "allowDmPolicies": ["pairing", "allowlist", "disabled"],
      "denyOpenGroups": true,
      "requireMentionInGroups": true,
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

Les règles font autorité. Un bloc de catégorie n'est qu'un espace de noms ; les vérifications s'exécutent lorsqu'une règle concrète est présente. OpenClaw lit les paramètres actuels `channels.*` `mcp.servers.*`, `models.providers.*`, les références de modèle d'agent sélectionnées, les paramètres SSRF réseau, la portée de session de message direct, la stratégie DM de channel, la stratégie de groupe de channel, les portes de mention channel/groupe, la posture Gateway bind/auth/Control UI/Tailscale/remote/HTTP, l'accès à l'espace de travail sandbox de l'agent de configuration OpenClaw et la posture de refus d'outil, la provenance du fournisseur de secrets de configuration et SecretRef, les métadonnées du profil d'authentification de configuration, la posture d'outil global/par agent configurée, et les déclarations `TOOLS.md` comme preuves, puis signale l'état observé qui n'est pas conforme. Si une stratégie refuse les liaisons Gateway non-bouclage, omettez `gateway.bind` uniquement lorsque vous êtes prêt à examiner la valeur par défaut d'exécution ; définissez `gateway.bind=loopback` pour une conformité de configuration stricte. Pour une posture d'agent en lecture seule, configurez le mode sandbox sur les valeurs par défaut applicables ou l'agent et définissez `workspaceAccess` sur `none` ou `ro` ; un mode sandbox omis ou `off` ne satisfait pas une stratégie de lecture seule/sans écriture. `agents.workspace.denyTools` prend en charge `exec`, `process`, `write`, `edit` et `apply_patch` ; la configuration OpenClaw `group:fs` couvre les outils de mutation de fichiers et `group:runtime` couvre les outils shell/processus. La stratégie de posture d'outil observe `tools.profile`, `tools.allow`, `tools.alsoAllow`, `tools.deny`, `tools.fs.workspaceOnly`, `tools.exec.security`, `tools.exec.ask`, `tools.exec.host`, `tools.elevated.enabled`, et les mêmes substitutions par agent `agents.list[].tools.*`. Elle ne lit pas l'état d'approbation d'exécution/opérateur tel que exec-approvals., et elle n'applique pas les appels d'outils lors de l'exécution. Les preuves de secrets enregistrent la posture du fournisseur/source et les métadonnées SecretRef, jamais les valeurs brutes des secrets. La stratégie ne lit pas n'atteste pas les magasins d'informations d'identification par agent tels que `auth-profiles.json` ; ces magasins restent la propriété des flux d'authentification et d'informations d'identification existants.

### Référence des règles de stratégie

Chaque champ de stratégie ci-dessous est facultatif. Une vérification ne s'exécute que lorsque la règle correspondante est présente dans `policy.jsonc`. L'état observé est la configuration OpenClaw existante ou les métadonnées de l'espace de travail ; la stratégie signale les écarts mais ne modifie pas le comportement d'exécution à moins qu'un chemin de réparation ne soit explicitement disponible et activé.

Les superpositions (overlays) de stratégie maintiennent des règles de haut niveau larges comme globales, puis laissent des blocs de portée nommés ajouter des sections de stratégie normales plus strictes pour des sélecteurs explicites. Un nom de portée est uniquement un compartiment descriptif ; la correspondance utilise les valeurs de sélecteur à l'intérieur de la portée. La superposition est additive : les revendications globales s'exécutent toujours, et une revendication délimitée peut émettre sa propre constatation sur la même configuration observée.

#### Superpositions délimitées

Utilisez `scopes.<scopeName>` lorsqu'un ensemble d'agents ou de canaux a besoin d'une stratégie plus stricte que la ligne de base de premier niveau. Les sections délimitées à l'agent utilisent `agentIds`, qui prend en charge `tools.*`, `agents.workspace.*` et `sandbox.*`. L'entrée délimitée au canal utilise `channelIds`, qui prend en charge `ingress.channels.*`. Les sections non prises en charge sont rejetées au lieu d'être ignorées. Si une entrée `agentIds` n'est pas présente dans `agents.list[]`, OpenClaw évalue la règle délimitée par rapport à la posture globale/défaut héritée pour cet ID d'agent d'exécution.

```jsonc
{
  "tools": {
    "exec": {
      "allowHosts": ["sandbox", "node"],
    },
  },
  "sandbox": {
    "requireMode": ["all", "non-main"],
  },
  "scopes": {
    "release-workspace": {
      "agentIds": ["release-agent", "review-agent"],
      "agents": {
        "workspace": {
          "allowedAccess": ["none", "ro"],
        },
      },
    },
    "release-lockdown": {
      "agentIds": ["release-agent"],
      "tools": {
        "exec": {
          "allowHosts": ["sandbox"],
          "allowSecurity": ["deny", "allowlist"],
          "requireAsk": ["always"],
        },
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
      "sandbox": {
        "requireMode": ["all"],
        "allowBackends": ["docker"],
      },
    },
    "shell-sandbox": {
      "agentIds": ["shell-agent"],
      "sandbox": {
        "allowBackends": ["openshell"],
        "containers": {
          "requireReadOnlyMounts": false,
        },
      },
    },
    "telegram-ingress": {
      "channelIds": ["telegram"],
      "ingress": {
        "channels": {
          "allowDmPolicies": ["pairing"],
          "denyOpenGroups": true,
          "requireMentionInGroups": true,
        },
      },
    },
  },
}
```

Le même agent peut apparaître dans plusieurs portées lorsque chaque portée régit différents champs, comme illustré ci-dessus. Un champ délimité répété pour le même agent doit être égal ou plus restrictif selon les métadonnées de la stratégie ; les revendications en double plus faibles sont rejetées. Les métadonnées de strictness traitent les listes d'autorisation comme des sous-ensembles, les listes de refus comme des super-ensembles et les booléens requis comme des exigences fixes.

La stratégie de posture des conteneurs est évaluée uniquement sur la base des preuves qu'OpenClaw peut
observer pour l'agent correspondant. Si une règle `sandbox.containers.*` activée s'applique
à un agent dont le backend de sandbox ne peut pas exposer ce champ, la stratégie signale
`policy/sandbox-container-posture-unobservable` au lieu de considérer la revendication comme
réussie. Utilisez des portées `agentIds` distinctes pour les groupes d'agents qui utilisent différents
backends de sandbox, et laissez les règles de conteneur non prises en charge non définies ou définies sur false pour les
groupes où ces champs ne peuvent pas être observés.

Le `ingress.session.requireDmScope` de premier niveau reste global car
`session.dmScope` n'est pas une preuve attribuable à un channel.

| Sélecteur    | Sections prises en charge                | À utiliser quand                                                       |
| ------------ | ---------------------------------------- | ---------------------------------------------------------------------- |
| `agentIds`   | `tools`, `agents.workspace` et `sandbox` | Un ou plusieurs agents d'exécution ont besoin de règles plus strictes. |
| `channelIds` | `ingress.channels`                       | Un ou plusieurs channels ont besoin de règles d'entrée plus strictes.  |

Chaque portée présente dans `policy.jsonc` doit être valide et applicable.

#### Channels

| Champ de stratégie                   | État observé                                              | À utiliser quand                                                  |
| ------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------- |
| `channels.denyRules[].when.provider` | Provider `channels.*` et état activé                      | Refuser les channels configurés d'un provider tel que `telegram`. |
| `channels.denyRules[].reason`        | Message de résultat et contexte de l'indice de réparation | Expliquer pourquoi le provider est refusé.                        |

#### Serveurs MCP

| Champ de stratégie  | État observé                 | À utiliser quand                                                            |
| ------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `mcp.servers.allow` | Identifiants `mcp.servers.*` | Exiger que chaque serveur MCP configuré soit dans une liste d'autorisation. |
| `mcp.servers.deny`  | Identifiants `mcp.servers.*` | Refuser des identifiants spécifiques de serveurs MCP configurés.            |

#### Providers de modèle

| Champ de stratégie       | État observé                                                            | À utiliser quand                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `models.providers.allow` | Identifiants `models.providers.*` et références de modèle sélectionnées | Exiger que les providers configurés et les références de modèle sélectionnées utilisent des providers approuvés. |
| `models.providers.deny`  | Identifiants `models.providers.*` et références de modèle sélectionnées | Refuser les providers configurés et les références de modèle sélectionnées par identifiant de provider.          |

#### Réseau

| Champ de stratégie             | État observé                              | À utiliser quand                                                                |
| ------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------- |
| `network.privateNetwork.allow` | Échappements SSRF pour les réseaux privés | Définissez sur `false` pour exiger que l'accès au réseau privé reste désactivé. |

#### Accès ingress et aux channels

| Champ de stratégie                        | État observé                                                                               | Utiliser quand                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `ingress.session.requireDmScope`          | `session.dmScope`                                                                          | Exiger une portée d'isolation de message direct (DM) révisée.                                    |
| `ingress.channels.allowDmPolicies`        | `channels.*.dmPolicy` et champs de stratégie DM de channel hérités                         | Autoriser uniquement les stratégies de channel de message direct (DM) révisées.                  |
| `ingress.channels.denyOpenGroups`         | Stratégie ingress pour les channels, comptes et groupes                                    | Refuser l'ingress de groupe ouvert pour les channels et comptes configurés.                      |
| `ingress.channels.requireMentionInGroups` | Configuration des barrières de mention pour channel, compte, groupe, guilde et imbrication | Exiger des barrières de mention lorsque l'ingress de groupe est ouvert ou restreint par mention. |

#### Gateway

| Champ de stratégie                      | État observé                                                                                                    | Utiliser quand                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                                                                                                  | Définissez sur `false` pour exiger la liaison loopback du Gateway.                                                      |
| `gateway.exposure.allowTailscaleFunnel` | Posture serveur/tunnel Tailscale Gateway                                                                        | Définissez sur `false`Tailscale pour refuser l'exposition via Tailscale Funnel.                                         |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                                                                                             | Définissez sur `true` pour rejeter l'authentification Gateway désactivée.                                               |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`                                                                                        | Définissez sur `true` pour exiger une configuration explicite de limite de taux d'authentification.                     |
| `gateway.controlUi.allowInsecure`       | Contrôler les commutateurs d'authentification, d'appareil et d'origine non sécurisés de l'interface utilisateur | Définissez sur `false` pour refuser les commutateurs d'exposition non sécurisés de l'interface utilisateur de contrôle. |
| `gateway.remote.allow`                  | Mode/configuration du Gateway distant                                                                           | Définissez sur `false` pour refuser le mode distant du Gateway.                                                         |
| `gateway.http.denyEndpoints`            | Points de terminaison HTTP Gateway du API                                                                       | Refuser les identifiants de point de terminaison tels que `chatCompletions` ou `responses`.                             |
| `gateway.http.requireUrlAllowlists`     | Entrées de récupération d'URL HTTP du Gateway                                                                   | Définir sur `true` pour exiger des listes blanches d'URL sur les entrées de récupération d'URL.                         |

#### Espace de travail de l'agent

| Champ de stratégie               | État observé                                                                         | À utiliser quand                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` et `agents.list[].sandbox.workspaceAccess` | Autoriser uniquement les valeurs d'accès à l'espace de travail du bac à sable telles que `none` ou `ro`.                                       |
| `agents.workspace.denyTools`     | Configuration de refus d'outil global et par agent                                   | Exiger que les outils de mutation d'espace de travail/d'exécution tels que `exec`, `process`, `write`, `edit` ou `apply_patch` soient refusés. |

#### Posture du bac à sable

| Champ de stratégie                                    | État observé                                                      | À utiliser quand                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `sandbox.requireMode`                                 | `agents.defaults.sandbox.mode` et mode par agent                  | Autoriser uniquement les modes de bac à sable examinés tels que `all` ou `non-main`. |
| `sandbox.allowBackends`                               | `agents.defaults.sandbox.backend` et backend par agent            | Autoriser uniquement les backends de bac à sable examinés tels que `docker`.         |
| `sandbox.containers.denyHostNetwork`                  | Mode réseau de bac à sable/navigateur basé sur un conteneur       | Refuser le mode réseau hôte.                                                         |
| `sandbox.containers.denyContainerNamespaceJoin`       | Mode réseau de bac à sable/navigateur basé sur un conteneur       | Refuser de rejoindre un autre espace de noms réseau de conteneur.                    |
| `sandbox.containers.requireReadOnlyMounts`            | Mode de montage de bac à sable/navigateur basé sur un conteneur   | Exiger que les montages soient en lecture seule.                                     |
| `sandbox.containers.denyContainerRuntimeSocketMounts` | Cibles de montage de bac à sable/navigateur basé sur un conteneur | Refuser les montages de sockets de runtime de conteneur.                             |
| `sandbox.containers.denyUnconfinedProfiles`           | Posture du profil de sécurité des conteneurs                      | Refuser les profils de sécurité de conteneur non confinés.                           |
| `sandbox.browser.requireCdpSourceRange`               | Plage source CDP du navigateur de bac à sable                     | Exiger que l'exposition du CDP du navigateur déclare une plage source.               |

La stratégie traite l'absence de `sandbox.mode` comme la valeur par défaut implicite `off`, donc
`sandbox.requireMode` signale un bac à sable nouveau ou non configuré comme étant en dehors d'une
liste blanche telle que `["all"]`.

#### Secrets

| Champ de stratégie                | État observé                                                      | À utiliser quand                                                                             |
| --------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `secrets.requireManagedProviders` | SecretRefs de configuration et déclarations `secrets.providers.*` | Définissez sur `true` pour exiger que les SecretRefs pointent vers des providers déclarés.   |
| `secrets.denySources`             | Sources de providers de secrets et sources de SecretRef           | Refuser les sources telles que `exec`, `file` ou un autre nom de source configuré.           |
| `secrets.allowInsecureProviders`  | Indicateurs de posture non sécurisés des providers de secrets     | Définissez sur `false` pour rejeter les providers qui optent pour une posture non sécurisée. |

#### Profils d'authentification

| Champ de stratégie              | État observé                                         | Utiliser quand                                                                                                                |
| ------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `auth.profiles.requireMetadata` | Métadonnées du provider et du mode `auth.profiles.*` | Exiger des clés de métadonnées telles que `provider` et `mode` sur les profils d'authentification de configuration.           |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`                               | Autoriser uniquement les modes de profil d'authentification pris en charge tels que `api_key`, `aws-sdk`, `oauth` ou `token`. |

#### Métadonnées de l'outil

| Champ de stratégie      | État observé                   | Utiliser quand                                                                                             |
| ----------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `tools.requireMetadata` | Déclarations `TOOLS.md` régies | Exiger que les outils régis déclarent des clés de métadonnées telles que `risk`, `sensitivity` ou `owner`. |

#### Posture de l'outil

| Champ de stratégie              | État observé                                                   | Utiliser quand                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `tools.profiles.allow`          | `tools.profile` et `agents.list[].tools.profile`               | Autoriser uniquement les identifiants de profil d'outil tels que `minimal`, `messaging` ou `coding`.                                |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` et remplacements `tools.fs` par agent | Définissez sur `true` pour exiger une posture de l'outil de système de fichiers uniquement pour l'espace de travail.                |
| `tools.exec.allowSecurity`      | `tools.exec.security` et sécurité d'exécution par agent        | Autoriser uniquement les modes de sécurité d'exécution tels que `deny` ou `allowlist`.                                              |
| `tools.exec.requireAsk`         | `tools.exec.ask` et mode de demande d'exécution par agent      | Exiger une posture d'approbation telle que `always`.                                                                                |
| `tools.exec.allowHosts`         | `tools.exec.host` et routage de l'hôte d'exécution par agent   | Autoriser uniquement les modes de routage de l'hôte d'exécution tels que `sandbox`.                                                 |
| `tools.elevated.allow`          | `tools.elevated.enabled` et posture élevée par agent           | Définir sur `false` pour exiger que le mode outil élevé reste désactivé.                                                            |
| `tools.alsoAllow.expected`      | `tools.alsoAllow` et `tools.alsoAllow` par agent               | Exiger des entrées `alsoAllow` exactes et signaler les octrois d'outils additifs manquants ou inattendus.                           |
| `tools.denyTools`               | `tools.deny` et `agents.list[].tools.deny`                     | Exiger que les listes de refus d'outils configurées incluent des ID ou des groupes d'outils tels que `group:runtime` et `group:fs`. |

Exécuter des vérifications de stratégie uniquement lors de la rédaction :

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` exécute uniquement l'ensemble de vérifications de stratégie et émet des preuves, des constatations et
des hachages d'attestation. Les mêmes constatations apparaissent également dans `openclaw doctor --lint`
lorsque le plugin Policy est activé.

Comparer un fichier de stratégie d'opérateur à un fichier de stratégie de référence rédigé :

```bash
openclaw policy compare --baseline official.policy.jsonc
openclaw policy compare --baseline official.policy.jsonc --policy policy.jsonc --json
```

`policy compare`OpenClaw compare la syntaxe du fichier de stratégie à la syntaxe du fichier de stratégie. Il n'inspecte
pas l'état d'exécution d'OpenClaw, les preuves, les informations d'identification ou les secrets. La commande
utilise les mêmes métadonnées de règles de stratégie qui régissent les superpositions délimitées : les listes d'autorisation doivent
rester égales ou plus étroites, les listes de refus doivent rester égales ou plus larges, les booléens requis
doivent conserver leur valeur requise, les chaînes ordonnées ne doivent se déplacer que vers l'extrémité
la plus restrictive de l'ordre configuré, et les listes exactes doivent correspondre.

Le fichier de référence peut être une stratégie rédigée par une organisation. La stratégie vérifiée peut
utiliser des valeurs plus strictes ou ajouter des règles de stratégie supplémentaires. Une règle vérifiée de premier niveau peut également
satisfaire une règle de référence délimitée lorsqu'elle est également ou plus restrictive car
la stratégie de premier niveau s'applique largement. Les noms de portée n'ont pas besoin de correspondre ; la comparaison
délimitée est indexée par la valeur du sélecteur telle que `agentIds` ou `channelIds` et par
le champ de stratégie en cours de vérification.

Exemple de sortie JSON propre : le rapport d'état de la comparaison de fichiers de stratégie indique uniquement :

```json
{
  "ok": true,
  "baselinePath": "official.policy.jsonc",
  "policyPath": "policy.jsonc",
  "rulesChecked": 3,
  "findings": []
}
```

Exemple de sortie propre `policy check --json` inclut des hachages stables qui peuvent être
enregistrés par un opérateur ou un superviseur :

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
| `expectedHash`            | Verrouillage de hachage optionnel pour l'artefact de stratégie approuvé.                          |
| `expectedAttestationHash` | Verrouillage de hachage optionnel pour la dernière vérification de stratégie propre acceptée.     |
| `path`                    | Emplacement relatif à l'espace de travail de l'artefact de stratégie.                             |

Définissez `plugins.entries.policy.config.enabled` sur `false` pour désactiver les vérifications de stratégie
pour un espace de travail tout en laissant le plugin installé.

Les exigences de métadonnées des outils sont rédigées dans `policy.jsonc` avec
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

Le hachage de stratégie identifie l'artefact de règle rédigé. Le bloc de preuve
enregistre l'état observé d'OpenClaw utilisé par les vérifications de stratégie. La
valeur OpenClaw`workspace.hash` identifie cette charge utile de preuve pour la portée vérifiée.
Le hachage des résultats identifie l'ensemble exact des résultats renvoyés par la vérification.
`checkedAt` enregistre le moment où l'évaluation a été exécutée. Le hachage d'attestation identifie
la déclaration stable : hachage de stratégie, hachage de preuve, hachage des résultats et si le
résultat était propre. Il n'inclut pas intentionnellement `checkedAt`, de sorte que le même
état de stratégie produit la même attestation lors de vérifications répétées. Ensemble,
ces éléments forment le tuple d'audit pour cette vérification de stratégie.

Si une passerelle ou un superviseur ultérieur utilise la stratégie pour bloquer, approuver ou annoter une
action d'exécution, il doit enregistrer le hachage d'attestation de la dernière vérification de stratégie
propre. `checkedAt` reste dans la sortie JSON pour les journaux d'audit, mais ne fait pas partie du
hachage d'attestation stable.

Utilisez ce cycle de vie lors de l'acceptation de l'état de la stratégie :

1. Créer ou réviser `policy.jsonc`.
2. Exécuter `openclaw policy check --json`.
3. Si le résultat est propre, enregistrer `attestation.policy.hash` sous `expectedHash`.
4. Enregistrer `attestation.attestationHash` sous `expectedAttestationHash`.
5. Réexécuter `openclaw doctor --lint` dans le CI ou les portes de publication.

Si les règles de stratégie changent intentionnellement, mettez à jour les deux hachages acceptés à partir d'une vérification propre. Si les paramètres de l'espace de travail changent intentionnellement mais que la stratégie reste la même, seul `expectedAttestationHash` change généralement.

L'activation ou la mise à niveau des règles `agents.workspace` ajoute des preuves `agentWorkspace` au hachage de l'espace de travail et au hachage d'attestation. Les opérateurs doivent examiner les nouvelles preuves et actualiser les hachages d'attestation acceptés après avoir activé ces règles. L'activation ou la mise à niveau des règles de posture de l'outil ajoute des preuves `toolPosture` de la même manière.

`openclaw policy watch` exécute la même vérification à plusieurs reprises et signale lorsque les preuves actuelles ne correspondent plus à `expectedAttestationHash` :

```bash
openclaw policy watch --json
```

Utilisez `--once` dans le CI ou les scripts qui ne nécessitent qu'une seule évaluation de dérive. Sans `--once`, la commande interroge toutes les deux secondes par défaut ; utilisez `--interval-ms` pour choisir un intervalle différent.

## Constats

La stratégie vérifie actuellement :

| ID de vérification                                | Constat                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                     | La stratégie est activée mais `policy.jsonc` est manquant.                                                                |
| `policy/policy-jsonc-invalid`                     | La stratégie ne peut pas être analysée ou contient des entrées de règles malformées.                                      |
| `policy/policy-hash-mismatch`                     | La stratégie ne correspond pas au `expectedHash` configuré.                                                               |
| `policy/attestation-hash-mismatch`                | Les preuves de stratégie actuelles ne correspondent plus à l'attestation acceptée.                                        |
| `policy/policy-conformance-invalid`               | Un fichier de stratégie de base ou vérifié a une syntaxe de comparaison invalide.                                         |
| `policy/policy-conformance-missing`               | Un fichier de stratégie vérifié manque une règle requise par le fichier de stratégie de base.                             |
| `policy/policy-conformance-weaker`                | Un fichier de stratégie vérifié a une valeur plus faible que le fichier de stratégie de base.                             |
| `policy/channels-denied-provider`                 | Un channel activé correspond à une règle de refus de channel.                                                             |
| `policy/mcp-denied-server`                        | Un serveur MCP configuré est refusé par la stratégie.                                                                     |
| `policy/mcp-unapproved-server`                    | Un serveur MCP configuré est en dehors de la liste d'autorisation.                                                        |
| `policy/models-denied-provider`                   | Un fournisseur de model configuré ou une référence de model utilise un fournisseur refusé.                                |
| `policy/models-unapproved-provider`               | Un fournisseur de model configuré ou une référence de model est en dehors de la liste d'autorisation.                     |
| `policy/network-private-access-enabled`           | Une échappatoire SSRF de réseau privé est activée alors que la stratégie la refuse.                                       |
| `policy/ingress-dm-policy-unapproved`             | Une stratégie de DM de channel est en dehors de la liste d'autorisation de la stratégie.                                  |
| `policy/ingress-dm-scope-unapproved`              | `session.dmScope` ne correspond pas à la portée d'isolement DM requise par la stratégie.                                  |
| `policy/ingress-open-groups-denied`               | Une stratégie de groupe de channel est `open` alors que la stratégie refuse l'ingestion de groupes ouverts.               |
| `policy/ingress-group-mention-required`           | Une entrée de channel ou de groupe désactive les portes de mention alors que la stratégie les exige.                      |
| `policy/gateway-non-loopback-bind`                | La posture de liaison Gateway autorise une exposition non-bouclage alors que la stratégie la refuse.                      |
| `policy/gateway-auth-disabled`                    | L'authentification Gateway est désactivée alors que la stratégie l'exige.                                                 |
| `policy/gateway-rate-limit-missing`               | La posture de limite de taux d'authentification Gateway n'est pas explicite alors que la stratégie l'exige.               |
| `policy/gateway-control-ui-insecure`              | Les commutateurs d'exposition non sécurisée de l'interface utilisateur de contrôle Gateway sont activés.                  |
| `policy/gateway-tailscale-funnel`                 | L'exposition Tailscale Funnel de Gateway est activée alors que la stratégie la refuse.                                    |
| `policy/gateway-remote-enabled`                   | Le mode distant Gateway est actif alors que la stratégie le refuse.                                                       |
| `policy/gateway-http-endpoint-enabled`            | Un point de terminaison API HTTP Gateway est activé alors qu'il est refusé par la stratégie.                              |
| `policy/gateway-http-url-fetch-unrestricted`      | L'entrée de récupération d'URL HTTP Gateway manque d'une liste d'autorisation d'URL requise.                              |
| `policy/agents-workspace-access-denied`           | Le mode bac à sable de l'agent ou l'accès à l'espace de travail est en dehors de la liste d'autorisation de la stratégie. |
| `policy/agents-tool-not-denied`                   | Un agent ou une configuration par défaut ne refuse pas un tool requis par la stratégie.                                   |
| `policy/tools-profile-unapproved`                 | Un profil de tool global ou par agent configuré est en dehors de la liste d'autorisation.                                 |
| `policy/tools-fs-workspace-only-required`         | Les outils de système de fichiers ne sont pas configurés avec une posture de chemin réservée à l'espace de travail.       |
| `policy/tools-exec-security-unapproved`           | Le mode de sécurité d'exécution n'est pas dans la liste verte de la stratégie.                                            |
| `policy/tools-exec-ask-unapproved`                | Le mode de confirmation d'exécution (Exec ask mode) n'est pas dans la liste verte de la stratégie.                        |
| `policy/tools-exec-host-unapproved`               | Le routage de l'hôte d'exécution (Exec host routing) est en dehors de la liste verte de la stratégie.                     |
| `policy/tools-elevated-enabled`                   | Le mode d'outil élevé est activé alors que la stratégie le refuse.                                                        |
| `policy/tools-also-allow-missing`                 | Une liste `alsoAllow` configurée manque une entrée requise par la stratégie.                                              |
| `policy/tools-also-allow-unexpected`              | Une liste `alsoAllow` configurée comprend une entrée non prévue par la stratégie.                                         |
| `policy/tools-required-deny-missing`              | Une liste de refus d'outils globale ou par agent n'inclut pas un outil refusé requis.                                     |
| `policy/sandbox-mode-unapproved`                  | Le mode Sandbox est en dehors de la liste verte de la stratégie.                                                          |
| `policy/sandbox-backend-unapproved`               | Le backend Sandbox est en dehors de la liste verte de la stratégie.                                                       |
| `policy/sandbox-container-posture-unobservable`   | Une règle de posture de conteneur est activée pour un backend qui ne peut pas l'observer.                                 |
| `policy/sandbox-container-host-network-denied`    | Un bac à sable ou un navigateur basé sur un conteneur utilise le mode réseau hôte.                                        |
| `policy/sandbox-container-namespace-join-denied`  | Un bac à sable ou un navigateur basé sur un conteneur rejoint un autre espace de noms de conteneur.                       |
| `policy/sandbox-container-mount-mode-required`    | Un point de montage d'un bac à sable ou d'un navigateur basé sur un conteneur n'est pas en lecture seule.                 |
| `policy/sandbox-container-runtime-socket-mount`   | Un point de montage d'un bac à sable ou d'un navigateur basé sur un conteneur expose la socket du runtime du conteneur.   |
| `policy/sandbox-container-unconfined-profile`     | Le profil de bac à sable de conteneur est non confiné lorsque la stratégie l'interdit.                                    |
| `policy/sandbox-browser-cdp-source-range-missing` | La plage source CDP du navigateur Sandbox est manquante alors que la stratégie en exige une.                              |
| `policy/secrets-unmanaged-provider`               | Une SecretRef de configuration fait référence à un provider non déclaré sous `secrets.providers`.                         |
| `policy/secrets-denied-provider-source`           | Un provider de secret de configuration ou une SecretRef utilise une source refusée par la stratégie.                      |
| `policy/secrets-insecure-provider`                | Un provider de secret opte pour une posture non sécurisée alors que la stratégie l'interdit.                              |
| `policy/auth-profile-invalid-metadata`            | Un profil d'authentification de configuration manque des métadonnées valides de provider ou de mode.                      |
| `policy/auth-profile-unapproved-mode`             | Le mode d'un profil d'authentification de configuration est en dehors de la liste verte de la stratégie.                  |
| `policy/tools-missing-risk-level`                 | Les métadonnées de risque sont absentes d'une déclaration d'outil gouverné.                                               |
| `policy/tools-unknown-risk-level`                 | Une déclaration d'outil gouverné utilise une valeur de risque inconnue.                                                   |
| `policy/tools-missing-sensitivity-token`          | Les métadonnées de sensibilité sont absentes d'une déclaration d'outil gouverné.                                          |
| `policy/tools-missing-owner`                      | Les métadonnées de propriétaire sont absentes d'une déclaration d'outil gouverné.                                         |
| `policy/tools-unknown-sensitivity-token`          | Une déclaration d'outil gouverné utilise une valeur de sensibilité inconnue.                                              |

Les résultats de la stratégie peuvent inclure à la fois `target` et `requirement`. `target` est l'élément observé de l'espace de travail qui n'est pas conforme. `requirement` est la règle de stratégie rédigée qui en a fait un résultat. Les deux valeurs sont aujourd'hui des adresses, généralement des chemins `oc://`, mais les noms des champs décrivent leur rôle dans la stratégie plutôt que le format de l'adresse.

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

Exemple de résultat d'outil :

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

Exemple de résultat de fournisseur de modèle :

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

`doctor --fix` ne modifie les paramètres de l'espace de travail gérés par la stratégie que lorsque `workspaceRepairs` est explicitement activé. Sans cette approbation, les vérifications de stratégie signalent ce qu'elles répareraient et laissent les paramètres inchangés.

Dans cette version, la réparation peut désactiver les canaux activés dans la configuration OpenClaw mais refusés par `channels.denyRules`. N'activez `workspaceRepairs` qu'après avoir examiné le fichier de stratégie, car une règle de refus valide peut désactiver un canal configuré :

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

| Commande         | `0`                                                                 | `1`                                                                                         | `2`                                       |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `policy check`   | Aucun résultat au seuil.                                            | Un ou plusieurs résultats ont atteint le seuil.                                             | Échec de l'argument ou de l'exécution.    |
| `policy compare` | Le fichier de stratégie est au moins aussi strict que la référence. | Le fichier de stratégie est invalide, manquant ou moins strict que les règles de référence. | Échec de l'argument ou de l'exécution.    |
| `policy watch`   | Aucun résultat et le hachage accepté est à jour.                    | Des constats existent ou l'attestation acceptée est obsolète.                               | Échec lié à un argument ou à l'exécution. |

## Connexes

- [Mode Doctor lint](/fr/cli/doctor#lint-mode)
- [CLI Path](CLI/en/cli/path)
