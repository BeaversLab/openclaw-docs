---
summary: "Bun 工作流程（實驗性）：安裝以及與 pnpm 的差異"
read_when:
  - You want the fastest local dev loop (bun + watch)
  - You hit Bun install/patch/lifecycle script issues
title: "Bun（實驗性）"
---

# Bun（實驗性）

<Warning>不建議將 Bun 用於 **gateway runtime**（與 WhatsApp 和 Telegram 存在已知問題）。生產環境請使用 Node。</Warning>

Bun 是一個可選的本地運行時，用於直接運行 TypeScript（`bun run ...`，`bun --watch ...`）。預設的套件管理器仍然是 `pnpm`，它被完全支援並用於文件工具。Bun 無法使用 `pnpm-lock.yaml` 並會忽略它。

## 安裝

<Steps>
  <Step title="安裝依賴項">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` 已被 gitignore，因此不會有版本庫變動。若要完全跳過寫入 lockfile：

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

除非明確信任，否則 Bun 會阻擋依賴項的生命週期腳本。對於此版本庫，通常被阻擋的腳本並非必要：

- `@whiskeysockets/baileys` `preinstall` -- 檢查 Node 主版本 >= 20（OpenClaw 預設為 Node 24 且仍支援 Node 22 LTS，目前為 `22.14+`）
- `protobufjs` `postinstall` -- 發出關於不相容版本方案的警告（無建置產出）

如果您遇到需要這些腳本的運行時問題，請明確信任它們：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事項

某些腳本仍硬編碼為使用 pnpm（例如 `docs:build`、`ui:*`、`protocol:check`）。目前請透過 pnpm 執行這些腳本。
