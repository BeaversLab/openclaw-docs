---
summary: "OpenClaw通过 diagnostics-prometheus 插件将 OpenClaw 诊断信息暴露为 Prometheus 文本指标"
title: "Prometheus 指标"
sidebarTitle: "Prometheus"
read_when:
  - You want Prometheus, Grafana, VictoriaMetrics, or another scraper to collect OpenClaw Gateway metrics
  - You need the Prometheus metric names and label policy for dashboards or alerts
  - You want metrics without running an OpenTelemetry collector
---

OpenClaw 可以通过官方的 OpenClaw`diagnostics-prometheus` 插件暴露诊断指标。它会监听受信任的内部诊断信息，并在以下位置渲染 Prometheus 文本端点：

```text
GET /api/diagnostics/prometheus
```

内容类型为 `text/plain; version=0.0.4; charset=utf-8`，这是标准的 Prometheus 暴露格式。

<Warning>该路由使用 Gateway（网关）身份验证（操作员范围）。请勿将其作为公共的未经身份验证的 Gateway(网关)`/metrics` 端点暴露。请通过您用于其他操作员 API 的相同身份验证路径来抓取它。</Warning>

有关追踪、日志、OTLP 推送和 OpenTelemetry GenAI 语义属性，请参阅 [OpenTelemetry 导出](/zh/gateway/opentelemetry)。

## 快速开始

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install clawhub:@openclaw/diagnostics-prometheus
    ```
  </Step>
  <Step title="启用插件">
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
  <Step title="Gateway(网关)重启 Gateway（网关）">
    HTTP 路由在插件启动时注册，因此在启用后请重新加载。
  </Step>
  <Step title="抓取受保护的路由">
    发送与您的操作员客户端使用的相同的 Gateway（网关）身份验证：

    ```bash
    curl -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
      http://127.0.0.1:18789/api/diagnostics/prometheus
    ```

  </Step>
  <Step title="连接 Prometheus">
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

<Note>`diagnostics.enabled: true` 是必需的。如果没有它，插件仍会注册 HTTP 路由，但不会有诊断事件流入导出器，因此响应为空。</Note>

## 导出的指标

| 指标                                          | 类型      | 标签                                                                                      |
| --------------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `openclaw_run_completed_total`                | 计数器    | `channel`, `model`, `outcome`, `provider`, `trigger`                                      |
| `openclaw_run_duration_seconds`               | 直方图    | `channel`，`model`，`outcome`，`provider`，`trigger`                                      |
| `openclaw_model_call_total`                   | 计数器    | `api`，`error_category`，`model`，`outcome`，`provider`，`transport`                      |
| `openclaw_model_call_duration_seconds`        | 直方图    | `api`，`error_category`，`model`，`outcome`，`provider`，`transport`                      |
| `openclaw_model_tokens_total`                 | 计数器    | `agent`，`channel`，`model`，`provider`，`token_type`                                     |
| `openclaw_gen_ai_client_token_usage`          | 直方图    | `model`，`provider`，`token_type`                                                         |
| `openclaw_model_cost_usd_total`               | 计数器    | `agent`，`channel`，`model`，`provider`                                                   |
| `openclaw_skill_used_total`                   | 计数器    | `activation`、`agent`、`skill`、`source`                                                  |
| `openclaw_tool_execution_total`               | 计数器    | `error_category`、`outcome`、`params_kind`、`tool`、`tool_owner`、`tool_source`           |
| `openclaw_tool_execution_duration_seconds`    | 直方图    | `error_category`、`outcome`、`params_kind`、`tool`、`tool_owner`、`tool_source`           |
| `openclaw_harness_run_total`                  | 计数器    | `channel`，`error_category`，`harness`，`model`，`outcome`，`phase`，`plugin`，`provider` |
| `openclaw_harness_run_duration_seconds`       | 直方图    | `channel`、`error_category`、`harness`、`model`、`outcome`、`phase`、`plugin`、`provider` |
| `openclaw_message_received_total`             | 计数器    | `channel`、`source`                                                                       |
| `openclaw_message_dispatch_started_total`     | 计数器    | `channel`、`source`                                                                       |
| `openclaw_message_dispatch_completed_total`   | counter   | `channel`、`outcome`、`reason`、`source`                                                  |
| `openclaw_message_dispatch_duration_seconds`  | histogram | `channel`、`outcome`、`reason`、`source`                                                  |
| `openclaw_message_processed_total`            | counter   | `channel`、`outcome`、`reason`                                                            |
| `openclaw_message_processed_duration_seconds` | histogram | `channel`、`outcome`、`reason`                                                            |
| `openclaw_message_delivery_started_total`     | 计数器    | `channel`、`delivery_kind`                                                                |
| `openclaw_message_delivery_total`             | counter   | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_message_delivery_duration_seconds`  | 直方图    | `channel`, `delivery_kind`, `error_category`, `outcome`                                   |
| `openclaw_talk_event_total`                   | 计数器    | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_event_duration_seconds`        | histogram | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_talk_audio_bytes`                   | histogram | `brain`, `event_type`, `mode`, `provider`, `transport`                                    |
| `openclaw_queue_lane_size`                    | gauge     | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`            | histogram | `lane`                                                                                    |
| `openclaw_session_state_total`                | counter   | `reason`, `state`                                                                         |
| `openclaw_session_queue_depth`                | gauge     | `state`                                                                                   |
| `openclaw_session_turn_created_total`         | 计数器    | `agent`, `channel`, `trigger`                                                             |
| `openclaw_session_recovery_total`             | 计数器    | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_session_recovery_age_seconds`       | histogram | `action`, `active_work_kind`, `state`, `status`                                           |
| `openclaw_memory_bytes`                       | gauge     | `kind`                                                                                    |
| `openclaw_memory_rss_bytes`                   | histogram | none                                                                                      |
| `openclaw_memory_pressure_total`              | counter   | `level`, `reason`                                                                         |
| `openclaw_telemetry_exporter_total`           | counter   | `exporter`、`reason`、`signal`、`status`                                                  |
| `openclaw_prometheus_series_dropped_total`    | 计数器    | 无                                                                                        |

## 标签策略

<AccordionGroup>
  <Accordion title="受限的、低基数的标签">
    Prometheus 标签保持受限且基数低。导出器不会发出原始诊断标识符，例如 `runId`、`sessionKey`、`sessionId`、`callId`、`toolCallId`OpenClaw、消息 ID、聊天 ID 或提供商请求 ID。

    标签值会被编辑，并且必须符合 OpenClaw 的低基数字符策略。不符合策略的值将根据指标情况替换为 `unknown`、`other` 或 `none`。看起来像作用域内代理会话密钥的标签也会被替换为 `unknown`。

  </Accordion>
  <Accordion title="序列上限和溢出统计">
    导出器在内存中将保留的时间序列上限设置为计数器、仪表和直方图总计 **2048** 个序列。超过此上限的新序列将被丢弃，并且每次 `openclaw_prometheus_series_dropped_total` 都会加一。

    请密切关注此计数器，将其视为上游属性正在泄漏高基数值的硬信号。导出器永远不会自动取消上限；如果该值上升，请修复源头而不是禁用上限。

  </Accordion>
  <Accordion title="Prometheus 输出中绝不会出现的内容">
    - 提示文本、响应文本、工具输入、工具输出、系统提示词
    - 通话记录、音频负载、通话 ID、房间 ID、交接令牌、轮次 ID 和原始会话 ID
    - 原始提供商请求 ID（仅在跨度上适用有界哈希——绝不用于指标）
    - 会话密钥和会话 ID
    - 主机名、文件路径、机密值

  </Accordion>
</AccordionGroup>

## PromQL 指南

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

<Tip>对于跨提供商的仪表板，建议首选 `gen_ai_client_token_usage`：它遵循 OpenTelemetry GenAI 语义约定，并且与非 OpenClaw GenAI 服务的指标保持一致。</Tip>

## 在 Prometheus 和 OpenTelemetry 导出之间进行选择

OpenClaw 独立支持这两种接口。您可以运行其中一种、两种，或者都不运行。

<Tabs>
  <Tab title="diagnostics-prometheus">
    - **Pull** 模型：Prometheus 抓取 `/api/diagnostics/prometheus`。
    - 不需要外部收集器。
    - 通过标准 Gateway(网关) 身份验证进行认证。
    - 接口仅包含指标（不包含追踪或日志）。
    - 最适合已标准化使用 Prometheus + Grafana 的技术栈。

  </Tab>
  <Tab title="diagnostics-otel">
    - **Push** 模型：OpenClaw 将 OTLP/HTTP 发送到收集器或兼容 OTLP 的后端。
    - 接口包括指标、追踪和日志。
    - 当您需要两者时，可以通过 OpenTelemetry 收集器（`prometheus` 或 `prometheusremotewrite` 导出器）桥接到 Prometheus。
    - 有关完整目录，请参阅 [OpenTelemetry 导出](/zh/gateway/opentelemetry)。

  </Tab>
</Tabs>

## 故障排除

<AccordionGroup>
  <Accordion title="Empty response body">
    - 检查配置中的 `diagnostics.enabled: true`。
    - 确认插件已启用并通过 `openclaw plugins list --enabled` 加载。
    - 生成一些流量；计数器和直方图仅在至少发生一个事件后才输出行。

  </Accordion>
  <Accordion title="401 / unauthorized">
    该端点需要 Gateway(网关) 操作员范围（`auth: "gateway"` 配合 `gatewayRuntimeScopeSurface: "trusted-operator"`）。使用 Prometheus 用于任何其他 Gateway(网关) 操作员路由的相同令牌或密码。没有公共的未认证模式。
  </Accordion>
  <Accordion title="`openclaw_prometheus_series_dropped_total` is climbing">
    一个新属性超过了 **2048** 个序列的上限。检查最近的指标中是否存在意外的高基数标签，并从源头修复它。导出器会有意丢弃新序列，而不是静默地重写标签。
  </Accordion>
  <Accordion title="Prometheus shows stale series after a restart"Gateway(网关)>
    该插件仅在内存中保持状态。在 Gateway(网关) 重启后，计数器将重置为零，仪表将从其下一个报告的值重新开始。使用 PromQL `rate()` 和 `increase()` 来干净地处理重置。
  </Accordion>
</AccordionGroup>

## 相关

- [Diagnostics export](/zh/gateway/diagnostics) — 用于支持包的本地诊断 zip 文件
- [Health and readiness](/zh/gateway/health) — `/healthz` 和 `/readyz` 探测
- [Logging](/zh/logging) — 基于文件的日志记录
- [OpenTelemetry export](/zh/gateway/opentelemetry) — 用于跟踪、指标和日志的 OTLP 推送
