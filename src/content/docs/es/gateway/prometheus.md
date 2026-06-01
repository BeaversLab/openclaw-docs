---
summary: "Exponga los diagnósticos de OpenClaw como métricas de texto de Prometheus a través del complemento diagnostics-prometheus"
title: "Métricas de Prometheus"
sidebarTitle: "Prometheus"
read_when:
  - You want Prometheus, Grafana, VictoriaMetrics, or another scraper to collect OpenClaw Gateway metrics
  - You need the Prometheus metric names and label policy for dashboards or alerts
  - You want metrics without running an OpenTelemetry collector
---

OpenClaw puede exponer métricas de diagnóstico a través del complemento oficial `diagnostics-prometheus`. Escucha diagnósticos de confianza más eventos de estabilidad de puerta de enlace emitidos por el núcleo y, a continuación, renderiza un endpoint de texto de Prometheus en:

```text
GET /api/diagnostics/prometheus
```

El tipo de contenido es `text/plain; version=0.0.4; charset=utf-8`, el formato de exposición estándar de Prometheus.

<Warning>La ruta utiliza la autenticación de Gateway (ámbito de operador). No la exponga como un punto final `/metrics` público sin autenticar. Extráigala a través de la misma ruta de autenticación que utiliza para otras API de operador.</Warning>

Para traces, registros, push OTLP y atributos semánticos de GenAI de OpenTelemetry, consulte [Exportación de OpenTelemetry](/es/gateway/opentelemetry).

## Inicio rápido

<Steps>
  <Step title="Instalar el complemento">
    ```bash
    openclaw plugins install clawhub:@openclaw/diagnostics-prometheus
    ```
  </Step>
  <Step title="Habilitar el complemento">
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
  <Step title="Reiniciar el Gateway">
    La ruta HTTP se registra al inicio del complemento, por lo que debe recargar después de habilitarlo.
  </Step>
  <Step title="Extraer la ruta protegida">
    Envíe la misma autenticación de puerta de enlace que utilizan sus clientes de operador:

    ```bash
    curl -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
      http://127.0.0.1:18789/api/diagnostics/prometheus
    ```

  </Step>
  <Step title="Conectar Prometheus">
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

<Note>`diagnostics.enabled: true` es obligatorio. Sin él, el complemento sigue registrando la ruta HTTP, pero ningún evento de diagnóstico fluye hacia el exportador, por lo que la respuesta está vacía.</Note>

## Métricas exportadas

| Métrica                                          | Tipo       | Etiquetas                                                                                 |
| ------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------- |
| `openclaw_run_completed_total`                   | contador   | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_run_duration_seconds`                  | histograma | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_model_call_total`                      | contador   | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_call_duration_seconds`           | histograma | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_failover_total`                  | contador   | `from_model`, `from_provider`, `lane`, `reason`, `suspended`, `to_model`, `to_provider`   |
| `openclaw_model_tokens_total`                    | contador   | `agent`, `channel`, `model`, `provider`, `token_type`                                     |
| `openclaw_gen_ai_client_token_usage`             | histograma | `model`, `provider`, `token_type`                                                         |
| `openclaw_model_cost_usd_total`                  | contador   | `agent`, `channel`, `model`, `provider`                                                   |
| `openclaw_skill_used_total`                      | contador   | `activation`, `agent`, `skill`, `source`                                                  |
| `openclaw_tool_execution_total`                  | contador   | `error_category`, `outcome`, `params_kind`, `tool`, `tool_owner`, `tool_source`           |
| `openclaw_tool_execution_duration_seconds`       | histograma | `error_category`, `outcome`, `params_kind`, `tool`, `tool_owner`, `tool_source`           |
| `openclaw_tool_execution_blocked_total`          | contador   | `denied_reason`, `params_kind`, `tool`, `tool_owner`, `tool_source`                       |
| `openclaw_harness_run_total`                     | contador   | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_harness_run_duration_seconds`          | histogram  | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_webhook_received_total`                | contador   | `channel`, `webhook`                                                                      |
| `openclaw_webhook_error_total`                   | counter    | `channel`, `webhook`                                                                      |
| `openclaw_webhook_duration_seconds`              | histogram  | `channel`, `webhook`                                                                      |
| `openclaw_message_received_total`                | counter    | `channel`, `source`                                                                       |
| `openclaw_message_dispatch_started_total`        | contador   | `channel`, `source`                                                                       |
| `openclaw_message_dispatch_completed_total`      | contador   | `channel`, `outcome`, `reason`, `source`                                                  |
| `openclaw_message_dispatch_duration_seconds`     | histogram  | `channel`, `outcome`, `reason`, `source`                                                  |
| `openclaw_message_processed_total`               | counter    | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_processed_duration_seconds`    | histograma | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_delivery_started_total`        | counter    | `channel`, `delivery_kind`                                                                |
| `openclaw_message_delivery_total`                | counter    | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_message_delivery_duration_seconds`     | histograma | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_talk_event_total`                      | contador   | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_event_duration_seconds`           | histogram  | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_audio_bytes`                      | histogram  | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_queue_lane_size`                       | gauge      | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`               | histograma | `lane`                                                                                    |
| `openclaw_session_state_total`                   | counter    | `reason`, `state`                                                                         |
| `openclaw_session_queue_depth`                   | gauge      | `state`                                                                                   |
| `openclaw_session_turn_created_total`            | contador   | `agent`, `channel`, `trigger`                                                             |
| `openclaw_session_stuck_total`                   | contador   | `reason`, `state`                                                                         |
| `openclaw_session_stuck_age_seconds`             | histogram  | `reason`, `state`                                                                         |
| `openclaw_session_recovery_total`                | counter    | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_session_recovery_age_seconds`          | histogram  | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_liveness_warning_total`                | counter    | `reason`                                                                                  |
| `openclaw_liveness_sessions`                     | gauge      | `state`                                                                                   |
| `openclaw_liveness_event_loop_delay_p99_seconds` | histogram  | `reason`                                                                                  |
| `openclaw_liveness_event_loop_delay_max_seconds` | histogram  | `reason`                                                                                  |
| `openclaw_liveness_event_loop_utilization_ratio` | histogram  | `reason`                                                                                  |
| `openclaw_liveness_cpu_core_ratio`               | histogram  | `reason`                                                                                  |
| `openclaw_payload_large_total`                   | contador   | `action`, `channel`, `plugin`, `reason`, `surface`                                        |
| `openclaw_payload_large_bytes`                   | histogram  | `action`, `channel`, `plugin`, `reason`, `surface`                                        |
| `openclaw_memory_bytes`                          | indicador  | `kind`                                                                                    |
| `openclaw_memory_rss_bytes`                      | histogram  | ninguno                                                                                   |
| `openclaw_memory_pressure_total`                 | contador   | `level`, `reason`                                                                         |
| `openclaw_telemetry_exporter_total`              | contador   | `exporter`, `reason`, `signal`, `status`                                                  |
| `openclaw_prometheus_series_dropped_total`       | contador   | ninguno                                                                                   |

## Política de etiquetas

<AccordionGroup>
  <Accordion title="Etiquetas limitadas y de baja cardinalidad">
    Las etiquetas de Prometheus se mantienen limitadas y de baja cardinalidad. El exportador no emite identificadores de diagnóstico sin procesar, como `runId`, `sessionKey`, `sessionId`, `callId`, `toolCallId`, ID de mensaje, ID de chat o ID de solicitud del proveedor.

    Los valores de las etiquetas se redactan y deben coincidir con la política de caracteres de baja cardinalidad de OpenClaw. Los valores que no cumplan con la política se reemplazan por `unknown`, `other` o `none`, dependiendo de la métrica. Las etiquetas que parezcan claves de sesión de agente con ámbito también se reemplazan por `unknown`.

  </Accordion>
  <Accordion title="Límite de series y contabilidad de desbordamiento">
    El exportador limita las series temporales retenidas en memoria a **2048** series combinando contadores, medidores e histogramas. Las nuevas series que superen ese límite se descartan y `openclaw_prometheus_series_dropped_total` se incrementa en uno cada vez.

    Vigile este contador como una señal clara de que un atributo upstream está filtrando valores de alta cardinalidad. El exportador nunca levanta el límite automáticamente; si aumenta, solucione el origen en lugar de deshabilitar el límite.

  </Accordion>
  <Accordion title="Lo que nunca aparece en la salida de Prometheus">
    - texto del prompt, texto de la respuesta, entradas de herramientas, salidas de herramientas, prompts del sistema
    - transcripciones de conversaciones, cargas de audio, ids de llamadas, ids de salas, tokens de traspaso, ids de turno e ids de sesión sin procesar
    - IDs de solicitud del proveedor sin procesar (solo hashes limitados, cuando corresponda, en los spans, nunca en métricas)
    - claves de sesión e IDs de sesión
    - nombres de host, rutas de archivo, valores secretos

  </Accordion>
</AccordionGroup>

## Recetas de PromQL

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

<Tip>Prefiera `gen_ai_client_token_usage` para paneles entre proveedores: sigue las convenciones semánticas de OpenTelemetry GenAI y es coherente con las métricas de servicios GenAI que no son de OpenClaw.</Tip>

## Elección entre exportación de Prometheus y OpenTelemetry

OpenClaw admite ambas superficies de forma independiente. Puede ejecutar una, ambas o ninguna.

<Tabs>
  <Tab title="diagnostics-prometheus">
    - Modelo **Pull** (extracción): Prometheus extrae `/api/diagnostics/prometheus`.
    - No se requiere un recopilador externo.
    - Autenticado a través de la autenticación normal del Gateway.
    - La superficie es solo métricas (sin rastros ni registros).
    - Mejor para pilas ya estandarizadas en Prometheus + Grafana.

  </Tab>
  <Tab title="diagnostics-otel">
    - Modelo **Push** (envío): OpenClaw envía OTLP/HTTP a un recopilador o un backend compatible con OTLP.
    - La superficie incluye métricas, rastros y registros.
    - Se integra con Prometheus a través de un OpenTelemetry Collector (exportador `prometheus` o `prometheusremotewrite`) cuando necesita ambos.
    - Consulte [Exportación de OpenTelemetry](/es/gateway/opentelemetry) para el catálogo completo.

  </Tab>
</Tabs>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Cuerpo de respuesta vacío">
    - Comprueba `diagnostics.enabled: true` en la configuración.
    - Confirma que el complemento está habilitado y cargado con `openclaw plugins list --enabled`.
    - Genera algo de tráfico; los contadores e histogramas solo emiten líneas después de al menos un evento.

  </Accordion>
  <Accordion title="401 / no autorizado">
    El punto final requiere el ámbito de operador de Gateway (`auth: "gateway"` con `gatewayRuntimeScopeSurface: "trusted-operator"`). Usa el mismo token o contraseña que Prometheus usa para cualquier otra ruta de operador de Gateway. No hay ningún modo público no autenticado.
  </Accordion>
  <Accordion title="`openclaw_prometheus_series_dropped_total` está aumentando">
    Un nuevo atributo está superando el límite de **2048** series. Inspecciona las métricas recientes para encontrar una etiqueta de cardinalidad inesperadamente alta y corrígela en el origen. El exportador intencionalmente descarta nuevas series en lugar de reescribir etiquetas silenciosamente.
  </Accordion>
  <Accordion title="Prometheus muestra series obsoletas después de un reinicio">
    El complemento mantiene el estado solo en memoria. Después de un reinicio del Gateway, los contadores se restablecen a cero y los indicadores se reinician en su próximo valor reportado. Usa PromQL `rate()` y `increase()` para manejar los restablecimientos correctamente.
  </Accordion>
</AccordionGroup>

## Relacionado

- [Exportación de diagnósticos](/es/gateway/diagnostics) — zip de diagnóstico local para paquetes de soporte
- [Estado y preparación](/es/gateway/health) — sondas `/healthz` y `/readyz`
- [Registro](/es/logging) — registro basado en archivos
- [Exportación de OpenTelemetry](/es/gateway/opentelemetry) — envío OTLP para trazas, métricas y registros
