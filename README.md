# 学期学习规划助手

一个面向大学生的本地网页原型，用来把每学期杂乱的课程、CW、大作业、DDL、考试范围整理成可执行的每日学习计划。

在线体验：https://zeweili666-ai.github.io/study_project/

## 当前功能

- 录入课程信息、课程表和本学期学习目标
- 录入任务、CW、大作业、DDL、预计耗时和详细要求
- 录入考试时间、考试难度和考试范围
- 支持用纯文本或 PDF/TXT 文件导入课程内容、作业/CW、考试范围
- 支持保存每次课的学习内容，后续会进入复习计划
- 支持上传课堂笔记文件，当前支持 PDF、DOCX 和 TXT，提取后按课程和日期整理
- 支持接入本地开源 AI，通过 Ollama 做总结、分类、提取和复习建议
- 自动计算任务优先级
- 自动生成每日学习/复习计划
- 总览页总结今天应该先做什么
- 任务可标记完成，完成后不会进入每日计划
- 支持浏览器本地存储，也支持本机 PowerShell 后端保存到 `data.json`

## 使用方式

### 方式一：直接打开前端

直接用浏览器打开 `index.html`。这种方式不需要后端，数据保存在浏览器本地。

### 方式二：启动本地后端

双击 `start_server.bat`，或者在 PowerShell 里运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\server.ps1
```

然后打开：

```text
http://127.0.0.1:5177
```

这种方式会把数据保存到项目目录下的 `data.json`。

### 方式三：启动 SQLite 后端

双击 `start_sqlite_server.bat`。

然后打开：

```text
http://127.0.0.1:5177
```

这种方式会把数据保存到项目目录下的 `study_planner.db`。

PDF / DOCX 提取文字需要使用 SQLite 后端方式启动，也就是先运行 `start_sqlite_server.bat`，再访问 `http://127.0.0.1:5177`。

## 本地开源 AI

AI 功能使用本机 Ollama，不需要 OpenAI API Key。

1. 安装 Ollama
2. 下载模型，例如：

```powershell
ollama pull qwen2.5:7b
```

3. 启动本项目：

```text
start_sqlite_server.bat
```

4. 打开：

```text
http://127.0.0.1:5177
```

默认模型是 `qwen2.5:7b`。如果想换模型，可以设置环境变量：

```powershell
setx OLLAMA_MODEL "qwen2.5:3b"
```

然后重新打开 `start_sqlite_server.bat`。

如果想快速看效果，点击右上角的“填充示例”。

## 后续可扩展方向

- 接入后端数据库，支持账号登录和多设备同步
- 接入 AI，自动解析用户粘贴的 CW 介绍、考试范围和课程大纲
- 支持上传 PDF/课件，并根据资料生成复习题
- 增加日历视图、周计划视图和提醒通知
- 增加学习时长记录和完成度统计
