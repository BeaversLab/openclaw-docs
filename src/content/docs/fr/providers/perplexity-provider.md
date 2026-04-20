---
title: "Perplexity"
summary: "Perplexity web search provider setup (API key, search modes, filtering)"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

# Perplexity (Web Search Provider)

Le plugin Perplexity fournit des capacités de recherche web via l'Perplexity
Search API ou Perplexity Sonar via OpenRouter.

<Note>Cette page traite de la configuration du **fournisseur** Perplexity. Pour l'**outil** Perplexity (comment l'agent l'utilise), voir [Perplexity tool](/en/tools/perplexity-search).</Note>

| Propriété               | Valeur                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| Type                    | Fournisseur de recherche web (pas un fournisseur de modèle)            |
| Auth                    | `PERPLEXITY_API_KEY` (direct) ou `OPENROUTER_API_KEY` (via OpenRouter) |
| Chemin de configuration | `plugins.entries.perplexity.config.webSearch.apiKey`                   |

## Getting started

<Steps>
  <Step title="Définir la clé API">
    Exécutez le flux de configuration interactif de recherche web :

    ```bash
    openclaw configure --section web
    ```

    Ou définissez la clé directement :

    ```bash
    openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
    ```

  </Step>
  <Step title="Commencer la recherche">
    L'agent utilisera automatiquement Perplexity pour les recherches web une fois la clé
    configurée. Aucune étape supplémentaire n'est requise.
  </Step>
</Steps>

## Modes de recherche

Le plugin sélectionne automatiquement le transport en fonction du préfixe de la clé API :

<Tabs>
  <Tab title="API Perplexity native (pplx-)">Lorsque votre clé commence par `pplx-`, OpenClaw utilise l'API de recherche Perplexity native. Ce transport renvoie des résultats structurés et prend en charge les filtres de domaine, de langue et de date (voir les options de filtrage ci-dessous).</Tab>
  <Tab title="OpenRouter / Sonar (sk-or-)">Lorsque votre clé commence par `sk-or-`, OpenClaw route via OpenRouter en utilisant le modèle Perplexity Sonar. Ce transport renvoie des réponses synthétisées par l'IA avec des citations.</Tab>
</Tabs>

| Préfixe de clé | Transport                          | Fonctionnalités                                      |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| `pplx-`        | API de recherche Perplexity native | Résultats structurés, filtres de domaine/langue/date |
| `sk-or-`       | OpenRouter (Sonar)                 | Réponses synthétisées par l'IA avec citations        |

## Filtrage de l'API native

<Note>Les options de filtrage ne sont disponibles que lors de l'utilisation de l'API Perplexity native (clé `pplx-`). Les recherches OpenRouter/Sonar ne prennent pas en charge ces paramètres.</Note>

Lors de l'utilisation de l'API Perplexity native, les recherches prennent en charge les filtres suivants :

| Filtre             | Description                                              | Exemple                             |
| ------------------ | -------------------------------------------------------- | ----------------------------------- |
| Pays               | Code pays à 2 lettres                                    | `us`, `de`, `jp`                    |
| Langue             | Code de langue ISO 639-1                                 | `en`, `fr`, `zh`                    |
| Plage de dates     | Fenêtre de récence                                       | `day`, `week`, `month`, `year`      |
| Filtres de domaine | Liste d'autorisation ou liste de refus (max 20 domaines) | `example.com`                       |
| Budget de contenu  | Limites de jetons par réponse / par page                 | `max_tokens`, `max_tokens_per_page` |

## Notes avancées

<AccordionGroup>
  <Accordion title="Variable d'environnement pour les processus démons">
    Si la passerelle OpenClaw s'exécute en tant que démon (launchd/systemd), assurez-vous
    que `PERPLEXITY_API_KEY` est disponible pour ce processus.

    <Warning>
    Une clé définie uniquement dans `~/.profile` ne sera pas visible pour un démon
    launchd/systemd à moins que cet environnement ne soit explicitement importé. Définissez la clé dans
    `~/.openclaw/.env` ou via `env.shellEnv` pour garantir que le processus de passerelle puisse
    la lire.
    </Warning>

  </Accordion>

  <Accordion title="Configuration du proxy OpenRouter">
    Si vous préférez acheminer les recherches Perplexity via OpenRouter, définissez une
    `OPENROUTER_API_KEY` (préfixe `sk-or-`) au lieu d'une clé Perplexity native.
    OpenClaw détectera le préfixe et passera automatiquement au transport Sonar.

    <Tip>
    Le transport OpenRouter est utile si vous avez déjà un compte OpenRouter
    et souhaitez une facturation consolidée sur plusieurs fournisseurs.
    </Tip>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Outil de recherche Perplexity" href="/en/tools/perplexity-search" icon="magnifying-glass">
    Comment l'agent invoque les recherches Perplexity et interprète les résultats.
  </Card>
  <Card title="Référence de configuration" href="/en/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration, y compris les entrées du plugin.
  </Card>
</CardGroup>
