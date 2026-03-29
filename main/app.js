// 1. SUPABASE CONFIGURATION
const URL = 'https://zdahbfsojemtyhsbpcji.supabase.co/';
const KEY = 'sb_publishable_YO03kzP1YH9r_Bv3m5_9ng_dnBYt6Sx';
const _supabase = supabase.createClient(URL, KEY);

let isSignUp = true;

// 2. AUTHENTICATION LOGIC
function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('auth-title').innerText = isSignUp ? "Create Account" : "Welcome Back";
    document.getElementById('confirm-password').style.display = isSignUp ? "block" : "none";
    document.getElementById('auth-btn').innerText = isSignUp ? "Start Designing" : "Secure Login";
    document.getElementById('toggle-btn').innerText = isSignUp ? "Already a member? Login" : "New Architect? Sign Up";
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm-password').value;

    if (!email || !password) return alert("Credentials required.");

    if (isSignUp) {
        if (password !== confirm) return alert("Passwords do not match.");
        const { error } = await _supabase.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert("Check your email for the confirmation link!");
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else location.reload();
    }
}

async function logout() {
    await _supabase.auth.signOut();
    location.reload();
}

// Check session
_supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('auth-overlay').classList.add('hidden');
        loadTasks();
    }
});

// 3. TASK MANAGEMENT
function openModal() { document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

async function saveTask() {
    const { data: { user } } = await _supabase.auth.getUser();
    const title = document.getElementById('task-title').value;
    const subject = document.getElementById('task-subject').value;
    const due_date = document.getElementById('task-date').value;

    if (!title || !due_date) return alert("Title and Date are essential.");

    const { error } = await _supabase.from('deadlines').insert([{ 
        title, subject, due_date, user_id: user.id 
    }]);

    if (error) alert(error.message);
    else {
        closeModal();
        loadTasks();
        // Clear inputs
        document.getElementById('task-title').value = '';
        document.getElementById('task-subject').value = '';
    }
}

async function loadTasks() {
    const { data, error } = await _supabase.from('deadlines').select('*').order('due_date', { ascending: true });
    const grid = document.getElementById('deadline-grid');
    
    if (data && data.length > 0) {
        grid.innerHTML = data.map(task => {
            const date = new Date(task.due_date);
            const urgent = (date - new Date()) < 86400000; // < 24h
            const accent = urgent ? 'bg-orange-500' : 'bg-[#005da7]';

            return `
                <div class="glass-card p-8 flex justify-between items-center shadow-sm">
                    <div class="flex gap-6 items-center">
                        <div class="w-1.5 h-16 ${accent} rounded-full"></div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <h3 class="text-2xl font-headline font-extrabold text-slate-800 mt-1">${task.title}</h3>
                            <p class="text-sm font-semibold text-[#005da7] opacity-60">${task.subject || 'Standard Project'}</p>
                        </div>
                    </div>
                    <button onclick="deleteTask('${task.id}')" class="text-slate-200 hover:text-red-500 transition-all">
                        <span class="material-symbols-outlined text-3xl">check_circle</span>
                    </button>
                </div>
            `;
        }).join('');
    } else {
        grid.innerHTML = `<div class="col-span-full py-24 text-center text-slate-400 font-medium">The architect's schedule is currently clear.</div>`;
    }
}

async function deleteTask(id) {
    await _supabase.from('deadlines').delete().eq('id', id);
    loadTasks();
}

// Initial Date
document.getElementById('header-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });