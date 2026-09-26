# 洞穴测绘草图编目台（gbcavesurvey）

面向洞穴测绘小组测量记录员的本地化编目台：把「洞段 → 测点方位/倾角/距离读数 → 草图 → 图幅拼合」串成一条可回溯的链路，解决手写记录散落、闭合导线误差看不出来、多张草图拼接对不上桩号的问题。**纯前端单页应用**，全部数据保存在浏览器 IndexedDB，不依赖任何后端服务或外部接口。

## 一、Docker 一键启动（推荐）

```bash
cp .env.example .env      # 首次启动先复制环境变量文件
docker compose up -d --build
```

启动后访问：<http://localhost:21814>

常用命令：

```bash
docker compose ps          # 查看容器状态
docker compose logs -f     # 查看日志
docker compose down        # 停止并移除容器（数据在浏览器本地，不受影响）
```

端口与项目名可在 `.env` 中调整：

```
COMPOSE_PROJECT_NAME=gbcavesurvey
FRONTEND_PORT=21814
```

## 二、技术栈

| 层次 | 选型 |
| --- | --- |
| 框架 | Vue 3（Composition API） |
| 语言 | TypeScript（`vue-tsc` 类型检查零错误） |
| UI 组件库 | Element Plus |
| 状态管理 | Zustand（`zustand/vanilla` createStore + Vue 响应式桥接） |
| 路由 | Vue Router 4（History 模式，nginx `try_files` 回落） |
| 构建 | Vite 6 |
| 本地存储 | IndexedDB（Dexie 封装，含 `schemaVersion` 与升级迁移） |
| 部署 | 多阶段 Dockerfile：`node:20-alpine` 构建 → `nginx:alpine` 托管 |

## 三、本地开发

```bash
cd frontend
npm install
npm run dev        # http://localhost:21814
npm run build      # 类型检查 + 生产构建
```

> 本地开发无需任何后端服务或环境变量。

## 四、目录结构

```
sologsb-1114/
├── docker-compose.yml          # 顶层 name: gbcavesurvey，无 version 字段
├── .env.example                # COMPOSE_PROJECT_NAME / FRONTEND_PORT
├── frontend/
│   ├── Dockerfile              # 多阶段构建，nginx 阶段 chmod -R a+rX 静态资源
│   ├── nginx.conf              # try_files 前端路由回落 + gzip
│   ├── public/favicon.svg
│   └── src/
│       ├── types/              # cave.ts / segment.ts / station.ts / sketch.ts / resurvey.ts / index.ts
│       ├── stores/             # caveStore / segmentStore / stationStore / sketchStore / resurveyStore（Zustand）
│       ├── components/common/  # SegmentTag / ReviewStatusTag / BearingInput / ClosureBadge / GridCanvas
│       ├── hooks/              # usePersistentStore / useClosureCheck
│       ├── pages/              # CavesPage / SegmentsPage / StationsPage / SketchPage / MergePage
│       ├── router/index.ts
│       └── utils/              # survey.ts / review.ts / export.ts / id.ts
```

## 五、数据模型与存储

| 模型 | 说明 | Dexie 表 |
| --- | --- | --- |
| Cave 洞穴 | 归属根节点：洞名、行政区、经纬度、海拔、发育层位、已知总长、负责人等 | `caves` |
| Segment 洞段 | 起止桩号、类型（竖井/廊道/厅堂/裂隙/水道）、平均宽高；复核状态由复测台账推导 | `segments` |
| Station 测点 | 方位角、倾角、斜距 → 自动推算水平距/垂距，累计闭合差 | `stations` |
| Sketch 草图 | 格数、比例、绘制人、拼合顺序号、桩号对齐锚点 | `sketches` |
| ResurveyRecord 复测记录 | 复测日期、复核负责人、结论（通过/不通过）、登记时闭合差快照、备注 | `resurveys` |

- 数据库名 `gbcavesurvey`，`meta` 表保存 `schemaVersion`；
- `version(2)` 升级迁移会把旧版测点记录由「斜距 + 倾角」补齐 `horizontalDistance` / `verticalDistance`；
- `version(3)` 升级迁移新增 `resurveys` 复测台账表，并删除洞段上的手工「已闭合」字段（旧洞段一律回到「待复核」，不沿用原开关）；
- 数据仅存于浏览器本地，容器无状态、不挂载命名卷，清除浏览器数据即清空。

## 六、主要页面

| 路由 | 功能 |
| --- | --- |
| `/caves` | 洞穴清单：卡片展示实测/已知总长、洞段数、待办洞段数、最近测量日期，支持新建、编辑、归档、删除（删除前校验下级洞段数） |
| `/segments` | 洞段编目表：按桩号区间/类型/洞穴筛选，批量调整洞段类型；实时闭合差、复核状态与待办标记逐行展示，支持「只看待办」过滤，自动累计总长 |
| `/stations` | 测点读数录入：方位角/倾角专用输入（度分秒 ⇄ 十进制度），自动推算水平距垂距，实时闭合差徽标，异常读数整行高亮，支持连续录入下一站；复测台账登记复测日期、负责人、结论与备注 |
| `/sketch` | 草图工作台：坐标纸网格上绘制测点折线、标注桩号与倾角箭头，支持草图基准方位旋转与草图记录管理 |
| `/merge` | 图幅拼合视图：拖动图幅按相邻边缘吸附、按桩号锚点一键对齐，输出可调整的拼合顺序表并支持 CSV 导出 |

## 七、计算约定

- 水平距 = 斜距 × cos(倾角)，垂距 = 斜距 × sin(倾角)；
- 闭合差 f = √(ΣΔE² + ΣΔN²)，默认阈值 0.25 m，超限时徽标变红并可展开计算过程；
- 方位角范围 0°–360°，倾角范围 -90°–90°，越界读数会被标记为异常。

## 八、复核台账与洞段状态

- 测点增删或改动时，洞段闭合差立即重算，复核状态随之更新；
- 复核状态推导规则（优先级从高到低）：
  1. 最新闭合差超限 → **超限待复测**；
  2. 没有任何复测记录 → **待复核**（旧洞段不沿用原「已闭合」开关）；
  3. 最新复测结论不是「通过」 → **复测未通过**；
  4. 最新结论为「通过」且最新闭合差回到阈值内 → **已完成**；
- 未达到「已完成」的洞段全部计入待办：洞段编目表逐行标记并可过滤，洞穴清单按洞穴汇总待办洞段数；
- 复测记录在测点页登记，保存登记时的闭合差快照；即使结论填「通过」，只要最新闭合差仍超限，状态也不会完成。
