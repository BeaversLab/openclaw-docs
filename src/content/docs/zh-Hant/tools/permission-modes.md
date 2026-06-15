---
summary: "主機執行、Codex Guardian 審核及 ACPX 鞍座階段的權限模式"
read_when:
  - Choosing auto, ask, allowlist, full, or deny for command permissions
  - Configuring Codex Guardian-reviewed approvals through tools.exec.mode
  - Comparing OpenClaw exec approvals with ACPX harness permissions
title: "權限模式"
---

權限模式決定了代理程式在執行主機指令、寫入檔案或請求後端鞍座提供額外存取權限之前擁有多少權力。當您希望 OpenClaw 優先使用允許清單，然後對未命中的項目採用 Codex 原生自動審核或人工審核流程時，請從 `tools.exec.mode: "auto"` 開始。

<Note>權限模式與 `tools.exec.host=auto` 分開。`tools.exec.host` 決定了指令在哪裡執行。`tools.exec.mode` 決定了如何核准 主機執行。</Note>

## 建議的預設值

對於需要實用主機存取權但不想讓每次未命中都提示人工的編碼代理程式，請使用 `auto`：

```bash
openclaw config set tools.exec.mode auto
openclaw approvals get
openclaw gateway restart
```

然後驗證生效的原則：

```bash
openclaw exec-policy show
```

在 `auto` 模式下，OpenClaw 會直接執行確定性允許清單的匹配。未命中的核准項目會先經過 OpenClaw 的原生自動審核器，然後在需要時回退到設定好的人工審核流程。

## OpenClaw 主機執行模式

`tools.exec.mode` 是主機 `exec` 的標準化原則介面。

| 模式        | 行為                                   | 使用時機                            |
| ----------- | -------------------------------------- | ----------------------------------- |
| `deny`      | 封鎖主機執行。                         | 不允許任何主機指令。                |
| `allowlist` | 僅執行允許清單中的指令。               | 您有一組已知安全的指令集。          |
| `ask`       | 執行允許清單的匹配，並在未命中時詢問。 | 應該由人工審查新指令。              |
| `auto`      | 執行允許清單的匹配，然後使用自動審核。 | 編碼階段需要實用的受防護存取權。    |
| `full`      | 無需提示即可執行主機執行。             | 此受信任的主機/階段應略過核准閘門。 |

如需完整的主機執行原則、本機核准檔案、允許清單架構、安全 bin 和轉發行為，請參閱 [執行核准](/zh-Hant/tools/exec-approvals)。

## Codex Guardian 對應

對於原生 Codex 應用伺服器階段，當本機 Codex 需求允許時，`tools.exec.mode: "auto"` 會對應到經過 Codex Guardian 審核的核准。OpenClaw 通常會發送：

| Codex 欄位          | 典型值            |
| ------------------- | ----------------- |
| `approvalPolicy`    | `on-request`      |
| `approvalsReviewer` | `auto_review`     |
| `sandbox`           | `workspace-write` |

在 `auto` 模式下，OpenClaw 不會保留舊版不安全的 Codex 覆寫設定，例如 `approvalPolicy: "never"` 或 `sandbox: "danger-full-access"`。請僅在您刻意希望採用無需批准的姿態時，才使用 `tools.exec.mode: "full"`。

如需了解應用程式伺服器設定、驗證順序以及原生 Codex 執行時詳細資訊，請參閱 [Codex harness](/zh-Hant/plugins/codex-harness)。

## ACPX harness 權限

ACPX 工作階段是非互動式的，因此它們無法點擊 TTY 權限提示。ACPX 使用 `plugins.entries.acpx.config` 下的獨立 harness 層級設定：

| 設定                        | 常見值          | 含義                        |
| --------------------------- | --------------- | --------------------------- |
| `permissionMode`            | `approve-reads` | 僅自動核准讀取。            |
| `permissionMode`            | `approve-all`   | 自動核准寫入和 shell 指令。 |
| `permissionMode`            | `deny-all`      | 拒絕所有權限提示。          |
| `nonInteractivePermissions` | `fail`          | 當需要提示時中止。          |
| `nonInteractivePermissions` | `deny`          | 拒絕提示並盡可能繼續執行。  |

請單獨設定 ACPX 權限，而不要與 OpenClaw 執行批准混為一談：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
openclaw gateway restart
```

將 `approve-all` 作為 ACPX 的緊急措施（break-glass），相當於無提示的 harness 工作階段。如需設定詳細資訊和失敗模式，請參閱 [ACP agents setup](/zh-Hant/tools/acp-agents-setup#permission-configuration)。

## 選擇模式

| 目標                                       | 設定                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| 完全封鎖主機指令                           | `tools.exec.mode: "deny"`                                   |
| 僅允許執行已知安全的指令                   | `tools.exec.mode: "allowlist"`                              |
| 詢問人員以處理每種新指令類型               | `tools.exec.mode: "ask"`                                    |
| 在人員審查前先使用 Codex/OpenClaw 自動審查 | `tools.exec.mode: "auto"`                                   |
| 完全跳過主機執行批准                       | `tools.exec.mode: "full"` 加上相符的主機批准檔案            |
| 讓非互動式 ACPX 工作階段進行寫入/執行      | `plugins.entries.acpx.config.permissionMode: "approve-all"` |

如果變更模式後指令仍出現提示或失敗，請檢查這兩層：

```bash
openclaw approvals get
openclaw exec-policy show
```

主機執行會使用 OpenClaw 配置和本地主機核准檔案中較嚴格的結果。ACCPX 複合駕駛裝置權限不會放寬主機執行核准，而主機執行核准也不會放寬 ACPX 複合駕駛裝置提示。

## 相關

- [執行核准](/zh-Hant/tools/exec-approvals)
- [執行核准 - 進階](/zh-Hant/tools/exec-approvals-advanced)
- [Codex 複合駕駛裝置](/zh-Hant/plugins/codex-harness)
- [ACP 代理程式設定](/zh-Hant/tools/acp-agents-setup#permission-configuration)
