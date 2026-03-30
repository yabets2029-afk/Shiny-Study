// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://zdahbfsojemtyhsbpcji.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_YO03kzP1YH9r_Bv3m5_9ng_dnBYt6Sx';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Management
let currentUser = null;

// 2. AUTHENTICATION LOGIC
async function handleSignUp(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) alert(error.message);
    else alert("Check your email for confirmation!");
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) alert(error.message);
    else checkUser();
}

async function handleLogout() {
    await supabase.auth.signOut();
    location.reload();
}

// 3. NAVIGATION & UI ROUTING
function showAuthPage(page) {
    document.getElementById('login-screen').classList.toggle('hidden', page !== 'login');
    document.getElementById('signup-screen').classList.toggle('hidden', page !== 'signup');
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    if(pageId === 'deadlines' || pageId === 'dashboard') fetchDeadlines();
    if(pageId === 'analytics') renderAnalytics();
}

// 4. DATABASE OPERATIONS (CRUD)
async function fetchDeadlines() {
    const { data, error } = await supabase
        .from('deadlines')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('due_date', { ascending: true });

    if (error) return console.error(error);
    renderDeadlinesUI(data);
}

async function addDeadline(e) {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const type = document.getElementById('task-type').value;
    const date = document.getElementById('task-date').value;

    const { error } = await supabase.from('deadlines').insert([
        { title, type, due_date: date, user_id: currentUser.id }
    ]);

    if (error) alert(error.message);
    else {
        closeModal();
        fetchDeadlines();
    }
}

// 5. RENDERING LOGIC
function renderDeadlinesUI(deadlines) {
    const todayList = document.getElementById('today-list');
    const allList = document.getElementById('all-deadlines-list');
    todayList.innerHTML = '';
    allList.innerHTML = '';

    deadlines.forEach(item => {
        const dueDate = new Date(item.due_date);
        const diff = (dueDate - new Date()) / (1000 * 60 * 60); // Difference in hours
        
        let urgencyClass = 'safe';
        if (diff < 24) urgencyClass = 'urgent';
        else if (diff < 72) urgencyClass = 'warning';

        const html = `
            <div class="deadline-item ${urgencyClass}">
                <div>
                    <strong>${item.title}</strong><br>
                    <small>${item.type} • ${dueDate.toLocaleString()}</small>
                </div>
                <button onclick="deleteTask('${item.id}')" class="btn-text" style="color:red">Delete</button>
            </div>
        `;

        allList.innerHTML += html;
        if (diff < 24 && diff > -24) todayList.innerHTML += html;
    });
}

function renderAnalytics() {
    supabase.from('deadlines').select('*', { count: 'exact' })
        .eq('user_id', currentUser.id)
        .then(({ count }) => {
            document.getElementById('stat-missed').innerText = count;
        });
}

async function deleteTask(id) {
    await supabase.from('deadlines').delete().eq('id', id);
    fetchDeadlines();
}

// 6. INITIALIZATION & AUTH STATE
async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('user-display-email').innerText = currentUser.email;
        fetchDeadlines();
    }
}

// Modal Helpers
function openModal() { document.getElementById('modal-overlay').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

// Event Listeners
document.getElementById('signup-form').addEventListener('submit', handleSignUp);
document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('logout-btn').addEventListener('click', handleLogout);
document.getElementById('deadline-form').addEventListener('submit', addDeadline);

// Run on load
checkUser();