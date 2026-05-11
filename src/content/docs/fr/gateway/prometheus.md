---
summary: "Exposer les diagnostics OpenClaw en tant que métriques texte Prometheus via le plugin diagnostics-prometheus"
title: "Métriques Prometheus"
sidebarTitle: "Prometheus"
read_when:
  - You want Prometheus, Grafana, VictoriaMetrics, or another scraper to collect OpenClaw Gateway metrics
  - You need the Prometheus metric names and label policy for dashboards or alerts
  - You want metrics without running an OpenTelemetry collector
---

OpenClaw peut exposer des métriques de diagnostic via le plugin intégré `diagnostics-prometheus`. Il écoute les diagnostics internes de confiance et affiche un point de terminaison texte Prometheus à l'adresse :

```text
GET /api/diagnostics/prometheus
```

Le type de contenu est `text/plain; version=0.0.4; charset=utf-8`, le format d'exposition standard Prometheus.

<Warning>La route utilise l'authentification Gateway (portée opérateur). Ne l'exposez pas en tant que point de terminaison `/metrics` public et non authentifié. Récupérez-la (scrapez) via le même chemin d'authentification que celui utilisé pour les autres API d'opérateur.</Warning>

Pour les traces, les logs, le push OTLP et les attributs sémantiques GenAI OpenTelemetry, consultez [Exportation OpenTelemetry](/fr/gateway/opentelemetry).

## Démarrage rapide

<Steps>
  <Step title="Activer le plugin">
    <Tabs>
      <Tab title="Config">
        ```json5
        {
          plugins: {
            allow: ["diagnostics-prometheus"],
            entries: {
              "diagnostics-prometheus": { enabled: true },
            },
          },
          diagnostics: {
            enabled: true,
          },
        }
        ```
      </Tab>
      <Tab title="CLI">
        ```bash
        openclaw plugins enable diagnostics-prometheus
        ```
      </Tab>
    </Tabs>
  </Step>
  <Step title="Redémarrer la passerelle">
    La route HTTP est enregistrée au démarrage du plugin, rechargez donc après l'avoir activé.
  </Step>
  <Step title="Récupérer la route protégée">
    Envoyez la même authentification passerelle que vos clients opérateurs utilisent :

    ```bash
    curl -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
      http://127.0.0.1:18789/api/diagnostics/prometheus
    ```

  </Step>
  <Step title="Connecter Prometheus">
    ```yaml
    # prometheus.yml
    scrape_configs:
      - job_name: openclaw
        scrape_interval: 30s
        metrics_path: /api/diagnostics/prometheus
        authorization:
          credentials_file: /etc/prometheus/openclaw-gateway-token
        static_configs:
          - targets: ["openclaw-gateway:18789"]
    ```
  </Step>
</Steps>

<Note>`diagnostics.enabled: true` est requis. Sans lui, le plugin enregistre toujours la route HTTP mais aucun événement de diagnostic ne circule vers l'exportateur, donc la réponse est vide.</Note>

## Métriques exportées

| Métrique                                      | Type        | Labels                                                                                    |
| --------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `openclaw_run_completed_total`                | compteur    | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_run_duration_seconds`               | histogramme | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_model_call_total`                   | compteur    | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_call_duration_seconds`        | histogram   | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_tokens_total`                 | counter     | `agent`, `channel`, `model`, `provider`, `token_type`                                     |
| `openclaw_gen_ai_client_token_usage`          | histogram   | `model`, `provider`, `token_type`                                                         |
| `openclaw_model_cost_usd_total`               | counter     | `agent`, `channel`, `model`, `provider`                                                   |
| `openclaw_tool_execution_total`               | counter     | `error_category`, `outcome`, `params_kind`, `tool`                                        |
| `openclaw_tool_execution_duration_seconds`    | histogram   | `error_category`, `outcome`, `params_kind`, `tool`                                        |
| `openclaw_harness_run_total`                  | counter     | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_harness_run_duration_seconds`       | histogram   | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_message_processed_total`            | counter     | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_processed_duration_seconds` | histogram   | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_delivery_total`             | counter     | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_message_delivery_duration_seconds`  | histogram   | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_queue_lane_size`                    | gauge       | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`            | histogram   | `lane`                                                                                    |
| `openclaw_session_state_total`                | counter     | `reason`, `state`                                                                         |
| `openclaw_session_queue_depth`                | gauge       | `state`                                                                                   |
| `openclaw_memory_bytes`                       | gauge       | `kind`                                                                                    |
| `openclaw_memory_rss_bytes`                   | histogram   | none                                                                                      |
| `openclaw_memory_pressure_total`              | counter     | `level`, `reason`                                                                         |
| `openclaw_telemetry_exporter_total`           | counter     | `exporter`, `reason`, `signal`, `status`                                                  |
| `openclaw_prometheus_series_dropped_total`    | counter     | none                                                                                      |

## Label policy

<AccordionGroup>
  <Accordion title="Bounded, low-cardinality labels">
    Les labels Prometheus restent bornés et de faible cardinalité. L'exportateur n'émet pas d'identifiants de diagnostic bruts tels que `runId`, `sessionKey`, `sessionId`, `callId`, `toolCallId`, les ID de message, les ID de chat ou les ID de requête provider.

    Les valeurs des labels sont masquées et doivent correspondre à la stratégie de caractères de faible cardinalité d'OpenClaw. Les valeurs qui ne respectent pas la stratégie sont remplacées par `unknown`, `other` ou `none`, selon la métrique.

  </Accordion>
  <Accordion title="Limite de séries et comptabilisation des dépassements">
    L'exporteur plafonne les séries chronologiques retenues en mémoire à **2048** séries, tous compteurs, jauges et histogrammes confondus. Les nouvelles séries dépassant cette limite sont ignorées, et `openclaw_prometheus_series_dropped_total` augmente de un à chaque fois.

    Surveillez ce compteur comme un signal fort indiquant qu'un attribut en amont fuite des valeurs à forte cardinalité. L'exporteur ne relève jamais la limite automatiquement ; s'il augmente, corrigez la source plutôt que de désactiver la limite.

  </Accordion>
  <Accordion title="Ce qui n'apparaît jamais dans la sortie Prometheus">
    - texte du prompt, texte de la réponse, entrées des outils, sorties des outils, invites système
    - identifiants de demande bruts du fournisseur (seulement des hachages délimités, le cas échéant, sur les spans — jamais sur les métriques)
    - clés de session et identifiants de session
    - noms d'hôte, chemins de fichiers, valeurs secrètes
  </Accordion>
</AccordionGroup>

## Recettes PromQL

```promql
# Tokens per minute, split by provider
sum by (provider) (rate(openclaw_model_tokens_total[1m]))

# Spend (USD) over the last hour, by model
sum by (model) (increase(openclaw_model_cost_usd_total[1h]))

# 95th percentile model run duration
histogram_quantile(
  0.95,
  sum by (le, provider, model)
    (rate(openclaw_run_duration_seconds_bucket[5m]))
)

# Queue wait time SLO (95p under 2s)
histogram_quantile(
  0.95,
  sum by (le, lane) (rate(openclaw_queue_lane_wait_seconds_bucket[5m]))
) < 2

# Dropped Prometheus series (cardinality alarm)
increase(openclaw_prometheus_series_dropped_total[15m]) > 0
```

<Tip>Préférez `gen_ai_client_token_usage` pour les tableaux de bord multi-fournisseurs : il suit les conventions sémantiques GenAI d'OpenTelemetry et est cohérent avec les métriques des services GenAI autres qu'OpenClaw.</Tip>

## Choisir entre l'exportation Prometheus et OpenTelemetry

OpenClaw prend en charge les deux surfaces indépendamment. Vous pouvez exécuter l'une, l'autre, les deux, ou aucune.

<Tabs>
  <Tab title="diagnostics-prometheus">- Modèle **Pull** : Prometheus récupère `/api/diagnostics/prometheus`. - Aucun collecteur externe requis. - Authentifié via l'authentification normale du Gateway. - La surface contient uniquement des métriques (pas de traces ni de journaux). - Idéal pour les piles déjà standardisées sur Prometheus + Grafana.</Tab>
  <Tab title="diagnostics-otel">
    - Modèle **Push** : OpenClaw envoie OTLP/HTTP à un collecteur ou à un backend compatible OTLP. - La surface inclut les métriques, les traces et les journaux. - Se connecte à Prometheus via un OpenTelemetry Collector (exportateur `prometheus` ou `prometheusremotewrite`) lorsque vous avez besoin des deux. - Voir [Exportation OpenTelemetry](/fr/gateway/opentelemetry) pour le catalogue complet.
  </Tab>
</Tabs>

## Dépannage

<AccordionGroup>
  <Accordion title="Corps de réponse vide">- Vérifiez `diagnostics.enabled: true` dans la configuration. - Confirmez que le plugin est activé et chargé avec `openclaw plugins list --enabled`. - Générez du trafic ; les compteurs et les histogrammes n'émettent des lignes qu'après au moins un événement.</Accordion>
  <Accordion title="401 / non autorisé">Le point de terminaison nécessite la portée opérateur du Gateway (`auth: "gateway"` avec `gatewayRuntimeScopeSurface: "trusted-operator"`). Utilisez le même jeton ou mot de passe que Prometheus utilise pour toute autre route opérateur du Gateway. Il n'existe aucun mode public non authentifié.</Accordion>
  <Accordion title="`openclaw_prometheus_series_dropped_total` augmente">Un nouvel attribut dépasse la limite de **2048** séries. Inspectez les métriques récentes pour trouver une étiquette à cardinalité inattendue élevée et corrigez-la à la source. L'exportateur abandonne intentionnellement les nouvelles séries au lieu de réécrire silencieusement les étiquettes.</Accordion>
  <Accordion title="Prometheus affiche des séries obsolètes après un redémarrage">Le plugin ne conserve l'état qu'en mémoire. Après un redémarrage du Gateway, les compteurs sont réinitialisés à zéro et les jauges redémarrent à leur prochaine valeur rapportée. Utilisez les fonctions PromQL `rate()` et `increase()` pour gérer les réinitialisations proprement.</Accordion>
</AccordionGroup>

## Connexes

- [Export des diagnostics](/fr/gateway/diagnostics) — archive zip de diagnostics locaux pour les bundles de support
- [Santé et disponibilité](/fr/gateway/health) — sondes `/healthz` et `/readyz`
- [Journalisation](/fr/logging) — journalisation basée sur les fichiers
- [Export OpenTelemetry](/fr/gateway/opentelemetry) — envoi OTLP pour les traces, les métriques et les journaux
