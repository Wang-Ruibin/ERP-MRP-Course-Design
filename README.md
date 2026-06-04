# MRP 物料需求计划系统

> 河海大学 · 信息管理与信息系统专业 · 23级 ERP 课程设计

一个基于 Web 的 MRP（Material Requirements Planning）物料需求计划系统。输入物料主数据、BOM 产品结构、库存信息与独立需求，自动计算各零部件的订货量和计划下达时间，并生成可视化报表与 Excel 导出。

## 功能特性

- **物料主数据管理** — 维护物料编码、名称、提前期、库存、安全库存、批量规则等
- **BOM 产品结构** — 支持多层级父-子关系，自动识别产品与部件
- **MRP 核心计算** — 毛需求展开、净需求计算、计划接收与计划下达，支持 L4L 和固定批量两种策略
- **订货建议报表** — 按下达时间排序的订货计划，标注需求来源
- **MRP 明细表** — 每个物料的逐周毛需求、预计可得、净需求、计划接收、计划下达
- **BOM 可视化** — 树形展示产品结构层级关系
- **历史记录** — 每次导出自动存档，支持载入回看与删除
- **Excel 导出** — 一键生成包含订货建议和 MRP 明细的 `.xlsx` 报表
- **MySQL 持久化** — 数据库读写，支持初始化样例数据

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 HTML + CSS + JavaScript（无框架） |
| 后端 | Python Flask |
| 数据库 | MySQL 8.x |
| Excel 导出 | openpyxl |

## 项目结构

```
.
├── index.html          # 前端页面
├── app.js              # 前端逻辑与 MRP 计算引擎
├── styles.css          # 样式
├── server.py           # Flask 后端 API
├── mysql_schema.sql    # 数据库建表与样例数据
├── db_config.json      # 数据库连接配置（需自行创建）
├── requirements.txt    # Python 依赖
├── start_server.bat    # Windows 一键启动
└── stop_server.bat     # Windows 一键停止
```

## 快速开始

### 1. 环境准备

- Python 3.10+
- MySQL 8.x

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置数据库

在项目根目录创建 `db_config.json`：

```json
{
  "host": "127.0.0.1",
  "port": 3306,
  "user": "your_username",
  "password": "your_password",
  "database": "erp_mrp_system"
}
```

### 4. 启动服务

```bash
python server.py
```

或双击 `start_server.bat`，服务将在 `http://127.0.0.1:8000` 启动。

### 5. 初始化数据库

打开浏览器访问系统后，点击页面右上角 **「初始化数据库」** 按钮，即可载入课程设计样例数据。

## 截图

> 欢迎补充系统运行截图 ✨

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<div align="center">

**如果觉得这个项目对你有帮助，请点一个 ⭐ Star 支持一下叭~ (⑅˃ᴗ˂⑅)**

你的每一个 Star 都是对认真写课设的同学最大的鼓励 💕

</div>
