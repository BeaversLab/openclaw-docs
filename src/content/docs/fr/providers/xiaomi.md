---
summary: "Utilisez les modèles MiMo Xiaomi avec OpenClaw"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo est la plateforme API pour les modèles **MiMo**. OpenClaw utilise le point de terminaison compatible Xiaomi de OpenAI avec une authentification par clé API.

| Propriété   | Valeur                          |
| ----------- | ------------------------------- |
| Fournisseur | `xiaomi`                        |
| Auth        | `XIAOMI_API_KEY`                |
| API         | compatible OpenAI               |
| URL de base | `https://api.xiaomimimo.com/v1` |

## Getting started

<Steps>
  <Step title="Obtenir une clé API">
    Créez une clé API dans la [console MiMo Xiaomi](https://platform.xiaomimimo.com/#/console/api-keys).
  </Step>
  <Step title="Exécuter l'intégration">
    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    Ou passez la clé directement :

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    ```

  </Step>
  <Step title="Vérifier que le modèle est disponible">
    ```bash
    openclaw models list --provider xiaomi
    ```
  </Step>
</Steps>

## Modèles disponibles

| Réf modèle             | Entrée       | Contexte  | Sortie max | Raisonnement | Notes             |
| ---------------------- | ------------ | --------- | ---------- | ------------ | ----------------- |
| `xiaomi/mimo-v2-flash` | texte        | 262,144   | 8,192      | Non          | Modèle par défaut |
| `xiaomi/mimo-v2-pro`   | texte        | 1,048,576 | 32,000     | Oui          | Grand contexte    |
| `xiaomi/mimo-v2-omni`  | texte, image | 262,144   | 32,000     | Oui          | Multimodal        |

<Tip>La référence du modèle par défaut est `xiaomi/mimo-v2-flash`. Le fournisseur est injecté automatiquement lorsque `XIAOMI_API_KEY` est défini ou qu'un profil d'authentification existe.</Tip>

## Exemple de configuration

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Comportement d'injection automatique">
    Le fournisseur `xiaomi` est injecté automatiquement lorsque `XIAOMI_API_KEY` est défini dans votre environnement ou qu'un profil d'authentification existe. Vous n'avez pas besoin de configurer manuellement le fournisseur, sauf si vous souhaitez remplacer les métadonnées du modèle ou l'URL de base.
  </Accordion>

  <Accordion title="Détails du modèle">
    - **mimo-v2-flash** — léger et rapide, idéal pour les tâches textuelles générales. Pas de prise en charge du raisonnement.
    - **mimo-v2-pro** — prend en charge le raisonnement avec une fenêtre de contexte de 1M de jetons pour les charges de travail sur des documents longs.
    - **mimo-v2-omni** — modèle multimodal avec raisonnement qui accepte les entrées texte et image.

    <Note>
    Tous les modèles utilisent le préfixe `xiaomi/` (par exemple `xiaomi/mimo-v2-pro`).
    </Note>

  </Accordion>

  <Accordion title="Dépannage">
    - Si les modèles n'apparaissent pas, vérifiez que `XIAOMI_API_KEY` est défini et valide.
    - Lorsque le Gateway s'exécute en tant que démon, assurez-vous que la clé est disponible pour ce processus (par exemple dans `~/.openclaw/.env` ou via `env.shellEnv`).

    <Warning>
    Les clés définies uniquement dans votre shell interactif ne sont pas visibles pour les processus de la passerelle gérés par le démon. Utilisez la config `~/.openclaw/.env` ou `env.shellEnv` pour une disponibilité persistante.
    </Warning>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/en/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/en/gateway/configuration" icon="gear">
    Référence complète de la configuration OpenClaw.
  </Card>
  <Card title="Console Xiaomi MiMo" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Tableau de bord Xiaomi MiMo et gestion des clés API.
  </Card>
</CardGroup>
