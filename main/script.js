// Initialization
const SUPABASE_URL = 'https://zdahbfsojemtyhsbpcji.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YO03kzP1YH9r_Bv3m5_9ng_dnBYt6Sx';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Elements
const authScreen = document.getElementById('auth-screen');
const dashScreen = document.getElementById('dash-screen');
const taskList = document.getElementById('task-list');
const logoutBtn = document.getElementById('logout-btn');
const authMsg = document.getElementById('auth-msg');

// --- AUTH LOGIC ---

// Login
document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) authMsg.innerText = error.message;
});

// Signup
document.getElementById('signup-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) authMsg.innerText = error.message;
    else authMsg.innerText = "Check your email for confirmation!";
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
});

// --- DATABASE LOGIC ---

async function loadTasks() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('deadlines')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) console.error(error);
    renderTasks(data || []);
}

function renderTasks(tasks) {
    taskList.innerHTML = tasks.length === 0 ? '<p>No deadlines! Add one above.</p>' : '';
    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-item ${task.status}`;
        div.innerHTML = `
            <div>
                <strong>${task.task_name}</strong><br>
                <small>${task.status.toUpperCase()}</small>
            </div>
            <button class="btn-done" onclick="deleteTask('${task.id}')">✖ Delete</button>
        `;
        taskList.appendChild(div);
    });
}

document.getElementById('add-task-btn').addEventListener('click', async () => {
    const name = prompt("Assignment/Task Name:");
    const status = prompt("Urgency (critical, soon, safe):", "soon");
    
    if (name && status) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('deadlines').insert([
            { task_name: name, status: status, user_id: user.id }
        ]);
        loadTasks();
    }
});

window.deleteTask = async (id) => {
    await supabase.from('deadlines').delete().eq('id', id);
    loadTasks();
};

// --- SESSION HANDLER ---
// This listens for login/logout and switches screens automatically
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        authScreen.classList.add('hidden');
        dashScreen.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        loadTasks();
    } else {
        authScreen.classList.remove('hidden');
        dashScreen.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        taskList.innerHTML = '';
    }
});