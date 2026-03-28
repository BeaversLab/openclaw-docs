---
summary: "Bun 工作流程（實驗性）：安裝以及與 pnpm 的差異和注意事項"
read_when:
  - You want the fastest local dev loop (bun + watch)
  - You hit Bun install/patch/lifecycle script issues
title: "Bun（實驗性）"
---

# Bun（實驗性）

<Warning>**不建議**將 Bun 用於 Gateway 執行環境（已知 WhatsApp 和 Telegram 存在問題）。生產環境請使用 Node 。</Warning>

Bun 是一個可選的本地執行環境，可直接執行 TypeScript（`bun run ...`，`bun --watch ...`）。預設的套件管理器維持為 `pnpm`，它受到完整支援並被文件工具所使用。Bun 無法使用 `pnpm-lock.yaml` 且會將其忽略。

## 安裝

<Steps>
  <Step title="安裝依賴">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` 已被 git 忽略，因此不會造成 repository 的變動。若要完全跳過 lockfile 寫入：

    ```sh
    bun install --no-save
    ```

  </Step>
  <Step title="建置與測試">
    ```sh
    bun run build
    bun run vitest run
    ```
  </Step>
</Steps>

## 生命週期腳本

除非明確信任，否則 Bun 會阻擋相依性的生命週期腳本。對於此 repository，常用的被封鎖腳本並非必需：

- `@whiskeysockets/baileys` `preinstall` -- 檢查 Node 主版本 >= 20 (OpenClaw 預設為 Node 24，目前仍支援 Node 22 LTS，目前為 `22.16+`)
- `protobufjs` `postinstall` -- 發出關於不相容版本格式的警告（無建構產物）

如果您遇到需要這些腳本的執行時問題，請明確信任它們：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事項

部分腳本仍硬編碼使用 pnpm（例如 `docs:build`、`ui:*`、`protocol:check`）。目前請透過 pnpm 執行這些腳本。
