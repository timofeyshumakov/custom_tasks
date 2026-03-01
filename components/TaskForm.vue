<template>
  <v-form ref="form" @submit.prevent="handleSubmit">
    <!-- Кнопка закрытия в правом верхнем углу -->
    <v-btn
      icon="mdi-close"
      variant="text"
      size="small"
      class="close-button"
      @click="emit('close')"
    />
    
    <!-- Название задачи (крупно) -->
    <v-text-field
      v-model="formData.title"
      label="Название задачи"
      :rules="[v => !!v || 'Название обязательно']"
      variant="outlined"
      class="mb-4 title-field"
      hide-details="auto"
      required
    />
    
    <!-- Описание -->
    <v-textarea
      v-model="formData.description"
      label="Описание"
      rows="4"
      variant="outlined"
      class="mb-4"
      hide-details="auto"
    />
    
    <!-- Исполнитель (обязательное поле, по умолчанию — текущий пользователь) -->
    <div class="mb-4">
      <div class="text-subtitle-2 text-grey mb-1">Исполнитель <span class="text-error">*</span></div>
      <UserSelect
        v-model="formData.assignedTo"
        :users="users"
        label="Выберите исполнителя"
        multiple
        variant="outlined"
        hide-details
      />
      <div v-if="assignedToError" class="text-caption text-error mt-1">{{ assignedToError }}</div>
    </div>
    
    <!-- Крайний срок -->
    <div class="mb-4">
      <div class="text-subtitle-2 text-grey mb-1">Крайний срок</div>
      <v-row>
        <v-col cols="12" md="8">
          <v-text-field
            v-model="formData.dueDate"
            label="Дата"
            type="date"
            variant="outlined"
            hide-details
            :min="today"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="formData.dueTime"
            :items="timeOptions"
            label="Время"
            variant="outlined"
            hide-details
          />
        </v-col>
      </v-row>
      <div v-if="formData.dueDate" class="text-caption text-grey mt-1">
        {{ formatDueDate }} (МСК)
      </div>
    </div>
    
    <!-- Кнопки Файлы и Чек-лист -->
    <v-row class="mb-4">
      <v-col cols="6">
        <v-btn
          block
          variant="outlined"
          prepend-icon="mdi-paperclip"
          @click="openFileDialog"
        >
          Файлы
          <v-badge
            v-if="attachedFiles.length"
            :content="attachedFiles.length"
            color="primary"
            inline
          />
        </v-btn>
      </v-col>
      <v-col cols="6">
        <v-btn
          block
          variant="outlined"
          prepend-icon="mdi-checkbox-marked-outline"
          @click="openChecklistDialog"
        >
          Чек-лист
          <v-badge
            v-if="checklistItems.length"
            :content="checklistItems.length"
            color="primary"
            inline
          />
        </v-btn>
      </v-col>
    </v-row>

    <!-- Кнопки действий внизу -->
    <v-divider class="my-4" />
    
    <v-card-actions class="pa-0">
      <v-spacer />
      <v-btn
        color="grey-darken-1"
        variant="text"
        @click="emit('close')"
      >
        Отмена
      </v-btn>
      <v-btn
        color="primary"
        type="submit"
        :loading="submitting"
      >
        {{ task ? 'Сохранить' : 'Создать' }}
      </v-btn>
    </v-card-actions>
    
    <!-- Скрытые диалоги для файлов и чек-листов -->
    <v-dialog v-model="fileDialog" max-width="500">
      <v-card>
        <v-card-title>Прикрепить файлы</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="newFiles"
            label="Выберите файлы"
            multiple
            chips
            counter
            show-size
            @update:model-value="handleFilesSelected"
          />
          
          <div v-if="attachedFiles.length" class="mt-4">
            <div class="text-subtitle-2 mb-2">Прикрепленные файлы:</div>
            <v-list density="compact">
              <v-list-item
                v-for="(file, index) in attachedFiles"
                :key="index"
              >
                <template v-slot:prepend>
                  <v-icon :icon="getFileIcon(file.name)" />
                </template>
                <v-list-item-title>{{ file.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ formatFileSize(file.size) }}</v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn
                    icon="mdi-close"
                    size="x-small"
                    variant="text"
                    @click="removeFile(index)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="fileDialog = false">
            Готово
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <v-dialog v-model="checklistDialog" max-width="500">
      <v-card>
        <v-card-title>Чек-лист</v-card-title>
        <v-card-text>
          <div v-for="(item, itemIndex) in checklistItems" :key="itemIndex" class="d-flex align-center mb-1">
            <v-checkbox
              v-model="item.checked"
              density="compact"
              hide-details
              class="mr-2"
            />
            <v-text-field
              v-model="item.text"
              variant="outlined"
              density="compact"
              hide-details
              placeholder="Пункт чек-листа"
              class="flex-grow-1"
            />
            <v-btn
              icon="mdi-close"
              size="x-small"
              variant="text"
              @click="removeChecklistItem(itemIndex)"
            />
          </div>
          <v-btn
            size="small"
            variant="text"
            prepend-icon="mdi-plus"
            class="mt-2"
            @click="addChecklistItem"
          >
            Добавить пункт
          </v-btn>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="checklistDialog = false">
            Готово
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-form>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import UserSelect from './UserSelect.vue'

const props = defineProps({
  task: {
    type: Object,
    default: null
  },
  projects: {
    type: Array,
    required: true
  },
  users: {
    type: Array,
    required: true
  },
  currentUserId: {
    type: [Number, String],
    default: null
  }
})

const emit = defineEmits(['submit', 'close'])

const form = ref(null)
const submitting = ref(false)
const assignedToError = ref('')

// Состояние для файлов и чек-листов
const fileDialog = ref(false)
const checklistDialog = ref(false)
const attachedFiles = ref([])
const newFiles = ref([])
const checklistItems = ref([])

// Опции для времени
const timeOptions = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', 
  '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
]

// Сегодняшняя дата для min атрибута
const today = computed(() => {
  const date = new Date()
  return date.toISOString().split('T')[0]
})

// Форматирование даты для отображения
const formatDueDate = computed(() => {
  if (!formData.value.dueDate) return ''
  
  const date = new Date(formData.value.dueDate + 'T' + (formData.value.dueTime || '19:00'))
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
})

const statusOptions = [
  { title: 'К выполнению', value: 'todo' },
  { title: 'В процессе', value: 'in-progress' },
  { title: 'Выполнено', value: 'done' }
]

const priorityOptions = [
  { title: 'Низкий', value: 'low' },
  { title: 'Средний', value: 'medium' },
  { title: 'Высокий', value: 'high' }
]

const formData = ref({
  title: '',
  description: '',
  projectId: null,
  status: 'todo',
  priority: 'medium',
  assignedTo: [],
  dueDate: '',
  dueTime: '19:00'
})

// Установка даты по умолчанию (1 неделя вперед)
onMounted(() => {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  formData.value.dueDate = date.toISOString().split('T')[0]
})

// Заполняем форму при редактировании
watch(() => props.task, (task) => {
  if (task) {
    formData.value = { 
      ...task,
      dueDate: task.dueDate || formData.value.dueDate,
      dueTime: task.dueTime || '19:00'
    }
    attachedFiles.value = task.files || []
    checklistItems.value = task.checklistItems?.length ? [...task.checklistItems] : (task.checklists?.[0]?.items ? [...task.checklists[0].items] : [])
  } else {
    const defaultAssignee = props.currentUserId != null ? [Number(props.currentUserId)] : []
    formData.value = {
      title: '',
      description: '',
      projectId: null,
      status: 'todo',
      priority: 'medium',
      assignedTo: defaultAssignee,
      dueDate: formData.value.dueDate,
      dueTime: '19:00'
    }
    assignedToError.value = ''
    attachedFiles.value = []
    checklistItems.value = []
  }
}, { immediate: true })

// Подстановка текущего пользователя, когда он загрузился после открытия формы создания
watch(() => props.currentUserId, (id) => {
  if (id != null && !props.task && (!formData.value.assignedTo || !formData.value.assignedTo.length)) {
    formData.value.assignedTo = [Number(id)]
  }
}, { immediate: true })

watch(() => formData.value.assignedTo, () => {
  if (assignedToError.value && formData.value.assignedTo?.length) assignedToError.value = ''
}, { deep: true })

const getPriorityColor = (priority) => {
  const colors = {
    low: 'success',
    medium: 'warning',
    high: 'error'
  }
  return colors[priority] || 'grey'
}

const getPriorityIcon = (priority) => {
  const icons = {
    low: 'mdi-arrow-down',
    medium: 'mdi-minus',
    high: 'mdi-arrow-up'
  }
  return icons[priority] || 'mdi-circle'
}

// Методы для работы с файлами
const openFileDialog = () => {
  fileDialog.value = true
}

const handleFilesSelected = () => {
  if (newFiles.value.length) {
    attachedFiles.value = [...attachedFiles.value, ...newFiles.value]
    newFiles.value = []
  }
}

const removeFile = (index) => {
  attachedFiles.value.splice(index, 1)
}

const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase()
  const icons = {
    pdf: 'mdi-file-pdf-box',
    doc: 'mdi-file-word',
    docx: 'mdi-file-word',
    xls: 'mdi-file-excel',
    xlsx: 'mdi-file-excel',
    jpg: 'mdi-file-image',
    jpeg: 'mdi-file-image',
    png: 'mdi-file-image',
    gif: 'mdi-file-image',
    txt: 'mdi-file-document-outline'
  }
  return icons[ext] || 'mdi-file'
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Методы для работы с чек-листами
const openChecklistDialog = () => {
  checklistDialog.value = true
}

const addChecklistItem = () => {
  checklistItems.value.push({
    text: '',
    checked: false
  })
}

const removeChecklistItem = (itemIndex) => {
  checklistItems.value.splice(itemIndex, 1)
}

const handleSubmit = async () => {
  assignedToError.value = ''
  const hasAssignee = formData.value.assignedTo != null && formData.value.assignedTo.length > 0
  if (!hasAssignee) {
    assignedToError.value = 'Выберите исполнителя'
  }
  const { valid } = await form.value.validate()
  if (!valid || !hasAssignee) return

  submitting.value = true
  try {
      // Формируем полную дату и время
      const dueDateTime = formData.value.dueDate && formData.value.dueTime
        ? `${formData.value.dueDate}T${formData.value.dueTime}:00`
        : null
      
      emit('submit', { 
        ...formData.value,
        id: props.task?.id,
        dueDateTime,
        files: attachedFiles.value,
        checklistItems: checklistItems.value
      })
      emit('close')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

.title-field :deep(.v-field__input) {
  font-size: 1.5rem;
  font-weight: 500;
  min-height: 56px;
}

:deep(.v-field) {
  border-radius: 8px;
}

:deep(.v-text-field .v-field__input) {
  padding-top: 10px;
  padding-bottom: 10px;
}

/* Стили для формы внутри диалога */
:deep(.v-card) {
  position: relative;
}
</style>