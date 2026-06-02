---
summary: "Comment OpenClaw sépare les providers de modèles, les modèles, les canaux et les runtimes d'agent"
title: "Runtimes d'agent"
read_when:
  - You are choosing between OpenClaw, Codex, ACP, or another native agent runtime
  - You are confused by provider/model/runtime labels in status or config
  - You are documenting support parity for a native harness
---

Un **agent runtime** est le composant qui possède une boucle de modèle préparée : il
reçoit le prompt, pilote la sortie du modèle, gère les appels d'outils natifs et renvoie
le tour fini à OpenClaw.

Les runtimes sont faciles à confondre avec les providers car ils apparaissent tous deux près de la
configuration du modèle. Ce sont des couches différentes :

| Couche        | Exemples                                     | Signification                                                                           |
| ------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| Provider      | `openai`, `anthropic`, `github-copilot`      | Comment OpenClaw s'authentifie, découvre les modèles et nomme les références de modèle. |
| Modèle        | `gpt-5.5`, `claude-opus-4-6`                 | Le modèle sélectionné pour le tour de l'agent.                                          |
| Agent runtime | `openclaw`, `codex`, `copilot`, `claude-cli` | La bouche de bas niveau ou le backend qui exécute le tour préparé.                      |
| Canal         | Telegram, Discord, Slack, WhatsApp           | Où les messages entrent et sortent de OpenClaw.                                         |

Vous verrez également le mot **harness** dans le code. Un harness est l'implentation
qui fournit un runtime d'agent. Par exemple, le harness Codex inclus
implémente le runtime `codex`. La configuration publique utilise `agentRuntime.id` sur
les entrées de provider ou de modèle ; les clés de runtime pour l'agent entier sont obsolètes et ignorées.
`openclaw doctor --fix` supprime les anciens épinglages de runtime pour l'agent entier et réécrit
les références de modèle de runtime obsolètes vers des références canoniques de provider/modèle ainsi qu'une politique de runtime
scopée au modèle où cela est nécessaire.

Il existe deux familles de runtimes :

- **Les harness intégrés** s'exécutent dans la boucle d'agent préparée de OpenClaw. Aujourd'hui, il
  s'agit du runtime `openclaw` intégré plus les harness de plugin enregistrés tels que
  `codex` et `copilot`.
- **Les backends CLI** exécutent un processus CLI local tout en conservant la référence du modèle
  canonique. Par exemple, `anthropic/claude-opus-4-8` avec
  un `agentRuntime.id: "claude-cli"` scopé au modèle signifie « sélectionner le modèle Anthropic,
  exécuter via le CLI Claude ». `claude-cli` n'est pas un identifiant de harness intégré
  et ne doit pas être passé à la sélection AgentHarness.

Le harnais `copilot` est un harnais de plugin externe distinct et optionnel pour le GitHub Copilot CLI ; voir [GitHub Copilot agent runtime](/fr/plugins/copilot) pour la décision orientée utilisateur entre PI, Codex et le runtime d'agent GitHub Copilot.

## Surfaces Codex

La plupart de la confusion provient du fait que plusieurs surfaces différentes partagent le nom Codex :

| Surface                                                             | Nom/configuration OpenClaw           | Ce qu'il fait                                                                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime natif du serveur d'application Codex                        | Références de `openai/*` model       | Exécute les tours d'agent intégrés OpenAI via le serveur d'application Codex. Il s'agit de la configuration d'abonnement ChatGPT/Codex habituelle. |
| Profils d'authentification Codex OAuth                              | Profils OAuth `openai`               | Stocke l'authentification d'abonnement ChatGPT/Codex consommée par le harnais du serveur d'application Codex.                                      |
| Adaptateur Codex ACP                                                | `runtime: "acp"`, `agentId: "codex"` | Exécute Codex via le plan de contrôle externe ACP/acpx. À utiliser uniquement lorsque ACP/acpx est explicitement demandé.                          |
| Ensemble de commandes natif de contrôle de chat Codex               | `/codex ...`                         | Lie, reprend, dirige, arrête et inspecte les fils de discussion du serveur d'application Codex à partir du chat.                                   |
| Route de la OpenAI de la plateforme API pour les surfaces non-agent | `openai/*` plus auth par clé API     | Utilisé pour les API directes OpenAI telles que les images, les embeddings, la voix et la temps réel.                                              |

Ces surfaces sont intentionnellement indépendantes. L'activation du plugin `codex` rend les fonctionnalités natives de l'application serveur disponibles ; `openclaw doctor --fix` gère la réparation de l'héritage de route Codex et le nettoyage des épingles de session périmées. Sélectionner `openai/*` pour un modèle d'agent signifie désormais « exécuter ceci via Codex », sauf si une surface OpenAI API non-agent est utilisée.

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

Cela signifie que OpenClaw sélectionne une référence de modèle OpenAI, puis demande au runtime du serveur d'application Codex d'exécuter le tour d'agent intégré. Cela ne signifie pas « utiliser la facturation API », et cela ne signifie pas que le canal, le catalogue de fournisseurs de modèles ou le magasin de sessions OpenClaw deviennent Codex.

Lorsque le plugin groupé `codex` est activé, le contrôle Codex en langage naturel doit utiliser la surface de commande native `/codex` (`/codex bind`, `/codex threads`, `/codex resume`, `/codex steer`, `/codex stop`) au lieu d'ACP. Utilisez ACP pour Codex uniquement lorsque l'utilisateur demande explicitement ACP/acpx ou teste le chemin de l'adaptateur ACP. Claude Code, Gemini CLI, OpenCode, Cursor et les harnais externes similaires utilisent toujours ACP.

Voici l'arbre de décision orienté agent :

1. Si l'utilisateur demande **Codex bind/control/thread/resume/steer/stop**, utilisez la surface de commande native `/codex` lorsque le plugin groupé `codex` est activé.
2. Si l'utilisateur demande **Codex en tant que runtime intégré** ou souhaite l'expérience normale d'agent Codex pris en charge par abonnement, utilisez `openai/<model>`.
3. Si l'utilisateur choisit explicitement OpenClaw pour un OpenAI de modèle, conservez la référence du modèle en tant que `openai/<model>` et définissez la stratégie d'exécution du fournisseur/modèle sur `agentRuntime.id: "openclaw"`. Un profil OAuth `openai` sélectionné est acheminé en interne via le transport d'authentification Codex de OpenClaw.
4. Si la configuration héritée contient encore des références de modèles Codex héritées, réparez-les en `openai/<model>` avec `openclaw doctor --fix` ; le médecin conserve l'itinéraire d'authentification Codex en ajoutant `agentRuntime.id: "codex"` étendu au fournisseur/modèle là où l'ancienne référence de modèle l'impliquait.
   Les références de modèles héritées `codex-cli/*` sont réparées vers le même itinéraire de serveur d'application Codex `openai/<model>` ; OpenClawCLI ne conserve plus un backend CLI Codex groupé.
5. Si l'utilisateur mentionne explicitement **ACP**, **acpx**, ou **adaptateur ACP Codex**, utilisez ACP avec `runtime: "acp"` et `agentId: "codex"`.
6. Si la demande concerne **Claude Code, Gemini CLI, OpenCode, Cursor, Droid ou un autre harnais externe**, utilisez ACP/acpx, et non le runtime de sous-agent natif.

| Vous voulez dire...                                        | Utilisez...                                  |
| ---------------------------------------------------------- | -------------------------------------------- |
| Contrôle de chat/discussion du serveur d'application Codex | `/codex ...` depuis le plugin `codex` groupé |
| Runtime d'agent intégré au serveur d'application Codex     | Références de modèles d'agent `openai/*`     |
| OpenAI Codex OAuth                                         | Profils OAuth `openai`                       |
| Claude Code ou autre harnais externe                       | ACP/acpx                                     |

Pour la répartition des préfixes de la famille OpenAI, consultez [OpenAI](/fr/providers/openai) et
[Fournisseurs de modèles](/fr/concepts/model-providers). Pour le contrat de support du runtime Codex, consultez [Runtime harnais Codex](/fr/plugins/codex-harness-runtime#v1-support-contract).

## Propriétaire du runtime

Différents runtimes possèdent différentes parties de la boucle.

| Surface                              | OpenClaw intégré                           | Serveur d'application Codex                                                   |
| ------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------- |
| Propriétaire de la boucle de modèle  | OpenClaw via le runner intégré OpenClaw    | Serveur d'application Codex                                                   |
| État canonique du fil de discussion  | Transcript OpenClaw                        | Fil de discussion Codex, plus miroir de transcript OpenClaw                   |
| Outils dynamiques OpenClaw           | Boucle d'outils native OpenClaw            | Ponté via l'adaptateur Codex                                                  |
| Outils natifs de shell et de fichier | Chemin OpenClaw                            | Outils natifs Codex, pontés via des hooks natifs lorsque pris en charge       |
| Moteur de contexte                   | Assemblage de contexte natif OpenClaw      | Les projets OpenClaw assemblent le contexte dans le tour Codex                |
| Compaction                           | OpenClaw ou moteur de contexte sélectionné | Compaction native Codex, avec notifications OpenClaw et maintenance du miroir |
| Livraison sur le canal               | OpenClaw                                   | OpenClaw                                                                      |

Cette séparation de propriété est la règle de conception principale :

- Si OpenClaw possède la surface, OpenClaw peut fournir un comportement normal de hook de plugin.
- Si le runtime natif possède la surface, OpenClaw a besoin d'événements de runtime ou de hooks natifs.
- Si le runtime natif possède l'état canonique du fil de discussion, OpenClaw doit refléter et projeter le contexte, et non réécrire les éléments internes non pris en charge.

## Sélection du runtime

OpenClaw choisit un runtime intégré après la résolution du provider et du modèle :

1. La stratégie d'exécution étendue au modèle l'emporte. Elle peut résider dans une entrée de modèle de fournisseur configurée ou dans `agents.defaults.models["provider/model"].agentRuntime` /
   `agents.list[].models["provider/model"].agentRuntime`. Un caractère générique de fournisseur
   tel que `agents.defaults.models["vllm/*"].agentRuntime` s'applique après la stratégie de
   modèle exacte, afin que les modèles de fournisseurs découverts dynamiquement puissent partager un
   runtime sans remplacer les exceptions exactes par modèle.
2. La stratégie d'exécution étendue au fournisseur vient ensuite à
   `models.providers.<provider>.agentRuntime`.
3. En mode `auto`, les runtimes de plugins enregistrés peuvent revendiquer les paires fournisseur/modèle prises en charge.
4. Si aucun runtime ne réclame un tour en mode `auto`, OpenClaw utilise `openclaw` comme
   runtime de compatibilité. Utilisez un id de runtime explicite lorsque l'exécution doit être
   stricte.

Les épingles de runtime pour toute la session et tout l'agent sont ignorées. Cela inclut
`OPENCLAW_AGENT_RUNTIME`, l'état de session `agentHarnessId`/`agentRuntimeOverride`,
`agents.defaults.agentRuntime` et `agents.list[].agentRuntime`. Exécutez
`openclaw doctor --fix` pour supprimer la configuration obsolète du runtime de l'agent complet et convertir
les références de modèle de runtime héritées là où OpenClaw peut préserver l'intention.

Les runtimes de plugin provider/model explicites échouent de manière fermée. Par exemple,
`agentRuntime.id: "codex"` sur un provider ou un modèle signifie Codex ou une erreur
claire de sélection/runtime ; il n'est jamais redirigé silencieusement vers OpenClaw.

Les alias de backend CLI sont différents des ids de harnais intégrés. La forme
CLI Claude préférée est :

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-8",
      models: {
        "anthropic/claude-opus-4-8": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

Les références héritées telles que `claude-cli/claude-opus-4-7` restent prises en charge pour
la compatibilité, mais la nouvelle configuration doit conserver le provider/model canonique et placer
le backend d'exécution dans la stratégie de runtime provider/model.

Les références héritées `codex-cli/*` sont différentes : le médecin les migre vers `openai/*` afin
qu'elles s'exécutent via le harnais app-server Codex au lieu de préserver un backend Codex CLI.

Le mode `auto` est intentionnellement conservateur pour la plupart des providers. Les modèles d'agent OpenAI
font l'exception : le runtime non défini et `auto` résolvent tous les deux vers le harnais
Codex. La configuration explicite du runtime OpenClaw reste une voie de compatibilité opt-in pour
les tours d'agent `openai/*` ; lorsqu'elle est associée à un profil OAuth `openai` sélectionné,
OpenClaw achemine ce chemin en interne via le transport Codex-auth tout en
conservant la référence publique du modèle sous la forme `openai/*`. Les épingles de session de runtime OpenAI obsolètes sont
ignorées par la sélection du runtime et peuvent être nettoyées avec `openclaw doctor --fix`.

Si `openclaw doctor` avertit que le plugin `codex` est activé alors que des références de modèle Codex héritées sont présentes dans la configuration, considérez cela comme un état d'itinéraire hérité. Exécutez `openclaw doctor --fix` pour le réécrire en `openai/*` avec le runtime Codex.

## Runtime d'agent GitHub Copilot

Le plugin externe `@openclaw/copilot` enregistre un runtime `copilot` optionnel soutenu par le GitHub Copilot CLI (`@github/copilot-sdk`). Il réclame le fournisseur d'abonnement canonique `github-copilot` et n'est **jamais** sélectionné par `auto`. Activez-le par modèle ou par fournisseur via `agentRuntime.id` :

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/gpt-5.5",
      models: {
        "github-copilot/gpt-5.5": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

Le harnais réclame son fournisseur, son runtime, sa clé de session CLI et son préfixe de profil d'authentification dans `extensions/copilot/doctor-contract-api.ts`, que `openclaw doctor` charge automatiquement. Pour la configuration, l'authentification, la mise en miroir des transcriptions, la compactage, la surface de sonde du médecin et la décision plus large entre le SDK PI, Codex et Copilot, consultez [GitHub Copilot agent runtime](/fr/plugins/copilot).

## Contrat de compatibilité

Lorsqu'un runtime n'est pas OpenClaw, il doit documenter les surfaces OpenClaw qu'il prend en charge.
Utilisez cette forme pour la documentation du runtime :

| Question                                                    | Pourquoi c'est important                                                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Qui possède la boucle du modèle ?                           | Détermine où ont lieu les nouvelles tentatives, la continuation des outils et les décisions de réponse finale.                    |
| Qui possède l'historique canonique des fils de discussion ? | Détermine si OpenClaw peut modifier l'historique ou uniquement le refléter.                                                       |
| Les outils dynamiques OpenClaw fonctionnent-ils ?           | La messagerie, les sessions, le cron et les outils détenus par OpenClaw reposent sur cela.                                        |
| Les hooks d'outils dynamiques fonctionnent-ils ?            | Les plugins s'attendent à `before_tool_call`, `after_tool_call` et à un intergiciel autour des outils appartenant à OpenClaw.     |
| Les hooks d'outils natifs fonctionnent-ils ?                | Les outils Shell, patch et ceux détenus par le runtime ont besoin du support des hooks natifs pour la stratégie et l'observation. |
| Le cycle de vie du moteur de contexte s'exécute-t-il ?      | Les plugins de mémoire et de contexte dépendent des cycles de vie d'assemblage, d'ingestion, après-tour et de compactage.         |
| Quelles données de compactage sont exposées ?               | Certains plugins ont uniquement besoin de notifications, tandis que d'autres ont besoin des métadonnées conservées/supprimées.    |
| Qu'est-ce qui est intentionnellement non pris en charge ?   | Les utilisateurs ne doivent pas supposer une équivalence avec OpenClaw là où le runtime natif possède plus d'état.                |

Le contrat de support du runtime Codex est documenté dans
[Codex harness runtime](/fr/plugins/codex-harness-runtime#v1-support-contract).

## Labels de statut

La sortie d'état peut afficher à la fois les étiquettes `Execution` et `Runtime`. Lisez-les comme des diagnostics, et non comme des noms de fournisseurs.

- Une référence de modèle telle que `openai/gpt-5.5` vous indique le fournisseur/modèle sélectionné.
- Un identifiant de runtime tel que `codex` vous indique quelle bouche exécute le tour.
- Un label de canal tel que Telegram ou Discord vous indique où la conversation a lieu.

Si une exécution affiche toujours un runtime inattendu, inspectez d'abord la stratégie de runtime du fournisseur/modèle
sélectionné. Les épingles de runtime de session héritées ne décident plus du routage.

## Connexes

- [Codex harness](/fr/plugins/codex-harness)
- [Codex harness runtime](/fr/plugins/codex-harness-runtime)
- [GitHub Copilot agent runtime](/fr/plugins/copilot)
- [OpenAI](/fr/providers/openai)
- [Agent harness plugins](/fr/plugins/sdk-agent-harness)
- [Agent loop](/fr/concepts/agent-loop)
- [Models](/fr/concepts/models)
- [Statut](/fr/cli/status)
