---
summary: "透過 diagnostics-prometheus 外掛程式將 OpenClaw 診斷公開為 Prometheus 文字指標"
title: "Prometheus 指標"
sidebarTitle: "Prometheus"
read_when:
  - You want Prometheus, Grafana, VictoriaMetrics, or another scraper to collect OpenClaw Gateway metrics
  - You need the Prometheus metric names and label policy for dashboards or alerts
  - You want metrics without running an OpenTelemetry collector
---

OpenClaw 可以透過官方 `diagnostics-prometheus` 外掛程式公開診斷指標。它會監聽受信任的內部診斷，並在以下位置呈現 Prometheus 文字端點：

```text
GET /api/diagnostics/prometheus
```

內容類型為 `text/plain; version=0.0.4; charset=utf-8`，即標準的 Prometheus 格式。

<Warning>此路由使用 Gateway 驗證 (operator 範圍)。請勿將其公開為未經驗證的公開 `/metrics` 端點。請使用您用於其他 operator API 的相同驗證路徑來抓取它。</Warning>

有關追蹤、日誌、OTLP 推送和 OpenTelemetry GenAI 語意屬性，請參閱 [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)。

## 快速開始

<Steps>
  <Step title="安裝外掛程式">
    ```bash
    openclaw plugins install clawhub:@openclaw/diagnostics-prometheus
    ```
  </Step>
  <Step title="啟用外掛程式">
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
  <Step title="重新啟動 Gateway">
    HTTP 路由是在外掛程式啟動時註冊的，因此請在啟用後重新載入。
  </Step>
  <Step title="抓取受保護的路由">
    發送您的 operator 用戶端使用的相同 gateway 驗證：

    ```bash
    curl -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
      http://127.0.0.1:18789/api/diagnostics/prometheus
    ```

  </Step>
  <Step title="連接 Prometheus">
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

<Note>`diagnostics.enabled: true` 是必須的。如果沒有它，外掛程式仍然會註冊 HTTP 路由，但沒有診斷事件流入匯出器，因此回應將是空的。</Note>

## 匯出的指標

| 指標                                          | 類型      | 標籤                                                                                      |
| --------------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `openclaw_run_completed_total`                | counter   | `channel`、`model`、`outcome`、`provider`、`trigger`                                      |
| `openclaw_run_duration_seconds`               | histogram | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_model_call_total`                   | counter   | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_call_duration_seconds`        | 直方圖    | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_tokens_total`                 | 計數器    | `agent`, `channel`, `model`, `provider`, `token_type`                                     |
| `openclaw_gen_ai_client_token_usage`          | 直方圖    | `model`, `provider`, `token_type`                                                         |
| `openclaw_model_cost_usd_total`               | 計數器    | `agent`, `channel`, `model`, `provider`                                                   |
| `openclaw_tool_execution_total`               | 計數器    | `error_category`, `outcome`, `params_kind`, `tool`                                        |
| `openclaw_tool_execution_duration_seconds`    | 直方圖    | `error_category`, `outcome`, `params_kind`, `tool`                                        |
| `openclaw_harness_run_total`                  | 計數器    | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_harness_run_duration_seconds`       | 直方圖    | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_message_processed_total`            | 計數器    | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_processed_duration_seconds` | 直方圖    | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_delivery_started_total`     | 計數器    | `channel`, `delivery_kind`                                                                |
| `openclaw_message_delivery_total`             | counter   | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_message_delivery_duration_seconds`  | histogram | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_talk_event_total`                   | counter   | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_event_duration_seconds`        | histogram | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_audio_bytes`                   | histogram | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_queue_lane_size`                    | 儀表      | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`            | 直方圖    | `lane`                                                                                    |
| `openclaw_session_state_total`                | 計數器    | `reason`, `state`                                                                         |
| `openclaw_session_queue_depth`                | gauge     | `state`                                                                                   |
| `openclaw_session_recovery_total`             | 計數器    | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_session_recovery_age_seconds`       | histogram | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_memory_bytes`                       | gauge     | `kind`                                                                                    |
| `openclaw_memory_rss_bytes`                   | 直方圖    | 無                                                                                        |
| `openclaw_memory_pressure_total`              | 計數器    | `level`, `reason`                                                                         |
| `openclaw_telemetry_exporter_total`           | 計數器    | `exporter`, `reason`, `signal`, `status`                                                  |
| `openclaw_prometheus_series_dropped_total`    | 計數器    | 無                                                                                        |

## 標籤原則

<AccordionGroup>
  <Accordion title="有界的、低基數標籤">
    Prometheus 標籤保持有界且基數較低。匯出器不會發出原始診斷標識符，例如 `runId`、`sessionKey`、`sessionId`、`callId`、`toolCallId`、訊息 ID、聊天 ID 或提供者請求 ID。

    標籤值會被編輯，且必須符合 OpenClaw 的低基數字元原則。不符合原則的值將根據指標類型替換為 `unknown`、`other` 或 `none`。

  </Accordion>
  <Accordion title="序列上限與溢出計數">
    匯出器將記憶體中保留的時間序列上限設定為 **2048** 個序列，合併計算計數器、儀表和直方圖。超出此上限的新序列將被丟棄，並且 `openclaw_prometheus_series_dropped_total` 每次遞增一。

    請監控此計數器，作為上游屬性正在洩漏高基數值的明確信號。匯出器絕不會自動解除上限；如果數值上升，請修復來源而不是停用上限。

  </Accordion>
  <Accordion title="Prometheus 輸出中從不出現的內容">
    - 提示文字、回應文字、工具輸入、工具輸出、系統提示
    - 對話紀錄、音訊載荷、通話 ID、房間 ID、交接權杖、輪次 ID 和原始工作階段 ID
    - 原始提供者請求 ID（僅在跨度上使用有界雜湊（如適用）—— 從不在指標上使用）
    - 工作階段金鑰和工作階段 ID
    - 主機名稱、檔案路徑、機密值

  </Accordion>
</AccordionGroup>

## PromQL 食譜

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

<Tip>對於跨供應商儀表板，建議優先使用 `gen_ai_client_token_usage`：它遵循 OpenTelemetry GenAI 語義約定，並且與來自非 OpenClaw GenAI 服務的指標保持一致。</Tip>

## 在 Prometheus 和 OpenTelemetry 匯出之間選擇

OpenClaw 獨立支援這兩種介面。您可以執行其中之一、同時執行兩者，或都不執行。

<Tabs>
  <Tab title="diagnostics-prometheus">
    - **Pull** 模型：Prometheus 抓取 `/api/diagnostics/prometheus`。
    - 不需要外部收集器。
    - 透過正常的 Gateway 認證進行驗證。
    - 介面僅包含指標（沒有追蹤或日誌）。
    - 最適合已標準化使用 Prometheus + Grafana 的技術堆疊。

  </Tab>
  <Tab title="diagnostics-otel">
    - **Push** 模型：OpenClaw 將 OTLP/HTTP 發送到收集器或相容 OTLP 的後端。
    - 介面包含指標、追蹤和日誌。
    - 當您同時需要兩者時，可透過 OpenTelemetry Collector（`prometheus` 或 `prometheusremotewrite` 匯出器）橋接至 Prometheus。
    - 有關完整目錄，請參閱 [OpenTelemetry export](/zh-Hant/gateway/opentelemetry)。

  </Tab>
</Tabs>

## 疑難排解

<AccordionGroup>
  <Accordion title="Empty response body">
    - 檢查設定中的 `diagnostics.enabled: true`。
    - 確認外掛已啟用並使用 `openclaw plugins list --enabled` 載入。
    - 產生一些流量；計數器和直方圖僅在至少發生一次事件後才會輸出行。

  </Accordion>
  <Accordion title="401 / unauthorized">
    此端點需要 Gateway 操作員範圍（帶有 `gatewayRuntimeScopeSurface: "trusted-operator"` 的 `auth: "gateway"`）。使用 Prometheus 用於任何其他 Gateway 操作員路由的相同 token 或密碼。沒有公開的未經驗證模式。
  </Accordion>
  <Accordion title="`openclaw_prometheus_series_dropped_total` is climbing">
    有新的屬性超過了 **2048** 個序列的上限。檢查最近的指標中是否有意外的高基數標籤，並從源頭修復它。匯出器會刻意捨棄新序列，而不是無聲地重寫標籤。
  </Accordion>
  <Accordion title="Prometheus shows stale series after a restart">
    該外掛僅在記憶體中保持狀態。Gateway 重啟後，計數器會重設為零，儀表會從下一次報告的值重新開始。使用 PromQL `rate()` 和 `increase()` 來乾淨地處理重設。
  </Accordion>
</AccordionGroup>

## 相關

- [診斷匯出](/zh-Hant/gateway/diagnostics) — 用於支援套件的本地診斷 zip 檔案
- [健康狀態與就緒狀態](/zh-Hant/gateway/health) — `/healthz` 和 `/readyz` 探測
- [日誌記錄](/zh-Hant/logging) — 基於檔案的日誌記錄
- [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry) — 針對追蹤、指標和日誌的 OTLP 推送
