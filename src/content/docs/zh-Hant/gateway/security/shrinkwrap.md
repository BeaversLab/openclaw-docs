---
summary: "OpenClaw 發布版中 npm shrinkwrap 的通俗與技術說明"
read_when:
  - You want to know what npm shrinkwrap means in an OpenClaw release
  - You are reviewing package lockfiles, dependency changes, or supply-chain risk
  - You are validating root or plugin npm packages before publishing
title: "npm shrinkwrap"
---

OpenClaw 原始碼檢出使用 `pnpm-lock.yaml`。已發布的 OpenClaw npm
套件使用 `npm-shrinkwrap.json`，這是 npm 可發布的相依性鎖定檔，因此
套件安裝會使用在發佈期間審查過的相依性圖表。

## 簡單來說

Shrinkwrap 是隨 npm 套件發布的相依性樹的收據。
它告訴 npm 要安裝哪些確切的傳遞套件版本。

對於 OpenClaw 發布版，這意味著：

- 已發布的套件不會要求 npm 在安裝時
  重新建立新的相依性圖表；
- 相依性變更變得更容易審查，因為它們會出現在鎖定檔中；
- 發布驗證可以測試使用者將安裝的相同圖表；
- 套件大小或原生相依性的意外狀況更容易在
  發布前發現。

Shrinkwrap 不是沙盒。它本身並不會讓相依性變得安全，也
不能取代主機隔離、`openclaw security audit`、套件
來源或安裝冒煙測試。

簡單的心智模型：

| 檔案                  | 適用場合            | 含義                  |
| --------------------- | ------------------- | --------------------- |
| `pnpm-lock.yaml`      | OpenClaw 原始碼檢出 | 維護者相依性圖表      |
| `npm-shrinkwrap.json` | 已發布的 npm 套件   | 使用者的 npm 安裝圖表 |
| `package-lock.json`   | 本機 npm 應用程式   | 非 OpenClaw 發布合約  |

## 為什麼 OpenClaw 使用它

OpenClaw 是一個閘道、外掛主機、模型路由器和代理執行時。預設
安裝會影響啟動時間、磁碟使用、原生套件下載以及
供應鏈暴露風險。

Shrinkwrap 為發布審查提供了穩定的邊界：

- 審查者可以看到傳遞相依性的變動；
- 套件驗證器可以拒絕意外的鎖定檔偏移；
- 套件驗收可以使用將隨版本發送的圖表來測試安裝；
- 外掛套件可以攜帶自己鎖定的相依性圖表，而不必
  依賴根套件來擁有僅外掛使用的相依性。

目標不是「更多的鎖定檔」。目標是具有明確所有權的可重現發布安裝。

## 技術細節

根 `openclaw` npm 套件與 OpenClaw 擁有的 npm 外掛套件在發佈時會包含
`npm-shrinkwrap.json`。適合的 OpenClaw 擁有之外掛套件
也可以使用明確的 `bundledDependencies` 發佈，使其執行時
相依性檔案包含在外掛壓縮檔中，而不僅僅依賴
安裝時期的解析。

像這樣維持邊界：

```bash
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check
```

產生器會解析 npm 的可發佈鎖定格式，但會拒絕未出現在 `pnpm-lock.yaml` 中的產生套件版本。這使得
pnpm 相依性年限、覆寫和補丁審查邊界保持完整。

僅當有意更新根套件而不觸及外掛套件時，才使用僅限根目錄的指令：

```bash
pnpm deps:shrinkwrap:root:generate
pnpm deps:shrinkwrap:root:check
```

將這些檔案視為敏感的安全性項目進行審查：

- `pnpm-lock.yaml`
- `npm-shrinkwrap.json`
- 捆綁的外掛相依性載荷
- 任何 `package-lock.json` 差異

OpenClaw 套件驗證器要求新的根套件壓縮檔中必須包含 shrinkwrap。
外掛 npm 發佈路徑會檢查外掛本地的 shrinkwrap、安裝
套件本地的捆綁相依性，然後進行打包或發佈。套件
驗證器會拒絕已發佈 OpenClaw 套件的 `package-lock.json`。

若要檢查已發佈的根套件：

```bash
npm pack openclaw@<version> --json --pack-destination /tmp/openclaw-pack
tar -tf /tmp/openclaw-pack/openclaw-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
```

若要檢查 OpenClaw 擁有的外掛套件：

```bash
npm pack @openclaw/discord@<version> --json --pack-destination /tmp/openclaw-plugin-pack
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/npm-shrinkwrap.json$'
tar -tf /tmp/openclaw-plugin-pack/openclaw-discord-<version>.tgz | grep '^package/node_modules/'
```

背景資訊：[npm-shrinkwrap.](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json)。
