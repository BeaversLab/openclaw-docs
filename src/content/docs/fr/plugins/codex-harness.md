---
summary: "OpenClawExécuter les tours d'agent intégré OpenClaw via le harnais d'application serveur Codex inclus"
title: "Harnais Codex"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to OpenClaw
---

Le plugin intégré `codex`OpenClaw permet à OpenClaw d'exécuter des tours d'agent OpenAI intégrés
via Codex app-server au lieu du harnais intégré OpenClaw.

Utilisez le harnais Codex lorsque vous souhaitez que Codex possède la session d'agent de bas niveau :
reprise de thread native, continuation d'outil native, compactage natif et
exécution app-server. OpenClaw possède toujours les canaux de discussion, les fichiers de session, la sélection de modèle,
les outils dynamiques OpenClaw, les approbations, la livraison des médias et le miroir
de transcription visible.

La configuration normale utilise des références de modèle OpenAI canoniques telles que `openai/gpt-5.5`.
Ne configurez pas les références GPT Codex héritées. Placez l'ordre d'authentification de l'agent OpenAI
sous `auth.order.openai` ; les anciens ID de profil d'authentification Codex hérités
et les entrées d'ordre d'authentification Codex héritées sont des états hérités réparés par
`openclaw doctor --fix`.

Lorsqu'aucun bac à sable OpenClaw n'est actif, OpenClaw démarre les threads du serveur d'application Codex
avec le mode de code natif Codex activé tout en laissant le mode code uniquement désactivé par défaut.
Cela permet de garder l'espace de travail natif et les capacités de code de Codex disponibles tandis que
les outils dynamiques OpenClaw continuent à travers le pont `item/tool/call` du serveur d'application.
Le bac à sable actif OpenClaw et les stratégies d'outils restreints désactivent entièrement le mode de code natif
sauf si vous optez pour le chemin expérimental du serveur d'exécution du bac à sable.

Cette fonctionnalité native Codex est distincte de
[le mode de code OpenClaw](/fr/reference/code-mode), qui est un runtime QuickJS-WASI
optionnel pour les exécutions génériques OpenClaw avec une forme d'entrée `exec` différente.

Pour la division plus large modèle/fournisseur/runtime, commencez par
[Runtimes d'agent](/fr/concepts/agent-runtimes). La version courte est :
`openai/gpt-5.5` est la référence du modèle, `codex` est le runtime, et Telegram,
Discord, Slack, ou un autre canal reste la surface de communication.

## Prérequis

- OpenClaw avec le plugin `codex` inclus disponible.
- Si votre configuration utilise `plugins.allow`, incluez `codex`.
- Serveur d'application Codex `0.125.0` ou plus récent. Le plugin inclus gère un binaire
  compatible du serveur d'application Codex par défaut, donc les commandes locales `codex` sur `PATH` n'affectent
  pas le démarrage normal du harnais.
- Authentification Codex disponible via `openclaw models auth login --provider openai`,
  un compte de serveur d'application dans le domicile Codex de l'agent, ou un profil d'authentification
  explicite par clé API Codex.

Pour la priorité de l'authentification, l'isolement de l'environnement, les commandes personnalisées de l'application serveur, la découverte de modèles et tous les champs de configuration, consultez la [référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Démarrage rapide

La plupart des utilisateurs qui souhaitent Codex dans OpenClaw souhaitent cette voie : se connecter avec un abonnement ChatGPT/Codex, activer le plugin intégré OpenClaw`codex` et utiliser une référence de modèle canonique `openai/gpt-*`.

Connectez-vous avec Codex OAuth :

```bash
openclaw models auth login --provider openai
```

Activez le plugin intégré `codex`OpenAI et sélectionnez un modèle agent OpenAI :

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
      model: "openai/gpt-5.5",
    },
  },
}
```

Si votre configuration utilise `plugins.allow`, ajoutez `codex` également à cet endroit :

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

Redémarrez la passerelle après avoir modifié la configuration du plugin. Si une discussion existante possède déjà une session, utilisez `/new` ou `/reset` avant de tester les modifications d'exécution afin que le prochain tour résolve le harnais à partir de la configuration actuelle.

## Configuration

La configuration de démarrage rapide est la configuration minimale viable du harnais Codex. Définissez les options
du harnais Codex dans la configuration OpenClaw, et utilisez la CLI uniquement pour l'authentification Codex :

| Besoin                                                      | Définir                                                                                                | Où                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Activer le harnais                                          | `plugins.entries.codex.enabled: true`                                                                  | Configuration OpenClaw                                 |
| Conserver une installation de plugin autorisée              | Incluez `codex` dans `plugins.allow`                                                                   | Configuration OpenClaw                                 |
| Acheminer les tours d'agent OpenAI via Codex                | `agents.defaults.model` ou `agents.list[].model` comme `openai/gpt-*`                                  | Configuration d'agent OpenClaw                         |
| Connectez-vous avec OAuth ChatGPT/Codex                     | `openclaw models auth login --provider openai`                                                         | Profil d'authentification CLI                          |
| Ajouter une sauvegarde de clé API pour les exécutions Codex | Profil de clé API `openai:*`API listé après l'authentification par abonnement dans `auth.order.openai` | Profil d'authentification CLI + configuration OpenClaw |
| Échec fermé lorsque Codex n'est pas disponible              | Fournisseur ou modèle `agentRuntime.id: "codex"`                                                       | Configuration modèle/provider OpenClaw                 |
| Utiliser le trafic direct de l'OpenAI API                   | Fournisseur ou modèle `agentRuntime.id: "openclaw"`OpenAI avec authentification OpenAI normale         | Configuration modèle/fournisseur OpenClaw              |
| Régler le comportement du serveur d'application             | `plugins.entries.codex.config.appServer.*`                                                             | Configuration du plugin Codex                          |
| Activer les applications natives du plugin Codex            | `plugins.entries.codex.config.codexPlugins.*`                                                          | Configuration du plugin Codex                          |
| Activer l'usage ordinateur de Codex                         | `plugins.entries.codex.config.computerUse.*`                                                           | Configuration du plugin Codex                          |

Utilisez des références de modèle `openai/gpt-*`OpenAI pour les tours d'agent OpenAI pris en charge par Codex. Privilégiez `auth.order.openai`API pour l'ordre abonnement en priorité / clé API en secours. Les identifiants de profil d'authentification Codex existants et l'ordre d'authentification Codex existants sont un état ancien réservé aux médecins ; n'écrivez pas de nouvelles références GPT Codex héritées.

Ne définissez pas `compaction.model` ou `compaction.provider`OpenClaw sur les agents pris en charge par Codex.
Codex effectue la compactage via son état de thread natif du serveur d'application, donc OpenClaw ignore
ces substitutions de résumé local lors de l'exécution et `openclaw doctor --fix` les supprime
lorsque l'agent utilise Codex.

Lossless reste pris en charge en tant que moteur de contexte pour l'assemblage, l'ingestion et
la maintenance autour des tours Codex. Configurez-le via
`plugins.slots.contextEngine: "lossless-claw"` et
`plugins.entries.lossless-claw.config.summaryModel`, et non via
`agents.defaults.compaction.provider`. `openclaw doctor --fix` migre l'ancienne structure
`compaction.provider: "lossless-claw"` vers l'emplacement du moteur de contexte Lossless
lorsque Codex est le runtime actif, mais le Codex natif possède toujours la compactage.

Le harnais natif du serveur d'application Codex prend en charge les moteurs de contexte qui nécessitent
un assemblage de pré-invite (pre-prompt). Les backends CLI génériques, y compris CLI`codex-cli`, ne fournissent pas
cette capacité hôte.

Pour les agents pris en charge par Codex, `/compact`OpenClawOpenClawOpenAI lance la compactage native du serveur d'application Codex sur
le thread lié. OpenClaw n'attend pas la fin, n'impose pas de délai d'attente OpenClaw,
ne redémarre pas le serveur d'application partagé, et ne revient pas à un moteur de contexte ou
à un résumé OpenAI public. Si la liaison de thread Codex native est manquante ou
obsolète, la commande échoue fermement (fail closed) afin que l'opérateur voie la véritable limite d'exécution
au lieu de changer silencieusement de backend de compactage.

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

Dans cette structure, les deux profils s'exécutent toujours via Codex pour les tours d'agent
`openai/gpt-*`APIOpenClawOpenAI. La clé API n'est qu'un repli d'authentification, et non une demande de basculer vers OpenClaw ou
les réponses OpenAI simples.

Le reste de cette page couvre les variantes courantes entre lesquelles les utilisateurs doivent choisir :
la structure de déploiement, le routage fermé (fail-closed), la politique d'approbation du gardien, les plugins Codex
natifs et l'utilisation de l'ordinateur (Computer Use). Pour les listes complètes d'options, les valeurs par défaut, les énumérations, la découverte,
l'isolement de l'environnement, les délais d'attente et les champs de transport du serveur d'application, consultez
[Référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Vérifier l'exécution Codex

Utilisez `/status` dans le chat où vous vous attendez à Codex. Un tour d'agent OpenAI pris en charge par Codex s'affiche :

```text
Runtime: OpenAI Codex
```

Ensuite, vérifiez l'état de l'app-server Codex :

```text
/codex status
/codex models
```

`/codex status` signale la connectivité du serveur d'application, le compte, les limites de débit, les serveurs MCP et les compétences. `/codex models` répertorie le catalogue en direct du serveur d'application Codex pour le harnais et le compte. Si `/status` est surprenant, consultez la section [Dépannage](#troubleshooting).

## Routage et sélection du modèle

Gardez les références de provider et la politique d'exécution séparées :

- Utilisez `openai/gpt-*` pour les tours d'agent OpenAI via Codex.
- N'utilisez pas les anciennes références GPT Codex dans la configuration. Exécutez `openclaw doctor --fix` pour réparer les anciennes références et les épingles d'itinéraire de session obsolètes.
- `agentRuntime.id: "codex"` est facultatif pour le mode automatique OpenAI normal, mais utile lorsqu'un déploiement doit échouer en mode fermé si Codex n'est pas disponible.
- `agentRuntime.id: "openclaw"` opte pour un fournisseur ou un modèle dans le runtime intégré OpenClaw lorsque cela est intentionnel.
- `/codex ...` contrôle les conversations natives du serveur d'application Codex depuis le chat.
- ACP/acpx est un chemin de harness externe distinct. Ne l'utilisez que lorsque l'utilisateur demande ACP/acpx ou un adaptateur de harness externe.

Routage des commandes courant :

| Intention de l'utilisateur                                   | Utiliser                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Attacher le chat actuel                                      | `/codex bind [--cwd <path>]`                                                                          |
| Reprendre un fil Codex existant                              | `/codex resume <thread-id>`                                                                           |
| Lister ou filtrer les fils Codex                             | `/codex threads [filter]`                                                                             |
| Lister les plugins natifs Codex                              | `/codex plugins list`                                                                                 |
| Activer ou désactiver un plugin natif Codex configuré        | `/codex plugins enable <name>`, `/codex plugins disable <name>`                                       |
| Attacher une session CLI Codex existante sur un nœud apparié | `/codex sessions --host <node> [filter]`, puis `/codex resume <session-id> --host <node> --bind here` |
| Envoyer uniquement les commentaires Codex                    | `/codex diagnostics [note]`                                                                           |
| Démarrer une tâche ACP/acpx                                  | Commandes de session ACP/acpx, pas `/codex`                                                           |

| Cas d'usage                                          | Configurer                                                                             | Vérifier                                   | Notes                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| Abonnement ChatGPT/Codex avec le runtime natif Codex | `openai/gpt-*` plus le plugin `codex` activé                                           | `/status` affiche `Runtime: OpenAI Codex`  | Chemin recommandé                                        |
| Échec fermé si Codex n'est pas disponible            | Fournisseur ou modèle `agentRuntime.id: "codex"`                                       | Le tour échoue au lieu du fallback intégré | Utiliser pour les déploiements Codex uniquement          |
| Diriger le trafic avec clé OpenAI API via OpenClaw   | Fournisseur ou modèle `agentRuntime.id: "openclaw"` et authentification OpenAI normale | `/status` affiche le runtime OpenClaw      | Utiliser uniquement lorsque OpenClaw est intentionnel    |
| Configuration héritée                                | anciennes références GPT Codex                                                         | `openclaw doctor --fix` le réécrit         | N'écrivez pas de nouvelle configuration de cette manière |
| Adaptateur Codex ACP/acpx                            | ACP `sessions_spawn({ runtime: "acp" })`                                               | Statut de tâche/session ACP                | Séparé du harnais natif Codex                            |

`agents.defaults.imageModel` suit le même fractionnement de préfixe. Utilisez `openai/gpt-*`OpenAI
pour la route OpenAI normale et `codex/gpt-*` uniquement lorsque la compréhension d'images
doit passer par un tour d'app-server Codex délimité. N'utilisez pas
les anciennes références GPT Codex ; le médecin réécrit cet ancien préfixe en `openai/gpt-*`.

## Modèles de déploiement

### Déploiement Codex de base

Utilisez la configuration de démarrage rapide lorsque tous les tours d'agent OpenAI doivent utiliser Codex par
défaut.

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
      model: "openai/gpt-5.5",
    },
  },
}
```

### Déploiement mixte de providers

Cette forme garde Claude comme agent par défaut et ajoute un agent Codex nommé :

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
      model: "anthropic/claude-opus-4-6",
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
        model: "openai/gpt-5.5",
      },
    ],
  },
}
```

Avec cette configuration, l'agent `main` utilise son chemin provider normal et l'agent
`codex` utilise l'app-server Codex.

### Déploiement Codex à échec fermé

Pour les tours d'agent OpenAI, OpenAI`openai/gpt-*` résout déjà vers Codex lorsque le
plugin inclus est disponible. Ajoutez une stratégie d'exécution explicite lorsque vous souhaitez une
règle de fermeture en cas d'échec écrite :

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: {
          id: "codex",
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
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

Avec Codex forcé, OpenClaw échoue tôt si le plugin Codex est désactivé, si le serveur d'application est trop ancien, ou si le serveur d'application ne peut pas démarrer.

## Stratégie de serveur d'application

Par défaut, le plugin démarre localement le binaire Codex géré par OpenClaw avec un transport
stdio. Définissez OpenClaw`appServer.command` uniquement lorsque vous souhaitez intentionnellement exécuter un
exécutable différent. Utilisez le transport WebSocket uniquement lorsqu'un app-server est déjà
en cours d'exécution ailleurs :

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
            authToken: "${CODEX_APP_SERVER_TOKEN}",
          },
        },
      },
    },
  },
}
```

Les sessions app-server stdio locales correspondent par défaut à la posture de l'opérateur local de confiance :
`approvalPolicy: "never"`, `approvalsReviewer: "user"` et
`sandbox: "danger-full-access"`OpenClawOpenClawOpenClawOpenClaw. Si les exigences locales de Codex interdisent cette
posture YOLO implicite, OpenClaw sélectionne à la place les autorisations du guardian autorisées.
Lorsqu'un bac à sable OpenClaw est actif pour la session, OpenClaw désactive le
mode de code natif Codex, les serveurs MCP utilisateur et l'exécution des plugins avec application pour ce
tour, au lieu de s'appuyer sur le sandboxing côté hôte de Codex. L'accès au shell est exposé
via les outils dynamiques avec sandbox OpenClaw tels que `sandbox_exec` et
`sandbox_process` lorsque les outils exec/process normaux sont disponibles.

Utilisez le mode d'exécution normalisé OpenClaw lorsque vous souhaitez une auto-révision native de Codex avant
les échappements de bac à sable ou les autorisations supplémentaires :

```json5
{
  tools: {
    exec: {
      mode: "auto",
    },
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

Pour les sessions Codex app-server, OpenClaw mappe `tools.exec.mode: "auto"` aux approbations révisées par Codex Guardian, généralement
`approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` et
`sandbox: "workspace-write"` lorsque les exigences locales autorisent ces valeurs.
Dans `tools.exec.mode: "auto"`, OpenClaw ne préserve pas les anciennes substitutions de `approvalPolicy: "never"` ou `sandbox: "danger-full-access"` Codex non sécurisées ; utilisez
`tools.exec.mode: "full"` pour une posture Codex sans approbation intentionnelle. Le
préréglage `plugins.entries.codex.config.appServer.mode: "guardian"` hérité fonctionne toujours,
mais `tools.exec.mode: "auto"` est la surface normalisée OpenClaw.

Pour la comparaison au niveau du mode avec les approbations d'exécution de l'hôte et les autorisations ACPX, consultez [Modes de permission](/fr/tools/permission-modes).

Pour chaque champ de l'application serveur, l'ordre d'authentification, l'isolation de l'environnement, la découverte et le comportement de délai d'expiration, consultez [Référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Commandes et diagnostics

Le plugin inclus enregistre `/codex` en tant que commande slash sur n'importe quel channel prenant en charge les commandes texte OpenClaw.

Formes courantes :

- `/codex status` vérifie la connectivité de l'application serveur, les modèles, le compte, les limites de débit, les serveurs MCP et les compétences.
- `/codex models` liste les modèles de l'application serveur Codex actifs.
- `/codex threads [filter]` liste les fils de discussion récents de l'application serveur Codex.
- `/codex resume <thread-id>` attache la session OpenClaw actuelle à un fil de discussion Codex existant.
- `/codex compact` demande à l'application serveur Codex de compacter le fil de discussion attaché.
- `/codex review` lance la révision native Codex pour le fil de discussion attaché.
- `/codex diagnostics [note]` demande avant d'envoyer les commentaires Codex pour le fil de discussion attaché.
- `/codex account` affiche l'état du compte et des limites de débit.
- `/codex mcp` liste l'état du serveur MCP de l'application serveur Codex.
- `/codex skills` liste les compétences de l'application serveur Codex.

Pour la plupart des rapports de support, commencez par `/diagnostics [note]` dans la conversation où le bug s'est produit. Cela crée un rapport de diagnostics Gateway et, pour les sessions de harnais Codex, demande une approbation pour envoyer le bundle de commentaires Codex pertinent. Consultez [Exportation des diagnostics](/fr/gateway/diagnostics) pour le modèle de confidentialité et le comportement des conversations de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous voulez spécifiquement le téléchargement des commentaires Codex pour le fil de discussion actuellement attaché sans le bundle de diagnostics complet Gateway.

### Inspecter les fils de discussion Codex localement

Le moyen le plus rapide d'inspecter une mauvaise exécution Codex est souvent d'ouvrir directement le fil de discussion natif Codex :

```bash
codex resume <thread-id>
```

Obtenez l'identifiant du fil de discussion à partir de la réponse terminée `/diagnostics`, `/codex binding`, ou `/codex threads [filter]`.

Pour les mécanismes de téléchargement et les limites de diagnostics au niveau de l'exécution, consultez
[Codex harness runtime](/fr/plugins/codex-harness-runtime#codex-feedback-upload).

L'authentification est sélectionnée dans cet ordre :

1. Profils d'authentification OpenAI ordonnés pour l'agent, de préférence sous
   `auth.order.openai`. Exécutez `openclaw doctor --fix` pour migrer les anciens
   identifiants de profil d'authentification Codex hérités et l'ordre d'authentification Codex hérité.
2. Le compte existant du serveur d'application dans le domicile Codex de cet agent.
3. Uniquement pour les lancements locaux de serveur d'application stdio, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`, lorsqu'aucun compte de serveur d'application n'est présent et que l'authentification OpenAI est
   toujours requise.

Lorsque OpenClaw détecte un profil d'authentification Codex de type abonnement ChatGPT, il supprime
`CODEX_API_KEY` et `OPENAI_API_KEY` du processus enfant Codex généré. Cela
garantit que les clés Gateway de niveau API restent disponibles pour les embeddings ou les modèles OpenAI directs
sans faire facturer accidentellement les tours natifs du serveur d'application Codex via l'API.
Les profils explicites de clé API Codex et la solution de repli de clé d'environnement stdio locale utilisent la connexion
au serveur d'application au lieu de l'environnement du processus enfant hérité. Les connexions WebSocket au serveur d'application
ne reçoivent pas la solution de repli de clé Gateway de l'environnement API ; utilisez un profil d'authentification explicite ou le
propre compte du serveur d'application distant.

Si un profil d'abonnement atteint une limite d'utilisation Codex, OpenClaw enregistre l'heure de
réinitialisation lorsque Codex en signale une et essaie le profil d'authentification ordonné suivant pour la même
exécution Codex. Une fois l'heure de réinitialisation passée, le profil d'abonnement redevient éligible
sans modifier le modèle `openai/gpt-*` sélectionné ni l'exécution Codex.

Pour les lancements locaux de serveur d'application stdio, OpenClaw définit `CODEX_HOME` sur un répertoire par agent afin que la configuration Codex, les fichiers d'authentification/de compte, le cache/les données des plugins et l'état du thread natif ne lisent ni n'écrivent le `~/.codex` personnel de l'opérateur par défaut. OpenClaw préserve le `HOME` de processus normal ; les sous-processus exécutés par Codex peuvent toujours trouver la configuration et les jetons du répertoire personnel de l'utilisateur, et Codex peut découvrir des entrées `$HOME/.agents/skills` et `$HOME/.agents/plugins/marketplace.json` partagées.

Si un déploiement a besoin d'un isolement d'environnement supplémentaire, ajoutez ces variables à `appServer.clearEnv` :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            clearEnv: ["CODEX_API_KEY", "OPENAI_API_KEY"],
          },
        },
      },
    },
  },
}
```

`appServer.clearEnv` n'affecte que le processus enfant du serveur d'application Codex généré. OpenClaw supprime `CODEX_HOME` et `HOME` de cette liste lors de la normalisation du lancement local : `CODEX_HOME` reste par agent, et `HOME` reste hérité afin que les sous-processus puissent utiliser l'état normal du répertoire personnel de l'utilisateur.

Les outils dynamiques Codex sont chargés par défaut via `searchable`. OpenClaw n'expose pas d'outils dynamiques qui dupliquent les opérations de l'espace de travail natif de Codex : `read`, `write`, `edit`, `apply_patch`, `exec`, `process` et `update_plan`. La plupart des autres outils d'intégration OpenClaw tels que la messagerie, les médias, cron, le navigateur, les nœuds, la passerelle, `heartbeat_respond` et `web_search` sont disponibles via la recherche d'outils Codex sous l'espace de noms `openclaw`, ce qui permet de garder le contexte du model initial plus petit.
Les réponses source `sessions_yield` et celles utilisant uniquement l'outil de message restent directes car il s'agit de contrats de contrôle de tour. `sessions_spawn` reste recherchable afin que le `spawn_agent` natif de Codex reste la surface principale du sous-agent Codex, tandis que la délégation explicite à OpenClaw ou à l'ACP est toujours disponible via l'espace de noms de l'outil dynamique `openclaw`. Les instructions de collaboration Heartbeat indiquent à Codex de rechercher `heartbeat_respond` avant de terminer un tour de battement de cœur (heartbeat) lorsque l'outil n'est pas déjà chargé.

Définissez `codexDynamicToolsLoading: "direct"` uniquement lorsque vous vous connectez à un serveur d'application Codex personnalisé qui ne peut pas rechercher les outils dynamiques différés ou lors du débogage de la charge utile complète de l'outil.

Champs de plugin Codex de premier niveau pris en charge :

| Champ                      | Par défaut     | Signification                                                                                                         |
| -------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Utilisez `"direct"` pour placer les outils dynamiques OpenClaw directement dans le contexte de l'outil Codex initial. |
| `codexDynamicToolsExclude` | `[]`           | Noms d'outils dynamiques supplémentaires OpenClaw à omettre des tours du serveur d'application Codex.                 |
| `codexPlugins`             | désactivé      | Prise en charge native des plugins/applications Codex pour les plugins Codex first-party configurés.                  |

Champs `appServer` pris en charge :

| Champ                                         | Par défaut                                                    | Signification                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                                     | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                                                                                                                                                                                                                                                                                    |
| `command`                                     | binaire Codex géré                                            | Exécutable pour le transport stdio. Laisser non défini pour utiliser le binaire géré ; ne le définir que pour un remplacement explicite.                                                                                                                                                                                                                                                                      |
| `args`                                        | `["app-server", "--listen", "stdio://"]`                      | Arguments pour le transport stdio.                                                                                                                                                                                                                                                                                                                                                                            |
| `url`                                         | non défini                                                    | URL du serveur d'application WebSocket.                                                                                                                                                                                                                                                                                                                                                                       |
| `authToken`                                   | non défini                                                    | Jeton Bearer pour le transport WebSocket.                                                                                                                                                                                                                                                                                                                                                                     |
| `headers`                                     | `{}`                                                          | En-têtes WebSocket supplémentaires.                                                                                                                                                                                                                                                                                                                                                                           |
| `clearEnv`                                    | `[]`                                                          | Noms de variables d'environnement supplémentaires supprimés du processus de serveur d'application stdio généré après qu'OpenClaw a construit son environnement hérité. OpenClaw conserve OpenClawOpenClaw`CODEX_HOME` par agent et `HOME` hérités pour les lancements locaux.                                                                                                                                 |
| `codeModeOnly`                                | `false`                                                       | Optez pour la surface tool en mode code uniquement de Codex. Les outils dynamiques OpenClaw restent enregistrés avec Codex afin que les appels imbriqués OpenClaw`tools.*` reviennent via le pont `item/tool/call` du serveur d'application.                                                                                                                                                                  |
| `requestTimeoutMs`                            | `60000`                                                       | Délai d'attente pour les appels au plan de contrôle du serveur d'application.                                                                                                                                                                                                                                                                                                                                 |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                       | Fenêtre de silence après que Codex accepte un tour ou après une demande de serveur d'application limitée à un tour, pendant qu'OpenClaw attend OpenClaw`turn/completed`.                                                                                                                                                                                                                                      |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                                      | Garde d'inactivité et de progression utilisée après un transfert d'outil, une fin d'outil natif, ou une progression brute de l'assistant post-outil, pendant qu'OpenClaw attend OpenClaw`turn/completed`. Utilisez ceci pour les charges de travail de confiance ou lourdes où la synthèse post-outil peut légitimement rester silencieuse plus longtemps que le budget de libération final de l'assistant.   |
| `mode`                                        | `"yolo"` sauf si les exigences Codex locales interdisent YOLO | Préréglage pour l'exécution YOLO ou révisée par le gardien. Les exigences stdio locales qui omettent `danger-full-access`, l'approbation `never` ou le réviseur `user` définissent le gardien par défaut implicite.                                                                                                                                                                                           |
| `approvalPolicy`                              | `"never"` ou une stratégie d'approbation de gardien autorisée | Stratégie d'approbation native Codex envoyée au démarrage/à la reprise/au tour du fil de discussion. Les valeurs par défaut du gardien préfèrent `"on-request"` lorsqu'il est autorisé.                                                                                                                                                                                                                       |
| `sandbox`                                     | `"danger-full-access"` ou un bac à sable de gardien autorisé  | Mode de bac à sable natif Codex envoyé au démarrage/à la reprise du fil de discussion. Les valeurs par défaut du gardien préfèrent `"workspace-write"` lorsqu'il est autorisé, sinon `"read-only"`OpenClaw. Lorsqu'un bac à sable OpenClaw est actif, les tours `danger-full-access` utilisent le `workspace-write`OpenClaw Codex avec un accès réseau dérivé du paramètre de sortie du bac à sable OpenClaw. |
| `approvalsReviewer`                           | `"user"` ou un réviseur de gardien autorisé                   | Utilisez `"auto_review"` pour laisser Codex réviser les invites d'approbation natives lorsqu'il est autorisé, sinon `guardian_subagent` ou `user`. `guardian_subagent` reste un alias hérité.                                                                                                                                                                                                                 |
| `serviceTier`                                 | unset                                                         | Niveau de service d'application Codex optionnel. `"priority"` active le routage en mode rapide, `"flex"` demande un traitement flexible, `null` efface la substitution, et l'ancien `"fast"` est accepté comme `"priority"`.                                                                                                                                                                                  |
| `experimental.sandboxExecServer`              | `false`                                                       | Aperçu d'option d'adhésion qui enregistre un environnement Codex pris en charge par un bac à sable OpenClaw avec le serveur d'application Codex 0.132.0 ou plus récent, afin que l'exécution native Codex puisse s'exécuter à l'intérieur du bac à sable OpenClaw actif.                                                                                                                                      |

Les appels d'outil dynamiques détenus par OpenClaw sont bornés indépendamment de `appServer.requestTimeoutMs` : les requêtes Codex `item/tool/call` utilisent par défaut un chien de garde OpenClaw de 90 secondes. Un argument `timeoutMs` positif par appel étend ou raccourcit ce budget d'outil spécifique. L'outil `image_generate` utilise `agents.defaults.imageGenerationModel.timeoutMs` lorsque l'appel d'outil ne fournit pas son propre délai d'expiration, ou un défaut de 120 secondes pour la génération d'images sinon. L'outil de compréhension des médias `image` utilise `tools.media.image.timeoutSeconds` ou son défaut média de 60 secondes. Les budgets d'outils dynamiques sont plafonnés à 600000 ms. En cas de dépassement du délai, OpenClaw abandonne le signal de l'outil lorsque cela est pris en charge et renvoie une réponse d'outil dynamique échouée à Codex afin que le tour puisse continuer au lieu de laisser la session dans `processing`.

Après que Codex a accepté un tour, et après qu'OpenClaw a répondu à une requête
app-server limitée au tour, le harnais s'attend à ce que Codex réalise des progrès
pour le tour en cours et termine éventuellement le tour natif avec
OpenClaw`turn/completed`. Si l'app-server reste silencieux pendant
`appServer.turnCompletionIdleTimeoutMs`OpenClawOpenClawOpenClaw, OpenClaw interrompt au mieux le tour Codex,
enregistre un timeout de diagnostic, et libère la voie de session d'OpenClaw
afin que les messages de chat suivants ne soient pas mis en file derrière un
tour natif obsolète. La plupart des notifications non terminales pour le même
tour désactivent ce chien de garde court car Codex a prouvé que le tour est
encore en vie. Les transferts d'outils utilisent un budget d'inactivité
post-tool plus long : après qu'OpenClaw a renvoyé une réponse `item/tool/call`,
après que les éléments d'outils natifs tels que `commandExecution` sont terminés,
après les complétions brutes `custom_tool_call_output`, et après la progression brute
de l'assistant post-tool. Le garde utilise `appServer.postToolRawAssistantCompletionIdleTimeoutMs` lorsqu'il
est configuré et sinon par défaut à cinq minutes. Ce même budget post-tool
étend également le chien de garde de progression pour la fenêtre de synthèse
silencieuse avant que Codex n'émette le prochain événement du tour en cours. Les
notifications globales de l'app-server, telles que les mises à jour de limite de
taux, ne réinitialisent pas la progression d'inactivité du tour. Les complétions
de raisonnement, les complétions de commentaire `agentMessage`,
et la progression brute de raisonnement ou d'assistant pré-tool peuvent être
suivies d'une réponse finale automatique, elles utilisent donc le garde de
réponse post-progression au lieu de libérer immédiatement la voie de session.
Seuls les éléments `agentMessage` terminés finaux/non-commentaires et
les complétions brutes d'assistant pré-tool arment la libération de la sortie de
l'assistant : si Codex se tait ensuite sans `turn/completed`OpenClawOpenClaw, OpenClaw
interrompt au mieux le tour natif et libère la voie de session. Les échecs de
l'app-server stdio sécurisés pour relecture, y compris les timeouts d'inactivité
de fin de tour sans assistant, outil, élément actif ou effet secondaire,
sont réessayés une fois lors d'une nouvelle tentative d'app-server. Les timeouts
non sécurisés retirent toujours le client app-server bloqué et libèrent la voie
de session OpenClaw. Ils effacent également la liaison de thread native
obsolète et présentent un message de timeout récupérable pour le jugement de
l'utilisateur ou du mainteneur au lieu d'être rejoués automatiquement. Les
diagnostics de timeout incluent la dernière méthode de notification de
l'app-server et, pour les éléments de réponse brute de l'assistant, le type
d'élément, le rôle, l'identifiant et un aperçu borné du texte de l'assistant.

Les remplacements d'environnement restent disponibles pour les tests locaux :

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` contourne le binaire géré lorsque
`appServer.command` n'est pas défini.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` a été supprimé. Utilisez plutôt
`plugins.entries.codex.config.appServer.mode: "guardian"`, ou
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` pour des tests locaux ponctuels. La configuration est
préférée pour les déploiements reproductibles car elle conserve le comportement du plugin dans le
même fichier révisé que le reste de la configuration du harnais Codex.

## Plugins natifs Codex

La prise en charge des plugins natifs Codex utilise les propres capacités d'application et de plugin
du serveur d'application Codex dans le même fil Codex que le tour de harnais OpenClaw. OpenClaw
ne traduit pas les plugins Codex en outils dynamiques OpenClaw
synthétiques `codex_plugin_*`.

`codexPlugins` n'affecte que les sessions qui sélectionnent le harnais natif Codex. Il
n'a aucun effet sur les exécutions de harnais intégrées, les exécutions de provider OpenAI normales, les liaisons
de conversation ACP ou autres harnais.

Configuration migrée minimale :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

La configuration de l'application de fil est calculée lorsque OpenClaw établit une session de harnais Codex
ou remplace une liaison de fil Codex obsolète. Elle n'est pas recalculée à chaque tour.
Après avoir modifié `codexPlugins`, utilisez `/new`, `/reset`, ou redémarrez la passerelle pour
que les futures sessions de harnais Codex commencent avec l'ensemble d'applications mis à jour.

Pour l'éligibilité à la migration, l'inventaire des applications, la politique d'action destructive,
les sollicitations et les diagnostics de plugins natifs, consultez
[Plugins natifs Codex](/fr/plugins/codex-native-plugins).

L'accès aux applications et plugins côté OpenAI est contrôlé par le compte Codex connecté
et, pour les espaces de travail Business et Enterprise/Edu, par les contrôles d'application de l'espace de travail. Voir
[Utiliser Codex avec votre plan ChatGPT](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
pour un aperçu du compte et du contrôle de l'espace de travail chez OpenAI.

## Utilisation de l'ordinateur

Computer Use est traité dans son propre guide d'installation :
[Codex Computer Use](/fr/plugins/codex-computer-use).

En résumé : OpenClaw ne fournit pas l'application de contrôle du bureau ni n'exécute
les actions du bureau lui-même. Il prépare Codex app-server, vérifie que le
serveur MCP `computer-use` est disponible, puis laisse Codex gérer les appels d'outils MCP natifs
pendant les tours en mode Codex.

## Limites de l'exécution

Le harnais Codex ne modifie que l'exécuteur de l'agent intégré de bas niveau.

- Les outils dynamiques OpenClaw sont pris en charge. Codex demande à OpenClaw d'exécuter ces
  outils, de sorte que OpenClaw reste dans le chemin d'exécution.
- Les outils natifs Codex shell, patch, MCP et d'application native sont possédés par Codex.
  OpenClaw peut observer ou bloquer des événements natifs sélectionnés via le relais
  pris en charge, mais il ne réécrit pas les arguments des outils natifs.
- Codex possède la compaction native. OpenClaw conserve un miroir de transcription pour l'historique du canal,
  la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais, mais
  il ne remplace pas la compaction Codex par un résumé OpenClaw ou context-engine.
- La génération de médias, la compréhension des médias, le TTS, les approbations et la sortie de l'outil de messagerie
  continuent via les paramètres de fournisseur/modèle OpenClaw correspondants.
- `tool_result_persist` s'applique aux résultats des outils de transcription possédés par OpenClaw, et non
  aux enregistrements de résultats d'outils natifs Codex.

Pour les couches de hook, les surfaces V1 prises en charge, la gestion des permissions natives, le pilotage
de la file d'attente, les mécanismes de téléchargement des commentaires Codex et les détails de la compaction, voir
[Codex harness runtime](/fr/plugins/codex-harness-runtime).

## Dépannage

**Codex n'apparaît pas comme un fournisseur `/model` normal :** c'est attendu pour
les nouvelles configurations. Sélectionnez un modèle `openai/gpt-*`, activez
`plugins.entries.codex.enabled`, et vérifiez si `plugins.allow` exclut
`codex`.

**OpenClaw utilise le harnais intégré au lieu de Codex :** assurez-vous que la référence du modèle est
OpenClaw`openai/gpt-*`OpenAI sur le fournisseur OpenAI officiel et que le plugin Codex est
installé et activé. Si vous avez besoin d'une preuve stricte lors des tests, définissez le fournisseur ou
le modèle `agentRuntime.id: "codex"`OpenClaw. Un runtime Codex forcé échoue au lieu de
décaler sur OpenClaw.

**Le runtime OpenAI Codex revient au chemin de la clé d'API :** collectez un extrait de
passerelle expurgé montrant le modèle, le runtime, le fournisseur sélectionné et l'échec.
Demandez aux collaborateurs concernés d'exécuter cette commande en lecture seule sur leur hôte OpenClaw :

```bash
(
  pattern='openai/gpt-5\.[45]|openai[-]codex|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|legacy OpenAI Codex prefix|resolveSelectedOpenAIRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

  if ls /tmp/openclaw/openclaw-*.log >/dev/null 2>&1; then
    grep -E -i -n "$pattern" /tmp/openclaw/openclaw-*.log 2>/dev/null || true
  else
    journalctl --user -u openclaw-gateway --since today --no-pager 2>/dev/null \
      | grep -E -i "$pattern" || true
  fi
) | sed -E \
    -e 's/(Authorization: Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(api[_ -]?key[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/(OPENAI_API_KEY[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/sk-[A-Za-z0-9_-]{12,}/sk-[REDACTED]/g' \
    -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/[EMAIL-REDACTED]/g' \
  | tail -200
```

Les extraits utiles incluent généralement `openai/gpt-5.5` ou `openai/gpt-5.4`,
`Runtime: OpenAI Codex`, `agentRuntime.id` ou `harnessRuntime`,
`candidateProvider: "openai"`, et un résultat `401`, `Incorrect API key`, ou
`No API key`OpenAIOAuthOpenAIAPI. Une exécution corrigée doit afficher le chemin OAuth
OpenAI au lieu d'un échec de clé d'API OpenAI simple.

**La configuration des références de modèle Codex héritées persiste :** exécutez `openclaw doctor --fix`.
Doctor réécrit les références de modèle héritées en `openai/*`, supprime les épinglages (pins) de session obsolètes et
de runtime d'agent complet, et préserve les remplacements de profil d'authentification existants.

**L'app-server est rejeté :** utilisez l'app-server Codex `0.125.0` ou plus récent.
Les préversions de même version ou les versions avec suffixe de build telles que
`0.125.0-alpha.2` ou `0.125.0+custom`OpenClaw sont rejetées car OpenClaw teste le
plancher (floor) du protocole stable `0.125.0`.

**`/codex status` ne peut pas se connecter :** vérifiez que le plugin `codex` groupé est
activé, que `plugins.allow` l'inclut lorsqu'une liste d'autorisation est configurée, et
que tout `appServer.command`, `url`, `authToken` personnalisé ou en-têtes sont valides.

**La découverte de modèles est lente :** diminuez
`plugins.entries.codex.config.discovery.timeoutMs` ou désactivez la découverte. Consultez
[Référence du harnais Codex](/fr/plugins/codex-harness-reference#model-discovery).

**Le transport WebSocket échoue immédiatement :** vérifiez `appServer.url`, `authToken`,
les en-têtes, et que le serveur d'application distant parle la même version du
protocole du serveur d'application Codex.

**Les outils de shell natif ou de correctif sont bloqués avec `Native hook relay unavailable` :**
le thread Codex essaie toujours d'utiliser un ID de relais de hook natif qu'OpenClaw
n'a plus enregistré. Il s'agit d'un problème de transport de hook natif Codex, et non d'une défaillance
du backend ACP, du provider, de GitHub ou de la commande shell. Démarrez une session fraîche
dans le chat affecté avec `/new` ou `/reset`, puis réessayez une commande inoffensive. Si cela
fonctionne une fois mais que l'appel d'outil natif suivant échoue à nouveau, considérez `/new` comme une solution
transitoire uniquement : copiez l'invite dans une session fraîche après avoir redémarré le serveur d'application Codex
ou la OpenClaw Gateway afin que les anciens threads soient abandonnés et que les enregistrements
de hooks natifs soient recréés.

**Un modèle non-Codex utilise le harnais intégré :** c'est attendu à moins que
la stratégie d'exécution du provider ou du modèle ne l'achemine vers un autre harnais. Les références de provider
non-OpenAI brutes restent sur leur chemin de provider normal en mode `auto`.

**Computer Use est installé mais les outils ne s'exécutent pas :** vérifiez
`/codex computer-use status` depuis une session fraîche. Si un outil signale
`Native hook relay unavailable`, utilisez la récupération du relais de hook natif ci-dessus. Consultez
[Computer Use Codex](/fr/plugins/codex-computer-use#troubleshooting).

## Connexes

- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Plugins Codex natifs](/fr/plugins/codex-native-plugins)
- [Computer Use Codex](/fr/plugins/codex-computer-use)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Providers de modèles](/fr/concepts/model-providers)
- [Provider OpenAI](/fr/providers/openai)
- [Aide Codex OpenAI](https://help.openai.com/en/collections/14937394-codex)
- [Plug-ins de harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Crochets de plug-in](/fr/plugins/hooks)
- [Export des diagnostics](/fr/gateway/diagnostics)
- [Statut](/fr/cli/status)
- [Tests](/fr/help/testing-live#live-codex-app-server-harness-smoke)
