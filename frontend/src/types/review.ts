/** 复测结论 */
export const REVIEW_CONCLUSIONS = ['通过', '不通过'] as const
export type ReviewConclusion = (typeof REVIEW_CONCLUSIONS)[number]

/** 复核状态（由最新闭合差与复测结论推导，不允许手勾） */
export const REVIEW_STATUSES = ['待复核', '待复测', '已完成'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

/** Review 复核台账：一次复测登记的结论留痕 */
export interface Review {
  id: string
  segmentId: string
  /** 复测日期 */
  date: string
  /** 复核负责人 */
  reviewer: string
  /** 复测结论 */
  conclusion: ReviewConclusion
  /** 登记时的闭合差（米） */
  closure: number
  /** 备注 */
  note: string
  /** 登记时间（ISO 时间戳） */
  createdAt: string
}
