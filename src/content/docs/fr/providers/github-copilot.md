---
summary: "Connectez-vous à GitHub Copilot depuis OpenClaw via le flux d'appareil ou l'importation de jeton non interactive"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

GitHub Copilot est l'assistant de codage IA de GitHub. Il donne accès aux modèles Copilot pour votre compte et votre plan GitHub. OpenClaw peut utiliser Copilot comme fournisseur de modèles de deux manières différentes.

## Deux façons d'utiliser Copilot dans OpenClaw

<Tabs>
  <Tab title="Built-in provider (github-copilot)">
    Utilisez le flux de connexion natif par appareil pour obtenir un jeton GitHub, puis échangez-le contre des jetons de l'API Copilot lors de l'exécution d'OpenClaw. C'est le chemin par **défaut** et le plus simple car il ne nécessite pas VS Code.

    <Steps>
      <Step title="Run the login command">
        ```bash
        openclaw models auth login-github-copilot
        ```

        Il vous sera demandé de visiter une URL et d'entrer un code à usage unique. Gardez le terminal ouvert jusqu'à la fin du processus.
      </Step>
      <Step title="Set a default model">
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

  <Tab title="Copilot Proxy plugin (copilot-proxy)">
    Utilisez l'extension VS Code **Copilot Proxy** comme pont local. OpenClaw communique avec le point de terminaison `/v1` du proxy et utilise la liste de modèles que vous y avez configurée.

    <Note>
    Choisissez cette option si vous exécutez déjà Copilot Proxy dans VS Code ou si vous devez router via celui-ci. Vous devez activer le plugin et garder l'extension VS Code en cours d'exécution.
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

Si vous possédez déjà un jeton d'accès GitHub OAuth pour Copilot, importez-le lors de la configuration sans interface (headless) avec `openclaw onboard --non-interactive` :

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

Vous pouvez également omettre `--auth-choice` ; le passage de `--github-copilot-token` déduit le choix d'authentification du fournisseur GitHub Copilot. Si l'indicateur est omis, l'onboarding revient à `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, puis `GITHUB_TOKEN`. Utilisez `--secret-input-mode ref` avec `COPILOT_GITHUB_TOKEN` défini pour stocker un `tokenRef` soutenu par l'environnement au lieu de texte brut dans `auth-profiles.json`.

<AccordionGroup>
  <Accordion title="TTY interactive requis">
    Le flux de connexion par appareil nécessite un TTY interactif. Exécutez-le directement dans un
    terminal, et non dans un script non interactif ou un pipeline CI.
  </Accordion>

<Accordion title="Model availability depends on your plan">
  La disponibilité des modèles Copilot dépend de votre plan GitHub. Si un modèle est rejeté, essayez un autre ID (par exemple `github-copilot/gpt-5.5`). Consultez la page sur les [modèles pris en charge par plan Copilot](https://docs.github.com/en/copilot/reference/ai-models/supported-models#supported-ai-models-per-copilot-plan) de GitHub pour obtenir la liste actuelle des modèles.
</Accordion>

  <Accordion title="Actualisation du catalogue en direct depuis l'API Copilot">
    Une fois que le chemin d'authentification par connexion (ou variable d'environnement) a résolu un jeton GitHub,
    OpenClaw actualise le catalogue des modèles à la demande depuis `${baseUrl}/models`
    (le même point de terminaison utilisé par VS Code Copilot) afin que le runtime suive
    les droits par compte et les fenêtres de contexte précises sans remaniement
    de manifeste. Les modèles Copilot nouvellement publiés deviennent visibles sans mise à jour d'OpenClaw,
    et les fenêtres de contexte reflètent les limites réelles par modèle
    (par exemple 400k pour la série gpt-5.x, 1M pour les variantes internes
    `claude-opus-*-1m`).

    Le catalogue statique groupé reste le repli visible lorsque la découverte
    est désactivée, que l'utilisateur n'a pas de profil d'authentification GitHub, que l'échange de jetons
    échoue, ou que l'appel HTTPS `/models` génère des erreurs. Pour refuser et s'appuyer entièrement
    sur le catalogue de manifestes statiques (scénarios hors ligne / isolés) :

    ```json5
    {
      plugins: {
        entries: {
          "github-copilot": {
            config: { discovery: { enabled: false } },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="Sélection du transport">Les ID de modèle Claude utilisent automatiquement le transport Messages de Anthropic. Les modèles GPT, o-series et Gemini conservent le transport Responses de OpenAI. OpenClaw sélectionne le transport correct en fonction de la référence du modèle.</Accordion>

<Accordion title="Compatibilité des requêtes">OpenClaw envoie des en-têtes de requête de style IDE Copilot sur les transports Copilot, incluant la compactage intégré, les tool-result et les tours de suivi d'image. Il n'active pas la continuation Responses au niveau du provider pour Copilot, sauf si ce comportement a été vérifié par rapport à l'API de Copilot.</Accordion>

  <Accordion title="Ordre de résolution des variables d'environnement">
    OpenClaw résout l'authentification Copilot à partir des variables d'environnement dans l'ordre
    de priorité suivant :

    | Priority | Variable              | Notes                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | Priorité la plus élevée, spécifique à Copilot |
    | 2        | `GH_TOKEN`            | Jeton GitHub CLI (alternative)      |
    | 3        | `GITHUB_TOKEN`        | Jeton GitHub standard (le plus bas)   |

    Lorsque plusieurs variables sont définies, OpenClaw utilise celle ayant la priorité la plus élevée.
    Le flux de connexion par appareil (`openclaw models auth login-github-copilot`) stocke
    son jeton dans le magasin de profils d'authentification et prend la priorité sur toutes les variables
    d'environnement.

  </Accordion>

  <Accordion title="Stockage des jetons">
    La connexion stocke un jeton GitHub dans le magasin de profils d'authentification et l'échange
    contre un jeton d'API Copilot lorsque OpenClaw s'exécute. Vous n'avez pas besoin de gérer le
    jeton manuellement.
  </Accordion>
</AccordionGroup>

<Warning>The device-login command requires an interactive TTY. Use non-interactive onboarding when you need headless setup.</Warning>

## Memory search embeddings

GitHub Copilot peut également servir de fournisseur d'embeddings pour la
[mémoire de recherche](GitHub/en/concepts/memory-searchOpenClawAPI). Si vous disposez d'un abonnement Copilot et
que vous êtes connecté, OpenClaw peut l'utiliser pour les embeddings sans clé API séparée.

### Détection automatique

Lorsque `memorySearch.provider` est `"auto"`GitHubOpenAIGitHubOpenClawAPI (par défaut), GitHub Copilot est essayé
avec la priorité 15 -- après les embeddings locaux mais avant OpenAI et les autres fournisseurs
payants. Si un jeton GitHub est disponible, OpenClaw découvre les modèles
d'embeddings disponibles depuis l'API Copilot et choisit automatiquement le meilleur.

### Configuration explicite

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

### Fonctionnement

1. OpenClaw résout votre jeton GitHub (à partir des env vars ou du profil d'authentification).
2. L'échange contre un jeton API Copilot de courte durée.
3. Interroge le point de terminaison `/models` de Copilot pour découvrir les modèles d'embeddings disponibles.
4. Choisit le meilleur modèle (préfère `text-embedding-3-small`).
5. Envoie les requêtes d'embeddings au point de terminaison `/embeddings` de Copilot.

La disponibilité des modèles dépend de votre offre GitHub. Si aucun modèle d'embeddings n'est
disponible, OpenClaw ignore Copilot et essaie le fournisseur suivant.

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
  <Card title="OAuthOAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des informations d'identification.
  </Card>
</CardGroup>
