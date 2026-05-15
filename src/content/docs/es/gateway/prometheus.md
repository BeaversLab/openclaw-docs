---
summary: "Exponga los diagnósticos de OpenClaw como métricas de texto de Prometheus a través del complemento diagnostics-prometheus"
title: "Métricas de Prometheus"
sidebarTitle: "Prometheus"
read_when:
  - You want Prometheus, Grafana, VictoriaMetrics, or another scraper to collect OpenClaw Gateway metrics
  - You need the Prometheus metric names and label policy for dashboards or alerts
  - You want metrics without running an OpenTelemetry collector
---

OpenClaw puede exponer métricas de diagnóstico a través del complemento oficial `diagnostics-prometheus`. Escucha los diagnósticos internos de confianza y representa un punto final de texto de Prometheus en:

```text
GET /api/diagnostics/prometheus
```

El tipo de contenido es `text/plain; version=0.0.4; charset=utf-8`, el formato de exposición estándar de Prometheus.

<Warning>La ruta utiliza la autenticación de Gateway (ámbito de operador). No la exponga como un punto final `/metrics` público sin autenticar. Extráigala a través de la misma ruta de autenticación que utiliza para otras API de operador.</Warning>

Para trazas, registros, envío OTLP y atributos semánticos de OpenTelemetry GenAI, consulte [Exportación de OpenTelemetry](/es/gateway/opentelemetry).

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

| Métrica                                       | Tipo       | Etiquetas                                                                                 |
| --------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `openclaw_run_completed_total`                | contador   | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_run_duration_seconds`               | histograma | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_model_call_total`                   | contador   | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_call_duration_seconds`        | histograma | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_tokens_total`                 | contador   | `agent`, `channel`, `model`, `provider`, `token_type`                                     |
| `openclaw_gen_ai_client_token_usage`          | histograma | `model`, `provider`, `token_type`                                                         |
| `openclaw_model_cost_usd_total`               | contador   | `agent`, `channel`, `model`, `provider`                                                   |
| `openclaw_tool_execution_total`               | contador   | `error_category`, `outcome`, `params_kind`, `tool`                                        |
| `openclaw_tool_execution_duration_seconds`    | histograma | `error_category`, `outcome`, `params_kind`, `tool`                                        |
| `openclaw_harness_run_total`                  | contador   | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_harness_run_duration_seconds`       | histograma | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_message_processed_total`            | contador   | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_processed_duration_seconds` | histogram  | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_delivery_started_total`     | counter    | `channel`, `delivery_kind`                                                                |
| `openclaw_message_delivery_total`             | contador   | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_message_delivery_duration_seconds`  | histograma | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_talk_event_total`                   | contador   | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_event_duration_seconds`        | histograma | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_audio_bytes`                   | histograma | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_queue_lane_size`                    | gauge      | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`            | histogram  | `lane`                                                                                    |
| `openclaw_session_state_total`                | counter    | `reason`, `state`                                                                         |
| `openclaw_session_queue_depth`                | indicador  | `state`                                                                                   |
| `openclaw_session_recovery_total`             | counter    | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_session_recovery_age_seconds`       | histograma | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_memory_bytes`                       | indicador  | `kind`                                                                                    |
| `openclaw_memory_rss_bytes`                   | histogram  | ninguno                                                                                   |
| `openclaw_memory_pressure_total`              | contador   | `level`, `reason`                                                                         |
| `openclaw_telemetry_exporter_total`           | contador   | `exporter`, `reason`, `signal`, `status`                                                  |
| `openclaw_prometheus_series_dropped_total`    | contador   | ninguno                                                                                   |

## Política de etiquetas

<AccordionGroup>
  <Accordion title="Etiquetas delimitadas y de baja cardinalidad">
    Las etiquetas de Prometheus se mantienen delimitadas y de baja cardinalidad. El exportador no emite identificadores de diagnóstico sin procesar, como `runId`, `sessionKey`, `sessionId`, `callId`, `toolCallId`, IDs de mensaje, IDs de chat o IDs de solicitud del proveedor.

    Los valores de las etiquetas se redactan y deben coincidir con la política de caracteres de baja cardinalidad de OpenClaw. Los valores que no cumplen con la política se reemplazan con `unknown`, `other` o `none`, según la métrica.

  </Accordion>
  <Accordion title="Límite de series y contabilidad de desbordamiento">
    El exportador limita las series temporales retenidas en memoria a **2048** series en total entre contadores, indicadores e histogramas. Las series nuevas que superen ese límite se descartan y `openclaw_prometheus_series_dropped_total` se incrementa en una cada vez.

    Vigile este contador como una señal fuerte de que un atributo aguas arriba está filtrando valores de alta cardinalidad. El exportador nunca elimina el límite automáticamente; si aumenta, solucione el origen en lugar de deshabilitar el límite.

  </Accordion>
  <Accordion title="Lo que nunca aparece en la salida de Prometheus">
    - texto del prompt, texto de respuesta, entradas de herramientas, salidas de herramientas, prompts del sistema
    - transcripciones de Talk, cargas de audio, IDs de llamada, IDs de sala, tokens de transferencia, IDs de turno e IDs de sesión sin procesar
    - IDs de solicitud de proveedor sin procesar (solo hash delimitados, cuando corresponda, en spans: nunca en métricas)
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

# Dropped Prometheus series (cardinality alarm)
increase(openclaw_prometheus_series_dropped_total[15m]) > 0
```

<Tip>Se recomienda `gen_ai_client_token_usage` para paneles entre proveedores: sigue las convenciones semánticas de OpenTelemetry GenAI y es coherente con las métricas de servicios GenAI que no son de OpenClaw.</Tip>

## Elección entre la exportación de Prometheus y OpenTelemetry

OpenClaw admite ambas superficies de forma independiente. Puede ejecutar una, ambas o ninguna.

<Tabs>
  <Tab title="diagnostics-prometheus">
    - Modelo de **extracción** (Pull): Prometheus extrae `/api/diagnostics/prometheus`.
    - No se requiere un recopilador externo.
    - Autenticado a través de la autenticación normal de Gateway.
    - La superficie es solo métricas (sin trazas ni registros).
    - Lo mejor para pilas ya estandarizadas en Prometheus + Grafana.

  </Tab>
  <Tab title="diagnostics-otel">
    - Modelo de **inserción** (Push): OpenClaw envía OTLP/HTTP a un recopilador o backend compatible con OTLP.
    - La superficie incluye métricas, trazas y registros.
    - Actúa como puente hacia Prometheus a través de un OpenTelemetry Collector (exportador `prometheus` o `prometheusremotewrite`) cuando necesita ambos.
    - Consulte [Exportación de OpenTelemetry](/es/gateway/opentelemetry) para obtener el catálogo completo.

  </Tab>
</Tabs>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Cuerpo de respuesta vacío">
    - Compruebe `diagnostics.enabled: true` en la configuración.
    - Confirme que el complemento esté habilitado y cargado con `openclaw plugins list --enabled`.
    - Genere algo de tráfico; los contadores e histogramas solo emiten líneas después de al menos un evento.

  </Accordion>
  <Accordion title="401 / no autorizado">
    El punto final requiere el ámbito de operador de Gateway (`auth: "gateway"` con `gatewayRuntimeScopeSurface: "trusted-operator"`). Use el mismo token o contraseña que Prometheus usa para cualquier otra ruta de operador de Gateway. No existe un modo público no autenticado.
  </Accordion>
  <Accordion title="`openclaw_prometheus_series_dropped_total` está aumentando">
    Un nuevo atributo está superando el límite de **2048** series. Inspeccione las métricas recientes para encontrar una etiqueta de cardinalidad inesperadamente alta y corríjala en la fuente. El exportador descarta intencionalmente las nuevas series en lugar de reescribir las etiquetas silenciosamente.
  </Accordion>
  <Accordion title="Prometheus muestra series obsoletas después de un reinicio">
    El complemento mantiene el estado solo en la memoria. Después de reiniciar el Gateway, los contadores se restablecen a cero y los medidores se reinician en su siguiente valor informado. Use PromQL `rate()` y `increase()` para manejar los reinicios de manera limpia.
  </Accordion>
</AccordionGroup>

## Relacionado

- [Exportación de diagnósticos](/es/gateway/diagnostics) — archivo zip de diagnósticos locales para paquetes de soporte
- [Salud y preparación](/es/gateway/health) — sondas `/healthz` y `/readyz`
- [Registro](/es/logging) — registro basado en archivos
- [Exportación de OpenTelemetry](/es/gateway/opentelemetry) — envío OTLP para trazas, métricas y registros
