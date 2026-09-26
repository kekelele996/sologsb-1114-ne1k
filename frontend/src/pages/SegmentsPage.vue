<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Segment, SegmentType } from '@/types'
import { SEGMENT_TYPES, segmentLength } from '@/types'
import SegmentTag from '@/components/common/SegmentTag.vue'
import ReviewStatusTag from '@/components/common/ReviewStatusTag.vue'
import { useStore } from '@/hooks/usePersistentStore'
import { caveStore } from '@/stores/caveStore'
import { segmentStore } from '@/stores/segmentStore'
import { stationStore } from '@/stores/stationStore'
import { resurveyStore } from '@/stores/resurveyStore'
import { resolveSegmentReview, type SegmentReview } from '@/utils/review'
import { stakeRangeOverlap, stakeToNumber } from '@/utils/survey'
import { uid } from '@/utils/id'

const caveState = useStore(caveStore)
const segmentState = useStore(segmentStore)
const stationState = useStore(stationStore)
const resurveyState = useStore(resurveyStore)

const filterCaveId = ref<string>('')
const filterType = ref<SegmentType | ''>('')
const onlyTodo = ref(false)
const rangeStart = ref<number | undefined>(undefined)
const rangeEnd = ref<number | undefined>(undefined)
const selectedIds = ref<string[]>([])
const batchType = ref<SegmentType>('廊道')

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  caveId: '',
  code: '',
  startStake: 'K0+000',
  endStake: 'K0+050',
  type: '廊道' as SegmentType,
  avgWidth: 1.5,
  avgHeight: 2,
  slopeTrend: '',
  sketchNo: ''
})

/** 单个洞段的复核汇总（闭合差随测点增删改实时重算） */
function reviewOf(segmentId: string): SegmentReview {
  return resolveSegmentReview(segmentId, stationState.stations, resurveyState.resurveys)
}

const filtered = computed(() =>
  segmentState.segments.filter((segment) => {
    if (filterCaveId.value && segment.caveId !== filterCaveId.value) return false
    if (filterType.value && segment.type !== filterType.value) return false
    if (onlyTodo.value && !reviewOf(segment.id).todo) return false
    if (rangeStart.value !== undefined || rangeEnd.value !== undefined) {
      const lo = rangeStart.value ?? Number.NEGATIVE_INFINITY
      const hi = rangeEnd.value ?? Number.POSITIVE_INFINITY
      if (!stakeRangeOverlap(stakeToNumber(segment.startStake), stakeToNumber(segment.endStake), lo, hi)) return false
    }
    return true
  })
)

const totalLength = computed(() =>
  Math.round(filtered.value.reduce((sum, segment) => sum + segmentLength(segment), 0) * 10) / 10
)

const todoCount = computed(() => filtered.value.filter((segment) => reviewOf(segment.id).todo).length)

function caveName(caveId: string): string {
  return caveState.caves.find((cave) => cave.id === caveId)?.name ?? '未归属洞穴'
}

function stationCount(segmentId: string): number {
  return stationState.stations.filter((station) => station.segmentId === segmentId).length
}

function resetForm(): void {
  editingId.value = null
  form.caveId = caveState.caves[0]?.id ?? ''
  form.code = `C-${String(segmentState.segments.length + 1).padStart(2, '0')}`
  form.startStake = 'K0+000'
  form.endStake = 'K0+050'
  form.type = '廊道'
  form.avgWidth = 1.5
  form.avgHeight = 2
  form.slopeTrend = ''
  form.sketchNo = ''
}

function openCreate(): void {
  resetForm()
  dialogVisible.value = true
}

function openEdit(segment: Segment): void {
  editingId.value = segment.id
  form.caveId = segment.caveId
  form.code = segment.code
  form.startStake = segment.startStake
  form.endStake = segment.endStake
  form.type = segment.type
  form.avgWidth = segment.avgWidth
  form.avgHeight = segment.avgHeight
  form.slopeTrend = segment.slopeTrend
  form.sketchNo = segment.sketchNo
  dialogVisible.value = true
}

async function submit(): Promise<void> {
  if (!form.caveId) {
    ElMessage.warning('请选择归属洞穴')
    return
  }
  if (!form.code.trim()) {
    ElMessage.warning('请填写洞段编号')
    return
  }
  if (stakeToNumber(form.endStake) <= stakeToNumber(form.startStake)) {
    ElMessage.warning('结束桩号必须大于起始桩号')
    return
  }
  const existing = segmentState.segments.find((item) => item.id === editingId.value)
  const segment: Segment = {
    id: existing?.id ?? uid('seg'),
    caveId: form.caveId,
    code: form.code.trim(),
    startStake: form.startStake.trim(),
    endStake: form.endStake.trim(),
    type: form.type,
    avgWidth: Number(form.avgWidth) || 0,
    avgHeight: Number(form.avgHeight) || 0,
    slopeTrend: form.slopeTrend.trim(),
    sketchNo: form.sketchNo.trim()
  }
  await segmentStore.getState().save(segment)
  dialogVisible.value = false
  ElMessage.success(existing ? '洞段已更新' : '洞段已建立')
}

async function applyBatchType(): Promise<void> {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先勾选要调整的洞段')
    return
  }
  await segmentStore.getState().bulkSetType(selectedIds.value, batchType.value)
  ElMessage.success(`已把 ${selectedIds.value.length} 个洞段调整为「${batchType.value}」`)
}

async function removeSegment(segment: Segment): Promise<void> {
  const count = stationCount(segment.id)
  if (count > 0) {
    ElMessage.error(`洞段「${segment.code}」下仍有 ${count} 个测点，请先清理`)
    return
  }
  const resurveyCount = resurveyState.resurveys.filter((record) => record.segmentId === segment.id).length
  if (resurveyCount > 0) {
    ElMessage.error(`洞段「${segment.code}」下仍有 ${resurveyCount} 条复测记录，请先在测点页清理`)
    return
  }
  await ElMessageBox.confirm(`确认删除洞段「${segment.code}」？`, '删除确认', { type: 'warning' })
  await segmentStore.getState().remove(segment.id)
  ElMessage.success('洞段已删除')
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">洞段编目表</h2>
        <p class="page-sub">
          按桩号区间筛选洞段、批量调整洞段类型；闭合差随测点变动实时重算，复核状态由复测台账推导，未完成的洞段计入待办。
        </p>
      </div>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>新建洞段
      </el-button>
    </div>

    <div class="toolbar">
      <el-select v-model="filterCaveId" placeholder="全部洞穴" clearable style="width: 200px">
        <el-option v-for="cave in caveState.caves" :key="cave.id" :label="cave.name" :value="cave.id" />
      </el-select>
      <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 140px">
        <el-option v-for="type in SEGMENT_TYPES" :key="type" :label="type" :value="type" />
      </el-select>
      <div class="range">
        <span class="muted">桩号区间筛选（米）</span>
        <el-input-number v-model="rangeStart" :min="0" :controls="false" placeholder="起" style="width: 110px" />
        <span>—</span>
        <el-input-number v-model="rangeEnd" :min="0" :controls="false" placeholder="止" style="width: 110px" />
      </div>
      <el-switch v-model="onlyTodo" active-text="只看待办" />
      <el-select v-model="batchType" style="width: 140px">
        <el-option v-for="type in SEGMENT_TYPES" :key="type" :label="type" :value="type" />
      </el-select>
      <el-button type="primary" plain @click="applyBatchType">批量调整类型</el-button>
      <el-tag :type="todoCount > 0 ? 'danger' : 'info'" effect="plain">
        命中共 {{ filtered.length }} 段 · 合计 {{ totalLength }} m · 待办 {{ todoCount }} 段
      </el-tag>
    </div>

    <el-table
      :data="filtered"
      border
      stripe
      row-key="id"
      @selection-change="(rows: Segment[]) => (selectedIds = rows.map((row) => row.id))"
    >
      <el-table-column type="selection" width="46" />
      <el-table-column label="洞段" width="120">
        <template #default="{ row }: { row: Segment }">
          <span class="mono">{{ row.code }}</span>
        </template>
      </el-table-column>
      <el-table-column label="归属洞穴" min-width="150">
        <template #default="{ row }: { row: Segment }">{{ caveName(row.caveId) }}</template>
      </el-table-column>
      <el-table-column label="类型" width="130">
        <template #default="{ row }: { row: Segment }">
          <SegmentTag :type="row.type" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="桩号区间" min-width="200">
        <template #default="{ row }: { row: Segment }">
          <span class="mono">{{ row.startStake }} → {{ row.endStake }}</span>
          <div class="muted">长度 {{ segmentLength(row) }} m</div>
        </template>
      </el-table-column>
      <el-table-column label="平均宽×高(m)" width="140">
        <template #default="{ row }: { row: Segment }">{{ row.avgWidth }} × {{ row.avgHeight }}</template>
      </el-table-column>
      <el-table-column prop="slopeTrend" label="坡度趋势" width="120" />
      <el-table-column label="测点数" width="90">
        <template #default="{ row }: { row: Segment }">{{ stationCount(row.id) }}</template>
      </el-table-column>
      <el-table-column label="闭合差(m)" width="110">
        <template #default="{ row }: { row: Segment }">
          <span :class="['closure-num', { over: reviewOf(row.id).closure.over }]">
            {{ reviewOf(row.id).closure.closure.toFixed(3) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="复核状态" width="130">
        <template #default="{ row }: { row: Segment }">
          <ReviewStatusTag :status="reviewOf(row.id).status" size="small" />
          <el-tag v-if="reviewOf(row.id).todo" type="danger" size="small" effect="plain" class="todo-tag">待办</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近复测" width="150">
        <template #default="{ row }: { row: Segment }">
          <template v-if="reviewOf(row.id).latest">
            <div class="mono">{{ reviewOf(row.id).latest!.date }}</div>
            <div class="muted">{{ reviewOf(row.id).latest!.reviewer }}</div>
          </template>
          <span v-else class="muted">未登记</span>
        </template>
      </el-table-column>
      <el-table-column prop="sketchNo" label="草图序号" width="100" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }: { row: Segment }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="removeSegment(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑洞段' : '新建洞段'" width="620px">
      <el-form label-width="110px">
        <el-form-item label="归属洞穴" required>
          <el-select v-model="form.caveId" style="width: 100%">
            <el-option v-for="cave in caveState.caves" :key="cave.id" :label="cave.name" :value="cave.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="洞段编号" required>
              <el-input v-model="form.code" placeholder="如 C-03" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="洞段类型">
              <el-select v-model="form.type" style="width: 100%">
                <el-option v-for="type in SEGMENT_TYPES" :key="type" :label="type" :value="type" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="起始桩号">
              <el-input v-model="form.startStake" placeholder="K0+000" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束桩号">
              <el-input v-model="form.endStake" placeholder="K0+050" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="平均宽(m)">
              <el-input-number v-model="form.avgWidth" :min="0" :step="0.1" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="平均高(m)">
              <el-input-number v-model="form.avgHeight" :min="0" :step="0.1" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="坡度趋势">
          <el-input v-model="form.slopeTrend" placeholder="如 缓升 3°" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="草图序号">
              <el-input v-model="form.sketchNo" placeholder="如 S-03" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-alert
              type="info"
              :closable="false"
              title="复核状态由测点页登记的复测结论与最新闭合差自动推导，无需手工勾选。"
            />
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.range {
  display: flex;
  align-items: center;
  gap: 6px;
}
.closure-num {
  font-variant-numeric: tabular-nums;
}
.closure-num.over {
  color: #c0392b;
  font-weight: 600;
}
.todo-tag {
  margin-left: 6px;
}
</style>
