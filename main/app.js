// app.js - main logic
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-client.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Utility
function qs(id){ return document.getElementById(id) }

// Auth helpers
export async function signup(){
  const email = qs('signupEmail').value.trim();
  const pass = qs('signupPassword').value;
  const confirm = qs('signupConfirm').value;
  const msgEl = document.querySelector('#authMsg');
  msgEl.textContent = '';
  if(pass !== confirm){ msgEl.textContent = 'Passwords do not match'; return; }
  const { error } = await supabase.auth.signUp({ email, password: pass });
  if(error) msgEl.textContent = error.message;
  else {
    msgEl.style.color = 'green';
    msgEl.textContent = 'Check your email to confirm. Redirecting...';
    setTimeout(()=> location.href = 'login.html', 1500);
  }
}

export async function login(){
  const email = qs('loginEmail').value.trim();
  const pass = qs('loginPassword').value;
  const msgEl = document.querySelector('#authMsg');
  msgEl.textContent = '';
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if(error) msgEl.textContent = error.message;
  else location.href = 'index.html';
}

export async function logout(){
  await supabase.auth.signOut();
  location.href = 'login.html';
}

// Page initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Attach logout if present
  const logoutBtn = qs('logoutBtn');
  if(logoutBtn) logoutBtn.addEventListener('click', logout);

  // If on index page, ensure user is logged in and load tasks
  if(location.pathname.endsWith('index.html') || location.pathname === '/' ){
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) return location.href = 'login.html';
    initIndex(user);
  }

  // If on login or signup, attach functions to window for inline calls
  if(location.pathname.endsWith('login.html')) window.login = login;
  if(location.pathname.endsWith('signup.html')) window.signup = signup;
  // Expose addTask for form
  window.addTask = addTask;
  window.clearForm = clearForm;
});

// Index page logic
async function initIndex(user){
  qs('topic').focus();
  await loadTasks(user.id);
  // Setup realtime subscription to tasks for live updates
  supabase.channel('public:tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
      loadTasks(user.id);
    })
    .subscribe();
}

// Add task
async function addTask(){
  const { value: dateVal } = { value: qs('dateTime').value };
  const task = {
    user_id: (await supabase.auth.getUser()).data.user.id,
    topic: qs('topic').value.trim(),
    subject: qs('subject').value.trim(),
    teacher: qs('teacher').value.trim(),
    date_time: dateVal ? new Date(dateVal).toISOString() : null,
    estimated_time: parseInt(qs('estimatedTime').value) || null,
    difficulty: parseInt(qs('difficulty').value) || 3,
    priority: qs('priority').value,
    task_type: qs('taskType').value.trim(),
    description: qs('description').value.trim()
  };
  const { error } = await supabase.from('tasks').insert([task]);
  if(error) return alert('Error: ' + error.message);
  clearForm();
  scheduleLocalNotifications(task);
}

// Clear form
function clearForm(){
  const formIds = ['topic','subject','teacher','dateTime','estimatedTime','difficulty','priority','taskType','description'];
  formIds.forEach(id => { const el = qs(id); if(el) el.value = ''; });
  qs('difficulty').value = 3;
  qs('priority').value = 'Medium';
}

// Load tasks
async function loadTasks(userId){
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('date_time', { ascending: true });

  const list = qs('taskList');
  if(!list) return;
  list.innerHTML = '';
  if(error) { list.innerHTML = `<div class="small">Error loading tasks</div>`; return; }
  if(!data || data.length === 0){ list.innerHTML = `<div class="small">No tasks yet</div>`; return; }

  data.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card';
    const dt = t.date_time ? new Date(t.date_time).toLocaleString() : 'No date';
    card.innerHTML = `
      <h3>${escapeHtml(t.topic || 'Untitled')}</h3>
      <div class="task-meta">
        <div class="small">${escapeHtml(t.subject || '')}</div>
        <div class="small">Teacher: ${escapeHtml(t.teacher || '-')}</div>
        <div class="small">When: ${dt}</div>
        <div class="small">Est: ${t.estimated_time || '-'} mins</div>
        <div class="small">Difficulty: ${t.difficulty || '-'}</div>
        <div class="small">Priority: ${escapeHtml(t.priority || '-')}</div>
      </div>
      <div class="small" style="margin-top:8px">${escapeHtml(t.description || '')}</div>
      <div class="task-actions">
        <button class="btn" onclick="deleteTask(${t.id})">Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

// Delete task
window.deleteTask = async function(id){
  if(!confirm('Delete this task?')) return;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if(error) alert('Error deleting: ' + error.message);
}

// Local notification scheduling (browser)
function scheduleLocalNotifications(task){
  if(!task.date_time) return;
  const target = new Date(task.date_time).getTime();
  const now = Date.now();
  const deltas = [
    { label: '1 day', ms: 24*60*60*1000 },
    { label: '1 hour', ms: 60*60*1000 },
    { label: '1 minute', ms: 60*1000 }
  ];
  deltas.forEach(d => {
    const when = target - d.ms;
    const delay = when - now;
    if(delay > 0 && delay < 2147483647){ // setTimeout limit
      setTimeout(()=> {
        showBrowserNotification(`Reminder: ${task.topic}`, `Due in ${d.label} at ${new Date(task.date_time).toLocaleString()}`);
      }, delay);
    }
  });
}

// Browser notification helper
function showBrowserNotification(title, body){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'granted'){
    new Notification(title, { body });
  } else if(Notification.permission !== 'denied'){
    Notification.requestPermission().then(p => {
      if(p === 'granted') new Notification(title, { body });
    });
  }
}

// Escape HTML
function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Expose logout for login page
window.logout = logout;
