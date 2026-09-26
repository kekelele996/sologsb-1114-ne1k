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

/** 待复测（红，最紧急）→ 待复核（橙）→ 已完成（绿） */
const tone = computed(() =>
  props.status === '已完成' ? 'success' : props.status === '待复测' ? 'danger' : 'warning'
)
</script>

<template>
  <el-tag :type="tone" :size="size" :effect="status === '已完成' ? 'plain' : 'dark'">{{ status }}</el-tag>
</template>
