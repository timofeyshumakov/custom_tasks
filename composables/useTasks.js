import { ref, computed, onMounted } from 'vue'
import { mockTasks, mockUsers, mockProjects } from '../data/mockData'
import { callApi, getTaskStages, callTaskAdd, callTaskAddFile, callTaskChecklistItemAdd, callTaskUpdate, getCurrentUser, callCrmItemGet } from './callApi'

/** Моковый ID проекта для dev (когда приложение не открыто из размещения сделки). */
const MOCK_PROJECT_ID = 37

/** entityTypeId сделки смарт-процесса, из которой берётся ID проекта. */
const DEAL_ENTITY_TYPE_ID = 180

/** Поле сделки с ID проекта (группы задач). */
const DEAL_UF_PROJECT_FIELD = 'ufCrm7_1766589108798'

export const useTasks = () => {
  const tasks = ref([])
  const users = ref([])
  const projects = ref([])
  const stages = ref([])
  const currentUserId = ref(null)
  /** ID проекта (группы задач): из сделки по размещению или MOCK_PROJECT_ID в dev. */
  const projectId = ref(MOCK_PROJECT_ID)
  const loading = ref(false)
  const error = ref(null)
  
  // Фильтры
const filters = ref({
  // Основные фильтры
  search: '',
  status: null,
  priority: null,
  responsibleId: null,
  
  // Дополнительные фильтры
  groupId: null,
  createdBy: null,
  accomplices: [],
  auditors: [],
  tags: '',
  addInReport: null,
  onlyRootTasks: null,
  stageId: '',
  
  // Фильтры по датам
  createdDateFrom: '',
  createdDateTo: '',
  deadlineFrom: '',
  deadlineTo: '',
  closedDateFrom: '',
  closedDateTo: '',
  
  // Специальные фильтры
  overdue: false,
  
  // UI состояние
  showAdvanced: false
})
// Функция трансформации данных из API в формат приложения
const transformTaskFromApi = (apiTask) => {
  return {
    id: apiTask.id,
    parentId: apiTask.parentId,
    title: apiTask.title,
    description: apiTask.description,
    activityDate: apiTask.activityDate,
    deadline: apiTask.deadline,
    createdBy: apiTask.createdBy,
    responsibleId: apiTask.responsibleId,
    flowId: apiTask.flowId,
    createdDate: apiTask.createdDate,
    changedDate: apiTask.changedDate,
    closedDate: apiTask.closedDate,
    timeEstimate: apiTask.timeEstimate,
    stageId: apiTask.stageId,
    timeSpentInLogs: apiTask.timeSpentInLogs,
    dateStart: apiTask.dateStart,
    status: apiTask.status, // мета-статус для сортировки
    realStatus: apiTask.realStatus, // реальный статус
    groupId: apiTask.groupId,
    group: apiTask.group ? {
      id: apiTask.group.id,
      name: apiTask.group.name,
      opened: apiTask.group.opened,
      membersCount: apiTask.group.membersCount,
      image: apiTask.group.image,
      additionalData: apiTask.group.additionalData || []
    } : null,
    creator: apiTask.creator ? {
      id: apiTask.creator.id,
      name: apiTask.creator.name,
      link: apiTask.creator.link,
      icon: apiTask.creator.icon,
      workPosition: apiTask.creator.workPosition
    } : null,
    priority: apiTask.priority,
    mark: apiTask.mark,
    siteId: apiTask.siteId,
    addInReport: apiTask.addInReport === 'Y' || apiTask.addInReport === true,
    accomplices: apiTask.accomplices || [],
    auditors: apiTask.auditors || [],
    dependsOn: apiTask.dependsOn,
    forumTopicId: apiTask.forumTopicId,
    tags: apiTask.tags || [],
    statusChangedBy: apiTask.statusChangedBy,
    onlyRootTasks: apiTask.onlyRootTasks === 'Y' || apiTask.onlyRootTasks === true
  }
}
  // Функция загрузки задач с API
  const fetchTasks = async () => {
    loading.value = true
    error.value = null
    
    try {
      // Пример вызова API для получения задач
      const groupId = projectId.value || MOCK_PROJECT_ID
      const response = (await callApi('tasks.task.list', { GROUP_ID: groupId }, ['ID', 'TITLE', 'STATUS', 'ACTIVITY_DATE', 'GROUP_ID', 'DEADLINE', 'CREATED_BY', 'RESPONSIBLE_ID', 'FLOW_ID', 'CREATED_DATE', 'CHANGED_DATE', 'CLOSED_DATE', 'TIME_ESTIMATE', 'STAGE_ID', 'TIME_SPENT_IN_LOGS', 'DATE_START', 'AUDITORS', 'ACCOMPLICES'])).tasks;
             
      if (response.length > 0) {

        // Трансформация данных из формата Битрикс24 в наш формат
        tasks.value = response.map(item => transformTaskFromApi(item));
 console.log(response[0]);
      } else {
        // Если API не работает, используем моковые данные
        console.warn('API недоступно, используем моковые данные')
        tasks.value = [...mockTasks]
      }
    } catch (err) {
      console.error('Ошибка загрузки задач:', err)
      error.value = err.message
      // В случае ошибки используем моковые данные
      tasks.value = [...mockTasks]
    } finally {
      loading.value = false
    }
  }

  // Функция загрузки пользователей с API
  const fetchUsers = async () => {
    try {
      const response = await callApi('user.get', null, ["ID", "NAME", "LAST_NAME"])
            console.log(response)
      if (response.length > 0) {
        users.value = response.map(user => ({
          id: +user.ID,
          name: `${user.NAME} ${user.LAST_NAME}`,
          //email: user.EMAIL,
          //avatar: user.PERSONAL_PHOTO || null
        }))
      } else {
        users.value = [...mockUsers]
      }
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err)
      users.value = [...mockUsers]
    }
  }

  // Функция загрузки проектов с API
  const fetchProjects = async () => {
    try {
      const response = await callApi('crm.project.list', {
        select: ['ID', 'NAME', 'DESCRIPTION']
      })
      
      if (response && response.result) {
        projects.value = response.result.map(project => ({
          id: project.ID,
          name: project.NAME,
          description: project.DESCRIPTION
        }))
      } else {
        projects.value = [...mockProjects]
      }
    } catch (err) {
      console.error('Ошибка загрузки проектов:', err)
      projects.value = [...mockProjects]
    }
  }

  // Функция загрузки стадий канбана (task.stages.get). entityId — ID группы или 0 для «Моего плана»
  const fetchStages = async (entityId) => {
    const eid = entityId ?? projectId.value ?? MOCK_PROJECT_ID
    try {
      const list = await getTaskStages(eid)
      stages.value = list || []
    } catch (err) {
      console.error('Ошибка загрузки стадий:', err)
      stages.value = []
    }
  }

  // Текущий пользователь (user.current) — для подстановки исполнителя по умолчанию
  const fetchCurrentUser = async () => {
    try {
      const user = await getCurrentUser()
      currentUserId.value = user ? Number(user.ID) : null
    } catch (err) {
      console.error('Ошибка загрузки текущего пользователя:', err)
      currentUserId.value = null
    }
  }

  // ID проекта из сделки: BX24.placement.info().options.ID → crm.item.get(180, id) → ufCrm7_1766589108798
  const fetchProjectIdFromPlacement = async () => {
    try {
      if (typeof BX24 === 'undefined' || !BX24.placement?.info) return null
      const info = BX24.placement.info()
      const dealId = info?.options?.ID
      if (dealId == null) return null
      const item = await callCrmItemGet(DEAL_ENTITY_TYPE_ID, dealId)
      const id = item?.[DEAL_UF_PROJECT_FIELD] ?? item?.['UF_CRM_7_1766589108798']
      return id != null ? Number(id) : null
    } catch (err) {
      console.warn('Не удалось получить ID проекта из сделки (placement):', err)
      return null
    }
  }

  // Чтение файла в base64 (для загрузки в Битрикс)
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result
        const base64 = typeof dataUrl === 'string' && dataUrl.startsWith('data:')
          ? dataUrl.replace(/^data:[^;]+;base64,/, '')
          : ''
        resolve(base64)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  // Функция создания задачи (tasks.task.add). Даты передаются в формате ISO. Файлы и чек-листы прикрепляются после создания.
  const createTask = async (taskData) => {
    loading.value = true
    error.value = null

    const responsibleId = Array.isArray(taskData.assignedTo)
      ? taskData.assignedTo[0]
      : (taskData.assignedTo ?? taskData.responsibleId)
    if (!responsibleId) {
      error.value = 'Укажите исполнителя'
      loading.value = false
      return null
    }

    const firstStageId = stages.value[0]?.id
    const fields = {
      TITLE: taskData.title || '',
      DESCRIPTION: taskData.description || '',
      RESPONSIBLE_ID: Number(responsibleId),
      GROUP_ID: taskData.projectId ?? projectId.value ?? MOCK_PROJECT_ID
    }
    if (firstStageId != null && firstStageId !== '') {
      fields.STAGE_ID = firstStageId
    }

    // Даты в формате ISO (например 2023-12-31T23:59:59.000Z)
    if (taskData.dueDateTime) {
      const date = new Date(taskData.dueDateTime)
      if (!isNaN(date.getTime())) {
        fields.DEADLINE = date.toISOString()
      }
    }
    if (taskData.createdBy) {
      fields.CREATED_BY = Number(taskData.createdBy)
    }

    try {
      const result = await callTaskAdd(fields)
      const taskId = result?.task?.id
      if (!taskId) return null

      // Прикрепление файлов к задаче (task.item.addfile)
      const files = taskData.files || []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file && file.name) {
          try {
            const base64 = await readFileAsBase64(file)
            await callTaskAddFile(taskId, file.name, base64)
          } catch (e) {
            console.warn('Не удалось прикрепить файл:', file.name, e)
          }
        }
      }

      // Добавление пунктов чек-листа (task.checklistitem.add) — один чек-лист, только пункты
      const checklistItems = taskData.checklistItems || []
      for (const item of checklistItems) {
        const text = (item.text || '').trim()
        if (text) {
          try {
            await callTaskChecklistItemAdd(taskId, text, !!item.checked)
          } catch (e) {
            console.warn('Не удалось добавить пункт чек-листа:', e)
          }
        }
      }

      await fetchTasks()
      return taskId
    } catch (err) {
      console.error('Ошибка создания задачи:', err)
      error.value = err?.message || 'Ошибка создания задачи'
      return null
    } finally {
      loading.value = false
    }
  }

  // Функция обновления задачи
  const updateTask = async (taskData) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await callApi('tasks.task.update', {
        id: taskData.id,
        fields: {
          TITLE: taskData.title,
          DESCRIPTION: taskData.description,
          ASSIGNED_BY_ID: Array.isArray(taskData.assignedTo) ? taskData.assignedTo[0] : taskData.assignedTo,
          STATUS_ID: mapStatusToBitrix(taskData.status)
        }
      })
      
      if (response && response.result) {
        await fetchTasks()
        return true
      }
    } catch (err) {
      console.error('Ошибка обновления задачи:', err)
      error.value = err.message
      
      // Локальное обновление
      const index = tasks.value.findIndex(t => t.id === taskData.id)
      if (index !== -1) {
        tasks.value[index] = { ...tasks.value[index], ...taskData }
      }
      return false
    } finally {
      loading.value = false
    }
  }

  // Перенос задачи на стадию (tasks.task.update, только STAGE_ID)
  const updateTaskStage = async (taskId, stageId) => {
    if (!taskId || stageId == null) return false
    try {
      await callTaskUpdate(taskId, { STAGE_ID: String(stageId) })
      await fetchTasks()
      return true
    } catch (err) {
      console.error('Ошибка смены стадии:', err)
      error.value = err?.message || 'Не удалось переместить задачу'
      return false
    }
  }

  // Функция удаления задачи
  const deleteTask = async (taskId) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await callApi('tasks.task.delete', {
        id: taskId
      })
      
      if (response && response.result) {
        tasks.value = tasks.value.filter(t => t.id !== taskId)
        return true
      }
    } catch (err) {
      console.error('Ошибка удаления задачи:', err)
      error.value = err.message
      
      // Локальное удаление
      tasks.value = tasks.value.filter(t => t.id !== taskId)
      return false
    } finally {
      loading.value = false
    }
  }

  // Загрузка всех данных при инициализации
  const loadAllData = async () => {
    loading.value = true
    error.value = null
    
    try {
      // Параллельная загрузка всех данных
      const dealProjectId = await fetchProjectIdFromPlacement()
      if (dealProjectId != null) projectId.value = dealProjectId

      await Promise.all([
        fetchTasks(),
        fetchUsers(),
        fetchStages(),
        fetchCurrentUser(),
        //fetchProjects()
      ])

      console.log('Все данные успешно загружены')
    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
      error.value = err.message
      
      // В случае ошибки используем моковые данные
      tasks.value = [...mockTasks]
      users.value = [...mockUsers]
      projects.value = [...mockProjects]
    } finally {
      loading.value = false
    }
  }

  // Вычисляемые задачи с фильтрацией
  const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    // Поиск по названию и описанию
    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase()
      const titleMatch = task.title?.toLowerCase().includes(searchLower)
      const descMatch = task.description?.toLowerCase().includes(searchLower)
      if (!titleMatch && !descMatch) return false
    }
    
    // Фильтр по статусу
    if (filters.value.status && (task.realStatus || task.status) != filters.value.status) return false
    
    // Фильтр по приоритету
    if (filters.value.priority && task.priority != filters.value.priority) return false
    
    // Фильтр по исполнителю
    if (filters.value.responsibleId && task.responsibleId != filters.value.responsibleId) return false
    
    // Фильтр по группе/проекту
    if (filters.value.groupId && task.groupId != filters.value.groupId) return false
    
    // Фильтр по постановщику
    if (filters.value.createdBy && task.createdBy != filters.value.createdBy) return false
    
    // Фильтр по соисполнителям
    if (filters.value.accomplices?.length) {
      console.log(filters.value.accomplices);
      console.log(task.accomplices);
      const hasAccomplices = filters.value.accomplices.some(id => task.accomplices?.includes(String(id)))
      if (!hasAccomplices) return false
    }
    
    // Фильтр по наблюдателям
    if (filters.value.auditors?.length) {
      const hasAuditors = filters.value.auditors.some(id => task.auditors?.includes(id))
      if (!hasAuditors) return false
    }
    
    // Фильтр по тегам
    if (filters.value.tags) {
      const searchTags = filters.value.tags.split(',').map(t => t.trim().toLowerCase())
      const taskTags = task.tags?.map(t => t.toLowerCase()) || []
      const hasTag = searchTags.some(tag => taskTags.includes(tag))
      if (!hasTag) return false
    }
    
    // Фильтр "В отчете"
    if (filters.value.addInReport !== null && task.addInReport !== filters.value.addInReport) return false
    
    // Фильтр "Только корневые"
    if (filters.value.onlyRootTasks !== null && task.onlyRootTasks !== filters.value.onlyRootTasks) return false
    
    // Фильтр по стадии
    if (filters.value.stageId && task.stageId !== filters.value.stageId) return false
    
    // Фильтры по датам
    if (filters.value.createdDateFrom && new Date(task.createdDate) < new Date(filters.value.createdDateFrom)) return false
    if (filters.value.createdDateTo && new Date(task.createdDate) > new Date(filters.value.createdDateTo)) return false
    
    if (filters.value.deadlineFrom && new Date(task.deadline) < new Date(filters.value.deadlineFrom)) return false
    if (filters.value.deadlineTo && new Date(task.deadline) > new Date(filters.value.deadlineTo)) return false
    
    if (filters.value.closedDateFrom && (!task.closedDate || new Date(task.closedDate) < new Date(filters.value.closedDateFrom))) return false
    if (filters.value.closedDateTo && (!task.closedDate || new Date(task.closedDate) > new Date(filters.value.closedDateTo))) return false
    
    // Фильтр просроченных
    if (filters.value.overdue) {
      const isOverdue = task.deadline && new Date(task.deadline) < new Date() && 
                       (task.realStatus || task.status) != 5
      if (!isOverdue) return false
    }
    
    return true
  })
})


  // Сброс фильтров
  const resetFilters = () => {
  filters.value = {
    search: '',
    status: null,
    priority: null,
    responsibleId: null,
    groupId: null,
    createdBy: null,
    accomplices: [],
    auditors: [],
    tags: '',
    addInReport: null,
    onlyRootTasks: null,
    stageId: '',
    createdDateFrom: '',
    createdDateTo: '',
    deadlineFrom: '',
    deadlineTo: '',
    closedDateFrom: '',
    closedDateTo: '',
    overdue: false,
    showAdvanced: false
  }
}

  // Вспомогательные функции для маппинга статусов
  const mapBitrixStatus = (bitrixStatus) => {
    const statusMap = {
      'NEW': 'todo',
      'IN_PROGRESS': 'in-progress',
      'COMPLETED': 'done',
      'WON': 'done',
      'LOSE': 'todo'
    }
    return statusMap[bitrixStatus] || 'todo'
  }

  const mapStatusToBitrix = (status) => {
    const statusMap = {
      'todo': 'NEW',
      'in-progress': 'IN_PROGRESS',
      'done': 'COMPLETED'
    }
    return statusMap[status] || 'NEW'
  }

  const mapBitrixPriority = (bitrixPriority) => {
    const priorityMap = {
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low'
    }
    return priorityMap[bitrixPriority] || 'medium'
  }

  // Автоматическая загрузка данных при использовании composable
  loadAllData()

  return {
    tasks,
    users,
    projects,
    stages,
    projectId,
    currentUserId,
    filters,
    filteredTasks,
    loading,
    error,
    createTask,
    addTask: createTask,
    updateTask,
    updateTaskStage,
    deleteTask,
    resetFilters,
    fetchTasks,
    fetchUsers,
    fetchProjects,
    loadAllData,
    refresh: loadAllData // Алиас для обновления
  }
}