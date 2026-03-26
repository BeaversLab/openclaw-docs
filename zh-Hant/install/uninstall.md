---
summary: "完全移除 OpenClaw（CLI、服務、狀態、工作區）"
read_when:
  - You want to remove OpenClaw from a machine
  - The gateway service is still running after uninstall
title: "移除"
---

# 移除

兩種途徑：

- **簡易途徑**：如果 `openclaw` 仍已安裝。
- **手動移除服務**：如果 CLI 已移除但服務仍在運作。

## 簡易途徑（CLI 仍已安裝）

建議做法：使用內建的解除安裝程式：

```bash
openclaw uninstall
```

非互動式（自動化 / npx）：

```bash
openclaw uninstall --all --yes --non-interactive
npx -y openclaw uninstall --all --yes --non-interactive
```

手動步驟（結果相同）：

1. 停止閘道服務：

```bash
openclaw gateway stop
```

2. 解除安裝閘道服務 (launchd/systemd/schtasks)：

```bash
openclaw gateway uninstall
```

3. 刪除狀態 + 設定：

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

如果您將 `OPENCLAW_CONFIG_PATH` 設定為狀態目錄以外的自訂位置，請一併刪除該檔案。

4. 刪除您的工作區（選用，會移除代理程式檔案）：

```bash
rm -rf ~/.openclaw/workspace
```

5. 移除 CLI 安裝（選擇您使用過的那一個）：

```bash
npm rm -g openclaw
pnpm remove -g openclaw
bun remove -g openclaw
```

6. 如果您安裝了 macOS 應用程式：

```bash
rm -rf /Applications/OpenClaw.app
```

備註：

- 如果您使用了設定檔（`--profile` / `OPENCLAW_PROFILE`），請針對每個狀態目錄重複步驟 3（預設為 `~/.openclaw-<profile>`）。
- 在遠端模式下，狀態目錄位於 **gateway host** 上，因此也請在那裡執行步驟 1-4。

## 手動移除服務（未安裝 CLI）

如果 gateway 服務持續運行但 `openclaw` 遺失，請使用此方法。

### macOS (launchd)

預設標籤為 `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；舊版的 `com.openclaw.*` 可能仍然存在）：

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

如果您使用了設定檔，請將標籤和 plist 名稱替換為 `ai.openclaw.<profile>`。如果存在任何舊版的 `com.openclaw.*` plist，請將其移除。

### Linux (systemd 使用者單元)

預設單元名稱為 `openclaw-gateway.service`（或 `openclaw-gateway-<profile>.service`）：

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

### Windows (排程任務)

預設任務名稱為 `OpenClaw Gateway` (或 `OpenClaw Gateway (<profile>)`)。
任務腳本位於您的狀態目錄下。

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

如果您使用了設定檔 (profile)，請刪除對應的任務名稱和 `~\.openclaw-<profile>\gateway.cmd`。

## 一般安裝 vs 原始碼檢出

### 一般安裝 (install.sh / npm / pnpm / bun)

如果您使用了 `https://openclaw.ai/install.sh` 或 `install.ps1`，則 CLI 是透過 `npm install -g openclaw@latest` 安裝的。
請使用 `npm rm -g openclaw` 將其移除 (如果您是透過那種方式安裝的，則使用 `pnpm remove -g` / `bun remove -g`)。

### 原始碼檢出 (git clone)

如果您是從程式庫檢出執行 (`git clone` + `openclaw ...` / `bun run openclaw ...`)：

1. 請在刪除程式庫**之前**解除安裝閘道服務 (使用上述簡易路徑或手動移除服務)。
2. 刪除程式庫目錄。
3. 如上所示，移除狀態 + 工作區。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
