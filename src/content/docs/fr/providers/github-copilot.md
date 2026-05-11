---
summary: "Connectez-vous à GitHub Copilot depuis OpenClaw en utilisant le flux d'appareil ou l'importation de jeton non interactive"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

GitHub Copilot est l'assistant de codage IA de GitHub. Il donne accès aux modèles Copilot pour votre compte et votre plan GitHub. OpenClaw peut utiliser Copilot comme fournisseur de modèles de deux manières différentes.

## Deux façons d'utiliser Copilot dans OpenClaw

<Tabs>
  <Tab title="Fournisseur intégré (github-copilot)">
    Utilisez le flux de connexion native par appareil pour obtenir un jeton GitHub, puis échangez-le contre des jetons de l'API Copilot lorsque OpenClaw s'exécute. C'est le chemin **par défaut** et le plus simple car il ne nécessite pas VS Code.

    <Steps>
      <Step title="Exécuter la commande de connexion">
        ```bash
        openclaw models auth login-github-copilot
        ```

        Vous serez invité à visiter une URL et à entrer un code à usage unique. Gardez le terminal ouvert jusqu'à ce qu'il se termine.
      </Step>
      <Step title="Définir un modèle par défaut">
        ```bash
        openclaw models set github-copilot/claude-opus-4.7
        ```

        Ou dans la configuration :

        ```json5
        {
          agents: {
            defaults: { model: { primary: "github-copilot/claude-opus-4.7" } },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Plugin Copilot Proxy (copilot-proxy)">
    Utilisez l'extension VS Code **Copilot Proxy** comme pont local. OpenClaw communique avec le point de terminaison `/v1` du proxy et utilise la liste de modèles que vous y avez configurée.

    <Note>
    Choisissez cette option lorsque vous exécutez déjà Copilot Proxy dans VS Code ou si vous devez acheminer le trafic via celui-ci. Vous devez activer le plugin et garder l'extension VS Code en cours d'exécution.
    </Note>

  </Tab>
</Tabs>

## Drapeaux optionnels

| Drapeau         | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `--yes`         | Ignorer l'invite de confirmation                                       |
| `--set-default` | Appliquer également le modèle par défaut recommandé par le fournisseur |

```bash
# Skip confirmation
openclaw models auth login-github-copilot --yes

# Login and set the default model in one step
openclaw models auth login --provider github-copilot --method device --set-default
```

## Intégration non interactive

Si vous possédez déjà un jeton d'accès GitHub OAuth pour Copilot, importez-le lors de la configuration sans tête avec `openclaw onboard --non-interactive` :

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

Vous pouvez également omettre `--auth-choice` ; le passage de `--github-copilot-token` déduit le
choix d'authentification du provider GitHub Copilot. Si l'indicateur est omis, l'onboarding revient
à `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, puis `GITHUB_TOKEN`. Utilisez
`--secret-input-mode ref` avec `COPILOT_GITHUB_TOKEN` défini pour stocker un
`tokenRef` soutenu par l'environnement au lieu du texte brut dans `auth-profiles.json`.

<AccordionGroup>
  <Accordion title="TTY interactif requis">
    Le flux de connexion par appareil nécessite un TTY interactif. Exécutez-le directement dans un
    terminal, et non dans un script non interactif ou un pipeline CI.
  </Accordion>

<Accordion title="La disponibilité des modèles dépend de votre plan">La disponibilité des modèles Copilot dépend de votre plan GitHub. Si un modèle est rejeté, essayez un autre ID (par exemple `github-copilot/gpt-4.1`).</Accordion>

<Accordion title="Sélection du transport">Les ID de modèles Claude utilisent automatiquement le transport Messages Anthropic. Les modèles GPT, la série o et Gemini conservent le transport Responses OpenAI. OpenClaw sélectionne le transport correct en fonction de la référence du modèle.</Accordion>

<Accordion title="Compatibilité des requêtes">OpenClaw envoie des en-têtes de requête de style IDE Copilot sur les transports Copilot, y compris la compaction intégrée, les résultats d'outils et les tours de suivi d'images. Il n'active pas la continuation des Responses au niveau du provider pour Copilot à moins que ce comportement n'ait été vérifié par rapport à l'API de Copilot.</Accordion>

  <Accordion title="Ordre de résolution des variables d'environnement">
    OpenClaw résout l'authentification Copilot à partir des variables d'environnement selon l'ordre de priorité suivant :

    | Priorité | Variable              | Notes                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | Priorité la plus élevée, spécifique à Copilot |
    | 2        | `GH_TOKEN`            | Jeton GitHub CLI (solution de repli)      |
    | 3        | `GITHUB_TOKEN`        | Jeton GitHub standard (le plus bas)   |

    Lorsque plusieurs variables sont définies, OpenClaw utilise celle ayant la priorité la plus élevée.
    Le flux de connexion par appareil (`openclaw models auth login-github-copilot`) stocke
    son jeton dans le magasin de profils d'authentification et prend le pas sur toutes les variables d'environnement.

  </Accordion>

  <Accordion title="Stockage du jeton">
    La connexion stocke un jeton GitHub dans le magasin de profils d'authentification et l'échange
    contre un jeton d'API Copilot lors de l'exécution de OpenClaw. Vous n'avez pas besoin de gérer le jeton manuellement.
  </Accordion>
</AccordionGroup>

<Warning>The device-login command requires an interactive TTY. Use non-interactive onboarding when you need headless setup.</Warning>

## Memory search embeddings

GitHub Copilot peut également servir de fournisseur d'embeddings pour
[memory search](/fr/concepts/memory-search). Si vous disposez d'un abonnement Copilot et
que vous êtes connecté, OpenClaw peut l'utiliser pour les embeddings sans clé d'API séparée.

### Auto-detection

Lorsque `memorySearch.provider` est `"auto"` (par défaut), GitHub Copilot est essayé
avec la priorité 15 -- après les embeddings locaux mais avant OpenAI et les autres fournisseurs payants.
Si un jeton GitHub est disponible, OpenClaw découvre les modèles d'embedding disponibles
à partir de l'API Copilot et choisit automatiquement le meilleur.

### Explicit config

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "github-copilot",
        // Optional: override the auto-discovered model
        model: "text-embedding-3-small",
      },
    },
  },
}
```

### How it works

1. OpenClaw résout votre jeton GitHub (à partir des variables d'environnement ou du profil d'authentification).
2. L'échange contre un jeton d'API Copilot à durée de vie limitée.
3. Interroge le point de terminaison `/models` de Copilot pour découvrir les modèles d'embedding disponibles.
4. Sélectionne le meilleur modèle (préfère `text-embedding-3-small`).
5. Envoie les demandes d'embedding au point de terminaison `/embeddings` de Copilot.

La disponibilité des modèles dépend de votre plan GitHub. Si aucun modèle d'intégration n'est disponible, OpenClaw ignore Copilot et essaie le provider suivant.

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="OAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails de l'authentification et règles de réutilisation des identifiants.
  </Card>
</CardGroup>
