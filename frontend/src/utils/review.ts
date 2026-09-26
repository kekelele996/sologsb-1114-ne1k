import type { ClosureResult, Review, ReviewStatus, Station } from '@/types'
import { CLOSURE_THRESHOLD, computeClosure } from '@/utils/survey'

/** 取洞段最新一条复测记录（按复测日期、登记时间取新） */
export function latestReviewOf(reviews: Review[], segmentId: string): Review | null {
  let latest: Review | null = null
  for (const review of reviews) {
    if (review.segmentId !== segmentId) continue
    if (!latest || review.date > latest.date || (review.date === latest.date && review.createdAt > latest.createdAt)) {
      latest = review
    }
  }
  return latest
}

/**
 * 复核状态推导：
 * - 最新闭合差超限 → 待复测（先复测读数，把闭合差压回阈值内）；
 * - 闭合差达标但缺少「通过」的复测结论 → 待复核（旧洞段的“已闭合”手勾不再作数）；
 * - 最新结论为「通过」且最新闭合差在阈值内 → 已完成。
 */
export function resolveReviewStatus(closure: ClosureResult, latest: Review | null): ReviewStatus {
  if (closure.over) return '待复测'
  if (!latest || latest.conclusion !== '通过') return '待复核'
  return '已完成'
}

export interface SegmentReviewInfo {
  status: ReviewStatus
  /** 是否待办（待复核 / 待复测） */
  todo: boolean
  closure: ClosureResult
  latest: Review | null
}

/** 汇总某个洞段的复核信息：实时重算闭合差并推导复核状态 */
export function segmentReviewInfo(
  segmentId: string,
  stations: Station[],
  reviews: Review[],
  threshold = CLOSURE_THRESHOLD
): SegmentReviewInfo {
  const closure = computeClosure(
    stations.filter((station) => station.segmentId === segmentId),
    threshold
  )
  const latest = latestReviewOf(reviews, segmentId)
  const status = resolveReviewStatus(closure, latest)
  return { status, todo: status !== '已完成', closure, latest }
}
