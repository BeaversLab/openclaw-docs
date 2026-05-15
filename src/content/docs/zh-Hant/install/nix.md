---
summary: "使用 Nix 宣告式安裝 OpenClaw"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

使用 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** 以宣告式方式安裝 OpenClaw —— 這是官方的、功能齊全的 Home Manager 模組。

<Info>[nix-openclaw](https://github.com/openclaw/nix-openclaw) 儲存庫是 Nix 安裝的資訊來源。本頁面僅提供快速概覽。</Info>

## 你將獲得

- Gateway + macOS 應用程式 + 工具 (whisper, spotify, cameras) —— 全部鎖定版本
- 能夠在重啟後存活的 Launchd 服務
- 具有宣告式配置的外掛系統
- 即時回滾：`home-manager switch --rollback`

## 快速開始

<Steps>
  <Step title="安裝 Determinate Nix">如果尚未安裝 Nix，請依照 [Determinate Nix installer](https://github.com/DeterminateSystems/nix-installer) 的指示操作。</Step>
  <Step title="建立本地 flake">使用 nix-openclaw repo 中的 agent-first 範本： ```bash mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="設定機密">設定您的訊息機器人權杖和模型提供者 API 金鑰。位於 `~/.secrets/` 的純文字檔案即可。</Step>
  <Step title="填寫範本預留位置並切換">```bash home-manager switch ```</Step>
  <Step title="驗證">確認 launchd 服務正在運行，且您的 bot 能回應訊息。</Step>
</Steps>

完整的模組選項與範例，請參閱 [nix-openclaw README](https://github.com/openclaw/nix-openclaw)。

## Nix 模式執行時期行為

當設定 `OPENCLAW_NIX_MODE=1` 時（使用 nix-openclaw 時自動設定），OpenClaw 會針對 Nix 管理的安裝進入確定性模式。其他 Nix 套件也可以設定相同的模式；nix-openclaw 是官方的參考實作。

您也可以手動進行設定：

```bash
export OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 應用程式不會自動繼承 shell 環境變數。請改用 defaults 來啟用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Nix 模式下的變更

- 自動安裝和自我變異流程已停用
- `openclaw.json` 被視為不可變更。啟動時衍生的預設值僅保留在執行時期，而設定寫入程式（如 setup、onboarding、變更 `openclaw update`、外掛程式安裝/更新/解除安裝/啟用、`doctor --fix`、`doctor --generate-gateway-token` 和 `openclaw config set`）將拒絕編輯該檔案。
- Agent 應改為編輯 Nix 來源。對於 nix-openclaw，請使用以 Agent 為主的 [快速開始](https://github.com/openclaw/nix-openclaw#quick-start)，並在 `programs.openclaw.config` 或 `instances.<name>.config` 下設定組態。
- 缺少相依性會顯示 Nix 專用的修復訊息
- UI 會顯示唯讀的 Nix 模式橫幅

### 組態與狀態路徑

OpenClaw 從 `OPENCLAW_CONFIG_PATH` 讀取 JSON5 組態，並將可變資料儲存在 `OPENCLAW_STATE_DIR` 中。在 Nix 下執行時，請將這些明確設定為 Nix 管理的位置，以便執行時期狀態和組態不會留在不可變的儲存庫中。

| 變數                   | 預設值                                  |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

### 服務 PATH 探索

launchd/systemd 閘道服務會自動探索 Nix profile 二進位檔，因此
外掛和工具調用 `nix` 安裝的可執行檔時，無需
手動設定 PATH：

- 當設定 `NIX_PROFILES` 時，每個條目都會以
  從右到左的優先級（符合 Nix shell 優先級 - 最右側優先）加入到服務 PATH 中。
- 當未設定 `NIX_PROFILES` 時，`~/.nix-profile/bin` 會作為備選方案被加入。

這適用於 macOS launchd 和 Linux systemd 服務環境。

## 相關

<CardGroup cols={2}>
  <Card title="nix-openclaw" href="https://github.com/openclaw/nix-openclaw" icon="arrow-up-right-from-square">
    唯一可信來源的 Home Manager 模組及完整設定指南。
  </Card>
  <Card title="Setup wizard" href="/zh-Hant/start/wizard" icon="wand-magic-sparkles">
    非 Nix CLI 設定逐步解說。
  </Card>
  <Card title="Docker" href="/zh-Hant/install/docker" icon="docker">
    作為非 Nix 替代方案的容器化設定。
  </Card>
  <Card title="Updating" href="/zh-Hant/install/updating" icon="arrow-up-right-from-square">
    更新 Home Manager 管理的安裝與軟體包。
  </Card>
</CardGroup>
