---
summary: "Configuration DeepSeek (auth + sélection de modèle)"
title: "DeepSeek"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

[DeepSeek](https://www.deepseek.com) fournit des modèles d'IA puissants avec une OpenAI compatible API.

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

<Tip>Les modèles V4 prennent en charge le contrôle `thinking` de DeepSeek. OpenClaw rejoue également le `reasoning_content` DeepSeek lors des tours de suivi, afin que les sessions de réflexion avec des appels d'outils puissent se poursuivre.</Tip>

## Réflexion et outils

Les sessions de réflexion DeepSeek V4 ont un contrat de relecture plus strict que la plupart
des fournisseurs compatibles OpenAI : lorsqu'un message d'assistant avec réflexion activée inclut
des appels d'outils, DeepSeek s'attend à ce que le `reasoning_content` de l'assistant précédent soit renvoyé
dans la requête de suivi. OpenClaw gère cela en interne dans le plugin DeepSeek,
ceci permet donc une utilisation normale des outils sur plusieurs tours avec `deepseek/deepseek-v4-flash` et
`deepseek/deepseek-v4-pro`.

Si vous basculez une session existante d'un autre fournisseur compatible OpenAI vers un
modèle DeepSeek V4, les anciens tours d'appels d'outils de l'assistant peuvent ne pas avoir de `reasoning_content`
natif DeepSeek. OpenClaw comble ce champ manquant pour les requêtes de réflexion DeepSeek V4,
afin que le fournisseur puisse accepter l'historique des appels d'outils rejoué
sans exiger `/new`.

Lorsque la réflexion est désactivée dans OpenClaw (y compris la sélection **Aucun** dans l'interface),
OpenClaw envoie le `thinking: { type: "disabled" }` DeepSeek et supprime les `reasoning_content`
rejoués de l'historique sortant. Cela maintient les sessions avec réflexion désactivée
sur le chemin DeepSeek sans réflexion.

Utilisez `deepseek/deepseek-v4-flash` pour le chemin rapide par défaut. Utilisez
`deepseek/deepseek-v4-pro` lorsque vous souhaitez le modèle V4 plus puissant et pouvez accepter
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
