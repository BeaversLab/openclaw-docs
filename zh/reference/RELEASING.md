---
title: "发布策略"
summary: "公开发布渠道、版本命名和发布节奏"
read_when:
  - 查找公开发布渠道定义
  - 查找版本命名和发布节奏
---

# 发布策略

OpenClaw 有三个公开发布通道：

- stable：发布到 npm `latest` 的标签发布
- beta：发布到 npm `beta` 的预发布标签
- dev：`main` 的动态头部

## 版本命名

- 稳定发布版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- 不要对月份或日期进行零填充
- `latest` 表示当前的稳定 npm 发布
- `beta` 表示当前的预发布 npm 版本
- Beta 版本的发布可能在 macOS 应用赶上之前

## 发布节奏

- 发布以 beta 优先
- 稳定版仅在最新的 beta 版本通过验证后才发布
- 详细的发布程序、批准、凭证和恢复说明
  仅限维护者查看

## 公开参考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)

维护者使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有发布文档作为实际的操作手册。

import en from "/components/footer/en.mdx";

<en />
