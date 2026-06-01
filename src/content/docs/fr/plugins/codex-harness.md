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

La configuration normale utilise des références de modèle OpenAI canoniques telles que OpenAI`openai/gpt-5.5`. Ne configurez pas les références de modèle `openai-codex/gpt-*`OpenAI. Placez l'ordre d'authentification de l'agent OpenAI sous `auth.order.openai` ; les anciens profils `openai-codex:*` et les entrées `auth.order.openai-codex` restent pris en charge pour les installations existantes.

Lorsqu'aucun bac à sable OpenClaw n'est actif, OpenClaw démarre les threads de l'application serveur Codex
avec le mode de code natif Codex activé tout en laissant le mode code uniquement désactivé par défaut.
Cela permet de garder disponibles les capacités de code et d'espace de travail natif de Codex
pendant que les outils dynamiques OpenClaw continuent de passer par le pont de l'application serveur OpenClawOpenClawOpenClaw`item/tool/call`OpenClaw.
Le bac à sable actif d'OpenClaw et les stratégies d'outils restreints désactivent entièrement le mode de code natif
sauf si vous optez pour le chemin expérimental du serveur d'exécution du bac à sable.

Cette fonctionnalité native Codex est distincte du
[mode code OpenClaw](/fr/reference/code-mode), qui est un runtime QuickJS-WASI
optionnel pour les exécutions génériques OpenClaw avec une forme d'entrée `exec` différente.

Pour la séparation plus large model/provider/runtime, commencez par
[Runtimes d'agent](/fr/concepts/agent-runtimes). En résumé :
`openai/gpt-5.5` est la référence du model, `codex` est le runtime, et Telegram,
Discord, Slack, ou un autre channel reste la surface de communication.

## Prérequis

- OpenClaw avec le plugin OpenClaw`codex` inclus disponible.
- Si votre configuration utilise `plugins.allow`, incluez `codex`.
- Application serveur Codex `0.125.0` ou plus récente. Le plugin inclus gère un binaire
  compatible de l'application serveur Codex par défaut, donc les commandes locales `codex` sur `PATH` n'affectent
  pas le démarrage normal du harnais.
- Authentification Codex disponible via `openclaw models auth login --provider openai-codex`API,
  un compte de l'application serveur dans le domicile Codex de l'agent, ou un profil
  d'authentification explicite avec une clé API Codex.

Pour la priorité d'authentification, l'isolement de l'environnement, les commandes personnalisées de l'app-server,
la découverte de model et tous les champs de configuration, voir
[Référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Démarrage rapide

La plupart des utilisateurs qui souhaitent Codex dans OpenClaw veulent ce chemin : se connecter avec un
abonnement ChatGPT/Codex, activer le plugin `codex` intégré, et utiliser une
référence de `openai/gpt-*` canonique.

Connectez-vous avec Codex OAuth :

```bash
openclaw models auth login --provider openai-codex
```

Activez le plugin `codex` intégré et sélectionnez un modèle d'agent OpenAI :

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

Si votre configuration utilise `plugins.allow`, ajoutez-y `codex` aussi :

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

Redémarrez la passerelle après avoir modifié la configuration du plugin. Si une conversation existante possède déjà
une session, utilisez `/new` ou `/reset` avant de tester les modifications d'exécution afin que le prochain
tour résolve le harnais à partir de la configuration actuelle.

## Configuration

La configuration de démarrage rapide est la configuration minimale viable du harnais Codex. Définissez les options
du harnais Codex dans la configuration OpenClaw, et utilisez la CLI uniquement pour l'authentification Codex :

| Besoin                                                      | Définir                                                                                             | Où                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Activer le harnais                                          | `plugins.entries.codex.enabled: true`                                                               | Configuration OpenClaw                                 |
| Conserver une installation de plugin autorisée              | Inclure `codex` dans `plugins.allow`                                                                | Configuration OpenClaw                                 |
| Acheminer les tours d'agent OpenAI via Codex                | `agents.defaults.model` ou `agents.list[].model` comme `openai/gpt-*`                               | Configuration d'agent OpenClaw                         |
| Se connecter avec Codex OAuth                               | `openclaw models auth login --provider openai-codex`                                                | Profil d'authentification CLI                          |
| Ajouter une sauvegarde de clé API pour les exécutions Codex | Profil de clé API `openai:*` listé après l'authentification par abonnement dans `auth.order.openai` | Profil d'authentification CLI + configuration OpenClaw |
| Échec fermé lorsque Codex n'est pas disponible              | Provider ou modèle `agentRuntime.id: "codex"`                                                       | Configuration modèle/provider OpenClaw                 |
| Utiliser le trafic direct de l'OpenAI API                   | Provider ou model `agentRuntime.id: "openclaw"` avec authentification OpenAI normale                | Configuration modèle/fournisseur OpenClaw              |
| Régler le comportement du serveur d'application             | `plugins.entries.codex.config.appServer.*`                                                          | Configuration du plugin Codex                          |
| Activer les applications natives du plugin Codex            | `plugins.entries.codex.config.codexPlugins.*`                                                       | Configuration du plugin Codex                          |
| Activer l'usage ordinateur de Codex                         | `plugins.entries.codex.config.computerUse.*`                                                        | Configuration du plugin Codex                          |

Utilisez les références de modèle `openai/gpt-*` pour les tours d'agent OpenAI pris en charge par Codex. Privilégiez
`auth.order.openai` pour l'ordre abonnement prioritaire/sauvegarde par clé API. Les profils
d'authentification `openai-codex:*` existants et `auth.order.openai-codex` restent valides, mais
n'écrivez pas de nouvelles références de modèle `openai-codex/gpt-*`.

Ne définissez pas `compaction.model` ou `compaction.provider` sur les agents basés sur Codex.
Codex compresse via son état de thread natif de l'app-server, donc OpenClaw ignore
ces substitutions de résumeur local au runtime et `openclaw doctor --fix` les supprime
lorsque l'agent utilise Codex.

Lossless reste pris en charge comme moteur de contexte pour l'assemblage, l'ingestion et
la maintenance autour des tours Codex. Configurez-le via
`plugins.slots.contextEngine: "lossless-claw"` et
`plugins.entries.lossless-claw.config.summaryModel`, et non via
`agents.defaults.compaction.provider`. `openclaw doctor --fix` migre l'ancienne
forme `compaction.provider: "lossless-claw"` vers l'emplacement du moteur de contexte Lossless
lorsque Codex est le runtime actif, mais le Codex natif possède toujours la compression.

Le harnais natif du serveur d'application Codex prend en charge les moteurs de contexte qui nécessitent
un assemblage de pré-prompt. Les backends génériques CLI, y compris `codex-cli`, ne fournissent pas
cette capacité d'hébergement.

Pour les agents basés sur Codex, `/compact` lance la compaction native du serveur d'application Codex sur
le thread lié. OpenClaw n'attend pas la fin, n'impose pas de délai d'expiration OpenClaw,
ne redémarre pas le serveur d'application partagé, ni ne revient à un moteur de contexte
ou à un résumeur public OpenAI. Si la liaison native du thread Codex est manquante ou
obsolète, la commande échoue en mode fermé (fail closed) afin que l'opérateur voit la véritable limite d'exécution
au lieu de changer silencieusement le backend de compactage.

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

Dans cette configuration, les deux profils s'exécutent toujours via Codex pour les tours d'agent
`openai/gpt-*`. La clé API n'est qu'un repli d'authentification, et non une demande de basculer vers OpenClaw ou
les réponses OpenAI simples.

Le reste de cette page couvre les variantes courantes entre lesquelles les utilisateurs doivent choisir :
la forme du déploiement, le routage en échec fermé (fail-closed), la politique d'approbation du gardien, les plugins natifs Codex
et l'utilisation de l'ordinateur. Pour les listes complètes d'options, les valeurs par défaut, les énumérations, la découverte,
l'isolement de l'environnement, les délais d'expiration et les champs de transport du serveur d'application, consultez
la [référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Vérifier l'exécution Codex

Utilisez `/status` dans le chat où vous vous attendez à Codex. Un tour d'agent OpenAI
soutenu par Codex affiche :

```text
Runtime: OpenAI Codex
```

Ensuite, vérifiez l'état de l'app-server Codex :

```text
/codex status
/codex models
```

`/codex status` signale la connectivité du serveur d'application, le compte, les limites de débit, les serveurs MCP
et les compétences. `/codex models` répertorie le catalogue en direct des serveurs d'application Codex pour
le harnais et le compte. Si `/status` est surprenant, consultez
la page [Dépannage](#troubleshooting).

## Routage et sélection du modèle

Gardez les références de provider et la politique d'exécution séparées :

- Utilisez `openai/gpt-*` pour les tours d'agent OpenAI via Codex.
- N'utilisez pas `openai-codex/gpt-*` dans la configuration. Exécutez `openclaw doctor --fix` pour
  réparer les références héritées et les épingles de route de session obsolètes.
- `agentRuntime.id: "codex"` est facultatif pour le mode automatique OpenAI normal, mais utile
  lorsqu'un déploiement doit échouer en mode fermé (fail closed) si Codex n'est pas disponible.
- `agentRuntime.id: "openclaw"` permet à un fournisseur ou à un modèle de choisir le runtime intégré OpenClaw
  lorsque cela est intentionnel.
- `/codex ...` contrôle les conversations du serveur d'application Codex natif depuis le chat.
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
| Démarrer une tâche ACP/acpx                                  | Commandes de session ACP/acpx, non `/codex`                                                           |

| Cas d'usage                                          | Configurer                                                                         | Vérifier                                   | Notes                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| Abonnement ChatGPT/Codex avec le runtime natif Codex | `openai/gpt-*` plus plugin `codex` activé                                          | `/status` affiche `Runtime: OpenAI Codex`  | Chemin recommandé                                        |
| Échec fermé si Codex n'est pas disponible            | Provider ou model `agentRuntime.id: "codex"`                                       | Le tour échoue au lieu du fallback intégré | Utiliser pour les déploiements Codex uniquement          |
| Diriger le trafic avec clé OpenAI API via OpenClaw   | Provider ou model `agentRuntime.id: "openclaw"` et authentification OpenAI normale | `/status` affiche le runtime OpenClaw      | Utiliser uniquement lorsque OpenClaw est intentionnel    |
| Configuration héritée                                | `openai-codex/gpt-*`                                                               | `openclaw doctor --fix` le réécrit         | N'écrivez pas de nouvelle configuration de cette manière |
| Adaptateur Codex ACP/acpx                            | ACP `sessions_spawn({ runtime: "acp" })`                                           | Statut de tâche/session ACP                | Séparé du harnais natif Codex                            |

`agents.defaults.imageModel` suit le même partage de préfixe. Utilisez `openai/gpt-*`
pour la route OpenAI normale et `codex/gpt-*` uniquement lorsque la compréhension d'image
doit passer par un tour app-server Codex délimité. N'utilisez pas
`openai-codex/gpt-*`; le docteur réécrit ce préfixe hérité en `openai/gpt-*`.

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

Pour les tours d'agent OpenAI, `openai/gpt-*` résout déjà vers Codex lorsque le
plugin inclus est disponible. Ajoutez une stratégie de runtime explicite lorsque vous voulez une règle
fail-closed écrite :

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
stdio. Définissez `appServer.command` uniquement lorsque vous voulez intentionnellement exécuter un
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

Les sessions app-server stdio locales sont par défaut en posture d'opérateur local de confiance :
`approvalPolicy: "never"`, `approvalsReviewer: "user"` et
`sandbox: "danger-full-access"`. Si les exigences locales de Codex n'autorisent pas cette
posture YOLO implicite, OpenClaw sélectionne à la place les autorisations de gardien autorisées.
Lorsqu'un bac à sable OpenClaw est actif pour la session, OpenClaw désactive le
mode Code natif de Codex, les serveurs MCP utilisateur et l'exécution de plugins pris en charge par l'application pour ce
tour, au lieu de s'appuyer sur le sandboxing côté hôte de Codex. L'accès au shell est exposé
via les outils dynamiques pris en charge par le bac à sable OpenClaw tels que `sandbox_exec` et
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

Pour les sessions app-server Codex, OpenClaw mappe `tools.exec.mode: "auto"` aux approbations
révisées par le gardien Codex, généralement
`approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` et
`sandbox: "workspace-write"` lorsque les exigences locales autorisent ces valeurs.
Dans `tools.exec.mode: "auto"`, OpenClaw ne préserve pas les remplacements non sécurisés hérités de Codex
`approvalPolicy: "never"` ou `sandbox: "danger-full-access"` ; utilisez
`tools.exec.mode: "full"` pour une posture Codex sans approbation intentionnelle. Le
préréglage hérité `plugins.entries.codex.config.appServer.mode: "guardian"` fonctionne toujours,
mais `tools.exec.mode: "auto"` est la surface normalisée OpenClaw.

Pour chaque champ app-server, l'ordre d'authentification, l'isolement de l'environnement, la découverte et le
comportement de délai d'attente, consultez la [Référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Commandes et diagnostics

Le plugin inclus enregistre `/codex` en tant que commande slash sur n'importe quel channel qui
prend en charge les commandes texte OpenClaw.

Formes courantes :

- `/codex status` vérifie la connectivité app-server, les modèles, le compte, les limites de débit,
  les serveurs MCP et les compétences.
- `/codex models` répertorie les modèles app-server Codex actifs.
- `/codex threads [filter]` répertorie les threads récents du serveur d'application Codex.
- `/codex resume <thread-id>` attache la session OpenClaw actuelle à un
  thread Codex existant.
- `/codex compact` demande au serveur d'application Codex de compacter le thread attaché.
- `/codex review` lance la révision native Codex pour le thread attaché.
- `/codex diagnostics [note]` demande avant d'envoyer les commentaires Codex pour le
  thread attaché.
- `/codex account` affiche le statut du compte et de la limite de débit.
- `/codex mcp` répertorie le statut du serveur MCP du serveur d'application Codex.
- `/codex skills` répertorie les compétences du serveur d'application Codex.

Pour la plupart des rapports de support, commencez par `/diagnostics [note]` dans la conversation
où le bug s'est produit. Cela crée un rapport de diagnostic Gateway et, pour les sessions
du harnais Codex, demande une approbation pour envoyer le bundle de commentaires Codex pertinent.
Voir [Exportation des diagnostics](/fr/gateway/diagnostics) pour le modèle de confidentialité et le comportement
des discussions de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous voulez spécifiquement le téléchargement
de commentaires Codex pour le thread actuellement attaché sans le bundle de diagnostics complet Gateway.

### Inspecter les discussions Codex localement

Le moyen le plus rapide d'inspecter une mauvaise exécution Codex est souvent d'ouvrir directement la discussion native Codex :

```bash
codex resume <thread-id>
```

Obtenez l'identifiant du thread à partir de la réponse `/diagnostics` terminée, `/codex binding`, ou
`/codex threads [filter]`.

Pour les mécanismes de téléchargement et les limites de diagnostics au niveau de l'exécution, voir
[Runtime du harnais Codex](/fr/plugins/codex-harness-runtime#codex-feedback-upload).

L'authentification est sélectionnée dans cet ordre :

1. Profils d'authentification OpenAI ordonnés pour l'agent, de préférence sous
   `auth.order.openai`. Les identifiants de profils `openai-codex:*` existants restent valides.
2. Le compte existant de l'application serveur dans le domicile Codex de cet agent.
3. Uniquement pour les lancements locaux de serveur d'application stdio, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`, lorsqu'aucun compte de serveur d'application n'est présent et que l'authentification OpenAI est
   toujours requise.

Lorsqu'OpenClaw détecte un profil d'authentification Codex de type abonnement ChatGPT, il supprime
`CODEX_API_KEY` et `OPENAI_API_KEY` du processus enfant Codex généré. Cela
permet de garder les clés Gateway de niveau API disponibles pour les intégrations ou les modèles OpenAI directs
sans que les tours natifs du serveur d'application Codex ne soient facturés par accident via l'APIAPI.
Les profils explicites de clés Gateway Codex et la repli sur la clé d'environnement stdio locale utilisent la connexion
au serveur d'application au lieu de l'environnement hérité du processus enfant. Les connexions WebSocket au serveur d'application
ne reçoivent pas le repli de clé API de l'environnement APIAPI ; utilisez un profil d'authentification explicite ou le
compte propre du serveur d'application distant.

Si un profil d'abonnement atteint une limite d'utilisation Codex, OpenClaw enregistre l'heure
de réinitialisation lorsque Codex en signale une et essaie le prochain profil d'authentification ordonné pour la même
exécution Codex. Une fois l'heure de réinitialisation passée, le profil d'abonnement redevient éligible
sans changer le modèle `openai/gpt-*` sélectionné ni le runtime Codex.

Pour les lancements locaux de serveur d'application stdio, OpenClaw définit `CODEX_HOME` sur un répertoire
par agent afin que la configuration Codex, les fichiers d'authentification/compte, le cache/données des plugins et l'état
natif du fil ne lisent ni n'écrivent le `~/.codex` personnel de l'opérateur par
défaut. OpenClaw préserve le processus normal `HOME` ; les sous-processus
exécutés par Codex peuvent toujours trouver la configuration et les jetons du dossier utilisateur personnel, et Codex peut découvrir des entrées `$HOME/.agents/skills` et `$HOME/.agents/plugins/marketplace.json` partagées.

Si un déploiement a besoin d'un isolement d'environnement supplémentaire, ajoutez ces variables à
`appServer.clearEnv` :

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

`appServer.clearEnv` n'affecte que le processus enfant du serveur d'application Codex généré.
OpenClaw supprime `CODEX_HOME` et `HOME` de cette liste lors de la normalisation
du lancement local : `CODEX_HOME` reste par agent, et `HOME` reste hérité afin que
les sous-processus puissent utiliser l'état normal du dossier utilisateur personnel.

Les outils dynamiques Codex sont chargés par défaut en `searchable`OpenClaw. OpenClaw n'expose pas les outils dynamiques qui dupliquent les opérations de l'espace de travail natif de Codex : `read`, `write`, `edit`, `apply_patch`, `exec`, `process` et `update_plan`OpenClaw. La plupart des outils d'intégration OpenClaw restants, tels que la messagerie, les médias, cron, le navigateur, les nœuds, la passerelle, `heartbeat_respond` et `web_search`, sont disponibles via la recherche d'outils Codex sous l'espace de noms `openclaw`, ce qui permet de garder le contexte initial du modèle plus petit.
Les réponses source `sessions_yield` et uniquement avec l'outil de message restent directes car il s'agit de contrats de contrôle de tour. `sessions_spawn` reste consultable pour que le `spawn_agent`OpenClaw natif de Codex reste la surface principale du sous-agent Codex, tandis que la délégation explicite OpenClaw ou ACP est toujours disponible via l'espace de noms de l'outil dynamique `openclaw`. Les instructions de collaboration Heartbeat indiquent à Codex de rechercher `heartbeat_respond` avant de terminer un tour de battement de cœur (heartbeat) lorsque l'outil n'est pas déjà chargé.

Définissez `codexDynamicToolsLoading: "direct"` uniquement lorsque vous vous connectez à un serveur d'application Codex personnalisé qui ne peut pas rechercher les outils dynamiques différés ou lors du débogage de la charge utile complète de l'outil.

Champs de plugin Codex de premier niveau pris en charge :

| Champ                      | Par défaut     | Signification                                                                                                                 |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Utilisez `"direct"`OpenClaw pour placer les outils dynamiques OpenClaw directement dans le contexte initial de l'outil Codex. |
| `codexDynamicToolsExclude` | `[]`           | Noms d'outils dynamiques OpenClaw supplémentaires à omettre des tours du serveur d'application Codex.                         |
| `codexPlugins`             | désactivé      | Prise en charge native des plugins/applications Codex pour les plugins sélectionnés installés par la source et migrés.        |

Champs `appServer` pris en charge :

| Champ                                         | Par défaut                                                    | Signification                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                                     | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `command`                                     | binaire Codex géré                                            | Exécutable pour le transport stdio. Laisser non défini pour utiliser le binaire géré ; ne le définir que pour une substitution explicite.                                                                                                                                                                                                                                                                                                                           |
| `args`                                        | `["app-server", "--listen", "stdio://"]`                      | Arguments pour le transport stdio.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `url`                                         | non défini                                                    | URL du serveur d'application WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `authToken`                                   | non défini                                                    | Jeton Bearer pour le transport WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `headers`                                     | `{}`                                                          | En-têtes WebSocket supplémentaires.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `clearEnv`                                    | `[]`                                                          | Noms de variables d'environnement supplémentaires supprimés du processus app-server stdio généré après qu'OpenClaw a construit son environnement hérité. OpenClaw conserve les `CODEX_HOME` par agent et les `HOME` héritées pour les lancements locaux.                                                                                                                                                                                                            |
| `codeModeOnly`                                | `false`                                                       | Optez pour la surface tool en mode code uniquement de Codex. Les outils dynamiques OpenClaw restent enregistrés auprès de Codex afin que les appels imbriqués `tools.*` retournent via le pont app-server `item/tool/call`.                                                                                                                                                                                                                                         |
| `requestTimeoutMs`                            | `60000`                                                       | Délai d'expiration pour les appels au plan de contrôle du serveur d'application.                                                                                                                                                                                                                                                                                                                                                                                    |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                       | Fenêtre de silence après que Codex a accepté un tour ou après une requête app-server limitée à un tour pendant que OpenClaw attend `turn/completed`. Augmentez cette valeur pour les phases de synthèse post-tool lentes ou uniquement de statut.                                                                                                                                                                                                                   |
| `postToolRawAssistantCompletionIdleTimeoutMs` | non défini                                                    | Garde d'inactivité après completion utilisé après un transfert tool lorsque Codex émet une completion d'assistant brute ou une progression mais n'envoie pas `turn/completed`. Par défaut, le délai d'inactivité de completion d'assistant lorsqu'il n'est pas défini. Utilisez ceci pour les charges de travail fiables ou lourdes où la synthèse post-tool peut légitimement rester silencieuse plus longtemps que le budget de libération finale de l'assistant. |
| `mode`                                        | `"yolo"` sauf si les exigences Codex locales interdisent YOLO | Préréglage pour l'exécution YOLO ou révisée par un gardien. Les exigences stdio locales qui omettent `danger-full-access`, l'approbation `never`, ou le réviseur `user` font du gardien implicite le gardien par défaut.                                                                                                                                                                                                                                            |
| `approvalPolicy`                              | `"never"` ou une stratégie d'approbation de gardien autorisée | Stratégie d'approbation native Codex envoyée au démarrage/reprise/tour du fil. Les valeurs par défaut du gardien préfèrent `"on-request"` lorsque cela est autorisé.                                                                                                                                                                                                                                                                                                |
| `sandbox`                                     | `"danger-full-access"` ou un bac à sable autorisé du gardien  | Mode de bac à sable natif Codex envoyé au démarrage/reprise du thread. Les valeurs par défaut du gardien préfèrent `"workspace-write"` si autorisé, sinon `"read-only"`. Lorsqu'un bac à sable OpenClaw est actif, les tours `danger-full-access` utilisent le `workspace-write` de Codex avec un accès réseau dérivé du paramètre de sortie du bac à sable OpenClaw.                                                                                               |
| `approvalsReviewer`                           | `"user"` ou un réviseur autorisé du gardien                   | Utilisez `"auto_review"` pour permettre à Codex de réviser les invites d'approbation natives si autorisé, sinon `guardian_subagent` ou `user`. `guardian_subagent` reste un alias hérité.                                                                                                                                                                                                                                                                           |
| `serviceTier`                                 | non défini                                                    | Niveau de service facultatif du serveur d'application Codex. `"priority"` active le routage en mode rapide, `"flex"` demande un traitement flexible, `null` efface la priorité, et l'ancien `"fast"` est accepté comme `"priority"`.                                                                                                                                                                                                                                |
| `experimental.sandboxExecServer`              | `false`                                                       | Option d'aperçu qui enregistre un environnement Codex pris en charge par un bac à sable OpenClaw avec le serveur d'application Codex 0.132.0 ou plus récent, afin que l'exécution native Codex puisse s'exécuter dans le bac à sable OpenClaw actif.                                                                                                                                                                                                                |

Les appels d'outil dynamiques détenus par OpenClaw sont limités indépendamment de
`appServer.requestTimeoutMs` : les requêtes Codex `item/tool/call` utilisent par défaut un chiens de garde OpenClaw de 90 secondes.
Un argument `timeoutMs` positif par appel étend
ou raccourcit ce budget d'outil spécifique. L'outil `image_generate` utilise
`agents.defaults.imageGenerationModel.timeoutMs` lorsque l'appel d'outil ne fournit
pas son propre délai d'attente, ou un délai par défaut de 120 secondes pour la génération d'images sinon.
L'outil de compréhension des médias `image` utilise
`tools.media.image.timeoutSeconds` ou son délai média par défaut de 60 secondes. Les budgets d'outils
dynamiques sont plafonnés à 600000 ms. En cas de dépassement de délai, OpenClaw abandonne le signal de l'outil
lorsque cela est pris en charge et renvoie une réponse d'outil dynamique échouée à Codex afin que le tour
puisse continuer au lieu de laisser la session en `processing`.

Une fois que Codex accepte un tour, et après qu'OpenClaw a répondu à une requête app-server limitée au tour, le harness s'attend à ce que Codex réalise des progrès pour le tour en cours et termine éventuellement le tour natif avec `turn/completed`. Si l'app-server reste silencieux pendant `appServer.turnCompletionIdleTimeoutMs`, OpenClaw tente d'interrompre au mieux le tour Codex, enregistre un diagnostic de délai d'attente, et libère la voie de session OpenClaw afin que les messages de chat suivants ne soient pas mis en file d'attente derrière un tour natif périmé. La plupart des notifications non terminales pour le même tour désactivent ce chien de garde court car Codex a prouvé que le tour est toujours en vie ; les complétions brutes `custom_tool_call_output` maintiennent le chien de garde court post-tool armé car elles représentent le transfert du résultat de l'outil limité au tour. Les notifications globales de l'app-server, telles que les mises à jour de limite de débit, ne réinitialisent pas la progression d'inactivité du tour. Les éléments `agentMessage` terminés et les éléments bruts d'assistant pré-tool `rawResponseItem/completed` arment la libération de la sortie de l'assistant : si Codex devient ensuite silencieux sans `turn/completed`, OpenClaw tente d'interrompre au mieux le tour natif et libère la voie de session. La progression brute de l'assistant post-tool continue d'attendre `turn/completed` tandis qu'une garde d'inactivité de complétion reste armée ; la garde utilise `appServer.postToolRawAssistantCompletionIdleTimeoutMs` lorsque configurée et revient sinon au délai d'inactivité de complétion de l'assistant. Les diagnostics de délai d'attente incluent la dernière méthode de notification de l'app-server et, pour les éléments de réponse brute de l'assistant, le type d'élément, le rôle, l'identifiant et un aperçu borné du texte de l'assistant.

Les redéfinitions d'environnement restent disponibles pour les tests locaux :

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` contourne le binaire géré lorsque
`appServer.command` n'est pas défini.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` a été supprimé. Utilisez
`plugins.entries.codex.config.appServer.mode: "guardian"` à la place, ou
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` pour des tests ponctuels locaux. La configuration est
préférée pour les déploiements reproductibles car elle conserve le comportement du plugin dans le
même fichier révisé que le reste de la configuration du Codex harness.

## Plugins natifs Codex

La prise en charge native des plugins Codex utilise les propres capacités d'application et de plugin du serveur d'application Codex dans le même fil Codex que le tour du harnais OpenClaw. OpenClaw ne traduit pas les plugins Codex en outils dynamiques OpenClaw synthétiques OpenClawOpenClaw`codex_plugin_*`OpenClaw.

`codexPlugins` affecte uniquement les sessions qui sélectionnent le harnais Codex natif. Il n'a aucun effet sur les exécutions de harnais intégrées, les exécutions normales du fournisseur OpenAI OpenAI, les liaisons de conversation ACP ou d'autres harnais.

Config minimale migrée :

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

La configuration de l'application de fil est calculée lorsque OpenClaw OpenClaw établit une session de harnais Codex ou remplace une liaison de fil Codex obsolète. Elle n'est pas recalculée à chaque tour. Après avoir modifié `codexPlugins`, utilisez `/new`, `/reset`, ou redémarrez la passerelle afin que les futures sessions de harnais Codex commencent avec l'ensemble d'applications mis à jour.

Pour l'éligibilité à la migration, l'inventaire des applications, la politique d'action destructive, les sollicitations et les diagnostics de plugins natifs, consultez [Plugins Codex natifs](/fr/plugins/codex-native-plugins).

## Utilisation de l'ordinateur

L'utilisation de l'ordinateur est traitée dans son propre guide de configuration :
[Utilisation de l'ordinateur Codex](/fr/plugins/codex-computer-use).

La version courte : OpenClaw OpenClaw ne fournit pas l'application de contrôle du bureau et n'exécute pas d'actions de bureau lui-même. Il prépare le serveur d'application Codex, vérifie que le serveur MCP `computer-use` est disponible, puis laisse Codex gérer les appels d'outil MCP natifs pendant les tours en mode Codex.

## Limites d'exécution

Le harnais Codex modifie uniquement l'exécuteur de l'agent intégré de bas niveau.

- Les outils dynamiques OpenClaw sont pris en charge. Codex demande à OpenClaw d'exécuter ces
  outils, donc OpenClaw reste dans le chemin d'exécution.
- Les outils shell, patch, MCP et d'application natifs de Codex sont détenus par Codex.
  OpenClaw peut observer ou bloquer des événements natifs sélectionnés via le relais pris en charge,
  mais il ne réécrit pas les arguments des outils natifs.
- Codex possède la compactage natif. OpenClaw OpenClaw conserve une copie miroir de la transcription pour l'historique des canaux, la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais, mais il ne remplace pas le compactage Codex par un résumé OpenClaw OpenClaw ou de moteur de contexte.
- La génération de médias, la compréhension des médias, le TTS, les approbations et la sortie de l'outil de messagerie
  continuent via les paramètres de fournisseur/modèle OpenClaw correspondants.
- `tool_result_persist` s'applique aux résultats des outils de transcription appartenant à OpenClaw OpenClaw, et non aux enregistrements de résultats d'outil natifs Codex.

Pour les couches de hooks, les surfaces V1 prises en charge, la gestion native des autorisations, le pilotage de la file d'attente, les mécanismes de téléchargement des commentaires Codex et les détails du compactage, consultez [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime).

## Dépannage

**Codex n'apparaît pas comme un `/model` provider normal :** c'est attendu pour
les nouvelles configurations. Sélectionnez un `openai/gpt-*` model, activez
`plugins.entries.codex.enabled`, et vérifiez si `plugins.allow` exclut
`codex`.

**OpenClaw utilise le harnais intégré au lieu de Codex :** assurez-vous que la référence du modèle est
OpenClaw`openai/gpt-*`OpenAI sur le provider OpenAI officiel et que le plugin Codex est
installé et activé. Si vous avez besoin d'une preuve stricte pendant les tests, définissez le provider ou
le modèle `agentRuntime.id: "codex"`OpenClaw. Un runtime Codex forcé échoue au lieu de
retomber sur OpenClaw.

**Le runtime Codex OpenAI revient au chemin de la clé API :** collectez un extrait de passerelle expurgé
qui montre le modèle, le runtime, le fournisseur sélectionné et l'échec.
Demandez aux collaborateurs concernés d'exécuter cette commande en lecture seule sur leur hôte OpenClaw :

```bash
(
  pattern='openai/gpt-5\.[45]|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|openai-codex|resolveSelectedOpenAIRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

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
`No API key`. Une exécution corrigée doit afficher le chemin `openai-codex`OAuthOpenAIAPI OAuth
au lieu d'un échec simple de clé API OpenAI.

**La configuration `openai-codex/*` héritée persiste :** exécutez `openclaw doctor --fix`.
Doctor réécrit les références de modèle héritées en `openai/*`, supprime les épinglages de session obsolètes et
de runtime d'agent entier, et préserve les remplacements de profil d'auth existants.

**Le app-server est rejeté :** utilisez le `0.125.0` du app-server Codex ou plus récent.
Les préversions de même version ou les versions avec suffixe de build telles que
`0.125.0-alpha.2` ou `0.125.0+custom`OpenClaw sont rejetées car OpenClaw teste le
plancher stable du protocole `0.125.0`.

**`/codex status` ne parvient pas à se connecter :** vérifiez que le plugin fourni `codex` est
activé, que `plugins.allow` l'inclut lorsqu'une liste d'autorisation est configurée, et
que tout `appServer.command`, `url`, `authToken`, ou en-tête personnalisé est valide.

**La découverte de modèle est lente :** réduisez
`plugins.entries.codex.config.discovery.timeoutMs` ou désactivez la découverte. Consultez
[Référence du harnais Codex](/fr/plugins/codex-harness-reference#model-discovery).

**Le transport WebSocket échoue immédiatement :** vérifiez `appServer.url`, `authToken`,
les en-têtes, et que le serveur d'application distant parle la même version du
protocole du serveur d'application Codex.

**Les outils de shell natif ou de patch sont bloqués avec `Native hook relay unavailable` :**
le thread Codex essaie toujours d'utiliser un id de relais de hook natif qu'OpenClaw n'a
plus enregistré. Il s'agit d'un problème de transport de hook natif Codex, et non d'une défaillance
du backend ACP, du fournisseur, de GitHub, ou de la commande shell. Commencez une nouvelle session dans
le chat affecté avec `/new` ou `/reset`, puis réessayez une commande inoffensive. Si cela
fonctionne une fois mais que l'appel d'outil natif suivant échoue à nouveau, considérez `/new` comme une
solution temporaire uniquement : copiez le prompt dans une nouvelle session après avoir redémarré le serveur d'application Codex
ou la OpenClaw Gateway afin que les anciens threads soient abandonnés et que les
enregistrements de hooks natifs soient recréés.

**Un modèle non-Codex utilise le harnais intégré :** c'est attendu à moins que
la stratégie d'exécution du fournisseur ou du modèle ne l'achemine vers un autre harnais. Les références de fournisseur non-OpenAI classiques
restent sur leur chemin de fournisseur normal en mode `auto`.

**Computer Use est installé mais les outils ne s'exécutent pas :** vérifiez
`/codex computer-use status` à partir d'une nouvelle session. Si un outil signale
`Native hook relay unavailable`, utilisez la récupération de relais de hook natif ci-dessus. Consultez
[Codex Computer Use](/fr/plugins/codex-computer-use#troubleshooting).

## Connexes

- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Plugins Codex natifs](/fr/plugins/codex-native-plugins)
- [Utilisation de l'ordinateur Codex](/fr/plugins/codex-computer-use)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Providers de modèles](/fr/concepts/model-providers)
- [Provider OpenAI](/fr/providers/openai)
- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Crochets de plugin](/fr/plugins/hooks)
- [Export des diagnostics](/fr/gateway/diagnostics)
- [Statut](/fr/cli/status)
- [Tests](/fr/help/testing-live#live-codex-app-server-harness-smoke)
