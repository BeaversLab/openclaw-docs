---
summary: "Utilisez Claude Anthropic via des clés API ou la CLI Claude dans OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

Anthropic développe la famille de **model** Claude. OpenClaw prend en charge deux méthodes d'authentification :

- **Clé API** — accès direct à l'Anthropic API avec facturation à l'utilisation (`anthropic/*` models)
- **Claude CLI** — réutiliser une connexion Claude Code existante sur le même hôte

<Warning>
Le backend Claude OpenClaw d'CLI exécute le Claude Code CLI installé en
mode d'impression non interactif. La documentation actuelle de Claude Code d'Anthropic décrit
`claude -p` comme une utilisation programmatique/de l'Agent SDK. À partir du 15 juin 2026, Anthropic
déclare que l'utilisation du `claude -p` de forfait par abonnement ne puise plus dans les limites normales du forfait
Claude ; elle puise d'abord dans un crédit mensuel distinct de l'Agent SDK, puis dans
les crédits d'utilisation aux tarifs standard de l'API lorsque ces crédits sont activés.

Claude Code interactif puise toujours dans les limites du forfait Claude connecté. L'authentification par
clé API reste une facturation directe de l'API à la demande. Pour les hôtes de passerelle à longue durée de vie,
l'automatisation partagée et les dépenses de production prévisibles, utilisez une clé Anthropic API.

Documentation publique actuelle d'Anthropic :

- [Référence du Claude Code CLI](https://code.claude.com/docs/en/cli-usage)
- [Utiliser le Claude Agent SDK avec votre forfait Claude](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
- [Utiliser Claude Code avec votre forfait Pro ou Max](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
- [Utiliser Claude Code avec votre forfait Team ou Enterprise](https://support.claude.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan)
- [Gérer les coûts de Claude Code](https://code.claude.com/docs/en/costs)

</Warning>

## Getting started

<Tabs>
  <Tab title="APIClé API"API>
    **Idéal pour :** accès standard à l'API et facturation à l'utilisation.

    <Steps>
      <Step title="APIObtenir votre clé API"API>
        Créez une clé API dans la [Console Anthropic](https://console.anthropic.com/).
      </Step>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        Ou passez la clé directement :

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### Exemple de configuration

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "example-anthropic-key-not-real" },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-8" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **Idéal pour :** réutiliser une connexion Claude CLI existante sans devoir utiliser une clé API distincte.

    <Steps>
      <Step title="S'assurer que Claude CLI est installé et connecté">
        Vérifiez avec :

        ```bash
        claude --version
        ```
      </Step>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard
        # choose: Claude CLI
        ```

        OpenClaw détecte et réutilise les identifiants Claude CLI existants.
      </Step>
      <Step title="Vérifier la disponibilité du modèle">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Les détails de configuration et d'exécution pour le backend Claude CLI se trouvent dans [Backends CLI](/fr/gateway/cli-backends).
    </Note>

    <Warning>
    La réutilisation du Claude CLI s'attend à ce que le processus OpenClaw s'exécute sur le même hôte que la
    connexion Claude CLI. Les installations dans des conteneurs comme [Podman](/fr/install/podman) ne montent pas
    le `~/.claude` de l'hôte dans la configuration ou l'exécution ; utilisez-y une clé Anthropic API,
    ou choisissez un provider avec un OpenClaw géré par OAuth tel que
    [OpenAI Codex](/fr/providers/openai).
    </Warning>

    ### Exemple de configuration

    Préférez la référence de modèle canonique Anthropic ainsi qu'une surcharge d'exécution CLI :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-8" },
          models: {
            "anthropic/claude-opus-4-8": {
              agentRuntime: { id: "claude-cli" },
            },
          },
        },
      },
    }
    ```

    Les références de modèle `claude-cli/claude-opus-4-7` obsolètes fonctionnent toujours pour des raisons de compatibilité,
    mais les nouvelles configurations devraient conserver la sélection provider/model en tant que
    `anthropic/*` et placer le backend d'exécution dans la stratégie d'exécution provider/model.

    ### Facturation et `claude -p`

    OpenClaw utilise le chemin non-interactif `claude -p` de Claude Code pour les exécutions
    du Claude CLI. Anthropic traite actuellement ce chemin comme une utilisation Agent SDK/programmatique :

    - Jusqu'au 15 juin 2026, la gestion des abonnements suit les règles actives de
      Claude Code de Anthropic pour le compte connecté.
    - À partir du 15 juin 2026, l'utilisation du `claude -p` d'abonnement puise d'abord dans le crédit
      mensuel Agent SDK de l'utilisateur, puis dans les crédits d'utilisation aux tarifs standards de l'API
      si les crédits d'utilisation sont activés.
    - Les connexions Console/Clé-API utilisent la facturation API à la demande et ne bénéficient pas
      du crédit Agent SDK d'abonnement.

    Anthropic peut modifier le comportement de facturation et de limitation de débit de Claude Code sans
    publication d'une version OpenClaw. Vérifiez `claude auth status`, `/status` et la documentation
    liée de Anthropic lorsque la prévisibilité de la facturation est importante.

    <Tip>
    Pour l'automatisation de production partagée, utilisez une clé Anthropic API plutôt que
    le Claude CLI. OpenClaw prend également en charge les options de type abonnement proposées par
    [OpenAI Codex](/fr/providers/openai), [Qwen Cloud](/fr/providers/qwen),
    [MiniMax](/fr/providers/minimax) et [Z.AI / GLM](/fr/providers/zai).
    </Tip>

  </Tab>
</Tabs>

## Valeurs par défaut de réflexion (Claude 4.8 et 4.6)

Claude Opus 4.8 désactive la réflexion par défaut dans OpenClaw. Lorsque vous activez explicitement la réflexion adaptative avec `/think high|xhigh|max`, OpenClaw envoie les valeurs d'effort Opus 4.8 de Anthropic ; les modèles Claude 4.6 ont par défaut la valeur `adaptive`.

Remplacez par message avec `/think:<level>` ou dans les paramètres du modèle :

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-8": {
          params: { thinking: "high" },
        },
      },
    },
  },
}
```

<Note>
Documentation Anthropic connexe :
- [Réflexion adaptative](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Réflexion étendue](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

</Note>

## Cache de prompt

OpenClaw prend en charge la fonctionnalité de cache de prompt de Anthropic pour l'authentification par clé API.

| Valeur                 | Durée du cache | Description                                                  |
| ---------------------- | -------------- | ------------------------------------------------------------ |
| `"short"` (par défaut) | 5 minutes      | Appliqué automatiquement pour l'authentification par clé API |
| `"long"`               | 1 heure        | Cache étendu                                                 |
| `"none"`               | Pas de cache   | Désactiver le cache de prompt                                |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Remplacements du cache par agent">
    Utilisez les paramètres au niveau du modèle comme base, puis remplacez des agents spécifiques via `agents.list[].params` :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": {
              params: { cacheRetention: "long" },
            },
          },
        },
        list: [
          { id: "research", default: true },
          { id: "alerts", params: { cacheRetention: "none" } },
        ],
      },
    }
    ```

    Ordre de fusion de la configuration :

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.list[].params` (correspondance `id`, remplacement par clé)

    Cela permet à un agent de conserver un cache à long terme tandis qu'un autre agent sur le même modèle désactive le cache pour le trafic par rafales/à faible réutilisation.

  </Accordion>

  <Accordion title="Notes sur Claude Bedrock">
    - Les modèles Claude Anthropic sur Bedrock (`amazon-bedrock/*anthropic.claude*`) acceptent le transfert `cacheRetention` lorsqu'ils sont configurés.
    - Les modèles Bedrock non Anthropic sont forcés à `cacheRetention: "none"` lors de l'exécution.
    - Les valeurs par défaut intelligentes de clé API initialisent également `cacheRetention: "short"` pour les références Claude-on-Bedrock lorsqu aucune valeur explicite n'est définie.

  </Accordion>
</AccordionGroup>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Mode rapide">
    L'interrupteur partagé `/fast` d'OpenClaw prend en charge le trafic direct vers Anthropic (clé API et OAuth vers `api.anthropic.com`).

    | Commande | Correspond à |
    |---------|---------|
    | `/fast on` | `service_tier: "auto"` |
    | `/fast off` | `service_tier: "standard_only"` |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-sonnet-4-6": {
              params: { fastMode: true },
            },
          },
        },
      },
    }
    ```

    <Note>
    - Injecté uniquement pour les requêtes directes vers `api.anthropic.com`. Les routes de proxy laissent `service_tier` intact.
    - Les paramètres explicites `serviceTier` ou `service_tier` remplacent `/fast` lorsque les deux sont définis.
    - Sur les comptes sans capacité Priority Tier, `service_tier: "auto"` peut résoudre à `standard`.

    </Note>

  </Accordion>

  <Accordion title="Compréhension des médias (image et PDF)">
    Le plugin Anthropic intégré enregistre la compréhension des images et des PDF. OpenClaw
    résout automatiquement les capacités des médias à partir de l'authentification Anthropic configurée — aucune
    configuration supplémentaire n'est nécessaire.

    | Propriété        | Valeur                 |
    | --------------- | --------------------- |
    | Modèle par défaut   | `claude-opus-4-8`     |
    | Entrée prise en charge | Images, documents PDF |

    Lorsqu'une image ou un PDF est joint à une conversation, OpenClaw achemine automatiquement
    via le fournisseur de compréhension des médias Anthropic.

  </Accordion>

  <Accordion title="Fenêtre de contexte de 1M">
    La fenêtre de contexte de 1M d'Anthropic est disponible sur les modèles Claude 4.x compatibles GA
    tels qu'Opus 4.8, Opus 4.7, Opus 4.6 et Sonnet 4.6. OpenClaw dimensionne ces modèles à
    1M automatiquement :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": {},
          },
        },
      },
    }
    ```

    Les anciennes configurations peuvent conserver `params.context1m: true`, mais OpenClaw n'envoie plus
    l'en-tête bêta `context-1m-2025-08-07` retiré. Les anciennes entrées de configuration `anthropicBeta`
    avec cette valeur sont ignorées lors de la résolution des en-têtes de requête et
    les anciens modèles Claude non pris en charge restent sur leur fenêtre de contexte normale.

    `params.context1m: true` s'applique également au backend Claude CLI
    (`claude-cli/*`) pour les modèles Opus et Sonnet éligibles compatibles GA, préservant
    la fenêtre de contexte d'exécution pour ces sessions CLI afin de correspondre au comportement de l'API direct.

    <Warning>
    Nécessite un accès au contexte long sur vos identifiants Anthropic. L'authentification par jeton OAuth/abonnement conserve ses en-têtes bêta Anthropic requis, mais OpenClaw supprime l'en-tête bêta 1M retiré s'il persiste dans l'ancienne configuration.
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.8 1M context">
    `anthropic/claude-opus-4-8` et sa variante `claude-cli` disposent d'une fenêtre de
    contexte de 1M par défaut — aucun `params.context1m: true` n'est nécessaire.
  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="401 errors / token suddenly invalid">
    L'authentification par jeton Anthropic expire et peut être révoquée. Pour les nouvelles configurations, utilisez plutôt une clé d'Anthropic API.
  </Accordion>

<Accordion title='Aucune clé API trouvée pour le provider "anthropic"'>L'authentification Anthropic est **par agent** — les nouveaux agents n'héritent pas des clés de l'agent principal. Relancez l'onboarding pour cet agent (ou configurez une clé API sur l'hôte de la passerelle), puis vérifiez avec `openclaw models status`.</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>Exécutez `openclaw models status` pour voir quel profil d'authentification est actif. Relancez l'onboarding, ou configurez une clé API pour ce chemin de profil.</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    Consultez `openclaw models status --json` pour `auth.unusableProfiles`. Les temps d'attente de limitation de débit Anthropic peuvent être spécifiques à un modèle, un modèle Anthropic voisin peut donc toujours être utilisable. Ajoutez un autre profil Anthropic ou attendez la fin du temps d'attente.
  </Accordion>
</AccordionGroup>

<Note>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèles et le comportement de basculement.
  </Card>
  <Card title="CLI backends" href="/fr/gateway/cli-backends" icon="terminal">
    Configuration et détails d'exécution du backend Claude CLI.
  </Card>
  <Card title="Prompt caching" href="/fr/reference/prompt-caching" icon="database">
    Fonctionnement du cache de prompt (prompt caching) entre les fournisseurs.
  </Card>
  <Card title="OAuth and auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
</CardGroup>
