<template>
  <v-app>
    <v-app-bar color="primary" prominent>
      <v-btn
        v-for="link in projectLinks"
        :key="link.title"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        variant="text"
        class="mx-1"
      >
        {{ link.title }}
      </v-btn>
    </v-app-bar>
    
    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12">
            <div class="d-flex justify-space-between align-center mb-4">
              <h1 class="text-h4">Задачи проекта</h1>
              <v-btn
                color="primary"
                prepend-icon="mdi-plus"
                @click="openCreateDialog"
              >
                Создать задачу
              </v-btn>
            </div>
          </v-col>
        </v-row>
        
        <!-- Фильтры -->
        <TaskFilters
          v-model:filters="filters"
          :users="users"
          :projects="projects"
          :stages="stages"
          @reset="resetFilters"
        />
        
        <!-- Поле поиска для таблицы -->
        <v-text-field
          v-model="search"
          label="Поиск по задачам"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-4"
          clearable
        />
        
        <!-- Список задач в виде таблицы -->
        <TaskList
          :tasks="filteredTasks"
          :users="users"
          :projects="projects"
          :stages="stages"
          :project-id="projectId"
          :loading="loading"
          :search="search"
          @edit="openEditDialog"
          @delete="deleteTask"
          @stage-change="handleStageChange"
        />
        
        <!-- Диалог создания/редактирования задачи -->
        <v-dialog v-model="dialog" max-width="600" persistent>
          <v-card>
            <v-card-title>
              {{ editingTask ? 'Редактировать задачу' : 'Создать задачу' }}
            </v-card-title>
            
            <v-card-text>
            <TaskForm
              :task="editingTask"
              :projects="projects"
              :users="users"
              :current-user-id="currentUserId"
              @submit="handleTaskSubmit"
              @close="closeDialog"
            />
            </v-card-text>
          </v-card>
        </v-dialog>
        
        <!-- Диалог подтверждения удаления -->
        <v-dialog v-model="deleteDialog" max-width="400">
          <v-card>
            <v-card-title>Подтверждение удаления</v-card-title>
            <v-card-text>
              Вы действительно хотите удалить эту задачу?
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn color="grey-darken-1" variant="text" @click="deleteDialog = false">
                Отмена
              </v-btn>
              <v-btn color="error" variant="text" @click="confirmDelete">
                Удалить
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        
        <!-- Уведомления -->
        <v-snackbar
          v-model="snackbar.show"
          :color="snackbar.color"
          :timeout="3000"
        >
          {{ snackbar.text }}
          <template v-slot:actions>
            <v-btn color="white" variant="text" @click="snackbar.show = false">
              Закрыть
            </v-btn>
          </template>
        </v-snackbar>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTasks } from '../composables/useTasks'
import TaskList from "../components/TaskList.vue";
import TaskFilters from "../components/TaskFilters.vue";
import TaskForm from "../components/TaskForm.vue";

const {
  users,
  projects,
  stages,
  projectId,
  currentUserId,
  filters,
  filteredTasks,
  error,
  addTask,
  updateTask,
  updateTaskStage,
  deleteTask: removeTask,
  resetFilters
} = useTasks()

const baseUrl = 'https://simetra.bitrix24.ru/workgroups/group'

const projectLinks = computed(() => {
  const pid = projectId?.value ?? 37
  return [
    { title: 'Лента', url: `${baseUrl}/${pid}/general/` },
    { title: 'Диск', url: `${baseUrl}/${pid}/disk/path/` },
    { title: 'О проекте', url: `${baseUrl}/${pid}/card/` },
    { title: 'Добавить участника', url: `${baseUrl}/${pid}/invite/` }
  ]
})

// Состояние диалогов
const dialog = ref(false)
const deleteDialog = ref(false)
const editingTask = ref(null)
const taskToDelete = ref(null)

// Уведомления
const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
})

const showNotification = (text, color = 'success') => {
  snackbar.value = {
    show: true,
    text,
    color
  }
}

// Открытие диалога создания
const openCreateDialog = () => {
  editingTask.value = null
  dialog.value = true
}

// Открытие диалога редактирования
const openEditDialog = (task) => {
  editingTask.value = { ...task }
  dialog.value = true
}

// Закрытие диалога
const closeDialog = () => {
  dialog.value = false
  editingTask.value = null
}

// Обработка отправки формы (создание через Bitrix tasks.task.add)
const handleTaskSubmit = async (taskData) => {
  if (taskData.id) {
    await updateTask(taskData)
    closeDialog()
    showNotification('Задача успешно обновлена')
  } else {
    const taskId = await addTask(taskData)
    if (taskId) {
      closeDialog()
      showNotification('Задача успешно создана')
    } else {
      showNotification(error?.value ?? 'Не удалось создать задачу', 'error')
    }
  }
}

// Открытие диалога удаления
const deleteTask = (taskId) => {
  taskToDelete.value = taskId
  deleteDialog.value = true
}

// Подтверждение удаления
const confirmDelete = () => {
  if (taskToDelete.value) {
    removeTask(taskToDelete.value)
    showNotification('Задача удалена', 'error')
    deleteDialog.value = false
    taskToDelete.value = null
  }
}

// Перенос задачи на другую стадию (клик по секции в колонке «Стадия»)
const handleStageChange = async ({ taskId, stageId }) => {
  const ok = await updateTaskStage(taskId, stageId)
  if (ok) {
    showNotification('Задача перемещена на стадию')
  } else {
    showNotification(error?.value ?? 'Не удалось переместить задачу', 'error')
  }
}
</script>