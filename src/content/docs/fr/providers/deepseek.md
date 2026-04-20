---
title: "DeepSeek"
summary: "Configuration DeepSeek (auth + sélection de model)"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) fournit des modèles d'IA puissants avec une API compatible OpenAI.

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
  <Step title="Exécutez l'onboarding">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    Cela vous demandera votre clé API et définira `deepseek/deepseek-chat` comme model par défaut.

  </Step>
  <Step title="Vérifiez que les models sont disponibles">
    ```bash
    openclaw models list --provider deepseek
    ```
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Configuration non interactive">
    Pour les installations scriptées ou sans interface, passez tous les indicateurs directement :

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

<Warning>Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `DEEPSEEK_API_KEY` est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via `env.shellEnv`).</Warning>

## Catalogue intégré

| Réf model                    | Nom               | Entrée | Contexte | Max sortie | Notes                                                  |
| ---------------------------- | ----------------- | ------ | -------- | ---------- | ------------------------------------------------------ |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | texte  | 131 072  | 8 192      | Model par défaut ; surface non réflexive DeepSeek V3.2 |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | texte  | 131 072  | 65 536     | Surface V3.2 avec capacités de raisonnement            |

<Tip>Les deux models groupés annoncent actuellement une compatibilité d'utilisation en mode streaming dans la source.</Tip>

## Exemple de configuration

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-chat" },
    },
  },
}
```

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de model" href="/fr/concepts/model-providers" icon="couches">
    Choix des fournisseurs, des références de models et du comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Référence de configuration complète pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
