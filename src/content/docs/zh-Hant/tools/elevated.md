---
summary: "提權執行模式：從沙箱代理程式在沙箱外部執行命令"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "提權模式"
---

當代理程式在沙箱內運行時，其 `exec` 指令會被侷限在
沙箱環境中。**提權模式 (Elevated mode)** 允許代理程式突破限制，轉而在沙箱
外部執行指令，並透過可設定的審核閘門進行控管。

<Info>提權模式僅在代理程式處於**沙箱**狀態時會改變行為。對於 非沙箱化的代理程式，exec 本來就在主機上執行。</Info>

## 指令

使用斜線指令控制每次對話的提權模式：

| 指令             | 作用                                           |
| ---------------- | ---------------------------------------------- |
| `/elevated on`   | 在設定的主機路徑上於沙箱外執行，並保留審核程序 |
| `/elevated ask`  | 與 `on` 相同（別名）                           |
| `/elevated full` | 在設定的主機路徑上於沙箱外執行並跳過審核程序   |
| `/elevated off`  | 恢復為受限於沙箱的執行模式                     |

也可作為 `/elev on|off|ask|full` 使用。

發送不帶參數的 `/elevated` 以查看當前等級。

## 運作方式

<Steps>
  <Step title="檢查可用性">
    必須在設定中啟用提權功能，且發送者必須在允許清單中：

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
    發送純指令訊息以設定對話預設值：

    ```
    /elevated full
    ```

    或在行內使用 (僅適用於該則訊息)：

    ```
    /elevated on run the deployment script
    ```

  </Step>

  <Step title="在沙箱外執行指令">
    啟用提權後，`exec` 呼叫會離開沙箱。預設的有效主機是
    `gateway`，當設定的/工作階段 exec 目標是
    `node` 時則為 `node`。在 `full` 模式下，會跳過 exec 審核。在 `on`/`ask` 模式下，
    設定的審核規則仍然適用。
  </Step>
</Steps>

## 解析順序

1. 訊息上的 **行內指令** (僅適用於該則訊息)
2. **對話覆蓋** (透過發送純指令訊息設定)
3. **全域預設值**（設定中的 `agents.defaults.elevatedDefault`）

## 可用性與允許清單

- **全域閘門**：`tools.elevated.enabled`（必須為 `true`）
- **發送者白名單**：`tools.elevated.allowFrom` 搭配各頻道清單
- **各代理程式閘門**：`agents.list[].tools.elevated.enabled`（只能進一步限制）
- **各代理程式白名單**：`agents.list[].tools.elevated.allowFrom`（發送者必須同時符合全域與各代理程式的規則）
- **Discord 後備機制**：如果省略了 `tools.elevated.allowFrom.discord`，則使用 `channels.discord.allowFrom` 作為後備
- **所有閘門必須通過**；否則提升模式將被視為不可用

允許清單條目格式：

| 前綴                    | 符合項目                      |
| ----------------------- | ----------------------------- |
| （無）                  | 發送者 ID、E.164 或 From 欄位 |
| `name:`                 | 發送者顯示名稱                |
| `username:`             | 發送者使用者名稱              |
| `tag:`                  | 發送者標籤                    |
| `id:`、`from:`、`e164:` | 明確的身分識別目標設定        |

## 提升模式不控制的項目

- **工具原則**：如果 `exec` 被工具原則拒絕，提權模式無法覆蓋此決定。
- **主機選擇策略**：elevated 不會將 `auto` 變成自由的跨主機覆寫。它使用已配置/會話的 exec 目標規則，僅當目標已經是 `node` 時才選擇 `node`。
- **與 `/exec` 分開**：`/exec` 指令會調整已授權發送者的每個會話 exec 預設值，並且不需要 elevated 模式。

<Note>bash 聊天指令（`!` 前綴；`/bash` 別名）是一個獨立的閘門，除了它自己的 `tools.bash.enabled` 標誌外，還需要啟用 `tools.elevated`。停用 elevated 也會將 `!` shell 指令鎖定在外。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="Exec 工具" href="/zh-Hant/tools/exec" icon="終端機">
    來自代理程式的 Shell 指令執行。
  </Card>
  <Card title="Exec 審批" href="/zh-Hant/tools/exec-approvals" icon="盾牌">
    針對 `exec` 的審批和允許清單系統。
  </Card>
  <Card title="沙盒化" href="/zh-Hant/gateway/sandboxing" icon="方塊">
    閘道層級的沙盒組態。
  </Card>
  <Card title="沙盒 vs 工具政策 vs Elevated" href="/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated" icon="scale-balanced">
    這三個閘門在工具呼叫期間如何組合。
  </Card>
</CardGroup>
