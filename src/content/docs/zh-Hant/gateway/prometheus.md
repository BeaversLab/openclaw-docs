---
summary: "透過 diagnostics-prometheus 外掛程式將 OpenClaw 診斷公開為 Prometheus 文字指標"
title: "Prometheus 指標"
sidebarTitle: "Prometheus"
read_when:
  - You want Prometheus, Grafana, VictoriaMetrics, or another scraper to collect OpenClaw Gateway metrics
  - You need the Prometheus metric names and label policy for dashboards or alerts
  - You want metrics without running an OpenTelemetry collector
---

OpenClaw 可以透過內建的 `diagnostics-prometheus` 外掛程式公開診斷指標。它會監聽受信任的內部診斷，並在以下位置提供 Prometheus 文字端點：

```text
GET /api/diagnostics/prometheus
```

內容類型為 `text/plain; version=0.0.4; charset=utf-8`，這是標準的 Prometheus 公開格式。

<Warning>此路由使用 Gateway 驗證 (operator 範圍)。請勿將其公開為未經驗證的公用 `/metrics` 端點。請透過您用於其他 operator API 的相同驗證路徑來抓取它。</Warning>

若要了解追蹤、日誌、OTLP 推送以及 OpenTelemetry GenAI 語意屬性，請參閱 [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)。

## 快速開始

<Steps>
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
    HTTP 路由會在外掛程式啟動時註冊，因此請在啟用後重新載入。
  </Step>
  <Step title="抓取受保護的路由">
    傳送您的 operator 用戶端使用的相同 gateway 驗證：

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

<Note>需要 `diagnostics.enabled: true`。如果沒有它，外掛程式仍會註冊 HTTP 路由，但沒有診斷事件流入匯出器，因此回應會是空的。</Note>

## 匯出的指標

| 指標                                          | 類型      | 標籤                                                                                      |
| --------------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `openclaw_run_completed_total`                | counter   | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_run_duration_seconds`               | histogram | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_model_call_total`                   | counter   | `api`、`error_category`、`model`、`outcome`、`provider`、`transport`                      |
| `openclaw_model_call_duration_seconds`        | 直方圖    | `api`、`error_category`、`model`、`outcome`、`provider`、`transport`                      |
| `openclaw_model_tokens_total`                 | 計數器    | `agent`、`channel`、`model`、`provider`、`token_type`                                     |
| `openclaw_gen_ai_client_token_usage`          | 直方圖    | `model`、`provider`、`token_type`                                                         |
| `openclaw_model_cost_usd_total`               | 計數器    | `agent`、`channel`、`model`、`provider`                                                   |
| `openclaw_tool_execution_total`               | 計數器    | `error_category`、`outcome`、`params_kind`、`tool`                                        |
| `openclaw_tool_execution_duration_seconds`    | 直方圖    | `error_category`、`outcome`、`params_kind`、`tool`                                        |
| `openclaw_harness_run_total`                  | 計數器    | `channel`、`error_category`、`harness`、`model`、`outcome`、`phase`、`plugin`、`provider` |
| `openclaw_harness_run_duration_seconds`       | 直方圖    | `channel`、`error_category`、`harness`、`model`、`outcome`、`phase`、`plugin`、`provider` |
| `openclaw_message_processed_total`            | 計數器    | `channel`、`outcome`、`reason`                                                            |
| `openclaw_message_processed_duration_seconds` | 直方圖    | `channel`, `outcome`, `reason`                                                            |
| `openclaw_message_delivery_total`             | 計數器    | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_message_delivery_duration_seconds`  | 直方圖    | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_queue_lane_size`                    | 儀表      | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`            | 直方圖    | `lane`                                                                                    |
| `openclaw_session_state_total`                | 計數器    | `reason`, `state`                                                                         |
| `openclaw_session_queue_depth`                | 儀表      | `state`                                                                                   |
| `openclaw_memory_bytes`                       | 儀表      | `kind`                                                                                    |
| `openclaw_memory_rss_bytes`                   | 直方圖    | 無                                                                                        |
| `openclaw_memory_pressure_total`              | 計數器    | `level`, `reason`                                                                         |
| `openclaw_telemetry_exporter_total`           | 計數器    | `exporter`, `reason`, `signal`, `status`                                                  |
| `openclaw_prometheus_series_dropped_total`    | 計數器    | 無                                                                                        |

## 標籤策略

<AccordionGroup>
  <Accordion title="有界的低基數標籤">
    Prometheus 標籤保持有界且低基數。匯出器不會發出原始的診斷識別碼，例如 `runId`、`sessionKey`、`sessionId`、`callId`、`toolCallId`、訊息 ID、聊天 ID 或提供者請求 ID。

    標籤值會被編輯，且必須符合 OpenClaw 的低基數字元策略。不符合策略的值將根據指標替換為 `unknown`、`other` 或 `none`。

  </Accordion>
  <Accordion title="Series cap and overflow accounting">
    匯出工具會將記憶體中保留的時間序列上限設定為 **2048** 個，此數值涵蓋了計數器、儀表和直方圖的總和。超過此上限的新時間序列將被捨棄，且 `openclaw_prometheus_series_dropped_total` 每次都會加一。

    請密切監控此計數器，這是上游屬性正在洩漏高基數值的強烈信號。匯出工具永遠不會自動解除上限；如果數值上升，請修復來源問題而不是停用上限。

  </Accordion>
  <Accordion title="What never appears in Prometheus output">
    - 提示詞文字、回應文字、工具輸入、工具輸出、系統提示詞
    - 原始提供者請求 ID（僅在 span 上有界定的雜湊值，若適用 — 絕不會在指標上）
    - 金鑰和工作階段 ID
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

<Tip>對於跨提供者儀表板，建議優先使用 `gen_ai_client_token_usage`：它遵循 OpenTelemetry GenAI 語意慣例，並與非 OpenClaw GenAI 服務的指標保持一致。</Tip>

## 選擇 Prometheus 與 OpenTelemetry 匯出

OpenClaw 獨立支援這兩種介面。您可以執行其中一種、同時執行兩種，或都不執行。

<Tabs>
  <Tab title="diagnostics-prometheus">- **Pull** 模型：Prometheus 抓取 `/api/diagnostics/prometheus`。 - 不需要外部收集器。 - 透過標準 Gateway 驗證進行驗證。 - 介面僅包含指標（無追蹤或日誌）。 - 最適合已經標準化使用 Prometheus + Grafana 的技術堆疊。</Tab>
  <Tab title="diagnostics-otel">- **Push** 模型：OpenClaw 將 OTLP/HTTP 發送至收集器或相容 OTLP 的後端。 - 介面包含指標、追蹤和日誌。 - 當您同時需要兩者時，可透過 OpenTelemetry Collector（`prometheus` 或 `prometheusremotewrite` 匯出器）橋接至 Prometheus。 - 請參閱 [OpenTelemetry export](/zh-Hant/gateway/opentelemetry) 以了解完整目錄。</Tab>
</Tabs>

## 故障排除

<AccordionGroup>
  <Accordion title="回應主體為空">- 檢查組態中的 `diagnostics.enabled: true`。 - 確認外掛程式已啟用並已使用 `openclaw plugins list --enabled` 載入。 - 產生一些流量；計數器 和直方圖 僅在至少發生一個事件後才會輸出資料行。</Accordion>
  <Accordion title="401 / 未授權">此端點需要 Gateway operator 範圍（`auth: "gateway"` 與 `gatewayRuntimeScopeSurface: "trusted-operator"`）。使用 Prometheus 用於任何其他 Gateway operator 路由的相同權杖 或密碼。沒有公開的未驗證模式。</Accordion>
  <Accordion title="`openclaw_prometheus_series_dropped_total` 正在持續上升">有新的屬性超過了 **2048** 個序列的上限。檢查最近的指標，尋找基數意外過高的標籤 並從來源進行修復。匯出器會刻意捨棄新序列，而不是以無聲的方式重寫標籤。</Accordion>
  <Accordion title="Prometheus 在重新啟動後顯示過期序列">此外掛程式僅將狀態保留在記憶體中。Gateway 重新啟動後，計數器會重設為零，儀表 會在下次回報的值重新開始。使用 PromQL `rate()` 和 `increase()` 來乾淨地處理重設。</Accordion>
</AccordionGroup>

## 相關

- [診斷匯出](/zh-Hant/gateway/diagnostics) — 用於支援套件的本地診斷壓縮檔
- [健康狀態與就緒狀態](/zh-Hant/gateway/health) — `/healthz` 和 `/readyz` 探測
- [日誌記錄](/zh-Hant/logging) — 基於檔案的日誌記錄
- [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry) — 用於追蹤、指標和日誌的 OTLP 推送
