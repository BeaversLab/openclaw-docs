---
summary: "Utilisez Anthropic Claude via des clés Anthropic ou Claude API dans CLI"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic développe la famille de modèles **Claude**. OpenClaw prend en charge deux méthodes d'authentification :

- **Clé API** — accès direct à l'Anthropic API avec une facturation à l'utilisation (modèles `anthropic/*`)
- **Claude CLI** — réutilisation d'une connexion existante à Claude CLI sur le même hôte

<Warning>
Le personnel d'Anthropic nous a indiqué que l'utilisation de Claude OpenClaw de type CLI est à nouveau autorisée, donc
OpenClaw considère la réutilisation de Claude CLI et l'utilisation de `claude -p` comme sanctionnées, sauf si
Anthropic publie une nouvelle politique.

Pour les hôtes de passerelle à longue durée de vie, les clés Anthropic d'API restent la voie de production
la plus claire et la plus prévisible.

Documentation publique actuelle d'Anthropic :

- [Référence du CLI Claude Code](https://code.claude.com/docs/en/cli-reference)
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
      env: { ANTHROPIC_API_KEY: "sk-ant-..." },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **Idéal pour :** réutiliser une connexion existante à la Claude CLI sans clé API distincte.

    <Steps>
      <Step title="S'assurer que la Claude CLI est installée et connectée">
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

        OpenClaw détecte et réutilise les identifiants existants de la Claude CLI.
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Les détails de configuration et d'exécution du backend de la Claude CLI se trouvent dans [Backends CLI](/en/gateway/cli-backends).
    </Note>

    <Tip>
    Si vous souhaitez la voie de facturation la plus claire, utilisez plutôt une clé Anthropic API. OpenClaw prend également en charge les options de type abonnement depuis [OpenAI Codex](/en/providers/openai), [Qwen Cloud](/en/providers/qwen), [MiniMax](/en/providers/minimax), et [Z.AI / GLM](/en/providers/glm).
    </Tip>

  </Tab>
</Tabs>

## Valeurs par défaut de réflexion (Claude 4.6)

Les modèles Claude 4.6 utilisent par défaut la réflexion `adaptive` dans OpenClaw lorsqu'aucun niveau de réflexion explicite n'est défini.

Remplacez par message avec `/think:<level>` ou dans les paramètres du modèle :

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
    Utilisez les paramètres au niveau du modèle comme base de référence, puis remplacez des agents spécifiques via `agents.list[].params` :

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

    Cela permet à un agent de conserver un cache à long terme tandis qu'un autre agent sur le même modèle désactive le cache pour le trafic sporadique/à faible réutilisation.

  </Accordion>

  <Accordion title="Notes sur Claude Bedrock">
    - Les modèles Anthropic Claude sur Bedrock (`amazon-bedrock/*anthropic.claude*`) acceptent le transfert `cacheRetention` lorsqu'ils sont configurés.
    - Les modèles Bedrock non-Anthropic sont forcés à `cacheRetention: "none"` lors de l'exécution.
    - Les valeurs par défaut intelligentes de clé API initialisent également `cacheRetention: "short"` pour les références Claude-sur-Bedrock lorsqu'aucune valeur explicite n'est définie.
  </Accordion>
</AccordionGroup>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Mode rapide">
    L'interrupteur partagé `/fast` de OpenClaw prend en charge le trafic direct Anthropic (clé API et OAuth vers `api.anthropic.com`).

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
    - Injecté uniquement pour les requêtes directes vers `api.anthropic.com`. Les routes de proxy laissent `service_tier` inchangé.
    - Les paramètres explicites `serviceTier` ou `service_tier` remplacent `/fast` lorsque les deux sont définis.
    - Sur les comptes sans capacité de niveau prioritaire, `service_tier: "auto"` peut résoudre à `standard`.
    </Note>

  </Accordion>

  <Accordion title="Compréhension des médias (image et PDF)">
    Le plugin Anthropic intégré enregistre la compréhension des images et des PDF. OpenClaw
    résout automatiquement les capacités multimédias à partir de l'authentification Anthropic configurée — aucune
    configuration supplémentaire n'est nécessaire.

    | Propriété       | Value                |
    | -------------- | -------------------- |
    | Modèle par défaut  | `claude-opus-4-6`    |
    | Entrée prise en charge | Images, documents PDF |

    Lorsqu'une image ou un PDF est joint à une conversation, OpenClaw l'achemine
    automatiquement via le fournisseur de compréhension des médias Anthropic.

  </Accordion>

  <Accordion title="Fenêtre de contexte de 1M (bêta)">
    La fenêtre de contexte de 1M de Anthropic est en version bêta restreinte. Activez-la par modèle :

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

    OpenClaw mappe cela vers `anthropic-beta: context-1m-2025-08-07` dans les requêtes.

    <Warning>
    Nécessite un accès au contexte long sur vos identifiants Anthropic. L'authentification par token héritée (`sk-ant-oat-*`) est rejetée pour les demandes de contexte 1M — OpenClaw enregistre un avertissement et revient à la fenêtre de contexte standard.
    </Warning>

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="Erreurs 401 / token soudainement invalide">
    L'authentification par token Anthropic peut expirer ou être révoquée. Pour les nouvelles configurations, migrez vers une clé d'Anthropic API.
  </Accordion>

<Accordion title='Aucune clé API trouvée pour le fournisseur "anthropic"'>L'authentification est **par agent**. Les nouveaux agents n'héritent pas des clés de l'agent principal. Relancez l'intégration pour cet agent, ou configurez une clé API sur l'hôte de la passerelle, puis vérifiez avec `openclaw models status`.</Accordion>

<Accordion title='Aucune identifiante trouvée pour le profil "anthropic:default"'>Exécutez `openclaw models status` pour voir quel profil d'authentification est actif. Relancez l'intégration, ou configurez une clé API pour ce chemin de profil.</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    Vérifiez `openclaw models status --json` pour `auth.unusableProfiles`. Les temps d'attente de limite de taux Anthropic peuvent dépendre du modèle, un modèle Anthropic frère peut donc toujours être utilisable. Ajoutez un autre profil Anthropic ou attendez la fin du temps d'attente.
  </Accordion>
</AccordionGroup>

<Note>Plus d'aide : [Dépannage](/en/help/troubleshooting) et [FAQ](/en/help/faq).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/en/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Backends CLI" href="/en/gateway/cli-backends" icon="terminal">
    Configuration du backend CLI Claude et détails d'exécution.
  </Card>
  <Card title="Mise en cache des prompts" href="/en/reference/prompt-caching" icon="database">
    Fonctionnement de la mise en cache des prompts entre les fournisseurs.
  </Card>
  <Card title="OAuth et auth" href="/en/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
</CardGroup>
