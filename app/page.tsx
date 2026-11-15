 "use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type TaskStatus = "Not started" | "In progress" | "On hold" | "Completed";
type Update = { id: string; task_id: string; note: string; progress: number; created_at: string };
type Task = {
  id: string; user_id?: string; title: string; description: string;
  start_date: string; due_date: string; priority: "Low" | "Medium" | "High";
  status: TaskStatus; progress: number; created_at: string; updated_at: string;
  updates?: Update[];
};
const KEY = "taskflow.tasks.v1";
const STATUSES: TaskStatus[] = ["Not started", "In progress", "On hold", "Completed"];
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const demoTasks: Task[] = [
  { id:"demo-1", title:"Prepare project plan", description:"Define scope, owners and delivery milestones.", start_date:today(), due_date:"", priority:"High", status:"In progress", progress:45, created_at:new Date().toISOString(), updated_at:new Date().toISOString(), updates:[] },
  { id:"demo-2", title:"Review requirements", description:"Collect feedback from stakeholders.", start_date:today(), due_date:"", priority:"Medium", status:"Not started", progress:0, created_at:new Date().toISOString(), updated_at:new Date().toISOString(), updates:[] }
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"signin"|"signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [form, setForm] = useState({ title:"", description:"", start_date:today(), due_date:"", priority:"Medium" as Task["priority"], status:"Not started" as TaskStatus, progress:0 });

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({data}) => { setSession(data.session); setReady(true); });
      const { data } = supabase.auth.onAuthStateChange((_event, s) => { setSession(s); });
      return () => data.subscription.unsubscribe();
    }
    try {
      const saved = localStorage.getItem(KEY);
      setTasks(saved ? JSON.parse(saved) : demoTasks);
    } catch { setTasks(demoTasks); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!supabase && ready) localStorage.setItem(KEY, JSON.stringify(tasks));
  }, [tasks, ready]);

  useEffect(() => {
    if (!supabase || !session?.user) { if (!supabase) return; setTasks([]); return; }
    let active = true;
    (async () => {
      const { data, error } = await supabase!.from("tasks").select("*, updates:task_updates(*)").order("created_at", {ascending:false});
      if (active && !error) setTasks((data || []) as Task[]);
      if (active && error) setAuthMessage(error.message);
    })();
    return () => { active = false; };
  }, [session]);

  const saveTask = async (task: Task) => {
    if (supabase) {
      const { updates, ...row } = task;
      const { error } = await supabase.from("tasks").upsert(row);
      if (error) { alert(error.message); return; }
    }
    setTasks(prev => prev.some(t => t.id === task.id)
      ? prev.map(t => t.id === task.id ? task : t)
      : [task, ...prev]);
    setShowForm(false); setEditing(null);
  };
  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task and its update history?")) return;
    if (supabase) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) { alert(error.message); return; }
    }
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selected === id) setSelected(null);
  };
  const addUpdate = async (task: Task) => {
    if (!note.trim()) return;
    const update: Update = { id:uid(), task_id:task.id, note:note.trim(), progress:task.progress, created_at:new Date().toISOString() };
    if (supabase) {
      const { error } = await supabase.from("task_updates").insert({ task_id:task.id, note:update.note, progress:update.progress });
      if (error) { alert(error.message); return; }
    }
    setTasks(prev => prev.map(t => t.id === task.id ? {...t, updates:[update, ...(t.updates || [])]} : t));
    setNote("");
    if (supabase) {
      const { data } = await supabase.from("task_updates").select("*").eq("task_id", task.id).order("created_at", {ascending:false});
      if (data) setTasks(prev => prev.map(t => t.id === task.id ? {...t, updates:data} : t));
    }
  };
  const openNew = () => {
    setEditing(null); setForm({title:"",description:"",start_date:today(),due_date:"",priority:"Medium",status:"Not started",progress:0}); setShowForm(true);
  };
  const openEdit = (task: Task) => {
    setEditing(task); setForm({title:task.title,description:task.description || "",start_date:task.start_date || "",due_date:task.due_date || "",priority:task.priority,status:task.status,progress:task.progress}); setShowForm(true);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const now = new Date().toISOString();
    const task: Task = { ...form, id:editing?.id || uid(), title:form.title.trim(), created_at:editing?.created_at || now, updated_at:now, user_id:session?.user?.id, updates:editing?.updates || [] };
    await saveTask(task);
  };
  const signIn = async (e: FormEvent) => {
    e.preventDefault(); if (!supabase) return;
    setAuthMessage("");
    const result = authMode === "signup"
      ? await supabase.auth.signUp({email,password})
      : await supabase.auth.signInWithPassword({email,password});
    setAuthMessage(result.error?.message || (authMode === "signup" ? "Check your email to confirm your account, then sign in." : "Signed in."));
  };
  const visible = useMemo(() => tasks.filter(t => (filter === "All" || t.status === filter) && `${t.title} ${t.description}`.toLowerCase().includes(query.toLowerCase())), [tasks,filter,query]);
  const activeTask = tasks.find(t => t.id === selected);
  const completed = tasks.filter(t => t.status === "Completed").length;
  const avg = tasks.length ? Math.round(tasks.reduce((n,t)=>n+t.progress,0)/tasks.length) : 0;

  if (!ready) return <main className="loading">Loading TaskFlow…</main>;
  if (supabase && !session) return <main className="auth-shell"><div className="auth-card"><div className="brand-mark">✓</div><p className="eyebrow">TASKFLOW</p><h1>{authMode === "signin" ? "Welcome back" : "Create your account"}</h1><p className="muted">Sign in to manage your tasks from anywhere.</p><form onSubmit={signIn} className="stack"><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label><label>Password<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} /></label><button className="primary full">{authMode === "signin" ? "Sign in" : "Create account"}</button></form>{authMessage && <p className="message">{authMessage}</p>}<button className="text-button" onClick={()=>{setAuthMode(authMode==="signin"?"signup":"signin");setAuthMessage("");}}>{authMode==="signin"?"New here? Create an account":"Already registered? Sign in"}</button></div></main>;

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">✓</div><span>TaskFlow</span></div>
      <div className="side-label">WORKSPACE</div>
      <button className={`nav-item ${filter==="All"?"active":""}`} onClick={()=>setFilter("All")}><span>▦</span> All tasks <b>{tasks.length}</b></button>
      <button className={`nav-item ${filter==="In progress"?"active":""}`} onClick={()=>setFilter("In progress")}><span>◷</span> In progress</button>
      <button className={`nav-item ${filter==="Not started"?"active":""}`} onClick={()=>setFilter("Not started")}><span>○</span> Not started</button>
      <button className={`nav-item ${filter==="Completed"?"active":""}`} onClick={()=>setFilter("Completed")}><span>✓</span> Completed</button>
      <div className="sidebar-bottom"><div className="tip"><strong>Stay on track</strong><p>Small updates make big progress visible. Add a note whenever something changes.</p></div>{supabase && <button className="text-button" onClick={()=>supabase.auth.signOut()}>Sign out</button>}</div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Tasks overview</h1></div><button className="primary" onClick={openNew}>＋ New task</button></header>
      {!supabase && <div className="notice"><span>ⓘ</span> Demo mode: tasks are saved in this browser only. Connect Supabase to sync securely across devices and users.</div>}
      <div className="stats">
        <div className="stat-card"><span className="stat-icon purple">▦</span><div><p>Total tasks</p><strong>{tasks.length}</strong></div></div>
        <div className="stat-card"><span className="stat-icon blue">◷</span><div><p>In progress</p><strong>{tasks.filter(t=>t.status==="In progress").length}</strong></div></div>
        <div className="stat-card"><span className="stat-icon green">✓</span><div><p>Completed</p><strong>{completed}</strong></div></div>
        <div className="stat-card"><span className="stat-icon amber">↗</span><div><p>Overall progress</p><strong>{avg}%</strong></div></div>
      </div>
      <div className="content-grid">
        <section className="task-panel">
          <div className="panel-heading"><div><h2>{filter === "All" ? "All tasks" : filter}</h2><p className="muted">{visible.length} task{visible.length===1?"":"s"} in your workspace</p></div><div className="tools"><input className="search" placeholder="⌕  Search tasks…" value={query} onChange={e=>setQuery(e.target.value)} /><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div></div>
          {visible.length===0 ? <div className="empty"><div>✦</div><h3>No tasks found</h3><p>Create a task or change your search/filter.</p><button className="primary" onClick={openNew}>Create a task</button></div> :
          <div className="task-list">{visible.map(task=><article className={`task-row ${selected===task.id?"chosen":""}`} key={task.id} onClick={()=>setSelected(task.id)}>
            <div className="task-main"><div className="task-title-line"><h3>{task.title}</h3><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span></div><p>{task.description || "No description added."}</p><div className="task-meta"><span>◷ {task.start_date || "No start date"} → {task.due_date || "No due date"}</span><span className={`status ${task.status.toLowerCase().replace(" ","-")}`}>{task.status}</span></div><div className="progress-line"><div className="progress-track"><div style={{width:`${task.progress}%`}} /></div><b>{task.progress}%</b></div></div>
            <button className="more-button" title="Edit task" onClick={e=>{e.stopPropagation();openEdit(task);}}>•••</button>
          </article>)}</div>}
        </section>
        <aside className="detail-panel">
          {activeTask ? <><div className="detail-head"><div><p className="eyebrow">TASK DETAILS</p><h2>{activeTask.title}</h2></div><button className="icon-button" onClick={()=>deleteTask(activeTask.id)} title="Delete task">⌫</button></div><p className="detail-description">{activeTask.description || "No description added."}</p>
            <div className="detail-facts"><div><span>Status</span><select value={activeTask.status} onChange={async e=>{const t={...activeTask,status:e.target.value as TaskStatus,updated_at:new Date().toISOString()};await saveTask(t);}}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div><div><span>Priority</span><b>{activeTask.priority}</b></div><div><span>Timeline</span><b>{activeTask.start_date || "—"} → {activeTask.due_date || "—"}</b></div></div>
            <div className="progress-detail"><div className="section-title"><h3>Progress</h3><strong>{activeTask.progress}%</strong></div><input aria-label="Task progress" type="range" min="0" max="100" step="5" value={activeTask.progress} onChange={async e=>{const p=Number(e.target.value);const status:TaskStatus=p===100?"Completed":p===0?"Not started":"In progress";const t={...activeTask,progress:p,status,updated_at:new Date().toISOString()};setTasks(prev=>prev.map(x=>x.id===t.id?t:x));if(supabase){const {updates,...row}=t;const {error}=await supabase.from("tasks").update({progress:p,status,updated_at:t.updated_at}).eq("id",t.id);if(error)alert(error.message);}}} /><div className="range-labels"><span>0%</span><span>100%</span></div></div>
            <div className="updates"><div className="section-title"><h3>Progress updates</h3><span>{(activeTask.updates||[]).length}</span></div><form onSubmit={e=>{e.preventDefault();addUpdate(activeTask);}}><textarea placeholder="What changed? Add a progress note…" value={note} onChange={e=>setNote(e.target.value)} rows={3}/><button className="primary full" disabled={!note.trim()}>＋ Add update</button></form><div className="update-list">{(activeTask.updates||[]).map(u=><div className="update-item" key={u.id}><div className="update-dot"/><div><p>{u.note}</p><span>{new Date(u.created_at).toLocaleString()} · {u.progress}% complete</span></div></div>)}</div>{!(activeTask.updates||[]).length && <p className="muted small">No updates yet. Add the first one above.</p>}</div>
            <button className="secondary full" onClick={()=>openEdit(activeTask)}>Edit task details</button>
          </> : <div className="detail-empty"><div>↖</div><h3>Select a task</h3><p>Choose a task to see its timeline, update progress and add notes.</p></div>}
        </aside>
      </div>
      <footer>TaskFlow <span>·</span> Keep your work moving forward.</footer>
    </section>
    {showForm && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false);}}><form className="modal" onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">{editing?"UPDATE TASK":"GET STARTED"}</p><h2>{editing?"Edit task":"Create a new task"}</h2></div><button type="button" className="icon-button" onClick={()=>setShowForm(false)}>✕</button></div><label>Task name *<input autoFocus required maxLength={120} placeholder="e.g. Launch the new website" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Description<textarea rows={3} placeholder="Add context, deliverables or notes…" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="form-two"><label>Start date<input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></label><label>Due date<input type="date" min={form.start_date || undefined} value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label></div><div className="form-two"><label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value as Task["priority"]})}><option>Low</option><option>Medium</option><option>High</option></select></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as TaskStatus})}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label></div><label>Progress · {form.progress}%<input type="range" min="0" max="100" step="5" value={form.progress} onChange={e=>setForm({...form,progress:Number(e.target.value)})}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary">{editing?"Save changes":"Create task"}</button></div></form></div>}
  </main>;
}
