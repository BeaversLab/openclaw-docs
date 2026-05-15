---
summary: "Configuration DeepSeek (auth + sélection de modèle)"
title: "DeepSeek"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

[DeepSeek](https://www.deepseek.com) fournit des modèles IA puissants avec une API compatible OpenAIAPI.

| Propriété   | Valeur                     |
| ----------- | -------------------------- |
| Fournisseur | `deepseek`                 |
| Auth        | `DEEPSEEK_API_KEY`         |
| API         | compatible OpenAI          |
| URL de base | `https://api.deepseek.com` |

## Getting started

<Steps>
  <Step title="Obtenez votre clé API">
    Créez une clé API sur [platform.deepseek.com](https://platform.deepseek.com/api_keys).
  </Step>
  <Step title="Lancer l'onboarding">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    Cela vous demandera votre clé API et définira `deepseek/deepseek-v4-flash` comme modèle par défaut.

  </Step>
  <Step title="Vérifier que les modèles sont disponibles">
    ```bash
    openclaw models list --provider deepseek
    ```

    Pour inspecter le catalogue statique intégré sans nécessiter de Gateway en cours d'exécution,
    utilisez :

    ```bash
    openclaw models list --all --provider deepseek
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Configuration non interactive">
    Pour les installations scriptées ou sans tête, passez tous les indicateurs directement :

    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice deepseek-api-key \
      --deepseek-api-key "$DEEPSEEK_API_KEY" \
      --skip-health \
      --accept-risk
    ```

  </Accordion>
</AccordionGroup>

<Warning>Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `DEEPSEEK_API_KEY` est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via `env.shellEnv`).</Warning>

## Catalogue intégré

| Réf modèle                   | Nom               | Entrée | Contexte  | Sortie max | Notes                                               |
| ---------------------------- | ----------------- | ------ | --------- | ---------- | --------------------------------------------------- |
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | text   | 1 000 000 | 384 000    | Modèle par défaut ; surface compatible réflexion V4 |
| `deepseek/deepseek-v4-pro`   | DeepSeek V4 Pro   | texte  | 1 000 000 | 384 000    | Surface compatible réflexion V4                     |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | texte  | 131 072   | 8 192      | Surface non réflexion DeepSeek V3.2                 |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | texte  | 131 072   | 65 536     | Surface V3.2 activée pour le raisonnement           |

<Tip>Les modèles V4 prennent en charge le contrôle `thinking` de DeepSeek. OpenClaw rejoue également le `reasoning_content` DeepSeek lors des tours de suivi afin que les sessions de réflexion avec des appels de tool puissent se poursuivre. Utilisez `/think xhigh` ou `/think max` avec les modèles DeepSeek V4 pour demander le `reasoning_effort` maximal de DeepSeek.</Tip>

## Réflexion et outils

Les sessions de réflexion DeepSeek V4 ont un contrat de relecture plus strict que la plupart des fournisseurs compatibles OpenAI : après qu'un tour activé pour la réflexion utilise des outils, DeepSeek s'attend à ce que les messages d'assistant relus à partir de ce tour incluent `reasoning_content` lors des demandes de suivi. OpenClaw gère cela en interne via le plugin DeepSeek, donc l'utilisation multi-tours normale des outils fonctionne avec `deepseek/deepseek-v4-flash` et `deepseek/deepseek-v4-pro`.

Si vous basculez une session existante d'un autre fournisseur compatible OpenAI vers un modèle DeepSeek V4, les tours d'appels d'outil de l'assistant plus anciens peuvent ne pas avoir de `reasoning_content` natif DeepSeek. OpenClaw remplit ce champ manquant sur les messages d'assistant relus pour les demandes de réflexion DeepSeek V4, afin que le fournisseur puisse accepter l'historique sans exiger `/new`.

Lorsque la réflexion est désactivée dans OpenClaw (y compris lors de la sélection **None** dans l'interface),
OpenClaw envoie DeepSeek `thinking: { type: "disabled" }` et supprime les `reasoning_content`
rejoués de l'historique sortant. Cela permet de maintenir les sessions avec réflexion désactivée
sur le chemin DeepSeek sans réflexion.

Utilisez `deepseek/deepseek-v4-flash` pour le chemin rapide par défaut. Utilisez
`deepseek/deepseek-v4-pro` lorsque vous souhaitez le model V4 plus puissant et que vous pouvez accepter
un coût ou une latence plus élevés.

## Test en direct

La suite de modèles en direct comprend DeepSeek V4 dans l'ensemble de modèles modernes. Pour
n'exécuter que les vérifications du modèle direct DeepSeek V4 :

```bash
OPENCLAW_LIVE_PROVIDERS=deepseek \
OPENCLAW_LIVE_MODELS="deepseek/deepseek-v4-flash,deepseek/deepseek-v4-pro" \
pnpm test:live src/agents/models.profiles.live.test.ts
```

Cette vérification en direct vérifie que les deux modèles V4 peuvent terminer et que les tours de suivi de réflexion/outils
préservent la charge utile de relecture requise par DeepSeek.

## Exemple de configuration

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-v4-flash" },
    },
  },
}
```

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
