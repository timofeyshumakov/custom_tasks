<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="users"
    :label="label"
    :multiple="multiple"
    :chips="multiple"
    :clearable="clearable"
    item-title="name"
    item-value="id"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup>

const props = defineProps({
  modelValue: {
    type: [Array, Number, String, Object],
    default: null
  },
  users: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    default: 'Пользователи'
  },
  multiple: {
    type: Boolean,
    default: false
  },
  clearable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue'])
</script>