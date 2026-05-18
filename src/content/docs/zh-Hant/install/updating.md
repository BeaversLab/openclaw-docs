---
summary: "安全地更新 OpenClaw（全域安裝或原始碼），以及回滾策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

保持 OpenClaw 為最新狀態。

## 建議使用：`openclaw update`

最快的更新方式。它會偵測您的安裝類型（npm 或 git），取得最新版本，執行 `openclaw doctor`，然後重新啟動 gateway。

```bash
openclaw update
```

若要切換頻道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`openclaw update` 不接受 `--verbose`。若要進行更新診斷，請使用
`--dry-run` 預覽計畫操作，`--json` 取得結構化結果，或
`openclaw update status --json` 檢查通道和可用性狀態。安裝程式有其自己的
`--verbose` 標誌，但該標誌並非 `openclaw update` 的一部分。

`--channel beta` 偏好 beta，但當 beta 標籤缺失或比最新的穩定版舊時，執行時
會退回至 stable/latest。如果您想要一次性套件更新的原始 npm beta dist-tag，請使用
`--tag beta`。

對於受控外掛，回退到測試版通道是一個警告：核心更新仍然可能成功，而外掛使用其記錄的預設/最新版本，因為沒有可用的外掛測試版。

請參閱[開發管道](/zh-Hant/install/development-channels)以了解管道語意。

## 在 npm 和 git 安裝之間切換

當您想要變更安裝類型時，請使用通道。更新程式會將您的狀態、設定、認證和工作區保留在 `~/.openclaw` 中；它只會變更 CLI 和 Gateway 使用的 OpenClaw 程式碼安裝。

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

請先使用 `--dry-run` 執行以預覽確切的安裝模式切換：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev` 通道會確保 git 檢出、建置它，並從該檢出安裝全域 CLI。`stable` 和 `beta` 通道則使用套件安裝。如果 Gateway 已安裝，`openclaw update` 會重新整理服務中繼資料並重新啟動它，除非您傳遞 `--no-restart`。

## 替代方案：重新執行安裝程式

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

加入 `--no-onboard` 以跳過新手引導。若要透過安裝程式強制特定的安裝類型，請傳遞 `--install-method git --no-onboard` 或 `--install-method npm --no-onboard`。

如果 `openclaw update` 在 npm 套件安裝階段後失敗，請重新執行安裝程式。安裝程式不會呼叫舊的更新程式；它會直接執行全域套件安裝，並可以恢復部分更新的 npm 安裝。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

若要將恢復固定到特定版本或發行標籤，請加入 `--version`：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## 替代方案：手動使用 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

對於受監管的安裝，建議優先使用 `openclaw update`，因為它可以協調套件交換與正在執行的 Gateway 服務。如果您在受控 Gateway 執行時手動更新，請在套件管理員完成後立即重新啟動 Gateway，以免舊程序繼續從已取代的套件檔案提供服務。

當 `openclaw update` 管理全域 npm 安裝時，它會先將目標安裝到臨時 npm 前綴，驗證打包後的 `dist` 清單，然後將乾淨的套件樹交換到真實的全域前綴中。這樣可以避免 npm 將新套件覆蓋在舊套件的過時檔案上。如果安裝指令失敗，OpenClaw 會使用 `--omit=optional` 重試一次。如果原生可選相依套件無法編譯，該重試有助於在主機上進行安裝，同時如果備用方案也失敗，仍會保持顯示原始失敗訊息。

由 OpenClaw 管理的 npm 更新和 plugin-update 指令也會為子 npm 程序清除 npm
`min-release-age` 隔離。npm 可能會將該策略回報為衍生的 `before` 截止點；這兩者對於一般的供應鏈
隔離策略都很有用，但明確的 OpenClaw 更新意味著「立即安裝選定的
OpenClaw 版本」。

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### 進階 npm 安裝主題

<AccordionGroup>
  <Accordion title="唯讀套件樹">
    OpenClaw 在執行時期會將封裝的全域安裝視為唯讀，即使當前使用者對全域套件目錄擁有寫入權限也一樣。外掛套件的安裝位於使用者設定目錄下 OpenClaw 擁有的 npm/git 根目錄中，且 Gateway 啟動不會修改 OpenClaw 套件樹。

    某些 Linux npm 設定會將全域套件安裝在 root 擁有的目錄下，例如 `/usr/lib/node_modules/openclaw`。OpenClaw 支援該配置，因為外掛安裝/更新指令會在該全域套件目錄之外進行寫入。

  </Accordion>
  <Accordion title="強化 systemd 單元">
    賦予 OpenClaw 對其設定/狀態根目錄的寫入權限，以便明確的外掛安裝、外掛更新和 doctor 清理能夠保存其變更：

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="磁碟空間預檢">
    在套件更新和明確外掛安裝之前，OpenClaw 會嘗試對目標磁碟區進行盡力的磁碟空間檢查。空間不足會產生包含檢查路徑的警告，但並不會阻擋更新，因為檔案系統配額、快照和網路磁碟區在檢查後可能會變更。實際的套件管理員安裝和安裝後驗證仍具有最終決定權。
  </Accordion>
</AccordionGroup>

## 自動更新程式

自動更新程式預設為關閉。請在 `~/.openclaw/openclaw.json` 中啟用它：

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| 管道     | 行為                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| `stable` | 等待 `stableDelayHours`，然後在 `stableJitterHours` 內套用確定性抖動（分階段推出）。 |
| `beta`   | 每隔 `betaCheckIntervalHours` 檢查一次（預設：每小時）並立即套用。                   |
| `dev`    | 不自動套用。請手動使用 `openclaw update`。                                           |

Gateway 也會在啟動時記錄更新提示（可用 `update.checkOnStart: false` 停用）。
若要進行降級或事故復原，請在 Gateway 環境中設定 `OPENCLAW_NO_AUTO_UPDATE=1` 以阻擋自動套用，即使已設定 `update.auto.enabled`。除非同時停用 `update.checkOnStart`，否則啟動時的更新提示仍可能執行。

透過即時 Gateway 控制平面處理程序請求的套件管理程式更新，並不會替換正在執行的 Gateway 程序內的套件樹。在受管理的服務安裝中，Gateway 會啟動分離的移交，然後退出，並讓一般的 `openclaw update --yes --json` CLI 路徑停止服務、替換套件、重新整理服務中繼資料、重新啟動、驗證 Gateway 版本與連線能力，並在可能時恢復已安裝但未載入的 macOS LaunchAgent。如果 Gateway 無法安全地進行該移交，`update.run` 將回報安全的 shell 指令，而不是在程序中執行套件管理程式。

## 更新後

<Steps>

### 執行 Doctor

```bash
openclaw doctor
```

遷移設定、稽核 DM 原則，並檢查 Gateway 健康狀況。詳細資訊：[Doctor](/zh-Hant/gateway/doctor)

### 重新啟動 Gateway

```bash
openclaw gateway restart
```

### 驗證

```bash
openclaw health
```

</Steps>

## 還原

### 鎖定版本

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

<Tip>`npm view openclaw version` 顯示目前發布的版本。</Tip>

### 鎖定提交

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

若要回到最新版本：`git checkout main && git pull`。

## 如果您遇到困難

- 請再次執行 `openclaw doctor` 並仔細閱讀輸出內容。
- 對於原始碼副本上的 `openclaw update --channel dev`，更新程式會在需要時自動引導 `pnpm`。如果您看到 pnpm/corepack 引導錯誤，請手動安裝 `pnpm`（或重新啟用 `corepack`）並重新執行更新。
- 檢查：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 在 Discord 中提問：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相關

- [安裝概觀](/zh-Hant/install)：所有安裝方法。
- [Doctor](/zh-Hant/gateway/doctor)：更新後的健康檢查。
- [遷移](/zh-Hant/install/migrating)：主要版本遷移指南。
