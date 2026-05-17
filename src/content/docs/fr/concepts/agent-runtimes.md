---
summary: "Comment OpenClaw sépare les fournisseurs de modèles, les modèles, les canaux et les runtimes d'agent"
title: "Runtimes d'agent"
read_when:
  - You are choosing between PI, Codex, ACP, or another native agent runtime
  - You are confused by provider/model/runtime labels in status or config
  - You are documenting support parity for a native harness
---

Un **agent runtime** est le composant qui possède une boucle de modèle préparée : il
reçoit le prompt, pilote la sortie du modèle, gère les appels d'outils natifs et renvoie
le tour fini à OpenClaw.

Les runtimes sont faciles à confondre avec les providers car ils apparaissent tous deux près de la
configuration du modèle. Ce sont des couches différentes :

| Couche        | Exemples                              | Signification                                                                           |
| ------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| Provider      | `openai`, `anthropic`, `openai-codex` | Comment OpenClaw s'authentifie, découvre les modèles et nomme les références de modèle. |
| Modèle        | `gpt-5.5`, `claude-opus-4-6`          | Le modèle sélectionné pour le tour de l'agent.                                          |
| Agent runtime | `pi`, `codex`, `claude-cli`           | La bouche de bas niveau ou le backend qui exécute le tour préparé.                      |
| Canal         | Telegram, Discord, Slack, WhatsApp    | Où les messages entrent et sortent de OpenClaw.                                         |

Vous verrez également le mot **harness** (harnais) dans le code. Un harnais est l'implémentation
qui fournit un runtime d'agent. Par exemple, le harnais Codex fourni
implémente le runtime `codex`. La configuration publique utilise `agentRuntime.id` sur
les entrées de fournisseur ou de modèle ; les clés de runtime pour l'agent entier sont obsolètes et ignorées.
`openclaw doctor --fix` supprime les anciens épinglages de runtime d'agent entier et réécrit
les références de modèle de runtime obsolètes vers des références canoniques fournisseur/modèle, plus une politique de runtime
limitée au modèle si nécessaire.

Il existe deux familles de runtimes :

- Les **harnais intégrés** (embedded harnesses) s'exécutent dans la boucle de l'agent préparé d'OpenClaw. Aujourd'hui, il s'agit
  du runtime intégré `pi` ainsi que des harnais de plugins enregistrés tels que
  `codex`.
- Les **backends CLI** exécutent un processus local CLI tout en conservant la référence du modèle
  canonique. Par exemple, `anthropic/claude-opus-4-7` avec
  un `agentRuntime.id: "claude-cli"` limité au modèle signifie « sélectionner le modèle Anthropic,
  exécuter via le CLI Claude ». `claude-cli` n'est pas un identifiant de harnais intégré
  et ne doit pas être transmis à la sélection AgentHarness.

## Surfaces Codex

La plus grande confusion provient du fait que plusieurs surfaces différentes partagent le nom Codex :

| Surface                                                          | Nom/config OpenClaw                           | Ce qu'il fait                                                                                                                                        |
| ---------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime natif de serveur d'application Codex                     | Références de modèle `openai/*`               | Exécute les tours d'agent intégré OpenAI via le serveur d'application Codex. Il s'agit de la configuration habituelle de l'abonnement ChatGPT/Codex. |
| Profils d'authentification OAuth Codex                           | Fournisseur d'authentification `openai-codex` | Stocke l'authentification de l'abonnement ChatGPT/Codex que le harnais du serveur d'application Codex consomme.                                      |
| Adaptateur Codex ACP                                             | `runtime: "acp"`, `agentId: "codex"`          | Exécute Codex via le plan de contrôle externe ACP/acpx. À utiliser uniquement lorsqu'ACP/acpx est explicitement demandé.                             |
| Ensemble de commandes de contrôle de chat Codex natif            | `/codex ...`                                  | Lie, reprend, dirige, arrête et inspecte les threads de l'app-server Codex depuis le chat.                                                           |
| Route de OpenAI de la plateforme API pour les surfaces non-agent | `openai/*` plus authentification par clé API  | Utilisé pour les OpenAI directs telles que les images, les embeddings, la parole et la temps réel.                                                   |

Ces surfaces sont intentionnellement indépendantes. L'activation du plugin `codex` rend les fonctionnalités natives de l'application serveur disponibles ; `openclaw doctor --fix` gère la réparation des routes `openai-codex/*` héritées et le nettoyage des épingles de session obsolètes. Sélectionner `openai/*` pour un modèle d'agent signifie désormais « exécuter ceci via Codex », sauf si une surface OpenAI API non-agent est utilisée.

La configuration commune d'abonnement ChatGPT/Codex utilise OAuth Codex pour l'authentification, mais conserve la référence du modèle comme `openai/*` et sélectionne le runtime `codex` :

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

Cela signifie que OpenClaw sélectionne une référence de modèle OpenAI, puis demande au runtime de l'application serveur Codex d'exécuter le tour de l'agent intégré. Cela ne signifie pas « utiliser la facturation API », et cela ne signifie pas que le canal, le catalogue de fournisseurs de modèles ou le stockage de session OpenClaw deviennent Codex.

Lorsque le plugin groupé `codex` est activé, le contrôle Codex en langage naturel doit utiliser la surface de commande native `/codex` (`/codex bind`, `/codex threads`, `/codex resume`, `/codex steer`, `/codex stop`) au lieu d'ACP. Utilisez ACP pour Codex uniquement lorsque l'utilisateur demande explicitement ACP/acpx ou teste le chemin de l'adaptateur ACP. Claude Code, Gemini CLI, OpenCode, Cursor et les harnais externes similaires utilisent toujours ACP.

Ceci est l'arbre de décision orienté agent :

1. Si l'utilisateur demande **Codex bind/control/thread/resume/steer/stop**, utilisez la
   surface de commande native `/codex` lorsque le plugin `codex` groupé est activé.
2. Si l'utilisateur demande **Codex en tant que runtime intégré** ou souhaite l'expérience d'agent Codex normale soutenue par abonnement, utilisez `openai/<model>`.
3. Si l'utilisateur choisit explicitement **PI pour un modèle OpenAI**, conservez la référence du modèle comme `openai/<model>` et définissez la stratégie de runtime fournisseur/modèle sur `agentRuntime.id: "pi"`. Un profil d'authentification `openai-codex` sélectionné est acheminé en interne via le transport hérité d'auth Codex de PI.
4. Si la configuration héritée contient encore des **`openai-codex/*` model refs**, réparez-la en
   `openai/<model>` avec `openclaw doctor --fix` ; le médecin garde la route d'auth Codex
   en ajoutant des `agentRuntime.id: "codex"` étendues au provider/model là où
   l'ancienne model ref l'impliquait.
5. Si l'utilisateur dit explicitement **ACP**, **acpx** ou **adaptateur ACP Codex**, utilisez
   ACP avec `runtime: "acp"` et `agentId: "codex"`.
6. Si la demande concerne **Claude Code, la CLI Gemini, OpenCode, Cursor, Droid, ou un autre harnais externe**, utilisez ACP/acpx, et non le runtime de sous-agent natif.

| Vous voulez dire...                                               | Utilisez...                                  |
| ----------------------------------------------------------------- | -------------------------------------------- |
| Contrôle de chat/fil de discussion de l'application serveur Codex | `/codex ...` depuis le plugin `codex` fourni |
| Runtime d'agent intégré de l'application serveur Codex            | `openai/*` model refs d'agent                |
| OAuth Codex OpenAIOAuth                                           | profils d'auth `openai-codex`                |
| Claude Code ou autre harnais externe                              | ACP/acpx                                     |

Pour le fractionnement du préfixe de la famille OpenAI, voir [OpenAI](/fr/providers/openai) et
[Model providers](/fr/concepts/model-providers). Pour le contrat de support du runtime Codex,
voir [Codex harness runtime](/fr/plugins/codex-harness-runtime#v1-support-contract).

## Propriété du runtime

Différents runtimes possèdent différentes parties de la boucle.

| Surface                              | OpenClaw PI intégré                        | serveur d'application Codex                                                  |
| ------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------- |
| Propriétaire de la boucle de modèle  | OpenClaw via le runner PI intégré          | serveur d'application Codex                                                  |
| État canonique du fil                | transcription OpenClaw                     | fil Codex, plus miroir de transcription OpenClaw                             |
| outils dynamiques OpenClaw           | boucle d'outils native OpenClaw            | Ponté via l'adaptateur Codex                                                 |
| outils natifs de shell et de fichier | chemin PI/OpenClaw                         | outils natifs Codex, pontés via des crochets natifs lorsque pris en charge   |
| Moteur de contexte                   | assemblage de contexte natif OpenClaw      | les projets OpenClaw assemblent le contexte dans le tour Codex               |
| Compactage                           | OpenClaw ou moteur de contexte sélectionné | compactage natif Codex, avec notifications OpenClaw et maintenance du miroir |
| Livraison du canal                   | OpenClaw                                   | OpenClaw                                                                     |

Cette division de propriété est la règle de conception principale :

- Si OpenClaw possède la surface, OpenClaw peut fournir un comportement normal de crochet de plugin.
- Si le runtime natif possède la surface, OpenClaw a besoin d'événements de runtime ou de crochets natifs.
- Si le runtime natif possède l'état canonique du fil, OpenClaw doit refléter et projeter le contexte, et non réécrire les éléments internes non pris en charge.

## Sélection du runtime

OpenClaw choisit un runtime intégré après la résolution du fournisseur et du modèle :

1. La stratégie de runtime étendue au modèle l'emporte. Elle peut résider dans une entrée de modèle provider configurée ou dans `agents.defaults.models["provider/model"].agentRuntime` /
   `agents.list[].models["provider/model"].agentRuntime`.
2. La stratégie de runtime étendue au provider vient ensuite à
   `models.providers.<provider>.agentRuntime`.
3. En mode `auto`, les runtimes de plugin enregistrés peuvent revendiquer des paires provider/model prises en charge.
4. Si aucun runtime ne revendique un tour en mode `auto`, OpenClaw utilise PI comme
   runtime de compatibilité. Utilisez un id de runtime explicite lorsque l'exécution doit être
   stricte.

Les épingles de runtime pour toute la session et tout l'agent sont ignorées. Cela inclut
`OPENCLAW_AGENT_RUNTIME`, l'état `agentHarnessId`/`agentRuntimeOverride` de session,
`agents.defaults.agentRuntime` et `agents.list[].agentRuntime`. Exécutez
`openclaw doctor --fix` pour supprimer la configuration de runtime d'agent entier obsolète et convertir
les model refs de runtime héritées là où OpenClaw peut préserver l'intention.

Les runtimes de plugin provider/model explicites échouent en mode fermé. Par exemple,
`agentRuntime.id: "codex"` sur un provider ou un modèle signifie Codex ou une erreur
claire de sélection/runtime ; il n'est jamais routé silencieusement vers PI.

Les alias de backend CLI sont différents des ids de harnais intégrés. La forme
Claude CLI préférée est :

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      models: {
        "anthropic/claude-opus-4-7": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

Les références héritées telles que `claude-cli/claude-opus-4-7` restent prises en charge pour la compatibilité, mais les nouvelles configurations doivent conserver le provider/model canonique et placer le backend d'exécution dans la stratégie d'exécution du provider/model.

Le mode `auto` est intentionnellement conservateur pour la plupart des providers. Les modèles d'agent OpenAI font exception : le runtime non défini et `auto` résolvent tous deux vers le harnais Codex. La configuration explicite du runtime PI reste une option de compatibilité opt-in pour les tours d'agent `openai/*` ; lorsqu'elle est associée à un profil d'authentification `openai-codex` sélectionné, OpenClaw achemine PI en interne via le transport d'auth Codex hérité tout en conservant la référence publique du modèle sous la forme `openai/*`. Les épingles de session PI OpenAI obsolètes sont ignorées par la sélection du runtime et peuvent être nettoyées avec `openclaw doctor --fix`.

Si `openclaw doctor` avertit que le plugin `codex` est activé alors que `openai-codex/*` reste dans la configuration, considérez cela comme un état d'acheminement hérité. Exécutez `openclaw doctor --fix` pour le réécrire en `openai/*` avec le runtime Codex.

## Contrat de compatibilité

Lorsqu'un runtime n'est pas PI, il doit documenter les surfaces OpenClaw qu'il prend en charge.
Utilisez cette structure pour la documentation des runtimes :

| Question                                                    | Pourquoi c'est important                                                                                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Qui possède la boucle du modèle ?                           | Détermine où ont lieu les nouvelles tentatives, la continuation des outils et les décisions de réponse finale.                           |
| Qui possède l'historique canonique des fils de discussion ? | Détermine si OpenClaw peut modifier l'historique ou seulement le refléter.                                                               |
| Les outils dynamiques OpenClaw fonctionnent-ils ?           | La messagerie, les sessions, le cron et les outils détenus par OpenClaw reposent là-dessus.                                              |
| Les hooks d'outils dynamiques fonctionnent-ils ?            | Les plugins s'attendent à `before_tool_call`, `after_tool_call` et à un intergiciel (middleware) autour des outils détenus par OpenClaw. |
| Les hooks d'outils natifs fonctionnent-ils ?                | Le shell, le patch et les outils détenus par le runtime ont besoin du support natif des hooks pour la stratégie et l'observation.        |
| Le cycle de vie du moteur de contexte s'exécute-t-il ?      | Les plugins de mémoire et de contexte dépendent des cycles de vie d'assemblage, d'ingestion, après-tour et de compactage.                |
| Quelles données de compactage sont exposées ?               | Certains plugins ont uniquement besoin de notifications, tandis que d'autres ont besoin des métadonnées conservées/supprimées.           |
| Qu'est-ce qui est intentionnellement non pris en charge ?   | Les utilisateurs ne doivent pas supposer une équivalence avec PI là où le runtime natif possède plus d'état.                             |

Le contrat de support du runtime Codex est documenté dans
[Codex harness runtime](/fr/plugins/codex-harness-runtime#v1-support-contract).

## Libellés de statut

La sortie d'état peut afficher à la fois les étiquettes `Execution` et `Runtime`. Lisez-les comme des diagnostics, et non comme des noms de provider.

- Une référence de modèle telle que `openai/gpt-5.5` vous indique le provider/model sélectionné.
- Un identifiant de runtime tel que `codex` vous indique quelle boucle exécute le tour.
- Un libellé de canal tel que Telegram ou Discord vous indique où se déroule la conversation.

Si une exécution affiche toujours un runtime inattendu, inspectez d'abord la stratégie de runtime provider/model sélectionnée. Les épingles de runtime de session héritées ne décident plus du routage.

## Connexes

- [Codex harness](/fr/plugins/codex-harness)
- [Codex harness runtime](/fr/plugins/codex-harness-runtime)
- [OpenAI](/fr/providers/openai)
- [Agent harness plugins](/fr/plugins/sdk-agent-harness)
- [Agent loop](/fr/concepts/agent-loop)
- [Models](/fr/concepts/models)
- [Status](/fr/cli/status)
