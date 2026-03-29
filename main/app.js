// 1. CONFIGURATION - Replace with your keys from Supabase
const SUPABASE_URL = 'https://zdahbfsojemtyhsbpcji.supabase.co/';
const SUPABASE_KEY = 'sb_publishable_YO03kzP1YH9r_Bv3m5_9ng_dnBYt6Sx';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. AUTHENTICATION LOGIC
async function handleSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await _supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Check your email for the confirmation link!");
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else location.reload(); // Refresh to show dashboard
}

async function handleLogout() {
    await _supabase.auth.signOut();
    location.reload();
}

// Check if user is logged in on page load
_supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('auth-overlay').classList.add('hidden');
        document.getElementById('user-display').innerText = `Tracking for: ${session.user.email}`;
        loadDeadlines();
    }
});

// 3. DEADLINE LOGIC
function showAddModal() { document.getElementById('add-modal').classList.remove('hidden'); }
function closeAddModal() { document.getElementById('add-modal').classList.add('hidden'); }

async function submitDeadline() {
    const { data: { user } } = await _supabase.auth.getUser();
    const title = document.getElementById('task-title').value;
    const subject = document.getElementById('task-subject').value;
    const date = document.getElementById('task-date').value;

    const { error } = await _supabase.from('deadlines').insert([
        { title, subject, due_date: date, user_id: user.id }
    ]);

    if (error) alert(error.message);
    else {
        closeAddModal();
        loadDeadlines();
    }
}

async function loadDeadlines() {
    const { data, error } = await _supabase
        .from('deadlines')
        .select('*')
        .order('due_date', { ascending: true });

    const list = document.getElementById('deadline-list');
    if (data && data.length > 0) {
        list.innerHTML = data.map(item => `
            <div class="bg-white p-5 rounded-2xl border-l-4 border-blue-400 shadow-sm flex justify-between items-center">
                <div>
                    <span class="text-[10px] font-bold text-blue-500 uppercase tracking-wider">${new Date(item.due_date).toLocaleDateString()}</span>
                    <h3 class="font-bold text-lg">${item.title}</h3>
                    <p class="text-sm text-slate-500">${item.subject}</p>
                </div>
                <button onclick="deleteDeadline('${item.id}')" class="text-slate-300 hover:text-red-500 transition-colors">
                    <span class="material-icons-round">delete</span>
                </button>
            </div>
        `).join('');
    }
}

async function deleteDeadline(id) {
    await _supabase.from('deadlines').delete().eq('id', id);
    loadDeadlines();
}