import React, { useState } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'
import { Plus, Trash2, Pencil, X, CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react'

const PRIORITIES = [
  { value: 'urgent', label: '🔴 Urgent', color: 'var(--danger)' },
  { value: 'high', label: '🟠 High', color: '#f97316' },
  { value: 'medium', label: '🟡 Medium', color: 'var(--warning)' },
  { value: 'low', label: '🟢 Low', color: 'var(--success)' },
]

const ROOMS = ['General', 'Living Room', 'Kitchen', 'Bathroom', 'Bedroom', 'Garden', 'Garage', 'Hallway', 'Exterior', 'Other']

const DEFAULT_PROJECTS = [
  { id: 1, name: 'Painting & Decorating', room: 'General', emoji: '🎨', open: true, tasks: [
    { id: 101, text: 'Choose paint colours for living room', done: false, priority: 'medium', notes: '' },
    { id: 102, text: 'Sand and prep walls', done: false, priority: 'medium', notes: '' },
    { id: 103, text: 'Buy brushes and rollers', done: false, priority: 'low', notes: '' },
  ]},
  { id: 2, name: 'Garden', room: 'Garden', emoji: '🌿', open: false, tasks: [
    { id: 201, text: 'Mow lawn', done: false, priority: 'medium', notes: '' },
    { id: 202, text: 'Tidy borders and beds', done: false, priority: 'low', notes: '' },
    { id: 203, text: 'Sort out the shed', done: false, priority: 'low', notes: '' },
  ]},
]

const EMPTY_TASK = { text: '', priority: 'medium', notes: '' }

export default function HouseRenoPage({ renoData, setRenoData }) {
  const projects = renoData.projects || DEFAULT_PROJECTS
  function setProjects(fn) { setRenoData(prev => ({ ...prev, projects: typeof fn === 'function' ? fn(prev.projects || DEFAULT_PROJECTS) : fn })) }

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', room: 'General', emoji: '🏠' })
  const [addingTaskTo, setAddingTaskTo] = useState(null)
  const [taskForm, setTaskForm] = useState(EMPTY_TASK)
  const [editTask, setEditTask] = useState(null) // { projectId, taskId }
  const [editTaskForm, setEditTaskForm] = useState(EMPTY_TASK)

  const totalTasks = projects.reduce((a, p) => a + p.tasks.length, 0)
  const doneTasks = projects.reduce((a, p) => a + p.tasks.filter(t => t.done).length, 0)

  function toggleProject(id) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, open: !p.open } : p))
  }

  function addProject() {
    if (!newProject.name.trim()) return
    setProjects(prev => [...prev, { id: Date.now(), ...newProject, open: true, tasks: [] }])
    setNewProject({ name: '', room: 'General', emoji: '🏠' })
    setShowNewProject(false)
  }

  function deleteProject(id) { setProjects(prev => prev.filter(p => p.id !== id)) }

  function addTask(projectId) {
    if (!taskForm.text.trim()) return
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: [...p.tasks, { id: Date.now(), ...taskForm, done: false }] } : p))
    setTaskForm(EMPTY_TASK)
    setAddingTaskTo(null)
  }

  function toggleTask(projectId, taskId) {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) } : p))
  }

  function deleteTask(projectId, taskId) {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p))
  }

  function startEditTask(projectId, task) {
    setEditTask({ projectId, taskId: task.id })
    setEditTaskForm({ text: task.text, priority: task.priority, notes: task.notes || '' })
  }

  function saveEditTask() {
    if (!editTaskForm.text.trim()) return
    setProjects(prev => prev.map(p => p.id === editTask.projectId ? { ...p, tasks: p.tasks.map(t => t.id === editTask.taskId ? { ...t, ...editTaskForm } : t) } : p))
    setEditTask(null)
  }

  function priorityColor(p) { return PRIORITIES.find(x => x.value === p)?.color || 'var(--text-muted)' }

  return (
    <div>
      <PageHeader
        title="House Reno"
        subtitle="Projects, tasks, and the ever-growing to-do list"
        action={<Btn onClick={() => setShowNewProject(true)}><Plus size={14} /> New project</Btn>}
      />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[['Total tasks', totalTasks, 'var(--accent)'], ['Done', doneTasks, 'var(--success)'], ['Remaining', totalTasks - doneTasks, 'var(--warning)'], ['Projects', projects.length, 'var(--text-secondary)']].map(([label, val, color]) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 18px', minWidth: 100 }}>
            <p style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', color, lineHeight: 1 }}>{val}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{label}</p>
          </div>
        ))}
      </div>

      {showNewProject && (
        <Card style={{ marginBottom: '16px', border: '1px solid var(--accent-border)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>New project</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input value={newProject.emoji} onChange={e => setNewProject(p => ({ ...p, emoji: e.target.value }))} style={{ width: 56, textAlign: 'center', fontSize: '18px' }} />
            <input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} placeholder="Project name" style={{ flex: 1, minWidth: 160 }} autoFocus />
            <select value={newProject.room} onChange={e => setNewProject(p => ({ ...p, room: e.target.value }))} style={{ width: 140 }}>
              {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <Btn onClick={addProject}>Create project</Btn>
            <Btn variant="ghost" onClick={() => setShowNewProject(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {projects.map(project => {
          const done = project.tasks.filter(t => t.done).length
          const total = project.tasks.length
          const pct = total > 0 ? Math.round((done / total) * 100) : 0
          return (
            <Card key={project.id} style={{ padding: '0', overflow: 'hidden' }}>
              {/* Project header */}
              <div
                onClick={() => toggleProject(project.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer', background: project.open ? 'var(--bg-card)' : 'var(--bg-input)' }}
              >
                {project.open ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                <span style={{ fontSize: '18px' }}>{project.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{project.name}</p>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-badge)', padding: '1px 6px', borderRadius: '4px' }}>{project.room}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ flex: 1, maxWidth: 200, height: 4, background: 'var(--bg-badge)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--accent)', borderRadius: '2px' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{done}/{total} done</span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteProject(project.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}><Trash2 size={14} /></button>
              </div>

              {project.open && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                  {project.tasks.length === 0 && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>No tasks yet  -  add one below.</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    {project.tasks.map(task => (
                      <div key={task.id}>
                        {editTask?.projectId === project.id && editTask?.taskId === task.id ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '6px 8px', background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)' }}>
                            <input value={editTaskForm.text} onChange={e => setEditTaskForm(f => ({ ...f, text: e.target.value }))} style={{ flex: 1, fontSize: '13px', padding: '4px 8px' }} autoFocus onKeyDown={e => e.key === 'Enter' && saveEditTask()} />
                            <select value={editTaskForm.priority} onChange={e => setEditTaskForm(f => ({ ...f, priority: e.target.value }))} style={{ width: 110, fontSize: '12px', padding: '4px 6px' }}>
                              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                            <Btn size="sm" onClick={saveEditTask}>✓</Btn>
                            <Btn size="sm" variant="ghost" onClick={() => setEditTask(null)}>✕</Btn>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: task.done ? 'transparent' : 'var(--bg-input)', opacity: task.done ? 0.55 : 1 }}>
                            <button onClick={() => toggleTask(project.id, task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: task.done ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0 }}>
                              {task.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </button>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColor(task.priority), flexShrink: 0 }} />
                            <p style={{ flex: 1, fontSize: '13px', textDecoration: task.done ? 'line-through' : 'none', color: 'var(--text-primary)' }}>{task.text}</p>
                            {task.notes && <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.notes}</span>}
                            <button onClick={() => startEditTask(project.id, task)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '1px' }}><Pencil size={12} /></button>
                            <button onClick={() => deleteTask(project.id, task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '1px' }}><Trash2 size={12} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {addingTaskTo === project.id ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <input value={taskForm.text} onChange={e => setTaskForm(f => ({ ...f, text: e.target.value }))} placeholder="Task description…" style={{ flex: 1, minWidth: 160 }} autoFocus onKeyDown={e => e.key === 'Enter' && addTask(project.id)} />
                      <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} style={{ width: 120 }}>
                        {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      <Btn size="sm" onClick={() => addTask(project.id)}>Add</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => setAddingTaskTo(null)}>Cancel</Btn>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingTaskTo(project.id); setTaskForm(EMPTY_TASK) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                      <Plus size={13} /> Add task
                    </button>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
