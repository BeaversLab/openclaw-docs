---
title: "QA 渠道"
summary: "用于确定性 Slack QA 场景的合成 OpenClaw 级渠道插件"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

# QA 渠道

`qa-channel` 是一个用于自动化 OpenClaw QA 的捆绑合成消息传输。

它不是一个生产渠道。它的存在是为了演练真实传输所使用的相同渠道插件
边界，同时保持状态的确定性并完全可检查。

## 目前的功能

- Slack 级目标语法：
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- 用于以下内容的 HTTP 支持合成总线：
  - 入站消息注入
  - 出站记录捕获
  - 线程创建
  - 回应
  - 编辑
  - 删除
  - 搜索和读取操作
- 捆绑的主机端自检运行器，用于写入 Markdown 报告

## 配置

```json
{
  "channels": {
    "qa-channel": {
      "baseUrl": "http://127.0.0.1:43123",
      "botUserId": "openclaw",
      "botDisplayName": "OpenClaw QA",
      "allowFrom": ["*"],
      "pollTimeoutMs": 1000
    }
  }
}
```

支持的账户密钥：

- `baseUrl`
- `botUserId`
- `botDisplayName`
- `pollTimeoutMs`
- `allowFrom`
- `defaultTo`
- `actions.messages`
- `actions.reactions`
- `actions.search`
- `actions.threads`

## 运行器

当前纵向切片：

```bash
pnpm qa:e2e
```

现在这会通过捆绑的 `qa-lab` 扩展进行路由。它会启动仓库内的
QA 总线，引导捆绑的 `qa-channel` 运行时切片，运行确定性
自检，并在 `.artifacts/qa-e2e/` 下写入 Markdown 报告。

私有调试器 UI：

```bash
pnpm qa:lab:up
```

该命令构建 QA 站点，启动 Docker 支持的网关 + QA Lab 栈，并打印 QA Lab URL。在该站点上，您可以选择场景、选择模型车道、启动单独的运行并实时观看结果。

完整的仓库支持的 QA 套件：

```bash
pnpm openclaw qa suite
```

这将在本地 URL 启动私有 QA 调试器，与随附的 Control UI 包分开。

## 范围

当前范围故意设为狭窄：

- bus + 插件传输
- 线程化路由语法
- 渠道拥有的消息操作
- Markdown 报告
- 带有运行控制的 Docker 支持的 QA 站点

后续工作将添加：

- 提供商/模型矩阵执行
- 更丰富的场景发现
- 稍后提供 OpenClaw 原生编排
