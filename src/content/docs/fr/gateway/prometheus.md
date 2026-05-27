---
summary: "Exposer les diagnostics OpenClaw sous forme de métriques texte Prometheus via le plugin diagnostics-prometheus"
title: "Métriques Prometheus"
sidebarTitle: "Prometheus"
read_when:
  - You want Prometheus, Grafana, VictoriaMetrics, or another scraper to collect OpenClaw Gateway metrics
  - You need the Prometheus metric names and label policy for dashboards or alerts
  - You want metrics without running an OpenTelemetry collector
---

OpenClaw peut exposer des métriques de diagnostic via le plugin officiel `diagnostics-prometheus`. Il écoute les diagnostics internes de confiance et restitue un point de terminaison texte Prometheus à l'adresse suivante :

```text
GET /api/diagnostics/prometheus
```

Le type de contenu est `text/plain; version=0.0.4; charset=utf-8`, le format d'exposition standard Prometheus.

<Warning>La route utilise l'authentification Gateway (portée opérateur). Ne l'exposez pas en tant que point de terminaison `/metrics` public et non authentifié. Effectuez le scraping via le même chemin d'authentification que celui utilisé pour les autres API d'opérateur.</Warning>

Pour les traces, les journaux, le push OTLP et les attributs sémantiques GenAI d'OpenTelemetry, consultez la section [Exportation OpenTelemetry](/fr/gateway/opentelemetry).

## Démarrage rapide

<Steps>
  <Step title="Installer le plugin">
    ```bash
    openclaw plugins install clawhub:@openclaw/diagnostics-prometheus
    ```
  </Step>
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
  <Step title="Redémarrer le Gateway">
    La route HTTP est enregistrée au démarrage du plugin, rechargez donc après l'avoir activé.
  </Step>
  <Step title="Scraping de la route protégée">
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

<Note>`diagnostics.enabled: true` est requis. Sans lui, le plugin enregistre toujours la route HTTP, mais aucun événement de diagnostic ne n'est acheminé vers l'exportateur, la réponse est donc vide.</Note>

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
| `openclaw_skill_used_total`                   | counter     | `activation`, `agent`, `skill`, `source`                                                  |
| `openclaw_tool_execution_total`               | compteur    | `error_category`, `outcome`, `params_kind`, `tool`, `tool_owner`, `tool_source`           |
| `openclaw_tool_execution_duration_seconds`    | histogramme | `error_category`, `outcome`, `params_kind`, `tool`, `tool_owner`, `tool_source`           |
| `openclaw_harness_run_total`                  | compteur    | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_harness_run_duration_seconds`       | histogramme | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_message_received_total`             | compteur    | `channel`, `source`                                                                       |
| `openclaw_message_dispatch_started_total`     | counter     | `channel`, `source`                                                                       |
| `openclaw_message_dispatch_completed_total`   | compteur    | `channel`, `outcome`, `reason`, `source`                                                  |
| `openclaw_message_dispatch_duration_seconds`  | histogramme | `channel`, `outcome`, `reason`, `source`                                                  |
| `openclaw_message_processed_total`            | compteur    | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_processed_duration_seconds` | histogramme | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_delivery_started_total`     | compteur    | `channel`, `delivery_kind`                                                                |
| `openclaw_message_delivery_total`             | compteur    | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_message_delivery_duration_seconds`  | histogram   | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_talk_event_total`                   | counter     | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_event_duration_seconds`        | histogramme | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_audio_bytes`                   | histogramme | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_queue_lane_size`                    | jauge       | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`            | histogramme | `lane`                                                                                    |
| `openclaw_session_state_total`                | compteur    | `reason`, `state`                                                                         |
| `openclaw_session_queue_depth`                | jauge       | `state`                                                                                   |
| `openclaw_session_turn_created_total`         | compteur    | `agent`, `channel`, `trigger`                                                             |
| `openclaw_session_recovery_total`             | compteur    | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_session_recovery_age_seconds`       | histogramme | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_memory_bytes`                       | jauge       | `kind`                                                                                    |
| `openclaw_memory_rss_bytes`                   | histogramme | aucun                                                                                     |
| `openclaw_memory_pressure_total`              | compteur    | `level`, `reason`                                                                         |
| `openclaw_telemetry_exporter_total`           | compteur    | `exporter`, `reason`, `signal`, `status`                                                  |
| `openclaw_prometheus_series_dropped_total`    | compteur    | aucun                                                                                     |

## Politique de libellé

<AccordionGroup>
  <Accordion title="Libellés bornés et à faible cardinalité">
    Les libellés Prometheus restent bornés et à faible cardinalité. L'exportateur n'émet pas d'identifiants de diagnostic bruts tels que `runId`, `sessionKey`, `sessionId`, `callId`, `toolCallId`, les ID de message, les ID de chat ou les ID de requête de fournisseur.

    Les valeurs des libellés sont expurgées et doivent correspondre à la politique de caractères à faible cardinalité d'OpenClaw. Les valeurs qui ne respectent pas la politique sont remplacées par `unknown`, `other` ou `none`, selon la métrique. Les libellés qui ressemblent à des clés de session d'agent délimitées sont également remplacés par `unknown`.

  </Accordion>
  <Accordion title="Plafond de séries et comptabilité des dépassements">
    L'exportateur plafonne les séries temporelles retenues en mémoire à **2048** séries, tous compteurs, jauges et histogrammes combinés. Les nouvelles séries dépassant ce plafond sont supprimées, et `openclaw_prometheus_series_dropped_total` augmente de un à chaque fois.

    Surveillez ce compteur comme un signal fort indiquant qu'un attribut en amont fuite des valeurs à forte cardinalité. L'exportateur ne relève jamais le plafond automatiquement ; s'il augmente, corrigez la source plutôt que de désactiver le plafond.

  </Accordion>
  <Accordion title="Ce qui n'apparaît jamais dans la sortie Prometheus">
    - texte de l'invite, texte de réponse, entrées de tool, sorties de tool, invites système
    - transcriptions d'appels, charges utiles audio, id d'appel, id de salle, jetons de transfert, id de tour et id de session bruts
    - ID de requête de fournisseur bruts (uniquement des hachages bornés, le cas échéant, sur les spans — jamais sur les métriques)
    - clés de session et ID de session
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

# Skill usage, split by bounded source
sum by (skill, source) (increase(openclaw_skill_used_total[24h]))

# Dropped Prometheus series (cardinality alarm)
increase(openclaw_prometheus_series_dropped_total[15m]) > 0
```

<Tip>Préférez `gen_ai_client_token_usage` pour les tableaux de bord multi-fournisseurs : il suit les conventions sémantiques OpenTelemetry GenAI et est cohérent avec les métriques des services GenAI autres qu'OpenClaw.</Tip>

## Choix entre l'exportation Prometheus et OpenTelemetry

OpenClaw prend en charge les deux surfaces indépendamment. Vous pouvez exécuter l'une, l'autre, les deux, ou aucune.

<Tabs>
  <Tab title="diagnostics-prometheus">
    - **Pull** model : Prometheus récupère `/api/diagnostics/prometheus`.
    - Aucun collecteur externe requis.
    - Authentifié via l'authentification normale du Gateway.
    - La surface contient uniquement des métriques (pas de traces ni de journaux).
    - Idéal pour les piles déjà standardisées sur Prometheus + Grafana.

  </Tab>
  <Tab title="diagnostics-otel">
    - **Push** model : OpenClaw envoie OTLP/HTTP à un collecteur ou à un backend compatible OTLP.
    - La surface inclut les métriques, les traces et les journaux.
    - Pont vers Prometheus via un OpenTelemetry Collector (exportateur `prometheus` ou `prometheusremotewrite`) lorsque vous avez besoin des deux.
    - Voir [OpenTelemetry export](/fr/gateway/opentelemetry) pour le catalogue complet.

  </Tab>
</Tabs>

## Dépannage

<AccordionGroup>
  <Accordion title="Empty response body">
    - Vérifiez `diagnostics.enabled: true` dans la configuration.
    - Confirmez que le plugin est activé et chargé avec `openclaw plugins list --enabled`.
    - Générez du trafic ; les compteurs et histogrammes n'émettent des lignes qu'après au moins un événement.

  </Accordion>
  <Accordion title="401 / unauthorized">
    Le point de terminaison nécessite la portée d'opérateur du Gateway (`auth: "gateway"` avec `gatewayRuntimeScopeSurface: "trusted-operator"`). Utilisez le même jeton ou mot de passe que Prometheus utilise pour toute autre route d'opérateur du Gateway. Il n'y a pas de mode public non authentifié.
  </Accordion>
  <Accordion title="`openclaw_prometheus_series_dropped_total` is climbing">
    Un nouvel attribut dépasse la limite de **2048** séries. Inspectez les métriques récentes pour trouver un label à cardinalité inattendument élevée et corrigez-le à la source. L'exportateur abandonne intentionnellement les nouvelles séries au lieu de réécrire silencieusement les labels.
  </Accordion>
  <Accordion title="Prometheus shows stale series after a restart">
    Le plugin conserve l'état uniquement en mémoire. Après un redémarrage du Gateway, les compteurs sont réinitialisés à zéro et les jauges redémarrent à leur prochaine valeur rapportée. Utilisez `rate()` et `increase()` PromQL pour gérer les réinitialisations proprement.
  </Accordion>
</AccordionGroup>

## Connexes

- [Diagnostics export](/fr/gateway/diagnostics) — archive de diagnostic locale pour les bundles de support
- [Health and readiness](/fr/gateway/health) — sondes `/healthz` et `/readyz`
- [Logging](/fr/logging) — journalisation basée sur les fichiers
- [OpenTelemetry export](/fr/gateway/opentelemetry) — push OTLP pour les traces, les métriques et les journaux
