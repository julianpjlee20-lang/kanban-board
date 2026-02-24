'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, X, Calendar, User, Flag, Paperclip, CheckSquare, Square } from 'lucide-react'
import { cn, getPriorityColor, getStatusColor } from '@/lib/utils'

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  projectId: string | null
  assigneeId: string | null
  project?: { id: string; name: string } | null
  assignee?: { id: string; name: string } | null
  subtasks?: { id: string; title: string; isCompleted: boolean }[]
  attachments?: { id: string; fileName: string }[]
}

type Project = { id: string; name: string }
type UserData = { id: string; name: string }

const COLUMNS = ['待辦', '進行中', '審核', '完成']

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showNewTask, setShowNewTask] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchData = useCallback(async () => {
    const [tasksRes, projectsRes, usersRes] = await Promise.all([
      fetch('/api/tasks'),
      fetch('/api/projects'),
      fetch('/api/users'),
    ])
    const tasksData = await tasksRes.json()
    const projectsData = await projectsRes.json()
    const usersData = await usersRes.json()
    setTasks(tasksData)
    setProjects(projectsData)
    setUsers(usersData)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('kanban-user')
    if (saved) setCurrentUser(saved)
    fetchData()
  }, [fetchData])

  const handleLogin = (name: string) => {
    setCurrentUser(name)
    localStorage.setItem('kanban-user', name)
  }

  const handleCreateProject = async (name: string) => {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    fetchData()
  }

  const handleCreateUser = async (name: string) => {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    fetchData()
  }

  const handleCreateTask = async (column: string) => {
    if (!newTaskTitle.trim()) return
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTaskTitle, status: column }),
    })
    setNewTaskTitle('')
    setShowNewTask(null)
    fetchData()
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    let newStatus = ''
    if (COLUMNS.includes(overId)) {
      newStatus = overId
    } else {
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask) newStatus = overTask.status
    }

    if (!newStatus) return

    const task = tasks.find((t) => t.id === taskId)
    if (task && task.status !== newStatus) {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchData()
    }
  }

  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setEditingTask(null)
    fetchData()
  }

  const handleDeleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    setEditingTask(null)
    fetchData()
  }

  const handleCreateSubtask = async (taskId: string, title: string) => {
    await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    fetchData()
  }

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: !isCompleted }),
    })
    fetchData()
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card p-8 rounded-lg w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">登入看板</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2 text-gray-400">選擇或輸入名稱</label>
              <input
                type="text"
                list="users"
                className="w-full bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
                placeholder="輸入你的名字"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value
                    if (value) handleLogin(value)
                  }
                }}
              />
              <datalist id="users">
                {users.map((u) => (
                  <option key={u.id} value={u.name} />
                ))}
              </datalist>
            </div>
            <button
              onClick={() => {
                const input = document.querySelector('input') as HTMLInputElement
                if (input?.value) handleLogin(input.value)
              }}
              className="w-full bg-primary hover:bg-primaryHover text-white py-2 rounded transition-colors"
            >
              登入
            </button>
          </div>
        </div>
      </div>
    )
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">公司內部看板</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">登入為：{currentUser}</span>
          <button
            onClick={() => setCurrentUser(null)}
            className="text-sm text-gray-400 hover:text-white"
          >
            登出
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-4 h-[calc(100vh-120px)]">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column)
            return (
              <div key={column} className="flex flex-col bg-card rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold">{column}</h2>
                  <span className="text-gray-400 text-sm">{columnTasks.length}</span>
                </div>
                <SortableContext
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 p-2 overflow-y-auto space-y-2">
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => setEditingTask(task)}
                        users={users}
                        projects={projects}
                      />
                    ))}
                    {showNewTask === column ? (
                      <div className="bg-cardHover p-3 rounded border border-primary">
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateTask(column)
                            if (e.key === 'Escape') setShowNewTask(null)
                          }}
                          placeholder="輸入任務標題"
                          className="w-full bg-background border border-border rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:border-primary"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCreateTask(column)}
                            className="bg-primary hover:bg-primaryHover text-white px-3 py-1 rounded text-sm"
                          >
                            新增
                          </button>
                          <button
                            onClick={() => setShowNewTask(null)}
                            className="text-gray-400 hover:text-white px-3 py-1 rounded text-sm"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </SortableContext>
                <button
                  onClick={() => setShowNewTask(column)}
                  className="p-3 flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-cardHover transition-colors border-t border-border"
                >
                  <Plus size={18} />
                  <span className="text-sm">新增任務</span>
                </button>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              users={users}
              projects={projects}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingTask && (
        <TaskModal
          task={editingTask}
          users={users}
          projects={projects}
          onClose={() => setEditingTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          onCreateSubtask={handleCreateSubtask}
          onToggleSubtask={handleToggleSubtask}
          onCreateProject={handleCreateProject}
          onCreateUser={handleCreateUser}
        />
      )}
    </div>
  )
}

function TaskCard({
  task,
  onClick,
  users,
  projects,
  isOverlay,
}: {
  task: Task
  onClick?: () => void
  users: UserData[]
  projects: Project[]
  isOverlay?: boolean
}) {
  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0
  const totalSubtasks = task.subtasks?.length || 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-cardHover p-3 rounded border-l-4 cursor-pointer hover:bg-opacity-80 transition-colors',
        getStatusColor(task.status),
        isOverlay && 'opacity-90 shadow-lg'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-sm line-clamp-2">{task.title}</h3>
        <span className={cn('text-xs px-2 py-0.5 rounded ml-2', getPriorityColor(task.priority))}>
          {task.priority}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-400">
        {task.project && <span className="truncate">{task.project.name}</span>}
        {task.assignee && (
          <span className="flex items-center gap-1">
            <User size={12} />
            {task.assignee.name}
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {new Date(task.dueDate).toLocaleDateString('zh-TW')}
          </span>
        )}
        {totalSubtasks > 0 && (
          <span className="flex items-center gap-1">
            <CheckSquare size={12} />
            {completedSubtasks}/{totalSubtasks}
          </span>
        )}
        {task.attachments && task.attachments.length > 0 && (
          <span className="flex items-center gap-1">
            <Paperclip size={12} />
            {task.attachments.length}
          </span>
        )}
      </div>
    </div>
  )
}

function TaskModal({
  task,
  users,
  projects,
  onClose,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onToggleSubtask,
  onCreateProject,
  onCreateUser,
}: {
  task: Task
  users: UserData[]
  projects: Project[]
  onClose: () => void
  onUpdate: (id: string, data: Partial<Task>) => void
  onDelete: (id: string) => void
  onCreateSubtask: (taskId: string, title: string) => void
  onToggleSubtask: (subtaskId: string, isCompleted: boolean) => void
  onCreateProject: (name: string) => void
  onCreateUser: (name: string) => void
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [status, setStatus] = useState(task.status)
  const [priority, setPriority] = useState(task.priority)
  const [projectId, setProjectId] = useState(task.projectId || '')
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '')
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '')
  const [newSubtask, setNewSubtask] = useState('')
  const [newProject, setNewProject] = useState('')
  const [newUser, setNewUser] = useState('')

  const handleSubmit = () => {
    onUpdate(task.id, {
      title,
      description,
      status,
      priority,
      projectId: projectId || null,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
    })
  }

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      onCreateSubtask(task.id, newSubtask)
      setNewSubtask('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">編輯任務</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm mb-1 text-gray-400">標題</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-400">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 text-gray-400">狀態</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
              >
                {COLUMNS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-400">優先級</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
              >
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 text-gray-400">建案</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  list="projects"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value && !projects.find((p) => p.name === e.target.value)) {
                      onCreateProject(e.target.value)
                    }
                  }}
                  placeholder="選擇或輸入"
                  className="flex-1 bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
                />
                <datalist id="projects">
                  {projects.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-400">負責人</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  list="assignees"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value && !users.find((u) => u.name === e.target.value)) {
                      onCreateUser(e.target.value)
                    }
                  }}
                  placeholder="選擇或輸入"
                  className="flex-1 bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
                />
                <datalist id="assignees">
                  {users.map((u) => (
                    <option key={u.id} value={u.name} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-400">截止日</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-400">子任務</label>
            <div className="space-y-2 mb-2">
              {task.subtasks?.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleSubtask(subtask.id, subtask.isCompleted)}
                    className="text-gray-400 hover:text-white"
                  >
                    {subtask.isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <span className={subtask.isCompleted ? 'line-through text-gray-500' : ''}>
                    {subtask.title}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                placeholder="新增子任務"
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleAddSubtask}
                className="bg-primary hover:bg-primaryHover px-3 py-2 rounded text-sm"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-between">
          <button
            onClick={() => onDelete(task.id)}
            className="text-red-500 hover:text-red-400 text-sm"
          >
            刪除任務
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-gray-400 hover:text-white"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="bg-primary hover:bg-primaryHover px-4 py-2 rounded text-white"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
