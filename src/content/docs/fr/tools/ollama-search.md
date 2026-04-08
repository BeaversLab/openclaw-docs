---
summary: "Recherche Web Ollama via votre hôte Ollama configuré"
read_when:
  - You want to use Ollama for web_search
  - You want a key-free web_search provider
  - You need Ollama Web Search setup guidance
title: "Recherche Web Ollama"
---

# Recherche Web Ollama

OpenClaw prend en charge la **Recherche Web Ollama** en tant que fournisseur `web_search` intégré.
Elle utilise l'API de recherche web expérimentale d'Ollama et renvoie des résultats structurés
avec des titres, des URL et des extraits.

Contrairement au fournisseur de modèle Ollama, cette configuration ne nécessite pas de clé API par
défaut. Elle nécessite toutefois :

- un hôte Ollama accessible depuis OpenClaw
- `ollama signin`

## Configuration

<Steps>
  <Step title="Démarrer Ollama">
    Assurez-vous qu'Ollama est installé et en cours d'exécution.
  </Step>
  <Step title="Se connecter">
    Exécutez :

    ```bash
    ollama signin
    ```

  </Step>
  <Step title="Choisir la Recherche Web Ollama">
    Exécutez :

    ```bash
    openclaw configure --section web
    ```

    Sélectionnez ensuite **Recherche Web Ollama** comme fournisseur.

  </Step>
</Steps>

Si vous utilisez déjà Ollama pour les modèles, la Recherche Web Ollama réutilise le même
hôte configuré.

## Config

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

Remplacement facultatif de l'hôte Ollama :

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
      },
    },
  },
}
```

Si aucune URL de base Ollama explicite n'est définie, OpenClaw utilise `http://127.0.0.1:11434`.

Si votre hôte Ollama attend une authentification par porteur (bearer), OpenClaw réutilise
`models.providers.ollama.apiKey` (ou l'authentification du fournisseur correspondant basée sur les variables d'environnement)
également pour les demandes de recherche web.

## Notes

- Aucun champ de clé API spécifique à la recherche web n'est requis pour ce fournisseur.
- Si l'hôte Ollama est protégé par authentification, OpenClaw réutilise la clé API normale du fournisseur
  Ollama lorsqu'elle est présente.
- OpenClaw avertit lors de la configuration si Ollama est injoignable ou non connecté, mais
  cela ne bloque pas la sélection.
- La détection automatique lors de l'exécution peut revenir à la Recherche Web Ollama si aucun fournisseur
  avec identifiants de priorité plus élevée n'est configuré.
- Le fournisseur utilise le point de terminaison expérimental `/api/experimental/web_search`
  d'Ollama.

## Connexes

- [Aperçu de la recherche Web](/en/tools/web) -- tous les fournisseurs et la détection automatique
- [Ollama](/en/providers/ollama) -- configuration du modèle Ollama et modes cloud/local
