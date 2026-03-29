// 1. PROJECT CONFIGURATION
const SUPABASE_URL = 'https://zdahbfsojemtyhsbpcji.supabase.co/';
const SUPABASE_KEY = 'sb_publishable_YO03kzP1YH9r_Bv3m5_9ng_dnBYt6Sx';
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isSignUp = true;

// 2. AUTHENTICATION LOGIC
function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('auth-title').innerText = isSignUp ? "Create Account" : "Welcome Back";
    document.getElementById('confirm-password').classList.toggle('hidden');
    document.getElementById('auth-main-btn').innerText = isSignUp ? "Create Account" : "Login";
    document.getElementById('auth-toggle-btn').innerText = isSignUp ? "Already have an account? Login" : "New here? Create Account";
}

async function handleAuthAction() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm-password').value;

    if (!email || !password) return alert("Fill all fields.");

    if (isSignUp) {
        if (password !== confirm) return alert("Passwords do not match.");
        const { error } = await _sb.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert("Account created! Check your email.");
    } else {
        const { error } = await _sb.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else location.reload();
    }
}

async function handleLogout() {
    await _sb.auth.signOut();
    location.reload();
}

// Session Observer
_sb.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('auth-overlay').classList.add('hidden');
        renderDeadlines();
    }
});

// 3. DEADLINE MANAGEMENT
function openModal() { document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

async function saveNewDeadline() {
    const { data: { user } } = await _sb.auth.getUser();
    const title = document.getElementById('task-title').value;
    const subject = document.getElementById('task-subject').value;
    const due_date = document.getElementById('task-date').value;

    if (!title || !due_date) return alert("Project name and date are required.");

    const { error } = await _sb.from('deadlines').insert([{ 
        title, subject, due_date, user_id: user.id 
    }]);

    if (error) alert(error.message);
    else {
        closeModal();
        renderDeadlines();
    }
}

async function renderDeadlines() {
    const { data, error } = await _sb.from('deadlines').select('*').order('due_date', { ascending: true });
    const container = document.getElementById('deadline-container');
    
    if (data && data.length > 0) {
        container.innerHTML = data.map(item => {
            const date = new Date(item.due_date);
            const isUrgent = (date - new Date()) < 86400000; // < 24 hours
            const borderCol = isUrgent ? 'border-orange-500' : 'border-blue-500';

            return `
                <div class="bg-white p-6 rounded-3xl border-l-8 ${borderCol} shadow-sm group hover:shadow-xl transition-all">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">${date.toLocaleDateString()} @ ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <h3 class="text-xl font-bold mt-1 text-slate-800">${item.title}</h3>
                            <p class="text-sm font-medium text-blue-500">${item.subject || 'General'}</p>
                        </div>
                        <button onclick="deleteTask('${item.id}')" class="p-2 text-slate-200 hover:text-red-500 transition-colors">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400 font-medium">Your schedule is clear. Enjoy the focus.</div>`;
    }
}

async function deleteTask(id) {
    if(confirm("Mark this objective as complete/removed?")) {
        await _sb.from('deadlines').delete().eq('id', id);
        renderDeadlines();
    }
}

// Set Date
document.getElementById('date-now').innerText = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });