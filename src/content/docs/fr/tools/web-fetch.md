---
summary: "outil web_fetch -- récupération HTTP avec extraction de contenu lisible"
read_when:
  - You want to fetch a URL and extract readable content
  - You need to configure web_fetch or its Firecrawl fallback
  - You want to understand web_fetch limits and caching
title: "Récupération Web"
sidebarTitle: "Récupération Web"
---

L'outil `web_fetch` effectue une requête HTTP GET simple et extrait le contenu lisible
(HTML vers markdown ou texte). Il n'exécute **pas** JavaScript.

Pour les sites fortement utilisant JS ou les pages protégées par une connexion, utilisez le
[Navigateur Web](/fr/tools/browser) à la place.

## Quick start

`web_fetch` est **activé par défaut** -- aucune configuration requise. L'agent peut
l'appeler immédiatement :

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## Paramètres de l'outil

<ParamField path="url" type="string" required>
  URL à récupérer. `http(s)` uniquement.
</ParamField>

<ParamField path="extractMode" type="'markdown' | 'text'" default="markdown">
  Format de sortie après l'extraction du contenu principal.
</ParamField>

<ParamField path="maxChars" type="number">
  Tronquer la sortie à ce nombre de caractères.
</ParamField>

## Fonctionnement

<Steps>
  <Step title="Récupérer">Envoie un HTTP GET avec un User-Agent semblable à Chrome et un en-tête `Accept-Language` . Bloque les noms d'hôte privés/internes et vérifie les redirections.</Step>
  <Step title="Extraire">Exécute Readability (extraction du contenu principal) sur la réponse HTML.</Step>
  <Step title="Secours (optionnel)">Si Readability échoue et que Firecrawl est configuré, nouvelle tentative via l'Firecrawl API en mode de contournement de bot.</Step>
  <Step title="Cache">Les résultats sont mis en cache pendant 15 minutes (configurable) pour réduire les récupérations répétées de la même URL.</Step>
</Steps>

## Mises à jour de la progression

`web_fetch` émet une ligne de progression publique uniquement lorsque la récupération est toujours en attente
après cinq secondes :

```text
Fetching page content...
```

Les accès rapides au cache et les réponses réseau rapides se terminent avant le déclenchement de la minuterie, ils n'affichent donc pas de ligne de progression. Si l'appel est annulé, la minuterie est effacée. Lorsque la récupération finit par se terminer, l'agent reçoit le résultat normal de l'outil ; la ligne de progression n'est qu'un état de l'interface utilisateur du channel et ne contient jamais le contenu de la page récupérée.

## Config

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // default: true
        provider: "firecrawl", // optional; omit for auto-detect
        maxChars: 50000, // max output chars
        maxCharsCap: 50000, // hard cap for maxChars param
        maxResponseBytes: 2000000, // max download size before truncation
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        useTrustedEnvProxy: false, // let a trusted HTTP(S) env proxy resolve DNS
        readability: true, // use Readability extraction
        userAgent: "Mozilla/5.0 ...", // override User-Agent
        ssrfPolicy: {
          allowRfc2544BenchmarkRange: true, // opt-in for trusted fake-IP proxies using 198.18.0.0/15
          allowIpv6UniqueLocalRange: true, // opt-in for trusted fake-IP proxies using fc00::/7
        },
      },
    },
  },
}
```

## Firecrawl fallback

Si l'extraction Readability échoue, `web_fetch` peut revenir à [Firecrawl](/fr/tools/firecrawl) pour contourner les bots et améliorer l'extraction :

```json5
{
  tools: {
    web: {
      fetch: {
        provider: "firecrawl", // optional; omit for auto-detect from available credentials
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "fc-...", // optional if FIRECRAWL_API_KEY is set
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 86400000, // cache duration (1 day)
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

`plugins.entries.firecrawl.config.webFetch.apiKey` prend en charge les objets SecretRef.
La configuration `tools.web.fetch.firecrawl.*` héritée est automatiquement migrée par `openclaw doctor --fix`.

<Note>Si Firecrawl est activé et que son SecretRef n'est pas résolu sans `FIRECRAWL_API_KEY` de secours env, le démarrage de la passerelle échoue rapidement.</Note>

<Note>Les remplacements `baseUrl` Firecrawl sont verrouillés : le trafic hébergé utilise `https://api.firecrawl.dev` ; les remplacements auto-hébergés doivent cibler des points de terminaison privés ou internes, et `http://` est accepté uniquement pour ces cibles privées.</Note>

Comportement d'exécution actuel :

- `tools.web.fetch.provider` sélectionne explicitement le provider de secours de récupération.
- Si `provider` est omis, OpenClaw détecte automatiquement le premier provider web-fetch
  prêt parmi les informations d'identification disponibles. Les `web_fetch` non sandboxed peuvent utiliser
  des plugins installés qui déclarent `contracts.webFetchProviders` et enregistrent un
  provider correspondant au moment de l'exécution. Aujourd'hui, le provider groupé est Firecrawl.
- Les appels `web_fetch` sandboxed restent limités aux providers groupés.
- Si Readability est désactivé, `web_fetch` passe directement au
  provider de secours sélectionné. Si aucun provider n'est disponible, il échoue en mode fermé.

## Proxy env de confiance

Si votre déploiement nécessite que `web_fetch` passe par un proxy
HTTP(S) sortant de confiance, définissez `tools.web.fetch.useTrustedEnvProxy: true`.

Dans ce mode, OpenClaw applique toujours les vérifications SSRF basées sur le nom d'hôte avant d'envoyer la requête, mais il laisse le proxy résoudre le DNS au lieu d'effectuer un épinglage DNS local. N'activez cette option que lorsque le proxy est contrôlé par l'opérateur et applique une stratégie sortante après la résolution DNS.

<Note>Si aucune variable d'environnement de proxy HTTP(S) n'est configurée, ou si l'hôte cible est exclu par `NO_PROXY`, `web_fetch` revient au chemin strict normal avec épinglage DNS local.</Note>

## Limites et sécurité

- `maxChars` est limité à `tools.web.fetch.maxCharsCap`
- Le corps de la réponse est plafonné à `maxResponseBytes` avant l'analyse ; les réponses trop volumineuses sont tronquées avec un avertissement
- Les noms d'hôte privés/internes sont bloqués
- `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` et
  `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` sont des options d'adhésion étroites
  pour les piles de proxy à fausse IP de confiance ; laissez-les non définies, sauf si votre proxy possède ces plages synthétiques et applique sa propre stratégie de destination
- Les redirections sont vérifiées et limitées par `maxRedirects`
- `useTrustedEnvProxy` est une option d'adhésion explicite et ne doit être activée que pour les proxies contrôlés par l'opérateur qui appliquent toujours une stratégie sortante après la résolution DNS
- `web_fetch` est un effort de meilleure volonté -- certains sites ont besoin du [Web Browser](/fr/tools/browser)

## Profils d'outil

Si vous utilisez des profils d'outil ou des listes d'autorisation, ajoutez `web_fetch` ou `group:web` :

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes web_fetch, web_search, and x_search)
  },
}
```

## Connexes

- [Web Search](/fr/tools/web) -- rechercher sur le Web avec plusieurs fournisseurs
- [Web Browser](/fr/tools/browser) -- automatisation complète du navigateur pour les sites riches en JS
- [Firecrawl](/fr/tools/firecrawl) -- outils de recherche et de scraping Firecrawl
