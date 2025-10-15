# Claude Config Manager

🎨 一个现代化的 Claude Code 配置管理工具，让你轻松切换不同的 API 配置。

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 特性

- 🚀 **可视化管理** - 炫酷的现代化 UI，支持配置的增删改查
- 🔄 **一键切换** - 快速在不同的 API 配置之间切换
- 💾 **本地存储** - 所有配置安全地保存在本地 JSON 文件
- 🎯 **简单易用** - 直观的界面，无需学习成本
- 🔒 **安全可靠** - 自动备份配置文件，数据不丢失
- 🎨 **精美界面** - 紫色渐变主题，流畅的动画效果

## 📸 预览

现代化的紫色渐变主题界面，支持：
- 左侧配置列表，一目了然
- 右侧详情面板，信息完整
- 模态窗口添加/编辑配置
- 实时的 Toast 通知反馈

## 🚀 快速开始

### 前置要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/你的用户名/claude-config-ui-v2.git

# 进入目录
cd claude-config-ui-v2

# 安装依赖
npm install
```

### 启动

**方式1：双击启动（推荐）**
```
双击 启动配置管理器.bat
```

**方式2：命令行启动**
```bash
npm start
```

### 打包成独立exe

```bash
npm run build
```

打包完成后，exe 文件位于 `dist/` 目录。

## 📖 使用说明

### 1. 添加配置

1. 点击左侧的 "新建" 按钮
2. 填写以下信息：
   - **配置名称**：给配置起个名字（如：official, backup, custom）
   - **Base URL**：API 端点地址（如：https://api.anthropic.com）
   - **API Key**：你的 API 密钥
   - **描述**：配置说明（可选）
3. 点击 "保存配置"

### 2. 查看配置

- 点击左侧列表中的任意配置
- 右侧会显示完整的配置信息
- API Key 默认隐藏，点击眼睛图标可显示/隐藏

### 3. 切换配置

1. 选择要切换到的配置
2. 点击 "切换到此配置" 按钮
3. **重启 Claude Code** 使配置生效

### 4. 编辑/删除配置

- 选择配置后，点击右上角的编辑或删除按钮

## 📁 配置文件位置

配置数据保存在以下位置：

- `~/.claude/config.json` - Claude Code 读取的当前配置
- `~/.claude_configs.json` - 配置管理器保存的所有配置方案

Windows 路径示例：
- `C:\Users\你的用户名\.claude\config.json`
- `C:\Users\你的用户名\.claude_configs.json`

## 🛠️ 技术栈

- **Electron** - 桌面应用框架
- **Tailwind CSS** - 现代化 CSS 框架
- **Node.js** - 运行时环境
- **IPC** - 进程间通信

## 📝 配置文件格式

### config.json（Claude Code 配置）
```json
{
  "baseURL": "https://api.anthropic.com",
  "apiKey": "sk-ant-api03-xxxxx..."
}
```

### .claude_configs.json（配置管理器数据）
```json
{
  "profiles": {
    "官方": {
      "baseURL": "https://api.anthropic.com",
      "apiKey": "sk-ant-api03-xxxxx...",
      "description": "Anthropic 官方 API",
      "created": "2025-10-15T12:00:00.000Z"
    }
  },
  "current": "官方"
}
```

## 🔧 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 打包
npm run build
```

## 📦 打包配置

项目使用 `electron-builder` 进行打包，配置为：

- **格式**：Portable（便携版，无需安装）
- **输出**：`dist/ClaudeConfigManager-2.0.0-portable.exe`
- **平台**：Windows x64

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

感谢 Claude Code 团队提供的优秀工具！

## ⚠️ 注意事项

- 切换配置后必须 **重启 Claude Code** 才能生效
- 配置文件会自动备份，格式为 `config.backup.时间戳.json`
- API Key 会在界面上默认隐藏，保护隐私
- 确保在切换配置前已经正确填写了 Base URL 和 API Key

## 📞 联系方式

如有问题或建议，请提交 Issue。

---

Made with ❤️ by Claude Code
