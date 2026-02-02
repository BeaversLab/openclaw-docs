> [!NOTE]
> 本页正在翻译中。

---
summary: "浏览器自动化的手动登录 + X/Twitter 发帖"
read_when:
  - 你需要为浏览器自动化登录站点
  - 你想发布 X/Twitter 更新
---

# 浏览器登录 + X/Twitter 发帖

## 手动登录（推荐）

当站点要求登录时，请在 **宿主机** 浏览器 profile（openclaw 浏览器）中 **手动登录**。

**不要**把你的凭据给模型。自动化登录往往会触发反机器人防护并可能锁号。

返回主浏览器文档：[浏览器](/zh/tools/browser)。

## 使用的是哪个 Chrome profile？

OpenClaw 控制一个 **独立的 Chrome profile**（名为 `openclaw`，UI 默认橙色系）。它与日常浏览器 profile 分离。

两种简单的访问方式：

1) **让 agent 打开浏览器**，然后你自己登录。
2) **用 CLI 打开**：

```bash
openclaw browser start
openclaw browser open https://x.com
```

如果你有多个 profile，传 `--browser-profile <name>`（默认是 `openclaw`）。

## X/Twitter：推荐流程

- **阅读/搜索/线程：** 使用 **bird** CLI 技能（无需浏览器，稳定）。
  - Repo: https://github.com/steipete/bird
- **发布更新：** 使用 **宿主机** 浏览器（手动登录）。

## 沙箱与宿主机浏览器访问

沙箱中的浏览器会 **更容易** 触发反机器人检测。对 X/Twitter（以及其他严格站点），优先使用 **宿主机** 浏览器。

如果 agent 在沙箱中运行，浏览器工具默认指向沙箱。要允许控制宿主机：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        browser: {
          allowHostControl: true
        }
      }
    }
  }
}
```

然后指定宿主机浏览器：

```bash
openclaw browser open https://x.com --browser-profile openclaw --target host
```

或为发布更新的 agent 关闭沙箱。
