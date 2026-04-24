---
title: "Harnais Codex"
summary: "Exécuter les tours d'agent intégré OpenClaw via le harnais d'application serveur Codex fourni"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex model refs and config examples
  - You want to disable PI fallback for Codex-only deployments
---

# Harnais Codex

Le plugin `codex` fourni permet à OpenClaw d'exécuter des tours d'agent intégrés via le
serveur d'application Codex au lieu du harnais PI intégré.

Utilisez ceci lorsque vous voulez que Codex gère la session de bas niveau de l'agent : découverte
de modèle, reprise de thread natif, compactage natif et exécution de l'app-server.
OpenClaw gère toujours les canaux de chat, les fichiers de session, la sélection de modèle, les outils,
les approbations, la livraison des médias et le miroir de transcription visible.

Les tours Codex natifs respectent également les hooks de plugin partagés afin que les shims de prompt,
l'automatisation sensible à la compaction, le middleware d'outils et les observateurs de cycle de vie restent
alignés avec le harnais PI :

- `before_prompt_build`
- `before_compaction`, `after_compaction`
- `llm_input`, `llm_output`
- `tool_result`, `after_tool_call`
- `before_message_write`
- `agent_end`

Les plugins fournis peuvent également enregistrer une fabrique d'extension de serveur d'application Codex pour ajouter
un middleware `tool_result` asynchrone, et les écritures de transcription Codex miroir sont acheminées
via `before_message_write`.

Le harnais est désactivé par défaut. Il est sélectionné uniquement lorsque le plugin `codex` est
activé et que le modèle résolu est un modèle `codex/*`, ou lorsque vous forcez explicitement
`embeddedHarness.runtime: "codex"` ou `OPENCLAW_AGENT_RUNTIME=codex`.
Si vous ne configurez jamais `codex/*`, les exécutions PI existantes, OpenAI, Anthropic, Gemini, locales,
et de fournisseurs personnalisés conservent leur comportement actuel.

## Choisir le bon préfixe de modèle

OpenClaw dispose de routes distinctes pour l'accès OpenAI et de type Codex :

| Référence de modèle    | Chemin d'exécution                              | À utiliser quand                                                                                 |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `openai/gpt-5.4`       | Fournisseur OpenAI via la plomberie OpenClaw/PI | Vous souhaitez un accès direct à l'OpenAI de la plateforme API avec `OPENAI_API_KEY`.            |
| `openai-codex/gpt-5.4` | Fournisseur OpenAI Codex OAuth via PI           | Vous souhaitez ChatGPT/Codex OAuth sans le harnais de serveur d'application Codex.               |
| `codex/gpt-5.4`        | Fournisseur Codex fourni plus harnais Codex     | Vous souhaitez une exécution native du serveur d'application Codex pour le tour d'agent intégré. |

Le harnais Codex ne réclame que les références de modèle `codex/*`. Les références de fournisseur existantes `openai/*`, `openai-codex/*`, Anthropic, Gemini, xAI, local et personnalisées conservent leur chemin normal.

## Conditions requises

- OpenClaw avec le plugin `codex` inclus disponible.
- Codex app-server `0.118.0` ou plus récent.
- Authentification Codex disponible pour le processus app-server.

Le plugin bloque les poignées de main (handshakes) d'app-server plus anciennes ou sans version. Cela maintient OpenClaw sur la surface de protocole contre laquelle il a été testé.

Pour les tests en direct et les tests de fumée Docker, l'authentification provient généralement de `OPENAI_API_KEY`, ainsi que des fichiers facultatifs de CLI Codex tels que `~/.codex/auth.json` et `~/.codex/config.toml`. Utilisez le même matériel d'authentification que votre app-server Codex local.

## Configuration minimale

Utilisez `codex/gpt-5.4`, activez le plugin inclus et forcez le harnais `codex` :

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

Définir `agents.defaults.model` ou un modèle d'agent sur `codex/<model>` active également automatiquement le plugin inclus `codex`. L'entrée de plugin explicite est toujours utile dans les configurations partagées car elle rend l'intention de déploiement évidente.

## Ajouter Codex sans remplacer d'autres modèles

Conservez `runtime: "auto"` lorsque vous souhaitez Codex pour les modèles `codex/*` et PI pour tout le reste :

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

- `/model codex` ou `/model codex/gpt-5.4` utilise le harnais Codex app-server.
- `/model gpt` ou `/model openai/gpt-5.4` utilise le chemin du fournisseur OpenAI.
- `/model opus` utilise le chemin du fournisseur Anthropic.
- Si un modèle non-Codex est sélectionné, PI reste le harnais de compatibilité.

## Déploiements Codex uniquement

Désactivez le repli (fallback) PI lorsque vous devez prouver que chaque tour d'agent intégré utilise le harnais Codex :

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

Avec le repli désactivé, OpenClaw échoue rapidement si le plugin Codex est désactivé, si le modèle demandé n'est pas une référence `codex/*`, si l'app-server est trop ancien ou si l'app-server ne peut pas démarrer.

## Codex par agent

Vous pouvez rendre un agent Codex-only alors que l'agent par défaut conserve la
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

Utilisez les commandes de session normales pour changer d'agents et de modèles. `/new` crée une
nouvelle session OpenClaw et le harnais Codex crée ou reprend son thread sidecar app-server
selon les besoins. `/reset` efface la liaison de session OpenClaw pour ce thread.

## Découverte de modèles

Par défaut, le plugin Codex demande à l'app-server les modèles disponibles. Si la
découverte échoue ou expire, il utilise le catalogue de repli inclus :

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

Désactivez la découverte lorsque vous souhaitez que le démarrage évite de sonder Codex et s'en tienne au
catalogue de repli :

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

## Connexion et stratégie de l'app-server

Par défaut, le plugin démarre Codex localement avec :

```bash
codex app-server --listen stdio://
```

Par défaut, OpenClaw démarre les sessions de harnais Codex locales en mode YOLO :
`approvalPolicy: "never"`, `approvalsReviewer: "user"` et
`sandbox: "danger-full-access"`. Il s'agit de la posture de l'opérateur local de confiance utilisée
pour les battements de cœur autonomes : Codex peut utiliser des outils shell et réseau sans
s'arrêter sur les invites d'approbation natives auxquelles personne n'est là pour répondre.

Pour opter pour les approbations révisées par le gardien Codex, définissez `appServer.mode:
"guardian"` :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "fast",
          },
        },
      },
    },
  },
}
```

Le mode gardien s'étend à :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
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

Guardian est un réviseur d'approbation natif de Codex. Lorsque Codex demande à quitter le
bac à sable, écrire en dehors de l'espace de travail ou ajouter des autorisations telles que l'accès réseau,
Codex achemine cette demande d'approbation vers un sous-agent réviseur au lieu d'une
invite humaine. Le réviseur rassemble le contexte et applique le cadre de risque de Codex, puis
approuve ou refuse la demande spécifique. Guardian est utile lorsque vous voulez plus de
garde-fous qu'en mode YOLO mais que vous avez toujours besoin d'agents et de battements de cœur sans surveillance
pour progresser.

Le harnais en direct Docker inclut une sonde Guardian lorsque
`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`. Il démarre le harnais Codex en
mode gardien, vérifie qu'une commande shell élevée bénigne est approuvée et
vérifie qu'un téléchargement de fausse clé secrète vers une destination externe non fiable est
refusé, afin que l'agent demande une approbation explicite en retour.

Les champs de stratégie individuels priment toujours sur `mode`, de sorte que les déploiements avancés peuvent
mélanger le préréglage avec des choix explicites.

Pour un serveur d'application déjà en cours d'exécution, utilisez le transport WebSocket :

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

| Champ               | Par défaut                               | Signification                                                                                                                               |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                  |
| `command`           | `"codex"`                                | Exécutable pour le transport stdio.                                                                                                         |
| `args`              | `["app-server", "--listen", "stdio://"]` | Arguments pour le transport stdio.                                                                                                          |
| `url`               | non défini                               | URL du serveur d'application WebSocket.                                                                                                     |
| `authToken`         | non défini                               | Jeton Bearer pour le transport WebSocket.                                                                                                   |
| `headers`           | `{}`                                     | En-têtes WebSocket supplémentaires.                                                                                                         |
| `requestTimeoutMs`  | `60000`                                  | Délai d'expiration pour les appels au plan de contrôle du serveur d'application.                                                            |
| `mode`              | `"yolo"`                                 | Préréglage pour l'exécution YOLO ou révisée par un gardien.                                                                                 |
| `approvalPolicy`    | `"never"`                                | Stratégie d'approbation Codex native envoyée au démarrage/reprise/tour du fil.                                                              |
| `sandbox`           | `"danger-full-access"`                   | Mode de bac à sable Codex natif envoyé au démarrage/reprise du fil.                                                                         |
| `approvalsReviewer` | `"user"`                                 | Utilisez `"guardian_subagent"` pour permettre à Codex Guardian de réviser les invites.                                                      |
| `serviceTier`       | non défini                               | Niveau de service optionnel du serveur d'application Codex : `"fast"`, `"flex"`, ou `null`. Les valeurs héritées non valides sont ignorées. |

Les anciennes variables d'environnement fonctionnent toujours comme solutions de secours pour les tests locaux lorsque
le champ de configuration correspondant n'est pas défini :

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` a été supprimé. Utilisez
`plugins.entries.codex.config.appServer.mode: "guardian"` à la place, ou
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` pour des tests locaux ponctuels. La configuration est
préférée pour les déploiements reproductibles car elle conserve le comportement du plugin dans le
même fichier examiné que le reste de la configuration du harnais Codex.

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

Validation du harnais Codex uniquement, avec le repli PI désactivé :

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
            mode: "guardian",
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

App-server distant avec en-têtes explicites :

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
à un fil Codex existant, le prochain tour envoie le modèle `codex/*`
sélectionné, le fournisseur, la politique d'approbation, le bac à sable et le niveau de service à
l'app-server à nouveau. Le passage de `codex/gpt-5.4` à `codex/gpt-5.2` conserve la
liaison du fil mais demande à Codex de continuer avec le modèle nouvellement sélectionné.

## Commande Codex

Le plugin inclus enregistre `/codex` comme commande slash autorisée. Il est
générique et fonctionne sur n'importe quel channel qui prend en charge les commandes texte OpenClaw.

Formes courantes :

- `/codex status` affiche la connectivité en direct de l'app-server, les modèles, le compte, les limites de taux, les serveurs MCP et les compétences.
- `/codex models` liste les modèles en direct de l'app-server Codex.
- `/codex threads [filter]` liste les fils Codex récents.
- `/codex resume <thread-id>` attache la session OpenClaw actuelle à un fil Codex existant.
- `/codex compact` demande à l'app-server Codex de compacter le fil attaché.
- `/codex review` lance la révision native Codex pour le fil attaché.
- `/codex account` affiche le statut du compte et de la limite de taux.
- `/codex mcp` liste le statut du serveur MCP de l'app-server Codex.
- `/codex skills` liste les compétences de l'app-server Codex.

`/codex resume` écrit le même fichier de liaison sidecar que le harnais utilise pour
les tours normaux. Au prochain message, OpenClaw reprend ce fil Codex, transmet le
modèle `codex/*` OpenClaw sélectionné à l'app-server et garde l'historique
étendu activé.

La surface de commande nécessite `0.118.0` ou une version plus récente du serveur d'application Codex. Les méthodes de contrôle individuelles sont signalées comme `unsupported by this Codex app-server` si un futur serveur d'application personnalisé n'expose pas cette méthode JSON-RPC.

## Outils, média et compactage

Le harnais Codex ne modifie que l'exécuteur d'agent intégré de bas niveau.

OpenClaw construit toujours la liste d'outils et reçoit les résultats dynamiques des outils de la part du harnais. Le texte, les images, la vidéo, la musique, le TTS, les approbations et la sortie des outils de messagerie continuent de passer par le chemin de livraison normal de OpenClaw.

Les sollicitations d'approbation d'outil MCP Codex sont acheminées via le flux d'approbation de plugin de OpenClaw lorsque Codex marque `_meta.codex_approval_kind` comme `"mcp_tool_call"` ; d'autres sollicitations et demandes de saisie libre échouent toujours.

Lorsque le modèle sélectionné utilise le harnais Codex, le compactage natif des threads est délégué au serveur d'application Codex. OpenClaw conserve une copie miroir de la transcription pour l'historique des canaux, la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais. Le miroir comprend l'invite de l'utilisateur, le texte final de l'assistant et les enregistrements de raisonnement ou de plan légers de Codex lorsque le serveur d'application les émet. À ce jour, OpenClaw n'enregistre que les signaux de début et de fin de compactage natif. Il n'expose pas encore de résumé de compactage lisible par l'homme ni une liste vérifiable des entrées que Codex a conservées après compactage.

La génération de média ne nécessite pas PI. Les images, la vidéo, la musique, le PDF, le TTS et la compréhension de média continuent d'utiliser les paramètres fournisseur/modèle correspondants tels que `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` et `messages.tts`.

## Dépannage

**Codex n'apparaît pas dans `/model` :** activez `plugins.entries.codex.enabled`, définissez une référence de modèle `codex/*`, ou vérifiez si `plugins.allow` exclut `codex`.

**OpenClaw utilise PI au lieu de Codex :** si aucun harnais Codex ne réclame l'exécution,
OpenClaw peut utiliser PI comme backend de compatibilité. Définissez
`embeddedHarness.runtime: "codex"` pour forcer la sélection de Codex pendant les tests, ou
`embeddedHarness.fallback: "none"` pour échouer si aucun harnais de plugin ne correspond. Une fois
le serveur d'application Codex sélectionné, ses échecs sont signalés directement sans configuration
de repli supplémentaire.

**Le serveur d'application est rejeté :** mettez à niveau Codex afin que la poignée de main du serveur d'application
signale la version `0.118.0` ou plus récente.

**La découverte de modèle est lente :** réduisez `plugins.entries.codex.config.discovery.timeoutMs`
ou désactivez la découverte.

**Le transport WebSocket échoue immédiatement :** vérifiez `appServer.url`, `authToken`,
et que le serveur d'application distant parle la même version du protocole du serveur d'application Codex.

**Un modèle non-Codex utilise PI :** c'est normal. L'harnais Codex ne réclame que
les références de modèle `codex/*`.

## Connexes

- [Plugins d'harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Fournisseurs de modèle](/fr/concepts/model-providers)
- [Référence de configuration](/fr/gateway/configuration-reference)
- [Tests](/fr/help/testing#live-codex-app-server-harness-smoke)
