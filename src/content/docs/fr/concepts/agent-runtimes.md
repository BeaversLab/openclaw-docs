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

Vous verrez aussi le mot **harness** dans le code. Un harness est l'implémentation
qui fournit un agent runtime. Par exemple, le harness Codex inclus
implémente le runtime `codex`. La configuration publique utilise `agentRuntime.id` ; `openclaw
doctor --fix` réécrit les clés de stratégie d'exécution plus anciennes vers ce format.

Il existe deux familles de runtimes :

- Les **harness embarqués** s'exécutent dans la boucle d'agent préparée de OpenClaw. Aujourd'hui, cela
  inclut le runtime intégré `pi` ainsi que les harness de plugins enregistrés tels que
  `codex`.
- Les **backends CLI** exécutent un processus CLI local tout en gardant la référence du modèle
  canonique. Par exemple, `anthropic/claude-opus-4-7` avec
  `agentRuntime.id: "claude-cli"` signifie « sélectionner le modèle Anthropic, exécuter
  via Claude CLI ». `claude-cli` n'est pas un identifiant de harness embarqué et ne doit pas
  être passé à la sélection AgentHarness.

## Trois choses nommées Codex

La plupart de la confusion provient de trois surfaces différentes partageant le nom Codex :

| Surface                                                                     | Nom/config OpenClaw                   | Ce qu'il fait                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Route du provider Codex OAuth                                               | Références de modèle `openai-codex/*` | Utilise l'abonnement ChatGPT/Codex OAuth via le runner PI OpenClaw standard.                                             |
| Runtime d'app-server Codex natif                                            | `agentRuntime.id: "codex"`            | Exécute le tour d'agent intégré via le harnais d'app-server Codex groupé.                                                |
| Adaptateur Codex ACP                                                        | `runtime: "acp"`, `agentId: "codex"`  | Exécute Codex via le plan de contrôle externe ACP/acpx. À utiliser uniquement lorsqu'ACP/acpx est explicitement demandé. |
| Ensemble de commandes de contrôle de chat Codex natif                       | `/codex ...`                          | Lie, reprend, dirige, arrête et inspecte les threads de l'app-server Codex depuis le chat.                               |
| Route de la OpenAI de la plateforme API pour les modèles de style GPT/Codex | références de `openai/*` model        | Utilise l'auth par clé d'OpenAI API sauf si une substitution de runtime, telle que `runtime: "codex"`, exécute le tour.  |

Ces surfaces sont intentionnellement indépendantes. L'activation du plugin `codex` rend les fonctionnalités de l'app-server natif disponibles ; elle ne réécrit pas `openai-codex/*` en `openai/*`, ne modifie pas les sessions existantes et ne fait pas d'ACP la valeur par défaut de Codex. Sélectionner `openai-codex/*` signifie « utiliser la route du fournisseur OAuth Codex » sauf si vous forcez séparément un runtime.

La configuration Codex courante utilise le fournisseur `openai` avec le runtime `codex` :

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

Cela signifie que OpenClaw sélectionne une référence de modèle OpenAI, puis demande au runtime d'app-server Codex d'exécuter le tour d'agent intégré. Cela ne signifie pas que le channel, le catalogue de fournisseurs de modèles ou le magasin de sessions OpenClaw devient Codex.

Lorsque le plugin groupé `codex` est activé, le contrôle Codex en langage naturel doit utiliser la surface de commande native `/codex` (`/codex bind`, `/codex threads`, `/codex resume`, `/codex steer`, `/codex stop`) au lieu d'ACP. Utilisez ACP pour Codex uniquement lorsque l'utilisateur demande explicitement ACP/acpx ou teste le chemin de l'adaptateur ACP. Claude Code, Gemini CLI, OpenCode, Cursor et les harnais externes similaires utilisent toujours ACP.

Ceci est l'arbre de décision orienté agent :

1. Si l'utilisateur demande **Codex bind/control/thread/resume/steer/stop**, utilisez la
   surface de commande native `/codex` lorsque le plugin `codex` groupé est activé.
2. Si l'utilisateur demande **Codex en tant que runtime intégré**, utilisez
   `openai/<model>` avec `agentRuntime.id: "codex"`.
3. Si l'utilisateur demande **Codex OAuth/auth d'abonnement sur le runner normal OpenClaw**,
   utilisez `openai-codex/<model>` et laissez le runtime tel que PI.
4. Si l'utilisateur dit explicitement **ACP**, **acpx**, ou **adaptateur Codex ACP**, utilisez
   ACP avec `runtime: "acp"` et `agentId: "codex"`.
5. Si la demande concerne **Claude Code, Gemini CLI, OpenCode, Cursor, Droid, ou
   un autre harnais externe**, utilisez ACP/acpx, et non le runtime de sous-agent natif.

| Vous voulez dire...                                    | Utiliser...                                  |
| ------------------------------------------------------ | -------------------------------------------- |
| Contrôle de chat/thread du serveur d'application Codex | `/codex ...` depuis le plugin `codex` groupé |
| Runtime d'agent intégré du serveur d'application Codex | `agentRuntime.id: "codex"`                   |
| OpenAI Codex OAuth sur le runner PI                    | Références de modèle `openai-codex/*`        |
| Claude Code ou un autre harnais externe                | ACP/acpx                                     |

Pour le fractionnement du préfixe de la famille OpenAI, voir [OpenAI](/fr/providers/openai) et
[Fournisseurs de modèles](/fr/concepts/model-providers). Pour le contrat de support du runtime Codex,
voir [Harnais Codex](/fr/plugins/codex-harness#v1-support-contract).

## Propriété du runtime

Différents runtimes possèdent différentes parties de la boucle.

| Surface                              | Intégré PI OpenClaw                        | Serveur d'application Codex                                                  |
| ------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------- |
| Propriétaire de la boucle de modèle  | OpenClaw via le runner intégré PI          | Serveur d'application Codex                                                  |
| État canonique du fil                | Transcription OpenClaw                     | Fil Codex, plus miroir de transcription OpenClaw                             |
| Outils dynamiques OpenClaw           | Boucle d'outil native OpenClaw             | Ponté via l'adaptateur Codex                                                 |
| Outils natifs de shell et de fichier | Chemin PI/OpenClaw                         | Outils natifs Codex, pontés via des crochets natifs si pris en charge        |
| Moteur de contexte                   | Assemblage de contexte natif OpenClaw      | Projets OpenClaw assemblant le contexte dans le tour Codex                   |
| Compactage                           | OpenClaw ou moteur de contexte sélectionné | Compactage natif Codex, avec notifications OpenClaw et maintenance du miroir |
| Livraison sur le canal               | OpenClaw                                   | OpenClaw                                                                     |

Cette séparation de propriété est la règle de conception principale :

- Si OpenClaw possède la surface, OpenClaw peut fournir un comportement normal de crochet de plugin.
- Si le runtime natif possède la surface, OpenClaw a besoin d'événements de runtime ou de crochets natifs.
- Si le runtime natif possède l'état canonique du fil de discussion, OpenClaw devrait refléter et projeter le contexte, et non réécrire les éléments internes non pris en charge.

## Sélection du runtime

OpenClaw choisit un runtime intégré après la résolution du fournisseur et du modèle :

1. Le runtime enregistré d'une session l'emporte. Les modifications de configuration ne basculent pas à chaud une
   transcription existante vers un système de fil natif différent.
2. `OPENCLAW_AGENT_RUNTIME=<id>` force ce runtime pour les nouvelles sessions ou réinitialisées.
3. `agents.defaults.agentRuntime.id` ou `agents.list[].agentRuntime.id` peuvent définir
   `auto`, `pi`, un id de harnais intégré enregistré tel que `codex`, ou un
   alias de backend CLI pris en charge tel que `claude-cli`.
4. En mode `auto`, les runtimes de plugin enregistrés peuvent revendiquer des paires fournisseur/modèle prises en charge.
5. Si aucun runtime ne revendique un tour en mode `auto` et que `fallback: "pi"` est défini
   (par défaut), OpenClaw utilise PI comme solution de repli de compatibilité. Définissez
   `fallback: "none"` pour que la sélection en mode `auto` sans correspondance échoue à la place.

Les runtimes de plugin explicites échouent en mode fermé par défaut. Par exemple,
`runtime: "codex"` signifie Codex ou une erreur de sélection claire, sauf si vous définissez
`fallback: "pi"` dans la même portée de substitution. Une substitution de runtime n'hérite pas
d'un paramètre de repli plus large, donc un `runtime: "codex"` au niveau de l'agent n'est pas acheminé
silencieusement vers PI simplement parce que les valeurs par défaut utilisaient `fallback: "pi"`.

Les alias de backend CLI sont différents des identifiants de harnais intégrés. La forme préférée
pour le CLI Claude est :

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      agentRuntime: { id: "claude-cli" },
    },
  },
}
```

Les références héritées telles que `claude-cli/claude-opus-4-7` restent prises en charge pour
la compatibilité, mais la nouvelle configuration devrait garder le fournisseur/modèle canonique et placer
le backend d'exécution dans `agentRuntime.id`.

Le mode `auto` est intentionnellement conservateur. Les runtimes de plugin peuvent revendiquer les paires fournisseur/modèle qu'ils comprennent, mais le plugin Codex ne revendique pas le fournisseur `openai-codex` en mode `auto`. Cela maintient `openai-codex/*` comme la route OAuth explicite pour Codex PI et évite de déplacer silencieusement les configurations d'authentification par abonnement sur le harnais natif du serveur d'application.

Si `openclaw doctor` avertit que le plugin `codex` est activé alors que `openai-codex/*` route toujours via PI, considérez cela comme un diagnostic, et non comme une migration. Gardez la configuration inchangée lorsque l'authentification OAuth Codex PI est ce que vous voulez. Passez à `openai/<model>` plus `agentRuntime.id: "codex"` uniquement lorsque vous souhaitez l'exécution native du serveur d'application Codex.

## Contrat de compatibilité

Lorsqu'un runtime n'est pas PI, il doit documenter les surfaces OpenClaw qu'il prend en charge.
Utilisez cette structure pour la documentation des runtimes :

| Question                                                    | Pourquoi c'est important                                                                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Qui possède la boucle de modèle ?                           | Détermine où ont lieu les nouvelles tentatives, la continuation des outils et les décisions de réponse finale.                   |
| Qui possède l'historique canonique des fils de discussion ? | Détermine si OpenClaw peut modifier l'historique ou seulement le refléter.                                                       |
| Les outils dynamiques OpenClaw fonctionnent-ils ?           | La messagerie, les sessions, le cron et les outils détenus par OpenClaw reposent sur cela.                                       |
| Les crochets d'outils dynamiques fonctionnent-ils ?         | Les plugins s'attendent à `before_tool_call`, `after_tool_call` et un intergiciel autour des outils détenus par OpenClaw.        |
| Les crochets d'outils natifs fonctionnent-ils ?             | Shell, patch et les outils détenus par le runtime ont besoin d'un support de crochet natif pour les stratégies et l'observation. |
| Le cycle de vie du moteur de contexte s'exécute-t-il ?      | Les plugins de mémoire et de contexte dépendent des cycles de vie d'assemblage, d'ingestion, après-tour et de compactage.        |
| Quelles données de compactage sont exposées ?               | Certains plugins ont uniquement besoin de notifications, tandis que d'autres ont besoin des métadonnées conservées/supprimées.   |
| Qu'est-ce qui est intentionnellement non pris en charge ?   | Les utilisateurs ne doivent pas supposer une équivalence PI lorsque le runtime natif possède plus d'état.                        |

Le contrat de support du runtime Codex est documenté dans
[Codex harness](/fr/plugins/codex-harness#v1-support-contract).

## Libellés de statut

La sortie de statut peut afficher à la fois les libellés `Execution` et `Runtime`. Lisez-les comme
des diagnostics, et non comme des noms de fournisseurs.

- Une référence de modèle telle que `openai/gpt-5.5` vous indique le provider/model sélectionné.
- Un identifiant de runtime tel que `codex` vous indique quelle boucle exécute le tour.
- Un label de channel tel que Telegram ou Discord vous indique où la conversation a lieu.

Si une session affiche toujours PI après avoir modifié la configuration du runtime, démarrez une nouvelle session avec `/new` ou effacez l'actuelle avec `/reset`. Les sessions existantes conservent leur runtime enregistré pour qu'une transcription ne soit pas rejouée à travers deux systèmes de session natifs incompatibles.

## Connexes

- [Codex harness](/fr/plugins/codex-harness)
- [OpenAI](/fr/providers/openai)
- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Boucle d'agent](/fr/concepts/agent-loop)
- [Modèles](/fr/concepts/models)
- [Statut](/fr/cli/status)
