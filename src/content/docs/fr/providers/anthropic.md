---
summary: "Utilisez Claude Anthropic via des clés API ou la CLI Claude dans OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

Anthropic développe la famille de **model** Claude. OpenClaw prend en charge deux méthodes d'authentification :

- **Clé API** — accès direct à l'Anthropic API avec facturation à l'utilisation (`anthropic/*` models)
- \***\*PH:GLOSSARY:141:2b65cd25%% Claude** — réutilisation d'une connexion existante à la CLI Claude sur le même hôte

<Warning>
Le personnel de Anthropic nous a informés que l'utilisation de la OpenClaw Claude de type CLI est à nouveau autorisée, donc
OpenClaw considère la réutilisation de la CLI Claude et l'utilisation de `claude -p` comme étant approuvées, sauf si
Anthropic publie une nouvelle politique.

Pour les hôtes de passerelle à longue durée de vie, les clés Anthropic de API restent la voie de production
la plus claire et la plus prévisible.

Documentation publique actuelle de Anthropic :

- [Référence de la CLI Claude Code](https://code.claude.com/docs/en/cli-reference)
- [Aperçu du SDK Claude Agent](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Utilisation de Claude Code avec votre plan Pro ou Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Utilisation de Claude Code avec votre plan Team ou Enterprise](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## Getting started

<Tabs>
  <Tab title="APIClé API"API>
    **Idéal pour :** un accès standard à l'API et une facturation à l'utilisation.

    <Steps>
      <Step title="APIObtenir votre clé API"APIAnthropic>
        Créez une clé API dans la [Console Anthropic](https://console.anthropic.com/).
      </Step>
      <Step title="Exécuter l'intégration">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        Ou transmettez la clé directement :

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
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
    }
    ```

  </Tab>

  <Tab title="CLIClaude CLI"CLIAPI>
    **Idéal pour :** réutiliser une connexion Claude CLI existante sans clé API distincte.

    <Steps>
      <Step title="CLIVérifier que Claude CLI est installé et connecté">
        Vérifiez avec :

        ```bash
        claude --version
        ```
      </Step>
      <Step title="Exécuter l'intégration">
        ```bash
        openclaw onboard
        # choose: Claude CLI
        ```OpenClawCLI

        OpenClaw détecte et réutilise les identifiants Claude CLI existants.
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider anthropic
        ```CLICLI
      </Step>
    </Steps>

    <Note>
    Les détails de configuration et d'exécution pour le backend Claude CLI se trouvent dans [Backends CLI](/en/gateway/cli-backendsAnthropicCLI).
    </Note>

    ### Exemple de configuration

    Privilégiez la référence canonique du modèle Anthropic ainsi qu'une substitution d'exécution CLI :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-7" },
          models: {
            "anthropic/claude-opus-4-7": {
              agentRuntime: { id: "claude-cli" },
            },
          },
        },
      },
    }
    ```

    Les références de modèle obsolètes `claude-cli/claude-opus-4-7` fonctionnent toujours par souci de compatibilité, mais les nouvelles configurations devraient conserver la sélection du fournisseur/modèle comme `anthropic/*`AnthropicAPIOpenClawOpenAI et placer le backend d'exécution dans la stratégie d'exécution du fournisseur/modèle.

    <Tip>
    Si vous souhaitez la voie de facturation la plus claire, utilisez plutôt une clé API Anthropic. OpenClaw prend également en charge les options de type abonnement depuis [OpenAI Codex](/fr/providers/openaiQwen), [Qwen Cloud](/fr/providers/qwenMiniMax), [MiniMax](/fr/providers/minimaxGLM) et [Z.AI / GLM](/fr/providers/zai).
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

<Note>
Documentation Anthropic connexe :
- [Adaptive thinking](Anthropichttps://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

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
  <Accordion title="Per-agent cache overrides">
    Utilisez les paramètres au niveau du modèle comme base, puis redéfinissez des agents spécifiques via `agents.list[].params` :

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

    Cela permet à un agent de conserver un cache à long terme tandis qu'un autre agent sur le même modèle désactive la mise en cache pour le trafic sporadique/faiblement réutilisé.

  </Accordion>

  <Accordion title="Bedrock Claude notes"Anthropic>
    - Les modèles Claude d'Anthropic sur Bedrock (`amazon-bedrock/*anthropic.claude*`) acceptent le transfert `cacheRetention`Anthropic lorsqu'ils sont configurés.
    - Les modèles Bedrock non-Anthropic sont forcés à `cacheRetention: "none"`API lors de l'exécution.
    - Les valeurs par défaut intelligentes de clé d'API amorcent également `cacheRetention: "short"` pour les références Claude-on-Bedrock lorsqu'aucune valeur explicite n'est définie.

  </Accordion>
</AccordionGroup>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Mode rapide"OpenClaw>
    L'interrupteur partagé `/fast`AnthropicAPIOAuth d'OpenClaw prend en charge le trafic direct vers Anthropic (clé d'API et OAuth vers `api.anthropic.com`).

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
    - Sur les comptes sans capacité de niveau prioritaire, `service_tier: "auto"` peut être résolu en `standard`.

    </Note>

  </Accordion>

  <Accordion title="Compréhension des médias (image et PDF)"AnthropicOpenClawAnthropic>
    Le plugin Anthropic inclus enregistre la compréhension d'images et de PDF. OpenClaw
    résout automatiquement les capacités multimédias à partir de l'authentification Anthropic configurée — aucune
    configuration supplémentaire n'est nécessaire.

    | Propriété        | Valeur                 |
    | --------------- | --------------------- |
    | Modèle par défaut   | `claude-opus-4-7`OpenClawAnthropic     |
    | Entrée prise en charge | Images, documents PDF |

    Lorsqu'une image ou un PDF est joint à une conversation, OpenClaw achemine
    automatiquement celui-ci via le fournisseur de compréhension des médias d'Anthropic.

  </Accordion>

  <Accordion title="Fenêtre de contexte de 1M">
    La fenêtre de contexte de 1M d'Anthropic est disponible sur les modèles Claude 4.x compatibles GA
    tels qu'Opus 4.6, Opus 4.7 et Sonnet 4.6. OpenClaw dimensionne ces modèles à
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
    (`claude-cli/*`) pour les modèles Opus et Sonnet éligibles et compatibles GA, préservant
    la fenêtre de contexte d'exécution pour ces sessions CLI pour correspondre au comportement de l'API direct.

    <Warning>
    Nécessite un accès au contexte long sur vos identifiants Anthropic. L'authentification par jeton OAuth/abonnement conserve ses en-têtes bêta Anthropic requis, mais OpenClaw supprime l'en-tête bêta 1M retiré s'il subsiste dans l'ancienne configuration.
    </Warning>

  </Accordion>

  <Accordion title="Contexte 1M Claude Opus 4.7">
    `anthropic/claude-opus-4-7` et sa variante `claude-cli` disposent d'une fenêtre de
    contexte de 1M par défaut — aucun `params.context1m: true` nécessaire.
  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="401 errors / token suddenly invalid">
    L'authentification par jeton Anthropic expire et peut être révoquée. Pour les nouvelles configurations, utilisez plutôt une clé d'Anthropic API.
  </Accordion>

<Accordion title='No API key found for provider "anthropic"'>L'authentification Anthropic est **par agent** — les nouveaux agents n'héritent pas des clés de l'agent principal. Relancez l'intégration (onboarding) pour cet agent (ou configurez une clé d'API sur l'hôte de la passerelle), puis vérifiez avec `openclaw models status`.</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>Exécutez `openclaw models status` pour voir quel profil d'authentification est actif. Relancez l'intégration (onboarding), ou configurez une clé API pour ce chemin de profil.</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    Consultez `openclaw models status --json` pour `auth.unusableProfiles`. Les temps de recharge des limites de débit (rate-limit) Anthropic peuvent être spécifiques au modèle, un modèle Anthropic voisin peut donc encore être utilisable. Ajoutez un autre profil Anthropic ou attendez la fin du temps de recharge.
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
