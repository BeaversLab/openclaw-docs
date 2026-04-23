---
title: "Harnais Codex"
summary: "Exécuter les tours d'agent intégré OpenClaw via le harnais d'app-server Codex fourni"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex model refs and config examples
  - You want to disable PI fallback for Codex-only deployments
---

# Harnais Codex

Le plugin `codex` fourni permet à OpenClaw d'exécuter les tours d'agent intégrés via le
Codex app-server au lieu du harnais PI intégré.

Utilisez ceci lorsque vous voulez que Codex gère la session de bas niveau de l'agent : découverte
de modèle, reprise de thread natif, compactage natif et exécution de l'app-server.
OpenClaw gère toujours les canaux de chat, les fichiers de session, la sélection de modèle, les outils,
les approbations, la livraison des médias et le miroir de transcription visible.

Le harnais est désactivé par défaut. Il est sélectionné uniquement lorsque le plugin `codex` est
activé et que le modèle résolu est un modèle `codex/*`, ou lorsque vous forcez explicitement
`embeddedHarness.runtime: "codex"` ou `OPENCLAW_AGENT_RUNTIME=codex`.
Si vous ne configurez jamais `codex/*`, les exécutions PI existantes, OpenAI, Anthropic, Gemini, locales,
et de fournisseur personnalisé conservent leur comportement actuel.

## Choisir le bon préfixe de modèle

OpenClaw dispose de routes distinctes pour l'accès OpenAI et de type Codex :

| Réf modèle             | Chemin d'exécution                              | Utiliser quand                                                                          |
| ---------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `openai/gpt-5.4`       | Fournisseur OpenAI via la plomberie OpenClaw/PI | Vous voulez un accès direct à l'OpenAI de la plateforme API avec `OPENAI_API_KEY`.      |
| `openai-codex/gpt-5.4` | Fournisseur OpenAI Codex OAuth via PI           | Vous voulez OAuth ChatGPT/Codex sans le harnais Codex app-server.                       |
| `codex/gpt-5.4`        | Fournisseur Codex fourni plus harnais Codex     | Vous voulez une exécution native de l'app-server Codex pour le tour de l'agent intégré. |

Le harnais Codex ne réclame que les références de modèle `codex/*`. Les références existantes `openai/*`,
`openai-codex/*`, Anthropic, Gemini, xAI, locales et de fournisseur personnalisé conservent
leurs chemins normaux.

## Prérequis

- OpenClaw avec le plugin `codex` fourni disponible.
- Codex app-server `0.118.0` ou plus récent.
- Auth Codex disponible pour le processus de l'app-server.

Le plugin bloque les handshakes d'app-server plus anciens ou non versionnés. Cela maintient
OpenClaw sur la surface de protocole contre laquelle il a été testé.

Pour les tests en direct et les tests de fumée Docker, l'authentification provient généralement de `OPENAI_API_KEY`, plus
fichiers CLI Codex optionnels tels que `~/.codex/auth.json` et
`~/.codex/config.toml`. Utilisez le même matériel d'authentification que votre app-server Codex local
utilise.

## Configuration minimale

Utilisez `codex/gpt-5.4`, activez le plugin intégré, et forcez le harnais `codex` :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "codex/gpt-5.4",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

Si votre configuration utilise `plugins.allow`, incluez `codex` également :

```json5
{
  plugins: {
    allow: ["codex"],
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Définir `agents.defaults.model` ou un model d'agent sur `codex/<model>` active également
automatiquement le plugin intégré `codex`. L'entrée de plugin explicite est toujours
utile dans les configurations partagées car elle rend l'intention de déploiement évidente.

## Ajouter Codex sans remplacer d'autres models

Conservez `runtime: "auto"` lorsque vous voulez Codex pour les models `codex/*` et PI pour
tout le reste :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: {
        primary: "codex/gpt-5.4",
        fallbacks: ["openai/gpt-5.4", "anthropic/claude-opus-4-6"],
      },
      models: {
        "codex/gpt-5.4": { alias: "codex" },
        "codex/gpt-5.4-mini": { alias: "codex-mini" },
        "openai/gpt-5.4": { alias: "gpt" },
        "anthropic/claude-opus-4-6": { alias: "opus" },
      },
      embeddedHarness: {
        runtime: "auto",
        fallback: "pi",
      },
    },
  },
}
```

Avec cette forme :

- `/model codex` ou `/model codex/gpt-5.4` utilise le harnais d'app-server Codex.
- `/model gpt` ou `/model openai/gpt-5.4` utilise le chemin du provider OpenAI.
- `/model opus` utilise le chemin du provider Anthropic.
- Si un model non-Codex est sélectionné, PI reste le harnais de compatibilité.

## Déploiements Codex uniquement

Désactivez le repli PI lorsque vous devez prouver que chaque tour d'agent intégré utilise
le harnais Codex :

```json5
{
  agents: {
    defaults: {
      model: "codex/gpt-5.4",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

Remplacement de l'environnement :

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

Avec le repli désactivé, OpenClaw échoue tôt si le plugin Codex est désactivé,
le model demandé n'est pas une référence `codex/*`, l'app-server est trop ancien, ou l'app-server ne peut pas démarrer.

## Codex par agent

Vous pouvez rendre un agent Codex uniquement alors que l'agent par défaut conserve la
sélection automatique normale :

```json5
{
  agents: {
    defaults: {
      embeddedHarness: {
        runtime: "auto",
        fallback: "pi",
      },
    },
    list: [
      {
        id: "main",
        default: true,
        model: "anthropic/claude-opus-4-6",
      },
      {
        id: "codex",
        name: "Codex",
        model: "codex/gpt-5.4",
        embeddedHarness: {
          runtime: "codex",
          fallback: "none",
        },
      },
    ],
  },
}
```

Utilisez les commandes de session normales pour changer d'agents et de models. `/new` crée une session
OpenClaw fraîche et le harnais Codex crée ou reprend son thread d'app-server sidecar
si nécessaire. `/reset` efface la liaison de session OpenClaw pour ce thread.

## Découverte de model

Par défaut, le plugin Codex demande à l'app-server les models disponibles. Si la
découverte échoue ou expire, il utilise le catalogue de repli intégré :

- `codex/gpt-5.4`
- `codex/gpt-5.4-mini`
- `codex/gpt-5.2`

Vous pouvez régler la découverte sous `plugins.entries.codex.config.discovery` :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
        },
      },
    },
  },
}
```

Désactivez la découverte lorsque vous voulez que le démarrage évite de sonder Codex et s'en tienne au catalogue de secours :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

## Connexion et stratégie de l'application serveur

Par défaut, le plugin lance Codex localement avec :

```bash
codex app-server --listen stdio://
```

Par défaut, OpenClaw demande à Codex de solliciter des approbations natives. Vous pouvez affiner cette politique, par exemple en la renforçant et en acheminant les réexamens via le gardien :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            approvalPolicy: "untrusted",
            approvalsReviewer: "guardian_subagent",
            sandbox: "workspace-write",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

Pour une application serveur déjà en cours d'exécution, utilisez le transport WebSocket :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://127.0.0.1:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

Champs `appServer` pris en charge :

| Champ               | Par défaut                               | Signification                                                                                       |
| ------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` génère Codex ; `"websocket"` se connecte à `url`.                                         |
| `command`           | `"codex"`                                | Exécutable pour le transport stdio.                                                                 |
| `args`              | `["app-server", "--listen", "stdio://"]` | Arguments pour le transport stdio.                                                                  |
| `url`               | non défini                               | URL de l'application serveur WebSocket.                                                             |
| `authToken`         | non défini                               | Jeton Bearer pour le transport WebSocket.                                                           |
| `headers`           | `{}`                                     | En-têtes WebSocket supplémentaires.                                                                 |
| `requestTimeoutMs`  | `60000`                                  | Délai d'expiration pour les appels au plan de contrôle de l'application serveur.                    |
| `approvalPolicy`    | `"on-request"`                           | Stratégie d'approbation native Codex envoyée au démarrage/reprise/tour de fil.                      |
| `sandbox`           | `"workspace-write"`                      | Mode de bac à sable (sandbox) natif Codex envoyé au démarrage/reprise de fil.                       |
| `approvalsReviewer` | `"user"`                                 | Utilisez `"guardian_subagent"` pour permettre au gardien Codex de réviser les approbations natives. |
| `serviceTier`       | non défini                               | Niveau de service Codex facultatif, par exemple `"priority"`.                                       |

Les anciennes variables d'environnement fonctionnent toujours comme solutions de secours pour les tests locaux lorsque
le champ de configuration correspondant n'est pas défini :

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`
- `OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1`

La configuration est préférée pour les déploiements reproductibles.

## Recettes courantes

Codex local avec le transport stdio par défaut :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Validation du harnais Codex uniquement, avec la basculement PI désactivé :

```json5
{
  embeddedHarness: {
    fallback: "none",
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Approbations Codex révisées par Guardian :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            approvalPolicy: "on-request",
            approvalsReviewer: "guardian_subagent",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

Serveur d'application distant avec en-têtes explicites :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://gateway-host:39175",
            headers: {
              "X-OpenClaw-Agent": "main",
            },
          },
        },
      },
    },
  },
}
```

Le changement de modèle reste contrôlé par OpenClaw. Lorsqu'une session OpenClaw est attachée
à un fil Codex existant, le prochain tour envoie le `codex/*` modèle, le fournisseur, la politique d'approbation, le bac à sable et le niveau de service actuellement sélectionnés
à nouveau au serveur d'application. Passer de `codex/gpt-5.4` à `codex/gpt-5.2` conserve la
liaison du fil mais demande à Codex de continuer avec le modèle nouvellement sélectionné.

## Commande Codex

Le plugin intégré enregistre `/codex` en tant que commande slash autorisée. Elle est
générique et fonctionne sur n'importe quel channel qui prend en charge les commandes texte OpenClaw.

Formes courantes :

- `/codex status` affiche la connectivité en direct du serveur d'application, les modèles, le compte, les limites de débit, les serveurs MCP et les compétences.
- `/codex models` liste les modèles du serveur d'application Codex en direct.
- `/codex threads [filter]` liste les fils Codex récents.
- `/codex resume <thread-id>` attache la session OpenClaw actuelle à un fil Codex existant.
- `/codex compact` demande au serveur d'application Codex de compacter le fil attaché.
- `/codex review` lance la révision native Codex pour le fil attaché.
- `/codex account` affiche le statut du compte et des limites de débit.
- `/codex mcp` liste le statut du serveur MCP du serveur d'application Codex.
- `/codex skills` liste les compétences du serveur d'application Codex.

`/codex resume` écrit le même fichier de liaison sidecar que celui utilisé par le harnais pour
les tours normaux. Au prochain message, OpenClaw reprend ce fil Codex, passe le
modèle OpenClaw `codex/*` actuellement sélectionné au serveur d'application, et conserve l'historique étendu
activé.

L'interface de commande nécessite `0.118.0` du serveur d'application Codex ou une version plus récente. Les méthodes de
contrôle individuelles sont signalées comme `unsupported by this Codex app-server` si un
serveur d'application futur ou personnalisé n'expose pas cette méthode JSON-RPC.

## Outils, médias et compactage

Le harnais Codex modifie uniquement l'exécuteur d'agent intégré de bas niveau.

OpenClaw construit toujours la liste des outils et reçoit les résultats dynamiques des outils de la part du harnais. Le texte, les images, la vidéo, la musique, le TTS, les approbations et la sortie de l'outil de messagerie continuent de passer par le chemin de livraison normal d'OpenClaw.

Lorsque le modèle sélectionné utilise le harnais Codex, la compactation native des threads est déléguée au serveur d'application Codex. OpenClaw conserve un miroir de transcription pour l'historique du canal, la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais. Le miroir comprend l'invite de l'utilisateur, le texte final de l'assistant et les enregistrements de raisonnement ou de plan légers Codex lorsque le serveur d'application les émet.

La génération de média ne nécessite pas PI. Image, vidéo, musique, PDF, TTS et la compréhension de média continuent d'utiliser les paramètres fournisseur/modèle correspondants tels que `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel`, et `messages.tts`.

## Dépannage

**Codex n'apparaît pas dans `/model` :** activez `plugins.entries.codex.enabled`, définissez une référence de modèle `codex/*`, ou vérifiez si `plugins.allow` exclut `codex`.

**OpenClaw revient à PI :** définissez `embeddedHarness.fallback: "none"` ou `OPENCLAW_AGENT_HARNESS_FALLBACK=none` pendant les tests.

**Le serveur d'application est rejeté :** mettez à niveau Codex afin que la négociation du serveur d'application signale la version `0.118.0` ou plus récente.

**La découverte de modèle est lente :** abaissez `plugins.entries.codex.config.discovery.timeoutMs` ou désactivez la découverte.

**Le transport WebSocket échoue immédiatement :** vérifiez `appServer.url`, `authToken`, et que le serveur d'application distant parle la même version de protocole de serveur d'application Codex.

**Un modèle non-Codex utilise PI :** c'est normal. Le harnais Codex ne réclame que les références de modèle `codex/*`.

## Connexes

- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Fournisseurs de modèle](/fr/concepts/model-providers)
- [Référence de configuration](/fr/gateway/configuration-reference)
- [Tests](/fr/help/testing#live-codex-app-server-harness-smoke)
