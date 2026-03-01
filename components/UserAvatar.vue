<template>
  <v-avatar :size="size" :color="color">
    <v-img v-if="user.avatar" :src="user.avatar" :alt="user.name" />
    <span v-else>{{ initials }}</span>
    <v-tooltip v-if="showTooltip" activator="parent" location="top">
      {{ user.name }}
    </v-tooltip>
  </v-avatar>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  size: {
    type: [Number, String],
    default: 32
  },
  color: {
    type: String,
    default: 'primary'
  },
  showTooltip: {
    type: Boolean,
    default: true
  }
})

const initials = computed(() => {
  return props.user.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
</script>