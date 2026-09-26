<script setup lang="ts">
import { computed } from 'vue'
import type { ReviewStatus } from '@/types'

const props = withDefaults(
  defineProps<{
    status: ReviewStatus
    size?: 'small' | 'default'
  }>(),
  { size: 'default' }
)

type TagType = 'success' | 'warning' | 'danger' | 'info'

const TAG_TYPES: Record<ReviewStatus, TagType> = {
  待复核: 'warning',
  超限待复测: 'danger',
  复测未通过: 'danger',
  已完成: 'success'
}

const tagType = computed<TagType>(() => TAG_TYPES[props.status] ?? 'info')
const dark = computed(() => props.status === '超限待复测')
</script>

<template>
  <el-tag :type="tagType" :effect="dark ? 'dark' : 'plain'" :size="size">{{ status }}</el-tag>
</template>
