/** 复测结论 */
export const RESURVEY_CONCLUSIONS = ['通过', '不通过'] as const
export type ResurveyConclusion = (typeof RESURVEY_CONCLUSIONS)[number]

/** ResurveyRecord 复测记录：洞段复核台账的一行，登记后即留痕 */
export interface ResurveyRecord {
  id: string
  segmentId: string
  /** 复测日期 */
  date: string
  /** 复核负责人 */
  reviewer: string
  /** 复测结论 */
  conclusion: ResurveyConclusion
  /** 登记时的闭合差快照（米） */
  closure: number
  /** 备注 */
  note: string
  createdAt: string
}

/** 洞段复核状态（由最新闭合差与复测台账推导，不再手工勾选） */
export const REVIEW_STATUSES = ['待复核', '超限待复测', '复测未通过', '已完成'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]
