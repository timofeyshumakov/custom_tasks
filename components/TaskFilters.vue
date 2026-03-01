<template>
  <v-card class="pa-4 mb-4">
    <!-- Основные фильтры (всегда видимые) -->
    <v-row>
      <v-col cols="12" md="3">
        <v-text-field
          v-model="filters.search"
          label="Поиск по названию"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          hide-details
          clearable
          placeholder="Введите текст..."
          variant="outlined"
        />
      </v-col>
      
      <v-col cols="12" md="2">
        <v-select
          v-model="filters.status"
          :items="statusOptions"
          label="Статус"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          clearable
          chips
          variant="outlined"
        />
      </v-col>
      
      <v-col cols="12" md="3">
        <UserSelect
          v-model="filters.responsibleId"
          :users="users"
          label="Исполнитель"
          density="compact"
          hide-details
          clearable
          variant="outlined"
        />
      </v-col>
      
      <v-col cols="12" md="2" class="d-flex align-center">
        <v-btn
          variant="text"
          color="primary"
          @click="resetFilters"
          :disabled="!hasActiveFilters"
          size="small"
        >
          <v-icon start>mdi-filter-remove</v-icon>
          Сбросить
        </v-btn>
      </v-col>
    </v-row>
    
    <!-- Кнопка для открытия дополнительных фильтров -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-btn
          variant="text"
          color="primary"
          size="small"
          @click="showAdvancedFilters = !showAdvancedFilters"
        >
          <v-icon :icon="showAdvancedFilters ? 'mdi-chevron-up' : 'mdi-chevron-down'" class="mr-1" />
          {{ showAdvancedFilters ? 'Скрыть' : 'Показать' }} дополнительные фильтры
        </v-btn>
      </v-col>
    </v-row>
    
    <!-- Дополнительные фильтры (в выпадающем списке) -->
    <v-expand-transition>
      <v-row v-if="showAdvancedFilters" class="mt-2">

        <v-col cols="12" md="3">
          <v-autocomplete
            v-model="filters.createdBy"
            :items="users"
            label="Постановщик"
            item-title="name"
            item-value="id"
            density="compact"
            hide-details
            clearable
            chips
            variant="outlined"
          />
        </v-col>
        
        <v-col cols="12" md="3">
          <v-autocomplete
            v-model="filters.accomplices"
            :items="users"
            label="Соисполнители"
            item-title="name"
            item-value="id"
            density="compact"
            hide-details
            clearable
            chips
            multiple
            variant="outlined"
          />
        </v-col>
        
        <v-col cols="12" md="3">
          <v-autocomplete
            v-model="filters.auditors"
            :items="users"
            label="Наблюдатели"
            item-title="name"
            item-value="id"
            density="compact"
            hide-details
            clearable
            chips
            multiple
            variant="outlined"
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-autocomplete
            v-model="filters.stageId"
            :items="stages"
            label="Стадия"
            item-title="title"
            item-value="id"
            density="compact"
            hide-details
            clearable
            chips
            variant="outlined"
          />
        </v-col>
        
        <!-- Фильтры по датам -->
        <v-col cols="12">
          <div class="text-subtitle-2 mb-2">Даты</div>
        </v-col>
        
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.createdDateFrom"
            label="Создано от"
            type="date"
            density="compact"
            hide-details
            variant="outlined"
          />
        </v-col>
        
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.createdDateTo"
            label="Создано до"
            type="date"
            density="compact"
            hide-details
            variant="outlined"
          />
        </v-col>
        
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.deadlineFrom"
            label="Срок от"
            type="date"
            density="compact"
            hide-details
            variant="outlined"
          />
        </v-col>
        
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.deadlineTo"
            label="Срок до"
            type="date"
            density="compact"
            hide-details
            variant="outlined"
          />
        </v-col>
        
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.closedDateFrom"
            label="Завершено от"
            type="date"
            density="compact"
            hide-details
            variant="outlined"
          />
        </v-col>
        
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filters.closedDateTo"
            label="Завершено до"
            type="date"
            density="compact"
            hide-details
            variant="outlined"
          />
        </v-col>
        
        <!-- Дополнительные опции -->
        <v-col cols="12" class="mt-2">
          <v-checkbox
            v-model="filters.overdue"
            label="Только просроченные"
            density="compact"
            hide-details
            variant="outlined"
          />
        </v-col>
      </v-row>
    </v-expand-transition>
    
    <!-- Активные фильтры (всегда видимые) -->
    <v-row v-if="hasActiveFilters" class="mt-2">
      <v-col cols="12">
        <div class="d-flex align-center flex-wrap" style="gap: 4px;">
          <span class="text-caption text-grey mr-1">Активные фильтры:</span>
          
          <!-- Поиск -->
          <v-chip
            v-if="filters.search"
            closable
            size="x-small"
            @click:close="filters.search = ''"
          >
            Поиск: "{{ filters.search }}"
          </v-chip>
          
          <!-- Статус -->
          <v-chip
            v-if="filters.status"
            closable
            size="x-small"
            @click:close="filters.status = null"
          >
            Статус: {{ getStatusLabel(filters.status) }}
          </v-chip>
          
          <!-- Приоритет -->
          <v-chip
            v-if="filters.priority"
            closable
            size="x-small"
            @click:close="filters.priority = null"
          >
            Приоритет: {{ getPriorityLabel(filters.priority) }}
          </v-chip>
          
          <!-- Исполнитель -->
          <v-chip
            v-if="filters.responsibleId"
            closable
            size="x-small"
            @click:close="filters.responsibleId = null"
          >
            Исполнитель: {{ getUserName(filters.responsibleId) }}
          </v-chip>
          
          <!-- Проект -->
          <v-chip
            v-if="filters.groupId"
            closable
            size="x-small"
            @click:close="filters.groupId = null"
          >
            Проект: {{ getProjectName(filters.groupId) }}
          </v-chip>
          
          <!-- Постановщик -->
          <v-chip
            v-if="filters.createdBy"
            closable
            size="x-small"
            @click:close="filters.createdBy = null"
          >
            Постановщик: {{ getUserName(filters.createdBy) }}
          </v-chip>
          
          <!-- Соисполнители -->
          <v-chip
            v-for="userId in filters.accomplices"
            :key="userId"
            closable
            size="x-small"
            @click:close="removeFilterItem('accomplices', userId)"
          >
            Соисп.: {{ getUserName(userId) }}
          </v-chip>
          
          <!-- Наблюдатели -->
          <v-chip
            v-for="userId in filters.auditors"
            :key="userId"
            closable
            size="x-small"
            @click:close="removeFilterItem('auditors', userId)"
          >
            Набл.: {{ getUserName(userId) }}
          </v-chip>

          <!-- В отчете -->
          <v-chip
            v-if="filters.addInReport !== null"
            closable
            size="x-small"
            @click:close="filters.addInReport = null"
          >
            В отчете: {{ filters.addInReport ? 'Да' : 'Нет' }}
          </v-chip>
          
          <!-- Только корневые -->
          <v-chip
            v-if="filters.onlyRootTasks !== null"
            closable
            size="x-small"
            @click:close="filters.onlyRootTasks = null"
          >
            Только корневые: {{ filters.onlyRootTasks ? 'Да' : 'Нет' }}
          </v-chip>
          
          <!-- Стадия -->
          <v-chip
            v-if="filters.stageId"
            closable
            size="x-small"
            @click:close="filters.stageId = ''"
          >
            Стадия: {{ getStageName(filters.stageId) }}
          </v-chip>
          
          <!-- Даты -->
          <v-chip
            v-if="filters.createdDateFrom"
            closable
            size="x-small"
            @click:close="filters.createdDateFrom = ''"
          >
            Создано с: {{ formatDate(filters.createdDateFrom) }}
          </v-chip>
          
          <v-chip
            v-if="filters.createdDateTo"
            closable
            size="x-small"
            @click:close="filters.createdDateTo = ''"
          >
            Создано по: {{ formatDate(filters.createdDateTo) }}
          </v-chip>
          
          <v-chip
            v-if="filters.deadlineFrom"
            closable
            size="x-small"
            @click:close="filters.deadlineFrom = ''"
          >
            Срок с: {{ formatDate(filters.deadlineFrom) }}
          </v-chip>
          
          <v-chip
            v-if="filters.deadlineTo"
            closable
            size="x-small"
            @click:close="filters.deadlineTo = ''"
          >
            Срок по: {{ formatDate(filters.deadlineTo) }}
          </v-chip>
          
          <v-chip
            v-if="filters.overdue"
            closable
            size="x-small"
            @click:close="filters.overdue = false"
          >
            Только просроченные
          </v-chip>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import UserSelect from './UserSelect.vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  users: {
    type: Array,
    required: true
  },
  projects: {
    type: Array,
    required: true
  },
  stages: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:filters', 'reset'])

// Состояние для отображения дополнительных фильтров
const showAdvancedFilters = computed({
  get: () => props.filters.showAdvanced || false,
  set: (value) => {
    emit('update:filters', { ...props.filters, showAdvanced: value })
  }
})

const statusOptions = [
  { title: 'Ждет выполнения', value: 2 },
  { title: 'Выполняется', value: 3 },
  { title: 'Ожидает контроля', value: 4 },
  { title: 'Завершена', value: 5 },
  { title: 'Отложена', value: 6 }
]

const priorityOptions = [
  { title: 'Низкий', value: 1 },
  { title: 'Средний', value: 2 },
  { title: 'Высокий', value: 3 }
]

const booleanOptions = [
  { title: 'Да', value: true },
  { title: 'Нет', value: false }
]

const hasActiveFilters = computed(() => {
  return props.filters.search ||
         props.filters.status ||
         props.filters.priority ||
         props.filters.responsibleId ||
         props.filters.groupId ||
         props.filters.createdBy ||
         props.filters.accomplices?.length ||
         props.filters.auditors?.length ||
         props.filters.tags ||
         props.filters.addInReport !== null ||
         props.filters.onlyRootTasks !== null ||
         props.filters.stageId ||
         props.filters.createdDateFrom ||
         props.filters.createdDateTo ||
         props.filters.deadlineFrom ||
         props.filters.deadlineTo ||
         props.filters.closedDateFrom ||
         props.filters.closedDateTo ||
         props.filters.overdue
})

const getStatusLabel = (status) => {
  const statusMap = {
    2: 'Ждет выполнения',
    3: 'Выполняется',
    4: 'Ожидает контроля',
    5: 'Завершена',
    6: 'Отложена'
  }
  return statusMap[status] || status
}

const getPriorityLabel = (priority) => {
  const priorityMap = {
    1: 'Низкий',
    2: 'Средний',
    3: 'Высокий'
  }
  return priorityMap[priority] || priority
}

const getUserName = (userId) => {
  if (userId == null) return ''
  // на случай если пришёл объект (например, из старого состояния)
  if (typeof userId === 'object' && 'name' in userId) return userId.name
  const user = props.users.find(u => u.id == userId)
  return user?.name || String(userId)
}

const getProjectName = (projectId) => {
  if (!projectId) return ''
  const project = props.projects.find(p => p.id == projectId)
  return project?.name || projectId
}

const getStageName = (stageId) => {
  if (stageId == null || stageId === '') return ''
  const stage = props.stages.find(s => s.id == stageId)
  return stage?.title || String(stageId)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

const removeFilterItem = (field, value) => {
  const newArray = props.filters[field].filter(item => item !== value)
  emit('update:filters', { ...props.filters, [field]: newArray })
}

const resetFilters = () => {
  emit('reset')
}
</script>

<style scoped>
:deep(.v-chip--size-x-small) {
  font-size: 0.7rem;
  height: 20px;
  margin: 2px;
}
</style>