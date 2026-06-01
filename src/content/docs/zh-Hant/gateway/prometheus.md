---
summary: "透過 diagnostics-prometheus 外掛程式將 OpenClaw 診斷公開為 Prometheus 文字指標"
title: "Prometheus 指標"
sidebarTitle: "Prometheus"
read_when:
  - You want Prometheus, Grafana, VictoriaMetrics, or another scraper to collect OpenClaw Gateway metrics
  - You need the Prometheus metric names and label policy for dashboards or alerts
  - You want metrics without running an OpenTelemetry collector
---

OpenClaw 可以透過官方的 `diagnostics-prometheus` 外掛程式公開診斷指標。它會監聽可信的診斷以及核心發出的閘道穩定性事件，然後在以下位置渲染 Prometheus 文字端點：

```text
GET /api/diagnostics/prometheus
```

內容類型為 `text/plain; version=0.0.4; charset=utf-8`，即標準的 Prometheus 格式。

<Warning>此路由使用 Gateway 驗證 (operator 範圍)。請勿將其公開為未經驗證的公開 `/metrics` 端點。請使用您用於其他 operator API 的相同驗證路徑來抓取它。</Warning>

關於追蹤、日誌、OTLP 推送和 OpenTelemetry GenAI 語義屬性，請參閱 [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)。

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

| 指標                                             | 類型      | 標籤                                                                                      |
| ------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------- |
| `openclaw_run_completed_total`                   | counter   | `channel`、`model`、`outcome`、`provider`、`trigger`                                      |
| `openclaw_run_duration_seconds`                  | histogram | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_model_call_total`                      | counter   | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_call_duration_seconds`           | 直方圖    | `api`, `error_category`, `model`, `outcome`, `provider`, `transport`                      |
| `openclaw_model_failover_total`                  | 計數器    | `from_model`, `from_provider`, `lane`, `reason`, `suspended`, `to_model`, `to_provider`   |
| `openclaw_model_tokens_total`                    | counter   | `agent`, `channel`, `model`, `provider`, `token_type`                                     |
| `openclaw_gen_ai_client_token_usage`             | histogram | `model`, `provider`, `token_type`                                                         |
| `openclaw_model_cost_usd_total`                  | 計數器    | `agent`, `channel`, `model`, `provider`                                                   |
| `openclaw_skill_used_total`                      | 計數器    | `activation`, `agent`, `skill`, `source`                                                  |
| `openclaw_tool_execution_total`                  | 計數器    | `error_category`, `outcome`, `params_kind`, `tool`, `tool_owner`, `tool_source`           |
| `openclaw_tool_execution_duration_seconds`       | 直方圖    | `error_category`, `outcome`, `params_kind`, `tool`, `tool_owner`, `tool_source`           |
| `openclaw_tool_execution_blocked_total`          | 計數器    | `denied_reason`, `params_kind`, `tool`, `tool_owner`, `tool_source`                       |
| `openclaw_harness_run_total`                     | 計數器    | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_harness_run_duration_seconds`          | 直方圖    | `channel`, `error_category`, `harness`, `model`, `outcome`, `phase`, `plugin`, `provider` |
| `openclaw_webhook_received_total`                | counter   | `channel`, `webhook`                                                                      |
| `openclaw_webhook_error_total`                   | 計數器    | `channel`, `webhook`                                                                      |
| `openclaw_webhook_duration_seconds`              | 直方圖    | `channel`, `webhook`                                                                      |
| `openclaw_message_received_total`                | 計數器    | `channel`, `source`                                                                       |
| `openclaw_message_dispatch_started_total`        | 計數器    | `channel`, `source`                                                                       |
| `openclaw_message_dispatch_completed_total`      | counter   | `channel`, `outcome`, `reason`, `source`                                                  |
| `openclaw_message_dispatch_duration_seconds`     | 直方圖    | `channel`, `outcome`, `reason`, `source`                                                  |
| `openclaw_message_processed_total`               | 計數器    | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_processed_duration_seconds`    | histogram | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_delivery_started_total`        | 計數器    | `channel`, `delivery_kind`                                                                |
| `openclaw_message_delivery_total`                | 計數器    | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_message_delivery_duration_seconds`     | histogram | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_talk_event_total`                      | counter   | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_event_duration_seconds`           | 直方圖    | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_audio_bytes`                      | 直方圖    | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_queue_lane_size`                       | 儀表      | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`               | histogram | `lane`                                                                                    |
| `openclaw_session_state_total`                   | 計數器    | `reason`, `state`                                                                         |
| `openclaw_session_queue_depth`                   | 儀表      | `state`                                                                                   |
| `openclaw_session_turn_created_total`            | counter   | `agent`, `channel`, `trigger`                                                             |
| `openclaw_session_stuck_total`                   | counter   | `reason`, `state`                                                                         |
| `openclaw_session_stuck_age_seconds`             | 直方圖    | `reason`, `state`                                                                         |
| `openclaw_session_recovery_total`                | 計數器    | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_session_recovery_age_seconds`          | 直方圖    | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_liveness_warning_total`                | 計數器    | `reason`                                                                                  |
| `openclaw_liveness_sessions`                     | 儀表      | `state`                                                                                   |
| `openclaw_liveness_event_loop_delay_p99_seconds` | 直方圖    | `reason`                                                                                  |
| `openclaw_liveness_event_loop_delay_max_seconds` | 直方圖    | `reason`                                                                                  |
| `openclaw_liveness_event_loop_utilization_ratio` | 直方圖    | `reason`                                                                                  |
| `openclaw_liveness_cpu_core_ratio`               | 直方圖    | `reason`                                                                                  |
| `openclaw_payload_large_total`                   | 計數器    | `action`, `channel`, `plugin`, `reason`, `surface`                                        |
| `openclaw_payload_large_bytes`                   | 直方圖    | `action`, `channel`, `plugin`, `reason`, `surface`                                        |
| `openclaw_memory_bytes`                          | 儀表      | `kind`                                                                                    |
| `openclaw_memory_rss_bytes`                      | 直方圖    | 無                                                                                        |
| `openclaw_memory_pressure_total`                 | 計數器    | `level`, `reason`                                                                         |
| `openclaw_telemetry_exporter_total`              | 計數器    | `exporter`, `reason`, `signal`, `status`                                                  |
| `openclaw_prometheus_series_dropped_total`       | 計數器    | 無                                                                                        |

## 標籤策略

<AccordionGroup>
  <Accordion title="Bounded, low-cardinality labels">
    Prometheus 標籤保持有界且基數較低。匯出器不會發出原始診斷標識符，例如 `runId`、`sessionKey`、`sessionId`、`callId`、`toolCallId`、訊息 ID、聊天 ID 或提供者請求 ID。

    標籤值會被編輯，且必須符合 OpenClaw 的低基數字元策略。未通過該策略的值會根據指標類型替換為 `unknown`、`other` 或 `none`。看起來像範圍代理工作階段金鑰的標籤也會替換為 `unknown`。

  </Accordion>
  <Accordion title="Series cap and overflow accounting">
    匯出器會將記憶體中保留的時間序列上限設為 **2048** 個，此上限合併計算了計數器、儀表和直方圖。超過此上限的新序列會被丟棄，並且 `openclaw_prometheus_series_dropped_total` 每次都會加一。

    請將此計數器視為上游屬性正在洩漏高基數值的強烈訊號。匯出器永遠不會自動取消上限；如果數值上升，請修復來源而不是停用上限。

  </Accordion>
  <Accordion title="What never appears in Prometheus output">
    - 提示詞文字、回應文字、工具輸入、工具輸出、系統提示詞
    - 對話紀錄、音訊負載、通話 ID、房間 ID、移交權杖、輪次 ID 和原始工作階段 ID
    - 原始供應商請求 ID（僅在 spans 上使用有界雜湊，如適用——從不在 metrics 上）
    - 工作階段金鑰和工作階段 ID
    - 主機名稱、檔案路徑、秘密值

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

# Skill usage, split by bounded source
sum by (skill, source) (increase(openclaw_skill_used_total[24h]))

# Dropped Prometheus series (cardinality alarm)
increase(openclaw_prometheus_series_dropped_total[15m]) > 0
```

<Tip>若用於跨供應商儀表板，請偏好使用 `gen_ai_client_token_usage`：它遵循 OpenTelemetry GenAI 語意慣例，並且與來自非 OpenClaw GenAI 服務的指標一致。</Tip>

## 選擇 Prometheus 和 OpenTelemetry 匯出

OpenClaw 獨立支援這兩個介面。您可以執行其中一個、兩者都執行，或都不執行。

<Tabs>
  <Tab title="diagnostics-prometheus">
    - **Pull** 模型：Prometheus 抓取 `/api/diagnostics/prometheus`。
    - 不需要外部收集器。
    - 透過一般的 Gateway 認證進行驗證。
    - 介面僅包含指標（沒有追蹤或日誌）。
    - 最適合已標準化使用 Prometheus + Grafana 的技術堆疊。

  </Tab>
  <Tab title="diagnostics-otel">
    - **Push** 模型：OpenClaw 將 OTLP/HTTP 發送到收集器或相容 OTLP 的後端。
    - 介面包含指標、追蹤和日誌。
    - 當您同時需要兩者時，透過 OpenTelemetry Collector（`prometheus` 或 `prometheusremotewrite` 匯出器）橋接至 Prometheus。
    - 請參閱 [OpenTelemetry export](/zh-Hant/gateway/opentelemetry) 以取得完整目錄。

  </Tab>
</Tabs>

## 疑難排解

<AccordionGroup>
  <Accordion title="回應主體空白">
    - 檢查組態中的 `diagnostics.enabled: true`。
    - 確認外掛程式已啟用並已使用 `openclaw plugins list --enabled` 載入。
    - 產生一些流量；計數器和直方圖僅在至少發生一個事件後才會輸出行。

  </Accordion>
  <Accordion title="401 / 未授權">
    此端點需要 Gateway 操作員範圍（`auth: "gateway"` 搭配 `gatewayRuntimeScopeSurface: "trusted-operator"`）。使用 Prometheus 用於任何其他 Gateway 操作員路由的相同權杖或密碼。沒有公開的未驗證模式。
  </Accordion>
  <Accordion title="`openclaw_prometheus_series_dropped_total` 正在上升">
    有新屬性超出了 **2048** 個序列的上限。檢查最近的指標是否有意外的高基數標籤，並從來源修正它。匯出器會故意捨棄新序列，而不是靜默地重寫標籤。
  </Accordion>
  <Accordion title="Prometheus 在重新啟動後顯示過時序列">
    此外掛程式僅在記憶體中保存狀態。在 Gateway 重新啟動後，計數器會重設為零，儀表會在下次回報的值重新啟動。使用 PromQL 的 `rate()` 和 `increase()` 來乾淨地處理重設。
  </Accordion>
</AccordionGroup>

## 相關

- [診斷匯出](/zh-Hant/gateway/diagnostics) — 適用於支援套件的本機診斷 zip 檔案
- [健康與就緒](/zh-Hant/gateway/health) — `/healthz` 和 `/readyz` 探測
- [記錄](/zh-Hant/logging) — 基於檔案的記錄
- [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry) — 追蹤、指標和記錄的 OTLP 推送
