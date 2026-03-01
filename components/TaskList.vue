<template>
  <div>
    <!-- Таблица задач -->
    <v-data-table
      :headers="headers"
      :items="tasks"
      :loading="loading"
      :search="search"
      :items-per-page="10"
      class="elevation-1"
      hover
      dense
    >
      <!-- ID -->
      <template v-slot:item.id="{ item }">
        <a :href="taskLink(item.id)" class="font-weight-medium" target="_blank">{{ item.id }}</a>
      </template>

      <!-- Название задачи -->
      <template v-slot:item.title="{ item }">
        <div class="d-flex align-center">
          <span class="text-truncate" style="max-width: 200px;" :title="item.title">
            {{ item.title }}
          </span>
        </div>
      </template>

      <!-- Статус -->
      <template v-slot:item.status="{ item }">
        <div class="d-flex align-center">
          <v-chip
            :color="getStatusColor(item.realStatus || item.status)"
            size="x-small"
            class="mr-1"
          >
            {{ getStatusLabel(item.realStatus || item.status) }}
          </v-chip>
          <v-tooltip v-if="getMetaStatus(item.status)" activator="parent" location="top">
            {{ getMetaStatus(item.status) }}
          </v-tooltip>
          <v-icon
            v-if="isDeadlineOverdue(item.deadline) && (item.realStatus || item.status) != 5"
            color="error"
            size="small"
            class="ml-1"
          >
            mdi-alert-circle
          </v-icon>
          <v-icon
            v-else-if="isDeadlineNear(item.deadline) && (item.realStatus || item.status) != 5"
            color="warning"
            size="small"
            class="ml-1"
          >
            mdi-alert
          </v-icon>
        </div>
      </template>

      <!-- Приоритет -->
      <template v-slot:item.priority="{ item }">
        <v-chip
          v-if="item.priority"
          :color="getPriorityColor(item.priority)"
          size="x-small"
          variant="tonal"
        >
          {{ getPriorityLabel(item.priority) }}
        </v-chip>
      </template>

      <!-- Исполнитель -->
      <template v-slot:item.responsibleId="{ item }">
        <div class="d-flex align-center">

          <span class="text-truncate" style="max-width: 100px;" :title="getUserById(item.responsibleId)?.name">
            {{ getUserById(item.responsibleId)?.name || '—' }}
          </span>
        </div>
      </template>

      <!-- Крайний срок -->
      <template v-slot:item.deadline="{ item }">
        <div :class="getDeadlineClass(item.deadline, item.realStatus || item.status)">
          {{ formatDate(item.deadline) }}
        </div>
      </template>

      <!-- Дата создания -->
      <template v-slot:item.createdDate="{ item }">
        {{ formatDate(item.createdDate) }}
      </template>

      <!-- Активность -->
      <template v-slot:item.activityDate="{ item }">
        {{ formatDate(item.activityDate) }}
      </template>

      <!-- Постановщик -->
      <template v-slot:item.createdBy="{ item }">
        <div class="d-flex align-center">

          <span class="text-truncate" style="max-width: 80px;" :title="item.creator?.name || getUserById(item.createdBy)?.name">
            {{ item.creator?.name || getUserById(item.createdBy)?.name || '—' }}
          </span>
        </div>
      </template>

      <!-- Соисполнители -->
      <template v-slot:item.accomplices="{ item }">
        <span v-if="item.accomplices?.length" class="text-body-2">
          {{ formatUserIdsToNames(item.accomplices) }}
        </span>
        <span v-else class="text-grey">—</span>
      </template>

      <!-- Наблюдатели -->
      <template v-slot:item.auditors="{ item }">
        <span v-if="item.auditors?.length" class="text-body-2">
          {{ formatUserIdsToNames(item.auditors) }}
        </span>
        <span v-else class="text-grey">—</span>
      </template>

      <!-- Оценка времени -->
      <template v-slot:item.timeEstimate="{ item }">
        <span v-if="item.timeEstimate && item.timeEstimate !== '0'">
          {{ formatTimeEstimate(item.timeEstimate) }}
        </span>
        <span v-else>00:00</span>
      </template>

      <!-- Стадия: прямоугольник с секциями (слева — первая стадия, справа — последняя), клик переносит задачу -->
      <template v-slot:item.stageId="{ item }">
        <div v-if="props.stages.length" class="stage-bar-cell">
          <div
            class="stage-bar"
            role="group"
            :aria-label="'Стадия: ' + getStageName(item.stageId)"
          >
            <v-tooltip
              v-for="(stage, segmentIndex) in props.stages"
              :key="stage.id"
              location="top"
            >
              <template #activator="{ props: tooltipProps }">
                <div
                  v-bind="tooltipProps"
                  class="stage-bar__segment"
                  :class="{ 'stage-bar__segment--active': segmentIndex <= getStageIndex(item.stageId) }"
                  :style="{ flex: '1 1 0', minWidth: '6px' }"
                  @click="onStageSegmentClick(item, stage)"
                />
              </template>
              {{ stage.title || stage.id }}
            </v-tooltip>
          </div>
          <div class="stage-bar-caption text-caption text-medium-emphasis mt-1">
            {{ getStageName(item.stageId) || '—' }}
          </div>
        </div>
        <span v-else class="text-grey">—</span>
      </template>

      <!-- В отчете -->
      <template v-slot:item.addInReport="{ item }">
        <v-icon :color="item.addInReport ? 'success' : 'grey'">
          {{ item.addInReport ? 'mdi-check-circle' : 'mdi-close-circle' }}
        </v-icon>
      </template>

      <!-- Действия -->
      <template v-slot:item.actions="{ item }">
        <v-btn
          icon="mdi-pencil"
          size="x-small"
          variant="text"
          @click="emit('edit', item)"
        />
        <v-btn
          icon="mdi-delete"
          size="x-small"
          variant="text"
          color="error"
          @click="emit('delete', item.id)"
        />
      </template>

      <!-- Пустое состояние -->
      <template v-slot:no-data>
        <div class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-format-list-bulleted</v-icon>
          <div class="text-h6 mt-4">Задачи не найдены</div>
          <div class="text-body-2 text-grey">
            Попробуйте изменить параметры фильтрации или создайте новую задачу
          </div>
        </div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tasks: {
    type: Array,
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
  },
  projectId: {
    type: [Number, String],
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  search: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['edit', 'delete', 'stage-change'])

const onStageSegmentClick = (item, stage) => {
  if (String(item.stageId) === String(stage.id)) return
  emit('stage-change', { taskId: item.id, stageId: stage.id })
}

/** Ссылка на задачу в Битрикс24: /workgroups/group/{projectId}/tasks/task/view/{taskId}/ */
const taskLink = (taskId) => {
  const pid = props.projectId != null ? props.projectId : ''
  return `/workgroups/group/${pid}/tasks/task/view/${taskId}/`
}

// Заголовки таблицы
const headers = [
  { title: 'ID', key: 'id', sortable: true, width: '70px' },
  { title: 'Название', key: 'title', sortable: true, width: '200px' },
  { title: 'Статус', key: 'status', sortable: true, width: '100px' },
  { title: 'Активность', key: 'activityDate', sortable: true, width: '100px' },
  { title: 'Исполнитель', key: 'responsibleId', sortable: true, width: '120px' },
  { title: 'Крайний срок', key: 'deadline', sortable: true, width: '90px' },
  { title: 'Создано', key: 'createdDate', sortable: true, width: '80px' },
  { title: 'Постановщик', key: 'createdBy', sortable: true, width: '100px' },
  { title: 'Соисп.', key: 'accomplices', sortable: false, width: '140px', minWidth: '120px' },
  { title: 'Набл.', key: 'auditors', sortable: false, width: '140px', minWidth: '120px' },
  { title: 'Плановые трудозатраты', key: 'timeEstimate', sortable: true, width: '70px' },
  { title: 'Стадия', key: 'stageId', sortable: true, width: '120px', minWidth: '80px' },
]
console.log(props.tasks);
const getUserById = (id) => {
  if (!id) return null
  return props.users.find(u => u.id == id) || { id, name: `User ${id}` }
}

/** Массив id пользователей → строка ФИО через запятую */
const formatUserIdsToNames = (userIds) => {
  if (!userIds?.length) return ''
  return userIds
    .map(id => getUserById(id)?.name)
    .filter(Boolean)
    .join(', ')
}

const getProjectName = (projectId) => {
  if (!projectId) return null
  const project = props.projects.find(p => p.id == projectId)
  return project?.name
}

const getStageName = (stageId) => {
  if (!stageId || stageId === '0') return ''
  const stage = props.stages.find(s => s.id == stageId)
  return stage?.title || String(stageId)
}

/** Индекс стадии в списке (0 = первая, слева). Для заливки всех секторов до текущей включительно. */
const getStageIndex = (stageId) => {
  if (stageId == null || stageId === '' || String(stageId) === '0') return -1
  const index = props.stages.findIndex(s => s.id == stageId)
  return index >= 0 ? index : -1
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

const formatTimeEstimate = (seconds) => {
  if (!seconds || seconds === '0') return '00:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}м`
  if (minutes === 0) return `${hours}ч`
  return `${hours}ч ${minutes}м`
}

const isDeadlineNear = (deadline) => {
  if (!deadline) return false
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffHours = (deadlineDate - now) / (1000 * 60 * 60)
  return diffHours > 0 && diffHours < 24
}

const isDeadlineOverdue = (deadline) => {
  if (!deadline) return false
  const now = new Date()
  const deadlineDate = new Date(deadline)
  return deadlineDate < now
}

const getDeadlineClass = (deadline, status) => {
  if (!deadline) return ''
  if (status == 5) return '' // Завершена - не подсвечиваем
  if (isDeadlineOverdue(deadline)) return 'text-error font-weight-bold'
  if (isDeadlineNear(deadline)) return 'text-warning'
  return ''
}

const getPriorityColor = (priority) => {
  const colors = {
    1: 'success',
    2: 'warning',
    3: 'error'
  }
  return colors[priority] || 'null'
}

const getPriorityLabel = (priority) => {
  const labels = {
    1: 'Низкий',
    2: 'Средний',
    3: 'Высокий'
  }
  return labels[priority] || priority
}

const getPriorityIcon = (priority) => {
  const icons = {
    1: 'mdi-arrow-down',
    2: 'mdi-minus',
    3: 'mdi-arrow-up'
  }
  return icons[priority] || 'mdi-circle'
}

const getStatusColor = (status) => {
  const colors = {
    2: 'grey',
    3: 'info',
    4: 'warning',
    5: 'success',
    6: 'grey-darken-1'
  }
  return colors[status] || 'grey'
}

const getStatusLabel = (status) => {
  const labels = {
    2: 'Ждет выполнения',
    3: 'В работе',
    4: 'На контроле',
    5: 'Готово',
    6: 'Отложено'
  }
  return labels[status] || status
}

const getMetaStatus = (status) => {
  const metaLabels = {
    '-3': 'Почти просрочена',
    '-2': 'Не просмотрена',
    '-1': 'Просрочена'
  }
  return metaLabels[status] || null
}
</script>

<style scoped>
:deep(.v-data-table-header) {
  background-color: #f5f5f5;
}

:deep(.v-data-table-header th) {
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  white-space: nowrap;
}

:deep(.v-data-table__tr:hover) {
  background-color: #f5f5f5 !important;
}

:deep(td) {
  font-size: 0.8rem !important;
  padding: 6px 8px !important;
  white-space: nowrap;
}

.text-error {
  color: #ff5252 !important;
}

.stage-bar {
  display: flex;
  flex-direction: row;
  width: 100%;
  min-width: 70px;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
  cursor: pointer;
}

.stage-bar__segment {
  background-color: #e0e0e0;
  transition: background-color 0.15s ease;
}

.stage-bar__segment:hover {
  background-color: #bdbdbd;
}

.stage-bar__segment--active {
  background-color: rgb(var(--v-theme-primary));
}

.stage-bar__segment--active:hover {
  opacity: 0.9;
}

.stage-bar-cell {
  min-width: 0;
}

.stage-bar-caption {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.text-warning {
  color: #fb8c00 !important;
}

:deep(.v-chip--size-x-small) {
  font-size: 0.7rem;
  height: 20px;
}

:deep(.v-btn--size-x-small) {
  width: 24px;
  height: 24px;
}
</style>