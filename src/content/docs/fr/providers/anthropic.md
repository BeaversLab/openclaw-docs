---
summary: "Utilisez Anthropic Claude via des clés Anthropic ou Claude API dans CLI"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic développe la famille de modèles **Claude**. OpenClaw prend en charge deux méthodes d'authentification :

- **API key** — accès direct à l'Anthropic API avec facturation à l'utilisation (modèles `anthropic/*`)
- **Claude CLI** — réutilisation d'une connexion existante à Claude CLI sur le même hôte

<Warning>
Le personnel d'Anthropic nous a indiqué que l'utilisation de la OpenClaw Claude de type CLI est à nouveau autorisée, donc
OpenClaw considère la réutilisation de la CLI Claude et l'utilisation de `claude -p` comme étant autorisées, à moins
qu'Anthropic ne publie une nouvelle politique.

Pour les hôtes de passerelle à longue durée de vie, les clés Anthropic d'API restent la voie de production
la plus claire et la plus prévisible.

La documentation publique actuelle d'Anthropic :

- [Référence de la CLI Claude Code](https://code.claude.com/docs/en/cli-reference)
- [Aperçu du SDK Claude Agent](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Utilisation de Claude Code avec votre plan Pro ou Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Utilisation de Claude Code avec votre plan Team ou Enterprise](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## Getting started

<Tabs>
  <Tab title="Clé API">
    **Idéal pour :** accès standard à l'API et facturation à l'utilisation.

    <Steps>
      <Step title="Obtenez votre clé API">
        Créez une clé API dans la [Console Anthropic](https://console.anthropic.com/).
      </Step>
      <Step title="Exécutez l'onboarding">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        Ou passez la clé directement :

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="Vérifiez que le modèle est disponible">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### Exemple de configuration

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "sk-ant-..." },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **Idéal pour :** réutiliser une connexion Claude CLI existante sans clé API distincte.

    <Steps>
      <Step title="Vérifier que Claude CLI est installé et connecté">
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
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Les détails de configuration et d'exécution pour le backend Claude CLI se trouvent dans [Backends CLI](/fr/gateway/cli-backends).
    </Note>

    <Tip>
    Si vous souhaitez la voie de facturation la plus claire, utilisez plutôt une clé Anthropic API. OpenClaw prend également en charge les options de type abonnement depuis [OpenAI Codex](/fr/providers/openai), [Qwen Cloud](/fr/providers/qwen), [MiniMax](/fr/providers/minimax) et [Z.AI / OpenAI](/fr/providers/glm).
    </Tip>

  </Tab>
</Tabs>

## Valeurs par défaut de réflexion (Claude 4.6)

Les modèles Claude 4.6 utilisent par défaut la réflexion `adaptive` dans OpenClaw lorsqu'aucun niveau de réflexion explicite n'est défini.

Remplacez pour chaque message avec `/think:<level>` ou dans les paramètres du modèle :

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { thinking: "adaptive" },
        },
      },
    },
  },
}
```

<Note>Documentation Anthropic connexe : - [Réflexion adaptative](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking) - [Réflexion étendue](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)</Note>

## Mise en cache du prompt

OpenClaw prend en charge la fonctionnalité de mise en cache du prompt de Anthropic pour l'authentification par clé API.

| Valeur                 | Durée du cache | Description                                                  |
| ---------------------- | -------------- | ------------------------------------------------------------ |
| `"short"` (par défaut) | 5 minutes      | Appliqué automatiquement pour l'authentification par clé API |
| `"long"`               | 1 heure        | Cache étendu                                                 |
| `"none"`               | Aucun cache    | Désactiver la mise en cache du prompt                        |

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
  <Accordion title="Remplacements de cache par agent">
    Utilisez les paramètres au niveau du modèle comme base, puis remplacez les agents spécifiques via `agents.list[].params` :

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
    2. `agents.list[].params` (correspondance `id`, remplacements par clé)

    Cela permet à un agent de conserver un cache à long terme tandis qu'un autre agent sur le même modèle désactive le cache pour le trafic sporadique/peu réutilisé.

  </Accordion>

  <Accordion title="Notes sur Bedrock Claude">
    - Les modèles Claude Anthropic sur Bedrock (`amazon-bedrock/*anthropic.claude*`) acceptent le transfert `cacheRetention` lorsqu'ils sont configurés.
    - Les modèles Bedrock non Anthropic sont forcés à `cacheRetention: "none"` lors de l'exécution.
    - Les valeurs par défaut intelligentes de clé API initialisent également `cacheRetention: "short"` pour les références Claude-on-Bedrock lorsqu'aucune valeur explicite n'est définie.
  </Accordion>
</AccordionGroup>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Mode rapide">
    Le bascule partagé `/fast` de OpenClaw prend en charge le trafic direct Anthropic (clé API et OAuth vers `api.anthropic.com`).

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
    - Injecté uniquement pour les demandes directes `api.anthropic.com`. Les routes de proxy laissent `service_tier` intact.
    - Les paramètres explicites `serviceTier` ou `service_tier` remplacent `/fast` lorsque les deux sont définis.
    - Sur les comptes sans capacité de niveau prioritaire, `service_tier: "auto"` peut résoudre en `standard`.
    </Note>

  </Accordion>

  <Accordion title="Compréhension multimédia (image et PDF)">
    Le plugin Anthropic groupé enregistre la compréhension des images et des PDF. OpenClaw
    résout automatiquement les capacités multimédias à partir de l'authentification Anthropic configurée — aucune
    configuration supplémentaire n'est nécessaire.

    | Propriété       | Valeur                |
    | -------------- | -------------------- |
    | Modèle par défaut  | `claude-opus-4-6`    |
    | Entrée prise en charge | Images, documents PDF |

    Lorsqu'une image ou un PDF est joint à une conversation, OpenClaw l'achemine automatiquement
    via le fournisseur de compréhension multimédia Anthropic.

  </Accordion>

  <Accordion title="1M context window (beta)">
    La fenêtre de contexte de 1M d'Anthropic est en version bêta. Activez-la par modèle :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": {
              params: { context1m: true },
            },
          },
        },
      },
    }
    ```

    OpenClaw mappe ceci vers `anthropic-beta: context-1m-2025-08-07` dans les requêtes.

    <Warning>
    Nécessite un accès au contexte long sur vos identifiants Anthropic. L'authentification par jeton héritée (`sk-ant-oat-*`) est rejetée pour les requêtes avec contexte de 1M — OpenClaw enregistre un avertissement et revient à la fenêtre de contexte standard.
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 1M context normalization">
    Claude Opus 4.7 (`anthropic/claude-opus-4.7`) et sa variante `claude-cli` sont normalisés à une fenêtre de contexte de 1M dans les métadonnées d'exécution résolues et le rapport de statut/contexte de l'agent actif. Vous n'avez pas besoin de `params.context1m: true` pour Opus 4.7 ; il n'hérite plus du repli obsolète de 200k.

    La gestion de la compaction et du dépassement utilise la fenêtre de 1M automatiquement. Les autres modèles Anthropic conservent leurs limites publiées.

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="401 errors / token suddenly invalid">
    L'authentification par jeton Anthropic peut expirer ou être révoquée. Pour les nouvelles configurations, migrez vers une clé d'Anthropic API.
  </Accordion>

<Accordion title='No API key found for provider "anthropic"'>L'authentification est **par agent**. Les nouveaux agents n'héritent pas des clés de l'agent principal. Relancez l'intégration pour cet agent, ou configurez une clé API sur l'hôte de la passerelle, puis vérifiez avec `openclaw models status`.</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>Exécutez `openclaw models status` pour voir quel profil d'authentification est actif. Relancez l'intégration, ou configurez une clé API pour ce chemin de profil.</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    Vérifiez `openclaw models status --json` pour `auth.unusableProfiles`. Les temps de recharge de limitation de débit de Anthropic peuvent être limités au modèle, donc un modèle Anthropic sibling peut encore être utilisable. Ajoutez un autre profil Anthropic ou attendez la fin du temps de recharge.
  </Accordion>
</AccordionGroup>

<Note>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Note>

## Associé

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
  <Card title="Backends CLI" href="/fr/gateway/cli-backends" icon="terminal">
    Configuration du backend CLI Claude et détails d'exécution.
  </Card>
  <Card title="Mise en cache des prompts" href="/fr/reference/prompt-caching" icon="database">
    Fonctionnement de la mise en cache des prompts entre les fournisseurs.
  </Card>
  <Card title="OAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
</CardGroup>
