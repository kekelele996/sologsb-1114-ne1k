import type { ClosureResult, ResurveyRecord, ReviewStatus, Station } from '@/types'
import { computeClosure } from '@/utils/survey'

/** 单个洞段的复核汇总 */
export interface SegmentReview {
  status: ReviewStatus
  /** 是否待办（未完成的洞段都需要跟进） */
  todo: boolean
  /** 最新闭合差计算结果（随测点增删改实时重算） */
  closure: ClosureResult
  /** 最新一条复测记录 */
  latest: ResurveyRecord | null
}

/** 取最新一条复测记录（按复测日期、登记时间倒序） */
export function latestResurvey(records: ResurveyRecord[]): ResurveyRecord | null {
  if (records.length === 0) return null
  return [...records].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`))[0]
}

/**
 * 推导洞段复核状态：
 * 1. 最新闭合差超限 → 超限待复测；
 * 2. 没有任何复测记录 → 待复核（旧洞段不沿用原「已闭合」开关）；
 * 3. 最新结论不是「通过」 → 复测未通过；
 * 4. 结论为通过且最新闭合差回到阈值内 → 已完成。
 */
export function resolveSegmentReview(
  segmentId: string,
  stations: Station[],
  resurveys: ResurveyRecord[],
  threshold = 0.25
): SegmentReview {
  const closure = computeClosure(
    stations.filter((station) => station.segmentId === segmentId),
    threshold
  )
  const latest = latestResurvey(resurveys.filter((record) => record.segmentId === segmentId))
  let status: ReviewStatus
  if (closure.over) status = '超限待复测'
  else if (!latest) status = '待复核'
  else if (latest.conclusion !== '通过') status = '复测未通过'
  else status = '已完成'
  return { status, todo: status !== '已完成', closure, latest }
}
