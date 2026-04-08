---
summary: "提權執行模式：從沙箱代理程式在沙箱外部執行命令"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "Elevated 模式"
---

# Elevated 模式

當代理程式在沙箱內執行時，其 `exec` 命令僅限於沙箱環境。**提權模式** 允許代理程式突破限制，轉而在沙箱外部執行命令，並具備可設定的審批閘門。

<Info>提升模式僅在代理程式位於**沙箱**中時才會變更行為。對於 非沙箱化的代理程式，exec 已經在主機上執行。</Info>

## 指令

使用斜線指令按會話控制 Elevated 模式：

| 指令             | 作用                                         |
| ---------------- | -------------------------------------------- |
| `/elevated on`   | 在設定的主機路徑上於沙箱外部執行，並保留審批 |
| `/elevated ask`  | 與 `on` 相同（別名）                         |
| `/elevated full` | 在設定的主機路徑上於沙箱外部執行，並跳過審批 |
| `/elevated off`  | 恢復為受限於沙盒的執行                       |

也可用於 `/elev on|off|ask|full`。

傳送 `/elevated` 且不帶參數以查看當前等級。

## 運作方式

<Steps>
  <Step title="檢查可用性">
    必須在設定中啟用 Elevated，且傳送者必須位於允許清單上：

    ```json5
    {
      tools: {
        elevated: {
          enabled: true,
          allowFrom: {
            discord: ["user-id-123"],
            whatsapp: ["+15555550123"],
          },
        },
      },
    }
    ```

  </Step>

  <Step title="設定等級">
    傳送僅包含指令的訊息以設定會話預設值：

    ```
    /elevated full
    ```

    或在行內使用（僅適用於該訊息）：

    ```
    /elevated on run the deployment script
    ```

  </Step>

  <Step title="命令在沙箱外部執行">
    啟用提權後，`exec` 呼叫會離開沙箱。實際主機預設為 `gateway`，當設定的/工作階段執行目標為 `node` 時則為 `node`。在 `full` 模式下，會跳過執行審批。在 `on`/`ask` 模式下，設定的審批規則仍然適用。
  </Step>
</Steps>

## 解析順序

1. 訊息上的**行內指令**（僅適用於該訊息）
2. **會話覆寫**（透過傳送僅包含指令的訊息設定）
3. **全域預設值**（設定中的 `agents.defaults.elevatedDefault`）

## 可用性與允許清單

- **全域閘門**：`tools.elevated.enabled`（必須為 `true`）
- **發送者允許清單**：`tools.elevated.allowFrom`，並包含各頻道清單
- **個別代理程式閘門**：`agents.list[].tools.elevated.enabled`（只能進一步限制）
- **個別代理程式允許清單**：`agents.list[].tools.elevated.allowFrom`（發送者必須同時符合全域與個別代理程式的設定）
- **Discord 備援**：如果省略 `tools.elevated.allowFrom.discord`，則使用 `channels.discord.allowFrom` 作為備援
- **所有閘門必須通過**；否則提升模式將被視為不可用

允許清單條目格式：

| 前綴                    | 符合項目                      |
| ----------------------- | ----------------------------- |
| （無）                  | 發送者 ID、E.164 或 From 欄位 |
| `name:`                 | 發送者顯示名稱                |
| `username:`             | 發送者使用者名稱              |
| `tag:`                  | 發送者標籤                    |
| `id:`、`from:`、`e164:` | 明確的身分識別目標            |

## 提升模式無法控制的事項

- **工具原則**：如果 `exec` 被工具原則拒絕，提權模式無法覆蓋此設定
- **主機選擇原則**：提權模式不會將 `auto` 變成免費的跨主機覆寫。它使用設定的/工作階段執行目標規則，僅在目標已經是 `node` 時選擇 `node`。
- **與 `/exec` 分開**：`/exec` 指令會針對授權發送者調整各階段的 exec 預設值，並不需要提升模式

## 相關

- [Exec 工具](/en/tools/exec) — shell 指令執行
- [Exec 審核](/en/tools/exec-approvals) — 審核與允許清單系統
- [沙盒化](/en/gateway/sandboxing) — 沙盒組態
- [沙盒 vs 工具政策 vs 提升模式](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
