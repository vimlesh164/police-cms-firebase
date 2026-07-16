/* ==========================================
   SHAKTICOP WEB APPLICATION CLIENT ENGINE (app.js)
   ========================================== */

// 1. SUPABASE CLIENT & FALLBACK CONFIGURATION
let supabase = null;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean up trailing spaces or characters in VITE_SUPABASE_URL
const cleanUrl = supabaseUrl ? supabaseUrl.trim().replace(/\s+yeh\s+rkhu/i, '') : '';
const cleanKey = supabaseKey ? supabaseKey.trim() : '';

const isSupabaseConfigured = cleanUrl && cleanUrl !== 'https://your-project-id.supabase.co' && cleanKey && cleanKey !== 'your-anon-public-key';

if (isSupabaseConfigured) {
  supabase = window.supabase.createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
  console.log('✅ Supabase Client initialized. Project:', cleanUrl);
  // Verify connectivity on load
  (async () => {
    try {
      const { error } = await supabase.from('categories').select('id').limit(1);
      if (error) {
        console.error('⚠️ Supabase DB connectivity issue:', error.message);
        console.warn('⚠️ Falling back to LocalStorage for this session. Run schema v2 if tables are missing.');
      } else {
        console.log('✅ Supabase DB connectivity confirmed.');
      }
    } catch(e) {
      console.error('❌ Supabase network error:', e.message);
    }
  })();
} else {
  console.warn('⚠️ Supabase keys not configured. Running in Local Mock Storage Simulator mode.');
  console.info('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable Supabase backend.');
}

// 2. STATE VARIABLES
let currentSessionUser = null; // Holds { id, email, role, full_name }

// Helper to map status string to CSS class name dynamically
function getStatusClass(status) {
  if (!status) return 'status-pending';
  const s = status.toLowerCase();
  if (s.includes('pending') || s.includes('received') || s.includes('submitted')) return 'status-pending';
  if (s.includes('investigation') || s.includes('review') || s.includes('progress') || s.includes('under') || s.includes('dispatch')) return 'status-investigation';
  if (s.includes('assigned') || s.includes('scheduled')) return 'status-assigned';
  if (s.includes('resolved') || s.includes('completed')) return 'status-resolved';
  if (s.includes('closed') || s.includes('exported')) return 'status-closed';
  if (s.includes('rejected') || s.includes('cancelled')) return 'status-rejected';
  return 'status-pending';
}

let currentAdminTab = 'dash';
let currentUserDashTab = 'complaints';
let currentLang = localStorage.getItem('shaktiLang') || 'en';
let activePublicTab = 'shakti';
let mediaRecorder = null;
let audioChunks = [];
let recTimer = null;
let recSecs = 0;
let isRecording = false;
let hasRecording = false;
let activeRecordingBlob = null;

// Mock LocalStorage keys for Fallback Simulator
const MOCK_PROFILES = 'mock_profiles';
const MOCK_COMPLAINTS = 'mock_complaints';
const MOCK_ARS_REPORTS = 'mock_ars_reports';
const MOCK_MHD_REQUESTS = 'mock_mhd_requests';
const MOCK_COUNSELLING_BOOKINGS = 'mock_counselling_bookings';
const MOCK_EMPOWERMENT_APPLICATIONS = 'mock_empowerment_applications';
const MOCK_CALLBACK_REQUESTS = 'mock_callback_requests';
const MOCK_CITIZEN_PROFILES = 'mock_citizen_profiles';
const MOCK_EMERGENCY_REQUESTS = 'mock_emergency_requests';
const MOCK_MODULE_HISTORY = 'mock_module_history';
const MOCK_OFFICERS = 'mock_officers';
const MOCK_CONTACTS = 'mock_contacts';
const MOCK_SCHEMES = 'mock_schemes';
const MOCK_ANNOUNCEMENTS = 'mock_announcements';
const MOCK_NOTIFICATIONS = 'mock_notifications';
const MOCK_CATEGORIES = 'mock_categories';
const MOCK_LOGS = 'mock_logs';

const EMERGENCY_CONTACTS = [
  { department: 'Women Powerline', phone_number: '1090', icon: '🚺' },
  { department: 'Emergency', phone_number: '112', icon: '🚨' },
  { department: 'Ambulance', phone_number: '108', icon: '🚑' },
  { department: 'Fire', phone_number: '101', icon: '🚒' },
  { department: 'Cyber Crime', phone_number: '1930', icon: '💻' },
  { department: 'Child Helpline', phone_number: '1098', icon: '👶' },
  { department: 'CM Helpline', phone_number: '1076', icon: '🏛️' },
  { department: 'Anti Corruption', phone_number: '1064', icon: '⚖️' }
];

const DEFAULT_FEMALE_OFFICERS = [
  { name: 'SI Neha Singh', designation: 'Sub-Inspector', station: 'Civil Lines PS', district: 'Etawah', mobile: '9454402121', email: 'neha.singh@uppolice.gov.in', availability: true, type: 'police', photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200' },
  { name: 'ASI Pushpa Devi', designation: 'Assistant Sub-Inspector', station: 'Civil Lines PS', district: 'Etawah', mobile: '9454402122', email: 'pushpa.devi@uppolice.gov.in', availability: true, type: 'police', photo_url: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=200' },
  { name: 'SI Sarita Yadav', designation: 'Sub-Inspector', station: 'Jaswantnagar PS', district: 'Etawah', mobile: '9454402123', email: 'sarita.yadav@uppolice.gov.in', availability: true, type: 'police', photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200' },
  { name: 'ASI Poonam Shakya', designation: 'Assistant Sub-Inspector', station: 'Chakarnagar PS', district: 'Etawah', mobile: '9454402124', email: 'poonam.shakya@uppolice.gov.in', availability: true, type: 'police', photo_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=200' }
];

const DEFAULT_COUNSELLORS = [
  { name: 'Dr. Priya Sharma', designation: 'Chief Counsellor', mobile: '9454408989', email: 'priya.sharma@uppolice.gov.in', police_station: 'District Hospital', district: 'Etawah', availability: true, status: 'Active' },
  { name: 'Dr. Rekha Singh', designation: 'Family Counsellor', mobile: '9454408990', email: 'rekha.singh@uppolice.gov.in', police_station: 'One Stop Centre', district: 'Etawah', availability: true, status: 'Active' },
  { name: 'Ms. Anita Verma', designation: 'Legal Counsellor', mobile: '9454408991', email: 'anita.verma@uppolice.gov.in', police_station: 'Family Court', district: 'Etawah', availability: true, status: 'Active' }
];

// Pagination variables
let adminPageSize = 10;
let adminCurrentPages = {
  complaints: 1,
  ars: 1,
  mhd: 1,
  cns: 1,
  emp: 1,
  logs: 1,
  reports: 1
};

// 3. SEED SIMULATOR DATA (If running in local simulator mode)
function seedSimulatorIfNeeded() {
  if (isSupabaseConfigured) return;

  const storedContacts = localStorage.getItem(MOCK_CONTACTS);
  if (storedContacts) {
    try {
      const contacts = JSON.parse(storedContacts);
      const depts = contacts.map(c => c.department);
      if (depts.includes('Mahila Helpdesk') || depts.includes('Anti Romeo Squad') || depts.includes('Counselling Center') || contacts.length > 8) {
        localStorage.removeItem(MOCK_CONTACTS);
      }
    } catch(e) {
      localStorage.removeItem(MOCK_CONTACTS);
    }
  }
  
  if (!localStorage.getItem(MOCK_CATEGORIES)) {
    localStorage.setItem(MOCK_CATEGORIES, JSON.stringify([
      { id: '1', name: 'Harassment / Eve Teasing' },
      { id: '2', name: 'Domestic Violence' },
      { id: '3', name: 'Stalking' },
      { id: '4', name: 'Cyber Crime' },
      { id: '5', name: 'Dowry Harassment' },
      { id: '6', name: 'Workplace Harassment' },
      { id: '7', name: 'Other' }
    ]));
  }
  
  if (!localStorage.getItem(MOCK_CONTACTS)) {
    const list = EMERGENCY_CONTACTS.map((c, idx) => ({
      id: String(idx + 1),
      department: c.department,
      officer_name: 'Nodal Officer',
      designation: 'Emergency Helpline',
      phone_number: c.phone_number,
      photo_url: '',
      availability: true,
      priority: 10 - idx
    }));
    localStorage.setItem(MOCK_CONTACTS, JSON.stringify(list));
  }

  if (!localStorage.getItem(MOCK_OFFICERS)) {
    const list = DEFAULT_FEMALE_OFFICERS.map((o, idx) => ({
      id: 'off-' + (idx + 1),
      name: o.name,
      designation: o.designation,
      station: o.station,
      district: o.district,
      mobile: o.mobile,
      email: o.email,
      availability: true,
      type: 'police',
      photo_url: o.photo_url || ''
    }));
    // Add default counsellors as well for backward compatibility of officers table
    DEFAULT_COUNSELLORS.forEach((c, idx) => {
      list.push({
        id: 'off-cns-' + (idx + 1),
        name: c.name,
        designation: c.designation,
        station: c.police_station,
        district: c.district,
        mobile: c.mobile,
        email: c.email,
        availability: c.availability,
        type: 'counsellor',
        photo_url: ''
      });
    });
    localStorage.setItem(MOCK_OFFICERS, JSON.stringify(list));
  }

  if (!localStorage.getItem('mock_counsellors')) {
    const list = DEFAULT_COUNSELLORS.map((c, idx) => ({
      id: 'cns-' + (idx + 1),
      name: c.name,
      designation: c.designation,
      mobile: c.mobile,
      email: c.email,
      district: c.district,
      police_station: c.police_station,
      availability: c.availability,
      status: c.status,
      created_at: new Date().toISOString()
    }));
    localStorage.setItem('mock_counsellors', JSON.stringify(list));
  }

  if (!localStorage.getItem(MOCK_SCHEMES)) {
    localStorage.setItem(MOCK_SCHEMES, JSON.stringify([
      { id: '1', title: 'Mission Shakti', description: 'Women safety and empowerment protection drive across Uttar Pradesh.', eligibility: 'All women residing in UP', benefits: 'Immediate police response, safety patrols, self-defense camps.', website_link: 'https://uppolice.gov.in/', contact: '1090', image_url: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&q=80&w=400' },
      { id: '2', title: 'Self Defence Training', description: 'Police organized martial arts and practical self-defence workshops.', eligibility: 'Female residents aged 12-45', benefits: 'Free certification, physical conditioning, safety tactics.', website_link: 'https://uppolice.gov.in/', contact: '0522-2206100', image_url: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=400' },
      { id: '3', title: 'Jan Shikshan Sansthan', description: 'Empowering women through vocational skills and digital literacy courses.', eligibility: 'Literates and non-literates, priority to women', benefits: 'Free skill courses, MSDE certification, self-employment support.', website_link: 'https://jss.gov.in/', contact: '9454408780', image_url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400' },
      { id: '4', title: 'Kanya Sumangala Yojana', description: 'Financial assistance scheme offered in six stages from birth to graduation.', eligibility: 'Daughters of UP domicile families with income under 3 Lakhs', benefits: 'DBT transfer of up to Rs 25,000.', website_link: 'https://mksy.up.gov.in/', contact: '1800-180-5302', image_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=400' }
    ]));
  }

  if (!localStorage.getItem(MOCK_ANNOUNCEMENTS)) {
    localStorage.setItem(MOCK_ANNOUNCEMENTS, JSON.stringify([
      { id: '1', type: 'Emergency Broadcast', title: 'Anti-Romeo Patrol Intensified', content: 'Patrol squads active near all transit corridors in Etawah.', active: true },
      { id: '2', type: 'Notice', title: 'Self Defence Camps Registration Open', content: 'Apply through your student dashboard.', active: true }
    ]));
  }
}

// 4. GENERAL UI UTILITIES (TOASTS, DIALOGS, LOADER)
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    const freshContainer = document.createElement('div');
    freshContainer.id = 'toastContainer';
    freshContainer.style.position = 'fixed';
    freshContainer.style.top = '20px';
    freshContainer.style.right = '20px';
    freshContainer.style.zIndex = '9999';
    document.body.appendChild(freshContainer);
  }
  
  const box = document.createElement('div');
  box.className = `toast-box ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '🚨';
  
  box.innerHTML = `<div>${icon}</div><div>${message}</div><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  document.getElementById('toastContainer').appendChild(box);
  
  setTimeout(() => {
    box.classList.add('toast-fade-out');
    setTimeout(() => box.remove(), 400);
  }, 4000);
};

window.handleLogoError = function(img) {
  const fallback = img?.parentElement?.querySelector('.logo-fallback');
  img.style.display = 'none';
  if (fallback) fallback.hidden = false;
};

function setLoginLoading(isLoading) {
  const btn = document.getElementById('loginSubmitBtn');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle('is-loading', isLoading);
  const label = btn.querySelector('span');
  if (label) label.textContent = isLoading ? 'Signing in...' : 'Login / Sign Up';
}

// Modals that require the citizen to be logged in before they can be opened.
// Emergency SOS (modalDV) is intentionally excluded — it must never be delayed by a login wall.
const LOGIN_REQUIRED_MODALS = ['modalRegisterComplaint', 'modalHelpDesk', 'modalRomeo', 'modalCounsel', 'modalLegalAid', 'modalAudio', 'modalTravel', 'modalEmpowerApply'];
let pendingModalAfterLogin = null;
let pendingEmpowerScheme = null;
let currentCitizenProfile = null;

async function findOfficerMatch(field, value) {
  if (!value) return null;
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.from('officers').select('*').eq('type', 'police').ilike(field, value).limit(1);
      return (data && data[0]) || null;
    } catch (e) { console.warn('Officer lookup failed:', e); return null; }
  }
  const list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
  if (field === 'email') return list.find(o => o.type === 'police' && (o.email || '').toLowerCase() === value.toLowerCase()) || null;
  return list.find(o => o.type === 'police' && o.mobile === value) || null;
}

function citizenProfileIsComplete(p) {
  return !!(p && p.full_name && p.father_name && p.mobile && p.district && p.police_station && p.address);
}

async function fetchCitizenProfile(emailKey) {
  if (!emailKey) return null;
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('citizen_profiles').select('*').eq('id', emailKey).single();
      if (!error && data) return data;
    } catch (e) { console.warn('citizen_profiles fetch failed, checking local fallback:', e); }
  }
  const store = JSON.parse(localStorage.getItem(MOCK_CITIZEN_PROFILES) || '{}');
  return store[emailKey] || null;
}

async function saveCitizenProfileData(emailKey, profile) {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('citizen_profiles').upsert({ id: emailKey, ...profile }, { onConflict: 'id' });
      if (!error) return true;
      console.warn('citizen_profiles table missing/insert failed — saving locally instead. Create the table in Supabase to persist across devices:', error.message);
    } catch (e) { console.warn(e); }
  }
  const store = JSON.parse(localStorage.getItem(MOCK_CITIZEN_PROFILES) || '{}');
  store[emailKey] = profile;
  localStorage.setItem(MOCK_CITIZEN_PROFILES, JSON.stringify(store));
  return true;
}

window.populateProfileStations = function(district) {
  const stationSel = document.getElementById('cp-station');
  if (!stationSel) return;
  stationSel.innerHTML = '<option value="">Select Station</option>';
  if (!district) return;
  if (district === 'Etawah') {
    stationSel.innerHTML += `
      <option value="Civil Lines PS">Civil Lines PS</option>
      <option value="Jaswantnagar PS">Jaswantnagar PS</option>
      <option value="Chakarnagar PS">Chakarnagar PS</option>
    `;
  } else {
    stationSel.innerHTML += `
      <option value="Hazratganj PS">Hazratganj PS</option>
      <option value="Gomti Nagar PS">Gomti Nagar PS</option>
      <option value="Kalyanpur PS">Kalyanpur PS</option>
    `;
  }
};

window.submitCitizenProfile = async function() {
  if (!currentSessionUser) { showToast('Please login first.', 'warning'); return; }
  const profile = {
    full_name: document.getElementById('cp-name').value.trim(),
    father_name: document.getElementById('cp-father-name').value.trim(),
    mobile: document.getElementById('cp-mobile').value.trim(),
    district: document.getElementById('cp-district').value,
    police_station: document.getElementById('cp-station').value,
    address: document.getElementById('cp-address').value.trim()
  };
  if (!citizenProfileIsComplete(profile)) {
    showToast('Please fill all profile fields.', 'warning');
    return;
  }
  await saveCitizenProfileData(currentSessionUser.email, profile);
  currentCitizenProfile = profile;
  showToast('Profile saved successfully.', 'success');
  closeModal('modalCitizenProfile');

  const distEl = document.getElementById('citizenProfileDistrict');
  if (distEl) distEl.textContent = `${profile.full_name} — ${profile.district} District`;

  // If they were trying to file a complaint before completing their profile, take them there now
  if (pendingModalAfterLogin === 'modalRegisterComplaint') {
    const modalToOpen = pendingModalAfterLogin;
    pendingModalAfterLogin = null;
    setTimeout(() => window.openModal(modalToOpen), 300);
  }
};

// Autofill (Self) or clear (Other) the complaint form based on who the complaint is for
window.toggleComplaintVictimType = function(type) {
  const hint = document.getElementById('c-victim-hint');
  if (type === 'self' && currentCitizenProfile) {
    document.getElementById('c-name').value = currentCitizenProfile.full_name || '';
    document.getElementById('c-father-name').value = currentCitizenProfile.father_name || '';
    document.getElementById('c-mobile').value = currentCitizenProfile.mobile || '';
    document.getElementById('c-district').value = currentCitizenProfile.district || '';
    populateComplaintStations(currentCitizenProfile.district || '');
    setTimeout(() => { document.getElementById('c-station').value = currentCitizenProfile.police_station || ''; }, 30);
    if (hint) { hint.textContent = 'Your saved profile details have been filled in below — you can still edit them.'; hint.style.display = 'block'; }
  } else {
    document.getElementById('c-name').value = '';
    document.getElementById('c-father-name').value = '';
    document.getElementById('c-mobile').value = '';
    document.getElementById('c-district').value = '';
    populateComplaintStations('');
    if (hint) { hint.textContent = "Please fill in the details of the person you're filing this complaint for."; hint.style.display = 'block'; }
  }
};

window.openHeaderProfile = function() {
  if (!currentSessionUser) return;
  if (currentSessionUser.role === 'user') {
    window.openModal('modalCitizenProfile');
  } else if (currentSessionUser.role === 'officer') {
    showToast('Officer profile details (name, PNO, station) are managed by Admin. Use the Duty Status dropdown in your sidebar to update your availability.', 'info');
  } else {
    showToast('Admin profile settings will be available from the Settings menu.', 'info');
  }
};

window.openLoginAs = function(role) {
  window.openModal('modalLogin');
  if (typeof switchLoginRoleTab === 'function') switchLoginRoleTab(role);
};

window.openModal = async function(id) {
  if (LOGIN_REQUIRED_MODALS.includes(id) && !currentSessionUser) {
    pendingModalAfterLogin = id;
    showToast('Please login with your mobile number to continue with your request.', 'warning');
    window.openModal('modalLogin');
    if (typeof switchLoginRoleTab === 'function') switchLoginRoleTab('citizen');
    return;
  }

  if (id === 'modalRegisterComplaint' && currentSessionUser) {
    if (!currentCitizenProfile) currentCitizenProfile = await fetchCitizenProfile(currentSessionUser.email);
    if (!citizenProfileIsComplete(currentCitizenProfile)) {
      pendingModalAfterLogin = 'modalRegisterComplaint';
      showToast('Please complete your profile first — it only takes a minute.', 'warning');
      window.openModal('modalCitizenProfile');
      return;
    }
  }

  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    if (id === 'modalLogin') {
      setLoginLoading(false);
      setTimeout(() => document.getElementById('citizenMobile')?.focus(), 80);
    }
    if (id === 'modalRegisterComplaint') {
      checkActiveRequest('complaints', 'modalRegisterComplaint', 'complaintForm');
      setTimeout(() => window.toggleComplaintVictimType('self'), 50);
      setTimeout(() => window.captureLocation('c-location', 'c-loc-status', document.getElementById('c-loc-btn')), 300);
    }
    if (id === 'modalHelpDesk') {
      checkActiveRequest('mhd_requests', 'modalHelpDesk', 'helpDeskForm');
      setTimeout(() => window.captureLocation('hd-location', 'hd-loc-status', document.getElementById('hd-loc-btn')), 300);
    }
    if (id === 'modalRomeo') checkActiveRequest('ars_reports', 'modalRomeo', 'romeoForm');
    if (id === 'modalDV') {
      checkActiveRequest('emergency_requests', 'modalDV', 'dvForm');
      setTimeout(() => window.captureLocation('dv-location', 'dv-loc-status', document.getElementById('dv-loc-btn')), 200);
    }
    if (id === 'modalCounsel') checkActiveRequest('counselling_bookings', 'modalCounsel', 'counselForm');
    if (id === 'modalLegalAid') checkActiveRequest('callback_requests', 'modalLegalAid', 'legalAidForm');
    if (id === 'modalAudio') {
      checkActiveRequest('complaints', 'modalAudio', 'audioForm');
      setTimeout(() => window.captureLocation('aud-location', 'aud-loc-status', document.getElementById('aud-loc-btn')), 300);
    }
    if (id === 'modalTravel') checkActiveRequest('emergency_requests', 'modalTravel', 'travelForm');
    if (id === 'modalCitizenProfile') {
      setTimeout(() => { if (!document.getElementById('cp-address').value.trim()) window.captureProfileAddress(); }, 300);
    }
  }
};

window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
    if (id === 'modalLogin') {
      setLoginLoading(false);
      pendingCitizenOtp = null;
      pendingStaffOtp = null;
      pendingModalAfterLogin = null;
      pendingEmpowerScheme = null;
      ['citizenOtpEntryField', 'staffOtpEntryField'].forEach(fid => {
        const f = document.getElementById(fid);
        if (f) f.style.display = 'none';
      });
      ['citizenOtpStatusMsg', 'staffOtpStatusMsg'].forEach(sid => {
        const s = document.getElementById(sid);
        if (s) { s.textContent = ''; s.classList.remove('show'); }
      });
      ['citizenOtpForm', 'staffOtpForm', 'loginForm', 'forgotPasswordForm'].forEach(fid => {
        const f = document.getElementById(fid);
        if (f) f.reset();
      });
      closeForgotPassword();
      switchLoginRoleTab('citizen');
    }
  }
};

// Auto-bind close events on backdrop click
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', function(e) {
    if (e.target === ov) closeModal(ov.id);
  });
});


// ==========================================
// 5. TRANSLATION MODULE (BILINGUAL SUPPORT)
// ==========================================
const TRANSLATIONS = {
  en: {
    'topbar.women_helpline':'Women Helpline:','topbar.cyber_fraud':'Cyber Fraud:','topbar.emergency':'Emergency:',
    'header.tab_shakti':'Mission Shakti','header.tab_police':'Police Services','header.portal':'Portal','header.sos_btn':'SOS: 112',
    'hero.gov_up':'🌸 Mission Shakti 5.0 — Government of Uttar Pradesh',
    'hero.title':'Your Safety. Your Rights. Your Shakti.','hero.title_span':'Your Shakti.',
    'hero.desc':'Mission Shakti services, women helplines, counselling, shelter homes and police assistance — all in one place.',
    'hero.search_placeholder':'Search Mission Shakti services...',
    'stats.shakti_services':'Shakti Services','stats.districts':'Districts Covered','stats.stations':'Police Stations','stats.availability':'Availability',
    'emergency.title':'Emergency Helplines','sidebar.title':'Quick Navigation',
    'tab.shakti':'Mission Shakti','tab.police':'Police Services','logo.t2':'WOMEN SAFETY & EMPOWERMENT HUB'
  },
  hi: {
    'topbar.women_helpline':'महिला हेल्पलाइन:','topbar.cyber_fraud':'साइबर धोखाधड़ी:','topbar.emergency':'आपातकाल:',
    'header.tab_shakti':'मिशन शक्ति','header.tab_police':'पुलिस सेवाएं','header.portal':'पोर्टल','header.sos_btn':'SOS: 112',
    'hero.gov_up':'🌸 मिशन शक्ति 5.0 — उत्तर प्रदेश सरकार',
    'hero.title':'आपकी सुरक्षा। आपके अधिकार। आपकी शक्ति।','hero.title_span':'आपकी शक्ति।',
    'hero.desc':'मिशन शक्ति सेवाएं, महिला हेल्पलाइन, परामर्श, आश्रय गृह और पुलिस सहायता — सब एक ही स्थान पर।',
    'hero.search_placeholder':'मिशन शक्ति सेवाएं खोजें...',
    'stats.shakti_services':'शक्ति सेवाएं','stats.districts':'जिले कवर किए','stats.stations':'पुलिस थाने','stats.availability':'उपलब्धता',
    'emergency.title':'आपातकालीन हेल्पलाइन','sidebar.title':'त्वरित नेविगेशन',
    'tab.shakti':'मिशन शक्ति','tab.police':'पुलिस सेवाएं','logo.t2':'महिला सुरक्षा एवं सशक्तिकरण केंद्र'
  }
};

window.setGlobalLang = function(lang) {
  currentLang = lang;
  localStorage.setItem('shaktiLang', lang);
  // Update translator bar buttons
  const enBtn = document.getElementById('transEnBtn');
  const hiBtn = document.getElementById('transHiBtn');
  if (enBtn) { enBtn.classList.toggle('active', lang === 'en'); }
  if (hiBtn) { hiBtn.classList.toggle('active', lang === 'hi'); }
  // Apply instantly (no loading state, no rebuild flash)
  applyLanguage();
  // Admin/officer panels — translate key labels instantly via data-i18n
  applyAdminLanguage(lang);
};

function applyAdminLanguage(lang) {
  const isHi = lang === 'hi';
  const adminMap = {
    'a-stat-label-total': isHi ? 'कुल (सभी मॉड्यूल)' : 'Total (All Modules)',
    'a-stat-label-pending': isHi ? 'लंबित' : 'Pending',
    'a-stat-label-complete': isHi ? 'पूर्ण' : 'Complete',
    'a-stat-label-assigned': isHi ? 'अधिकारी नियुक्त' : 'Officer Assigned',
    'a-stat-label-rejected': isHi ? 'अस्वीकृत' : 'Rejected',
    'a-stat-label-rate': isHi ? 'समाधान दर' : 'Resolution Rate'
  };
  Object.entries(adminMap).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });
  // Translate all elements with data-i18n-admin attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const k = el.getAttribute('data-i18n');
    if (t[k]) el.textContent = t[k];
  });
}

window.toggleLanguage = function() {
  setGlobalLang(currentLang === 'en' ? 'hi' : 'en');
};

function applyLanguage() {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  
  const logoT2 = document.getElementById('logo-t2');
  const hs = document.getElementById('heroSearch');
  
  if (logoT2) logoT2.textContent = t['logo.t2'];
  if (hs) hs.placeholder = t['hero.search_placeholder'];
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (t[k]) el.textContent = t[k];
  });
  
  const langToggleBtn = document.getElementById('langToggleBtn');
  if (langToggleBtn) {
    langToggleBtn.textContent = currentLang === 'hi' ? '🌐 English' : '🌐 हिन्दी';
  }
  
  fetchEmergencyContacts();
  buildSidebar();
}


// ==========================================
// 6. DYNAMIC CARDS & PUBLIC VIEWS
// ==========================================
function buildSidebar() {
  const sidebarLinks = document.getElementById('sidebarLinks');
  if (!sidebarLinks) return;

  const shaktiSections = [
    { id: 'safety', label: currentLang === 'hi' ? 'सुरक्षा और आपातकाल' : 'Safety & Emergency', icon: '🌸', bg: '#fff0f6', count: '6 services', desc: currentLang === 'hi' ? 'SOS, हेल्पलाइन, FIR' : 'SOS, Helplines, FIR' },
    { id: 'support', label: currentLang === 'hi' ? 'सहायता और कानूनी' : 'Support & Legal', icon: '💬', bg: '#f3f0ff', count: '4 services', desc: currentLang === 'hi' ? 'काउंसलिंग, कानूनी सहायता' : 'Counselling, Legal Aid' },
    { id: 'welfare', label: currentLang === 'hi' ? 'कल्याण योजनाएं' : 'Welfare Schemes', icon: '🎀', bg: '#fff0f6', count: '4 services', desc: currentLang === 'hi' ? 'सरकारी लाभ, पेंशन' : 'Gov Benefits, Pension' }
  ];
  const policeSections = [
    { id: 'police_services', label: currentLang === 'hi' ? 'पुलिस सेवाएं' : 'Police Services', icon: '👮', bg: '#eef2ff', count: '10 services', desc: currentLang === 'hi' ? 'FIR, शिकायत, सत्यापन' : 'FIR, Complaint, Verify' }
  ];

  const list = activePublicTab === 'shakti' ? shaktiSections : policeSections;

  sidebarLinks.innerHTML = list.map(item => `
    <a href="#section-${item.id}" class="sidebar-nav-item" onclick="setSidebarActive(this); scrollToSection('section-${item.id}');return false;">
      <div class="sidebar-nav-icon" style="background:${item.bg};">${item.icon}</div>
      <div class="sidebar-nav-info">
        <div class="sidebar-nav-label">${item.label}</div>
        <div class="sidebar-nav-count">${item.count} · ${item.desc}</div>
      </div>
      <div class="sidebar-nav-arrow">›</div>
    </a>
  `).join('');
}

window.setSidebarActive = function(el) {
  document.querySelectorAll('.sidebar-nav-item').forEach(a => a.classList.remove('active'));
  el.classList.add('active');
};

window.switchTab = function(tab) {
  activePublicTab = tab;
  document.getElementById('nav-shakti').classList.toggle('active', tab === 'shakti');
  document.getElementById('nav-police').classList.toggle('active', tab === 'police');
  
  const navDash = document.getElementById('nav-dashboard');
  if (navDash) navDash.classList.toggle('active', tab === 'dashboard');

  const tShakti = document.getElementById('tab-shakti');
  const tPolice = document.getElementById('tab-police');
  if (tShakti) tShakti.classList.toggle('active', tab === 'shakti');
  if (tPolice) tPolice.classList.toggle('active', tab === 'police');

  const mainWrap = document.getElementById('publicMainWrap');
  const userDash = document.getElementById('userDashboard');
  const hero = document.getElementById('publicHero');
  const emerBar = document.getElementById('publicEmergencyBar');
  const announcementBar = document.getElementById('announcementBar');
  
  if (tab === 'dashboard') {
    if (mainWrap) mainWrap.style.display = 'none';
    if (hero) hero.style.display = 'none';
    if (emerBar) emerBar.style.display = 'none';
    if (userDash) {
      userDash.style.display = 'flex';
      fetchUserDashboardData();
    }
  } else {
    if (userDash) userDash.style.display = 'none';
    if (mainWrap) mainWrap.style.display = 'flex';
    if (hero) hero.style.display = 'block';
    if (emerBar) emerBar.style.display = 'block';
    
    buildSidebar();
    buildContent();
  }
  updateMobileNavState(tab);
};


window.scrollToSection = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};

function buildContent() {
  const container = document.getElementById('mainContent');
  if (!container) return;
  
  const categoriesList = activePublicTab === 'shakti' ? [
    {
      id: 'safety', label: 'Safety & Emergency Response', icon: '🌸', accent: '#a61e4d', iconBg: '#fff0f6',
      items: [
        { name: 'Women Powerline 1090', tag: '24x7 Helpline', desc: 'Dedicated women helpline. Immediate call callback assistance.', url: 'tel:1090', icon: '📞' },
        { name: 'Mahila Help Desk', tag: 'Nearest Police Station', desc: 'Direct access to designated female officers. Request callback.', action: "openModal('modalHelpDesk')", icon: '👮‍♀️' },
        { name: 'Anti-Romeo Squad', tag: 'Deploy Squad', desc: 'Report stalking or harassment. Rapid dispatch unit.', action: "openModal('modalRomeo')", icon: '🚔' },
        { name: 'Domestic Violence SOS', tag: 'Emergency Support', desc: 'Immediate dispatch and shelter support for abuse protection.', action: "openModal('modalDV')", icon: '🆘' },
        { name: 'Safe Travel Mode', tag: 'Live Tracking', desc: 'Share your route details. Automated police alert check.', action: "openModal('modalTravel')", icon: '🛡' },
        { name: 'Audio Complaint', tag: 'Voice FIR', desc: 'Register a complaint in your own voice natively.', action: "openModal('modalAudio')", icon: '🎙️' }
      ]
    },
    {
      id: 'support', label: 'Support & Legal Services', icon: '💬', accent: '#5f3dc4', iconBg: '#f3f0ff',
      items: [
        { name: 'Counselling Support', tag: 'Confidential', desc: 'Free counselling with licensed psychological experts.', action: "openModal('modalCounsel')", icon: '💬' },
        { name: 'Legal Aid Referral', tag: 'Free Assistance', desc: 'Referral for free lawyers on domestic acts and safety rules.', action: "openModal('modalLegalAid')", icon: '⚖️' },
        { name: 'Jan Shikshan Sansthan', tag: 'Vocational Training', desc: 'Free skills training and certifications for women.', action: "openEmpowerApplyModal('Jan Shikshan Sansthan')", icon: '🏫', oblique: true },
        { name: 'Self Defence Training', tag: 'Workshops', desc: 'Free safety workshops and self-defence certification.', action: "openEmpowerApplyModal('Self Defence Training')", icon: '🥋', oblique: true }
      ]
    },
    {
      id: 'welfare', label: 'Welfare Schemes', icon: '🎀', accent: '#d6336c', iconBg: '#fff0f6',
      items: [
        { name: 'Kanya Sumangala Yojana', tag: 'Financial Aid', desc: 'Direct benefit transfer for girl child education & health.', url: 'https://mksy.up.gov.in', target: '_blank', icon: '👶' },
        { name: 'Shadi Anudan Yojana', tag: 'Marriage Grant', desc: 'Financial assistance for marriages of daughters from poor families.', url: 'https://shadianudan.upsdc.gov.in', target: '_blank', icon: '💍' },
        { name: 'Vidhwa Pension Scheme', tag: 'Widow Pension', desc: 'Social security and pension for destitute widows in UP.', url: 'https://sspy-up.gov.in', target: '_blank', icon: '👵' },
        { name: 'Sakhi One Stop Centre', tag: 'Support Centre', desc: 'Integrated support services for women affected by violence.', url: 'https://missionshakti.up.gov.in', target: '_blank', icon: '🏢' }
      ]
    }
  ] : [
    {
      id: 'police_services', label: 'Police Services Portal', icon: '👮', accent: '#3b5bdb', iconBg: '#eef2ff',
      items: [
        { name: 'Register Safety Complaint', tag: 'Online Submission', desc: 'File your official complaint to database directly.', action: "openModal('modalRegisterComplaint')", icon: '📝' },
        { name: 'Track Complaint ID', tag: 'Realtime Tracker', desc: 'Track your complaint status and officer timeline.', action: "switchTab('dashboard')", icon: '🔍' },
        { name: 'Register Online FIR', tag: 'Online FIR', desc: 'Access the UP Police official FIR lodging portal.', url: "https://uppolice.gov.in/", icon: '📄' },
        { name: 'File E-FIR', tag: 'E-FIR Cell', desc: 'File an official e-FIR for lost articles or complaints instantly.', action: "openModal('modalRegisterComplaint')", icon: '📝' },
        { name: 'CEIR Mobile Block', tag: 'CEIR Portal', desc: 'Block or track your lost/stolen mobile device nationally.', url: "https://ceir.sancharsaathi.gov.in", icon: '📱' },
        { name: 'Report Cyber Crime', tag: 'Cyber Cell', desc: 'Report cyber financial fraud, hacking, or online harassment.', url: "https://cybercrime.gov.in", icon: '💻' },
        { name: 'Character Certificate', tag: 'Verification', desc: 'Apply online for character certificate and police verification.', url: "https://uppolice.gov.in/", icon: '🎖️' },
        { name: 'File Lost Report', tag: 'UPCOP Lost', desc: 'Report lost documents, mobile phones, or keys instantly.', url: "https://uppolice.gov.in/", icon: '🔍' },
        { name: 'Tenant Verification', tag: 'Verification', desc: 'File police verification for your tenant or domestic helper.', url: "https://uppolice.gov.in/", icon: '🏠' },
        { name: 'Passport Status', tag: 'Verification', desc: 'Track your passport application verification status online.', url: "https://uppolice.gov.in/", icon: '✈️' }
      ]
    }
  ];
  
  container.innerHTML = categoriesList.map(cat => `
    <section id="section-${cat.id}" class="cat-section" style="margin-bottom:40px;">
      <div class="cat-header">
        <div style="background:${cat.iconBg}; color:${cat.accent};" class="cat-icon">${cat.icon}</div>
        <h3>${cat.label}</h3>
        <div class="cat-count">${cat.items.length} Services</div>
      </div>
      <div class="card-grid">
        ${cat.items.map(item => {
          const clickHandler = item.url 
            ? (item.target === '_blank' ? `window.open('${item.url}', '_blank', 'noopener,noreferrer')` : `window.location.href='${item.url}'`) 
            : item.action;
          const linkText = item.target === '_blank' ? 'Open Portal' : 'Proceed';
          const obliqueBanner = '';
          return `
            <div class="svc-card" onclick="${clickHandler}" style="--card-accent: ${cat.accent}; --card-icon-bg: ${cat.iconBg}; --card-tag-bg: ${cat.iconBg}; --card-tag-color: ${cat.accent}; position:relative; overflow:hidden;">
              ${obliqueBanner}
              <div class="svc-card-top">
                <div class="svc-card-icon">${item.icon}</div>
                <span class="svc-tag">${item.tag}</span>
              </div>
              <div class="svc-name">${item.name}</div>
              <div class="svc-desc">${item.desc}</div>
              <div class="svc-link">
                ${linkText} <span style="margin-left:auto;">➔</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `).join('');
}

window.openEmpowerApplyModal = function(schemeName) {
  if (!currentSessionUser) {
    pendingModalAfterLogin = 'modalEmpowerApply';
    pendingEmpowerScheme = schemeName;
    showToast('Please login with your mobile number to apply for this scheme.', 'warning');
    window.openModal('modalLogin');
    if (typeof switchLoginRoleTab === 'function') switchLoginRoleTab('citizen');
    return;
  }
  const modal = document.getElementById('modalEmpowerApply');
  if (modal) {
    document.getElementById('emp-scheme-title').value = schemeName;
    document.getElementById('emp-program-display').value = schemeName;
    modal.classList.add('open');
    checkActiveRequest('empowerment_applications', 'modalEmpowerApply', 'empowerForm');
  }
};

function getEmerIcon(dept) {
  const d = dept.toLowerCase();
  if (d.includes('women') || d.includes('powerline')) return '🚺';
  if (d.includes('ambulance') || d.includes('108')) return '🚑';
  if (d.includes('fire') || d.includes('101')) return '🚒';
  if (d.includes('child') || d.includes('1098')) return '👶';
  if (d.includes('cyber') || d.includes('1930')) return '💻';
  if (d.includes('cm') || d.includes('1076')) return '🏛️';
  if (d.includes('corruption') || d.includes('1064')) return '⚖️';
  if (d.includes('emergency') || d.includes('112')) return '🚨';
  return '🚨';
}

// Fetch Helpline Contacts
async function fetchEmergencyContacts() {
  const container = document.getElementById('emerChips');
  if (!container) return;
  
  let list = [];
  try {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('contacts').select('*').order('priority', { ascending: false });
      list = data || [];
    } else {
      list = JSON.parse(localStorage.getItem(MOCK_CONTACTS) || '[]');
    }
  } catch (err) {
    console.error('fetchEmergencyContacts error:', err);
  }
  
  const officialHelplinesMap = {
    '1090': { department: 'Women Powerline', icon: '🚺' },
    '112': { department: 'Emergency', icon: '🚨' },
    '108': { department: 'Ambulance', icon: '🚑' },
    '101': { department: 'Fire', icon: '🚒' },
    '1930': { department: 'Cyber Crime', icon: '💻' },
    '1098': { department: 'Child Helpline', icon: '👶' },
    '1076': { department: 'CM Helpline', icon: '🏛️' },
    '1064': { department: 'Anti Corruption', icon: '⚖️' }
  };

  const allowedNumbers = ['1090', '112', '108', '101', '1930', '1098', '1076', '1064'];
  const seen = new Set();
  let filteredList = [];
  
  for (const c of list) {
    if (c && c.phone_number) {
      const num = c.phone_number.trim();
      if (allowedNumbers.includes(num) && !seen.has(num)) {
        seen.add(num);
        const official = officialHelplinesMap[num];
        filteredList.push({
          ...c,
          department: official.department,
          icon: official.icon
        });
      }
    }
  }
  
  if (filteredList.length === 0) {
    filteredList = EMERGENCY_CONTACTS;
  } else {
    // Fill in any missing ones from the official list if they were not in the database response
    for (const officialItem of EMERGENCY_CONTACTS) {
      if (!seen.has(officialItem.phone_number)) {
        filteredList.push(officialItem);
      }
    }
  }
  
  // Sort list to match the exact order of allowedNumbers
  filteredList.sort((a, b) => allowedNumbers.indexOf(a.phone_number) - allowedNumbers.indexOf(b.phone_number));
  
  container.innerHTML = filteredList.map(c => {
    const icon = getEmerIcon(c.department);
    return `
      <div class="emer-chip-card">
        <a href="tel:${c.phone_number}" class="emer-chip-main" aria-label="Call ${c.department} at ${c.phone_number}">
          <span class="emer-icon">${icon}</span>
          <div class="emer-details">
            <span class="emer-title">${c.department}</span>
            <strong class="num">${c.phone_number}</strong>
          </div>
          <div class="emer-call-btn">📞</div>
        </a>
        <button class="emer-copy-btn" onclick="navigator.clipboard.writeText('${c.phone_number}'); showToast('Number copied to clipboard!', 'success')" title="Copy Number">📋</button>
      </div>
    `;
  }).join('');
}

// Search utility
window.handleSearch = function(query) {
  const container = document.getElementById('searchResults');
  const mainContent = document.getElementById('mainContent');
  if (!container || !mainContent) return;
  
  if (!query.trim()) {
    container.style.display = 'none';
    mainContent.style.display = 'block';
    return;
  }
  
  mainContent.style.display = 'none';
  container.style.display = 'block';
  
  // Flatten items
  const allItems = [
    { name: 'Women Powerline 1090', tag: 'Helpline', url: 'tel:1090', desc: 'Dedicated women powerline.', icon: '📞' },
    { name: 'Mahila Help Desk', tag: 'Station Desk', action: "openModal('modalHelpDesk')", desc: 'Female officer assistance.', icon: '👮‍♀️' },
    { name: 'Anti-Romeo Squad', tag: 'Patrol', action: "openModal('modalRomeo')", desc: 'Anti Romeo deployment dispatch.', icon: '🚔' },
    { name: 'Domestic Violence SOS', tag: 'SOS', action: "openModal('modalDV')", desc: 'Distress rescue shelter support.', icon: '🆘' },
    { name: 'Safe Travel Monitor', tag: 'Travel', action: "openModal('modalTravel')", desc: 'Live travel monitor route share.', icon: '🛡' },
    { name: 'Audio Complaint Record', tag: 'Voice FIR', action: "openModal('modalAudio')", desc: 'Voice complaint recorder.', icon: '🎙️' },
    { name: 'Counselling Support', tag: 'Counselling', action: "openModal('modalCounsel')", desc: 'Confidential psychiatric support.', icon: '💬' },
    { name: 'Legal Aid Referral', tag: 'Legal', action: "openModal('modalLegalAid')", desc: 'Free panels lawyers.', icon: '⚖️' },
    { name: 'Jan Shikshan Sansthan JSS', tag: 'Vocational', action: "openEmpowerApplyModal('Jan Shikshan Sansthan')", desc: 'Vocational courses training JSS.', icon: '🏫' },
    { name: 'Self Defence Workshops', tag: 'Workshops', action: "openEmpowerApplyModal('Self Defence Training')", desc: 'Self defence training workshops.', icon: '🥋' }
  ];
  
  const matches = allItems.filter(item => 
    item.name.toLowerCase().includes(query.toLowerCase()) || 
    item.desc.toLowerCase().includes(query.toLowerCase()) ||
    item.tag.toLowerCase().includes(query.toLowerCase())
  );
  
  if (matches.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted)">No matching services found for "${query}"</div>`;
  } else {
    container.innerHTML = `
      <h3 style="margin-bottom:20px;">Search Results for "${query}"</h3>
      <div class="card-grid">
        ${matches.map(item => `
          <div class="svc-card" onclick="${item.url ? `window.location.href='${item.url}'` : item.action}" style="--card-accent: #3b5bdb; --card-icon-bg: #eef2ff; --card-tag-bg: #eef2ff; --card-tag-color: #3b5bdb;">
            <div class="svc-card-top">
              <div class="svc-card-icon">${item.icon}</div>
              <span class="svc-tag">${item.tag}</span>
            </div>
            <div class="svc-name">${item.name}</div>
            <div class="svc-desc">${item.desc}</div>
            <div class="svc-link">
              Proceed <span style="margin-left:auto;">➔</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};


// ==========================================
// 7. SECURITY & ACCESS CONTROL
// ==========================================
window.openForgotPassword = function() {
  const loginForm = document.getElementById('loginForm');
  const forgotForm = document.getElementById('forgotPasswordForm');
  if (loginForm) loginForm.style.display = 'none';
  if (forgotForm) forgotForm.style.display = 'block';
  setTimeout(() => document.getElementById('forgotEmail')?.focus(), 60);
};

window.closeForgotPassword = function() {
  const loginForm = document.getElementById('loginForm');
  const forgotForm = document.getElementById('forgotPasswordForm');
  if (forgotForm) { forgotForm.style.display = 'none'; forgotForm.reset(); }
  if (loginForm) loginForm.style.display = 'block';
  const status = document.getElementById('forgotPasswordStatus');
  if (status) { status.textContent = ''; status.classList.remove('show'); }
};

window.submitForgotPassword = async function() {
  const email = document.getElementById('forgotEmail').value.trim();
  const status = document.getElementById('forgotPasswordStatus');
  if (!email) return;

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        if (status) { status.textContent = `Could not send reset link: ${error.message}`; status.classList.add('show', 'error'); }
      } else {
        if (status) { status.textContent = `✅ Reset link sent to ${email} (check inbox/spam).`; status.classList.add('show'); status.classList.remove('error'); }
        showToast('Password reset link sent to your email.', 'success');
      }
    } catch (e) {
      if (status) { status.textContent = `Reset failed: ${e.message}`; status.classList.add('show', 'error'); }
    }
  } else {
    if (status) {
      status.innerHTML = `Demo mode — no real email is sent. Use the fixed demo credentials shown on the login screen, or ask your Supabase admin to enable email-based password reset for production use.`;
      status.classList.add('show', 'error');
    }
  }
};

window.handleLoginSubmit = async function() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  
  if (!email || !password) return;
  setLoginLoading(true);
  
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showToast(`Login failed: ${error.message}`, 'error');
        setLoginLoading(false);
        return;
      }

      const officerMatch = await findOfficerMatch('email', email);
      if (officerMatch) {
        currentSessionUser = { id: data.user.id, email, role: 'officer', officerId: officerMatch.id };
        showToast(`Logged in as Officer ${officerMatch.name}.`, 'success');
        postLoginAction();
        return;
      }

      let { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (profile && profile.role === 'admin') {
        currentSessionUser = { id: data.user.id, email, role: 'admin' };
        showToast('Logged in as Admin.', 'success');
        postLoginAction();
      } else {
        showToast('This account is not registered as Admin or Officer. Citizens should use the Citizen Login tab.', 'error');
        await supabase.auth.signOut();
        setLoginLoading(false);
      }
    } catch (err) {
      showToast(`Login failed: ${err.message}`, 'error');
      console.error('Login error:', err);
      setLoginLoading(false);
    }
  } else {
    // Simulator Login (Admin / Officer only — citizens use the Citizen Login tab)
    const effectiveAdminPassword = localStorage.getItem('shakti_admin_password_override') || 'admin@098';
    if (email.toLowerCase() === 'adarsh004455@gmail.com' && password === effectiveAdminPassword) {
      currentSessionUser = { id: 'admin-id-local', email, role: 'admin' };
      showToast("Logged in as Admin (Local Mock Simulator).", "success");
      postLoginAction();
    } else if (password === 'officer@123') {
      const officerMatch = await findOfficerMatch('email', email);
      if (officerMatch) {
        currentSessionUser = { id: 'officer-' + officerMatch.id, email, role: 'officer', officerId: officerMatch.id };
        showToast(`Logged in as Officer ${officerMatch.name} (Local Mock Simulator).`, "success");
        postLoginAction();
      } else {
        showToast("No officer profile found with this email. Ask your admin to add your email to your officer profile first.", "error");
        setLoginLoading(false);
      }
    } else {
      showToast("Invalid credentials. Officer: your registered email + password officer@123. Admin: adarsh004455@gmail.com + admin@098. Citizens should use the Citizen Login tab instead.", "error");
      setLoginLoading(false);
    }
  }
};

function postLoginAction() {
  closeModal('modalLogin');
  document.getElementById('loginBtnGroup').style.display = 'none';
  
  const userBadge = document.getElementById('userBadge');
  const userBadgeText = document.getElementById('userBadgeText');
  
  if (userBadge && userBadgeText) {
    userBadge.style.display = 'flex';
    userBadgeText.textContent = currentSessionUser.email;
  }
  if (currentSessionUser.role === 'user') {
    const bellWrap = document.getElementById('notifBellWrap');
    if (bellWrap) bellWrap.style.display = 'block';
  }
  updateMobileUserChrome();
  
  const navDash = document.getElementById('nav-dashboard');
  if (navDash) navDash.style.display = 'inline-block';
  
  if (currentSessionUser.role === 'admin') {
    // Switch to admin workspace
    document.getElementById('publicSiteWrapper').style.display = 'none';
    document.getElementById('adminWorkspace').style.display = 'flex';
    // Set dynamic admin profile
    const adminName = document.getElementById('adminProfileName');
    const adminRole = document.getElementById('adminProfileRole');
    if (adminName) adminName.textContent = currentSessionUser.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (adminRole) adminRole.textContent = 'System Administrator — Etawah';
    // Set backend mode badge
    const badge = document.getElementById('backendModeBadge');
    if (badge) {
      badge.textContent = isSupabaseConfigured ? '✅ Supabase Connected' : '⚠️ LocalStorage Mode';
      badge.style.background = isSupabaseConfigured ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
      badge.style.color = isSupabaseConfigured ? '#10b981' : '#ef4444';
      badge.style.border = isSupabaseConfigured ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
    }
    switchAdminTab('dash');
    applySavedAdminAppearance();
    loadAdminProfileDisplay();
    startAdminLiveClock();
    updateTopbarQuickStats();
    fetchAdminNotifications();
    subscribeRealtimeEventsAdmin();
  } else if (currentSessionUser.role === 'officer') {
    // Switch to officer portal workspace
    document.getElementById('publicSiteWrapper').style.display = 'none';
    document.getElementById('officerWorkspace').style.display = 'flex';
    const badge = document.getElementById('officerBackendModeBadge');
    if (badge) {
      badge.textContent = isSupabaseConfigured ? '✅ Supabase Connected' : '⚠️ LocalStorage Mode';
      badge.style.background = isSupabaseConfigured ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
      badge.style.color = isSupabaseConfigured ? '#10b981' : '#ef4444';
      badge.style.border = isSupabaseConfigured ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
    }
    loadOfficerSelfProfile();
    applySavedAdminAppearance();
  } else {
    switchTab('shakti');
    subscribeRealtimeEventsUser();
    // Refresh notifications for logged-in citizen
    setTimeout(fetchUserNotifications, 500);
    // Restore any active travel journeys and SOS button
    const activeJ = getActiveJourneys().filter(j => j.userEmail === currentSessionUser.email);
    activeJ.forEach(j => startTravelAutoCloseTimer(j.id, j.createdAt));
    checkTravelSOSFloat();
    setTimeout(renderActiveTravelCards, 300);

    // Warm the citizen profile cache so complaint autofill and the gate work immediately
    (async () => {
      currentCitizenProfile = await fetchCitizenProfile(currentSessionUser.email);
      const distEl = document.getElementById('citizenProfileDistrict');
      if (distEl && currentCitizenProfile) {
        distEl.textContent = `${currentCitizenProfile.full_name || currentSessionUser.email} — ${currentCitizenProfile.district || ''} District`;
      }
    })();

    // If the citizen was trying to open a request form before being asked to login, take them straight there
    if (pendingModalAfterLogin) {
      const modalToOpen = pendingModalAfterLogin;
      const schemeToApply = pendingEmpowerScheme;
      pendingModalAfterLogin = null;
      pendingEmpowerScheme = null;
      setTimeout(() => {
        if (modalToOpen === 'modalEmpowerApply' && schemeToApply) {
          window.openEmpowerApplyModal(schemeToApply);
        } else {
          window.openModal(modalToOpen);
        }
      }, 400);
    }
  }
  
  // Load announcements bar for all users
  loadAnnouncementBar();
}

// ==========================================
// LOGIN MODULE — Citizen (mobile+OTP only) vs Admin/Officer (email+password or OTP)
// ==========================================
let pendingCitizenOtp = null; // { mobile, code, mode, expiresAt }
let pendingStaffOtp = null;   // { mobile, code, mode, expiresAt }

window.switchLoginRoleTab = function(role) {
  const citizenPanel = document.getElementById('citizenLoginPanel');
  const staffPanel = document.getElementById('staffLoginPanel');
  const modalTitle = document.getElementById('loginModalTitle');
  if (!citizenPanel || !staffPanel) return;

  if (role === 'staff') {
    staffPanel.style.display = 'block';
    citizenPanel.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Admin / Officer Login';
    setTimeout(() => document.getElementById('loginEmail')?.focus(), 80);
  } else {
    citizenPanel.style.display = 'block';
    staffPanel.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Citizen Login';
    setTimeout(() => document.getElementById('citizenMobile')?.focus(), 80);
  }
};

window.switchStaffMethodTab = function(method) {
  closeForgotPassword();
  const emailBtn = document.getElementById('staffMethodEmailBtn');
  const mobileBtn = document.getElementById('staffMethodMobileBtn');
  const emailForm = document.getElementById('loginForm');
  const otpForm = document.getElementById('staffOtpForm');
  if (!emailBtn || !mobileBtn || !emailForm || !otpForm) return;

  if (method === 'mobile') {
    mobileBtn.classList.add('active'); mobileBtn.setAttribute('aria-selected', 'true');
    emailBtn.classList.remove('active'); emailBtn.setAttribute('aria-selected', 'false');
    otpForm.style.display = 'block';
    emailForm.style.display = 'none';
    setTimeout(() => document.getElementById('staffMobile')?.focus(), 80);
  } else {
    emailBtn.classList.add('active'); emailBtn.setAttribute('aria-selected', 'true');
    mobileBtn.classList.remove('active'); mobileBtn.setAttribute('aria-selected', 'false');
    emailForm.style.display = 'block';
    otpForm.style.display = 'none';
    setTimeout(() => document.getElementById('loginEmail')?.focus(), 80);
  }
};

function issueDemoOtp(mobile, statusElId, otpFieldId) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const otpField = document.getElementById(otpFieldId);
  if (otpField) otpField.style.display = 'block';
  const statusEl = document.getElementById(statusElId);
  if (statusEl) {
    statusEl.innerHTML = `Demo mode — real SMS gateway not connected. Your OTP is <span class="otp-demo-badge">${code}</span>`;
    statusEl.classList.add('show');
  }
  showToast(`Demo OTP for +91 ${mobile}: ${code} (valid 5 min)`, 'info');
  return { mobile, code, mode: 'demo', expiresAt: Date.now() + 5 * 60 * 1000 };
}

// ---------- CITIZEN: Mobile + OTP (always role 'user') ----------
window.sendCitizenOtp = async function() {
  const mobileInput = document.getElementById('citizenMobile');
  const mobile = mobileInput ? mobileInput.value.trim() : '';
  const sendBtn = document.getElementById('citizenSendOtpBtn');
  const statusEl = document.getElementById('citizenOtpStatusMsg');

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    showToast('Please enter a valid 10-digit mobile number.', 'warning');
    return;
  }
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending...'; }
  if (statusEl) statusEl.classList.remove('show');

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: '+91' + mobile });
      if (error) {
        console.warn('Supabase phone OTP unavailable, using demo OTP instead:', error.message);
        pendingCitizenOtp = issueDemoOtp(mobile, 'citizenOtpStatusMsg', 'citizenOtpEntryField');
      } else {
        pendingCitizenOtp = { mobile, mode: 'supabase' };
        const otpField = document.getElementById('citizenOtpEntryField');
        if (otpField) otpField.style.display = 'block';
        if (statusEl) { statusEl.textContent = `OTP sent to +91 ${mobile} via SMS.`; statusEl.classList.add('show'); }
      }
    } catch (e) {
      pendingCitizenOtp = issueDemoOtp(mobile, 'citizenOtpStatusMsg', 'citizenOtpEntryField');
    }
  } else {
    pendingCitizenOtp = issueDemoOtp(mobile, 'citizenOtpStatusMsg', 'citizenOtpEntryField');
  }

  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Resend OTP'; }
};

window.verifyCitizenOtp = async function() {
  const otpInput = document.getElementById('citizenOtp');
  const otp = otpInput ? otpInput.value.trim() : '';

  if (!pendingCitizenOtp) { showToast('Please request an OTP first.', 'warning'); return; }
  if (!otp || otp.length < 4) { showToast('Please enter the OTP you received.', 'warning'); return; }

  if (pendingCitizenOtp.mode === 'supabase') {
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: '+91' + pendingCitizenOtp.mobile, token: otp, type: 'sms' });
      if (error) { showToast(`OTP verification failed: ${error.message}`, 'error'); return; }
      currentSessionUser = { id: data.user.id, email: data.user.phone || (pendingCitizenOtp.mobile + '@shakticop.gov.in'), role: 'user' };
      showToast('Logged in successfully as Citizen.', 'success');
      pendingCitizenOtp = null;
      postLoginAction();
    } catch (e) {
      showToast(`OTP verification failed: ${e.message}`, 'error');
    }
  } else {
    if (Date.now() > pendingCitizenOtp.expiresAt) { showToast('OTP expired. Please tap Resend OTP.', 'error'); return; }
    if (otp !== pendingCitizenOtp.code) { showToast('Incorrect OTP. Please try again.', 'error'); return; }
    currentSessionUser = { id: 'user-otp-' + pendingCitizenOtp.mobile, email: pendingCitizenOtp.mobile + '@shakticop.gov.in', role: 'user' };
    showToast(`Logged in as Citizen via mobile +91 ${pendingCitizenOtp.mobile}.`, 'success');
    pendingCitizenOtp = null;
    postLoginAction();
  }
};

// ---------- ADMIN / OFFICER: Mobile + OTP (must match a registered officer, else rejected) ----------
window.sendStaffOtp = async function() {
  const mobileInput = document.getElementById('staffMobile');
  const mobile = mobileInput ? mobileInput.value.trim() : '';
  const sendBtn = document.getElementById('staffSendOtpBtn');
  const statusEl = document.getElementById('staffOtpStatusMsg');

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    showToast('Please enter a valid 10-digit mobile number.', 'warning');
    return;
  }

  const officerMatch = await findOfficerMatch('mobile', mobile);
  if (!officerMatch) {
    showToast('This mobile number is not registered as Admin/Officer. Citizens should use the Citizen Login tab.', 'error');
    return;
  }

  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending...'; }
  if (statusEl) statusEl.classList.remove('show');

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: '+91' + mobile });
      if (error) {
        console.warn('Supabase phone OTP unavailable, using demo OTP instead:', error.message);
        pendingStaffOtp = issueDemoOtp(mobile, 'staffOtpStatusMsg', 'staffOtpEntryField');
      } else {
        pendingStaffOtp = { mobile, mode: 'supabase' };
        const otpField = document.getElementById('staffOtpEntryField');
        if (otpField) otpField.style.display = 'block';
        if (statusEl) { statusEl.textContent = `OTP sent to +91 ${mobile} via SMS.`; statusEl.classList.add('show'); }
      }
    } catch (e) {
      pendingStaffOtp = issueDemoOtp(mobile, 'staffOtpStatusMsg', 'staffOtpEntryField');
    }
  } else {
    pendingStaffOtp = issueDemoOtp(mobile, 'staffOtpStatusMsg', 'staffOtpEntryField');
  }

  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Resend OTP'; }
};

window.verifyStaffOtp = async function() {
  const otpInput = document.getElementById('staffOtp');
  const otp = otpInput ? otpInput.value.trim() : '';

  if (!pendingStaffOtp) { showToast('Please request an OTP first.', 'warning'); return; }
  if (!otp || otp.length < 4) { showToast('Please enter the OTP you received.', 'warning'); return; }

  const officerMatch = await findOfficerMatch('mobile', pendingStaffOtp.mobile);
  if (!officerMatch) { showToast('This mobile number is no longer registered as staff.', 'error'); pendingStaffOtp = null; return; }

  if (pendingStaffOtp.mode === 'supabase') {
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: '+91' + pendingStaffOtp.mobile, token: otp, type: 'sms' });
      if (error) { showToast(`OTP verification failed: ${error.message}`, 'error'); return; }
      currentSessionUser = { id: data.user.id, email: data.user.phone || (pendingStaffOtp.mobile + '@shakticop.gov.in'), role: 'officer', officerId: officerMatch.id };
      showToast(`Logged in as Officer ${officerMatch.name} via mobile OTP.`, 'success');
      pendingStaffOtp = null;
      postLoginAction();
    } catch (e) {
      showToast(`OTP verification failed: ${e.message}`, 'error');
    }
  } else {
    if (Date.now() > pendingStaffOtp.expiresAt) { showToast('OTP expired. Please tap Resend OTP.', 'error'); return; }
    if (otp !== pendingStaffOtp.code) { showToast('Incorrect OTP. Please try again.', 'error'); return; }
    currentSessionUser = { id: 'officer-' + officerMatch.id, email: pendingStaffOtp.mobile + '@shakticop.gov.in', role: 'officer', officerId: officerMatch.id };
    showToast(`Logged in as Officer ${officerMatch.name} via mobile OTP.`, 'success');
    pendingStaffOtp = null;
    postLoginAction();
  }
};

window.doLogout = function() {
  currentSessionUser = null;
  document.getElementById('loginBtnGroup').style.display = 'flex';
  
  const userBadge = document.getElementById('userBadge');
  if (userBadge) userBadge.style.display = 'none';
  if (adminClockInterval) { clearInterval(adminClockInterval); adminClockInterval = null; }
  const bellWrap = document.getElementById('notifBellWrap');
  if (bellWrap) { bellWrap.style.display = 'none'; const p = document.getElementById('notifPopup'); if(p) p.style.display = 'none'; }
  updateMobileUserChrome();
  
  const navDash = document.getElementById('nav-dashboard');
  if (navDash) navDash.style.display = 'none';
  
  // Clear screens
  document.getElementById('adminWorkspace').style.display = 'none';
  document.getElementById('officerWorkspace').style.display = 'none';
  document.getElementById('publicSiteWrapper').style.display = 'block';
  
  switchTab('shakti');
  closeMobileDrawer();
  showToast("Logged out successfully.", "info");
};


// ==========================================
// 8. ISOLATED MODULES SUBMISSION WRAPPERS
// ==========================================

// Helper to write audit/module history log
async function insertHistoryLog(trackingId, status, officerName = null, remarks = 'Record submitted successfully.', email = null) {
  const actor = email || (currentSessionUser ? currentSessionUser.email : 'anonymous@shakticop.gov.in');
  
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('module_history').insert({
      tracking_id: trackingId,
      status: status,
      officer_name: officerName,
      remarks: remarks,
      updated_by_email: actor
    });
    if (error) console.error('History log insert error:', error.message);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_MODULE_HISTORY) || '[]');
    list.push({
      id: 'hist-' + Math.floor(Math.random()*100000),
      tracking_id: trackingId,
      status: status,
      officer_name: officerName,
      remarks: remarks,
      updated_by_email: actor,
      created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_MODULE_HISTORY, JSON.stringify(list));
  }
}

// Helper to check if active unresolved request exists for a user in a module
window.showFreshRequestForm = function(modalId) {
  const wrapperEl = document.getElementById(`${modalId}-active-wrapper`);
  const formId = { modalRegisterComplaint: 'complaintForm', modalHelpDesk: 'helpDeskForm', modalRomeo: 'romeoForm', modalDV: 'dvForm', modalCounsel: 'counselForm', modalLegalAid: 'legalAidForm', modalAudio: 'audioForm', modalTravel: 'travelForm' }[modalId];
  const formEl = formId ? document.getElementById(formId) : null;
  if (wrapperEl) wrapperEl.style.display = 'none';
  if (formEl) formEl.style.display = 'block';
  showToast('You can now file a new request. Your previous case is still tracked separately.', 'info');
};

window.checkActiveRequest = async function(tableName, modalId, formId) {
  const wrapperId = `${modalId}-active-wrapper`;
  const formEl = document.getElementById(formId);
  const wrapperEl = document.getElementById(wrapperId);
  
  if (!formEl || !wrapperEl) return;
  
  if (!currentSessionUser) {
    formEl.style.display = 'block';
    wrapperEl.style.display = 'none';
    return;
  }
  
  let activeRecord = null;
  const email = currentSessionUser.email;
  
  if (isSupabaseConfigured) {
    const { data } = await supabase.from(tableName)
      .select('*')
      .eq('email', email)
      .not('status', 'in', '("Resolved","Closed","Session Completed")')
      .order('created_at', { ascending: false });
    if (data && data.length > 0) activeRecord = data[0];
  } else {
    let storageKey = '';
    if (tableName === 'complaints') storageKey = MOCK_COMPLAINTS;
    if (tableName === 'ars_reports') storageKey = MOCK_ARS_REPORTS;
    if (tableName === 'mhd_requests') storageKey = MOCK_MHD_REQUESTS;
    if (tableName === 'counselling_bookings') storageKey = MOCK_COUNSELLING_BOOKINGS;
    if (tableName === 'empowerment_applications') storageKey = MOCK_EMPOWERMENT_APPLICATIONS;
    if (tableName === 'callback_requests') storageKey = MOCK_CALLBACK_REQUESTS;
    if (tableName === 'emergency_requests') storageKey = MOCK_EMERGENCY_REQUESTS;
    
    const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
    activeRecord = list.find(r => r.email === email && r.status !== 'Resolved' && r.status !== 'Closed' && r.status !== 'Session Completed');
  }
  
  if (activeRecord) {
    // Show active ticket screen
    formEl.style.display = 'none';
    wrapperEl.style.display = 'block';
    
    wrapperEl.innerHTML = `
      <div class="active-ticket-card">
        <div class="active-ticket-header">
          <span style="font-weight:700; color:var(--navy);">ℹ️ Active Case: ${activeRecord.id}</span>
          <span class="admin-badge ${getStatusClass(activeRecord.status)}">${activeRecord.status}</span>
        </div>
        <div class="active-ticket-detail-row">
          <strong>Filing Date:</strong>
          <span>${new Date(activeRecord.created_at || new Date()).toLocaleDateString()}</span>
        </div>
        <div class="active-ticket-detail-row">
          <strong>Assigned Node:</strong>
          <span>${activeRecord.police_station || activeRecord.assigned_officer_id || 'Pending Allocation'}</span>
        </div>
        <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
          <button class="admin-btn primary" onclick="trackActiveTicket('${activeRecord.id}', '${modalId}')">🔍 Track Timeline</button>
          <button class="admin-btn" onclick="toggleAddNoteContainer('${modalId}')">💬 Add Additional Note</button>
        </div>
        <div id="${modalId}-add-note-container" style="display:none; margin-top:12px;">
          <textarea id="${modalId}-additional-note" class="admin-textarea" placeholder="Input further remarks or critical updates..." style="min-height:60px; margin-bottom:8px; background:#fff; color:#000; border:1px solid #cbd5e1;"></textarea>
          <button class="admin-btn primary" onclick="submitAdditionalNote('${activeRecord.id}', '${tableName}', '${modalId}')">📤 Submit Note</button>
        </div>
        <div style="margin-top:16px; padding-top:14px; border-top:1px solid #e2e8f0; text-align:center;">
          <a href="#" onclick="showFreshRequestForm('${modalId}');return false;" style="font-size:12px; color:#a61e4d; font-weight:700; text-decoration:none;">+ Have a new, different concern? File a New Request →</a>
        </div>
      </div>
    `;
  } else {
    // Clear and show form
    formEl.style.display = 'block';
    wrapperEl.style.display = 'none';
  }
};

window.trackActiveTicket = function(id, modalId) {
  closeModal(modalId);
  switchTab('dashboard');
  document.getElementById('trackInputId').value = id;
  trackRequestById();
};

window.toggleAddNoteContainer = function(modalId) {
  const container = document.getElementById(`${modalId}-add-note-container`);
  if (container) {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  }
};

window.submitAdditionalNote = async function(id, tableName, modalId) {
  const noteText = document.getElementById(`${modalId}-additional-note`).value.trim();
  if (!noteText) {
    showToast("Please input some details to submit.", "warning");
    return;
  }
  
  await insertHistoryLog(id, 'Additional Note Submitted', null, `User remark: ${noteText}`);
  showToast("Additional information logged successfully.", "success");
  
  document.getElementById(`${modalId}-additional-note`).value = '';
  document.getElementById(`${modalId}-add-note-container`).style.display = 'none';
};

// Form submit: Standard Complaint
window.submitComplaintForm = async function() {
  const victimType = (document.querySelector('input[name="c-victim-type"]:checked') || {}).value || 'self';
  const name = document.getElementById('c-name').value.trim();
  const fatherName = document.getElementById('c-father-name').value.trim();
  const mobile = document.getElementById('c-mobile').value.trim();
  const email = document.getElementById('c-email').value.trim() || (currentSessionUser ? currentSessionUser.email : null);
  const district = document.getElementById('c-district').value;
  const station = document.getElementById('c-station').value;
  const category = document.getElementById('c-category').value;
  const date = document.getElementById('c-date').value;
  const time = document.getElementById('c-time').value;
  const location = document.getElementById('c-location').value.trim();
  let desc = document.getElementById('c-desc').value.trim();
  const anon = document.getElementById('c-anonymous').value === 'true';
  
  if (!name || !mobile || !district || !station || !category || !date || !time || !location || !desc) {
    showToast("Please complete all required fields.", "warning");
    return;
  }

  // Keep the father's name and, if filed on someone else's behalf, the filer's own identity — folded
  // into the description so no schema change is needed on the complaints table.
  let metaLines = [];
  if (fatherName) metaLines.push(`Father's/Husband's Name: ${fatherName}`);
  if (victimType === 'other' && currentCitizenProfile) {
    metaLines.push(`Filed on behalf of the above by: ${currentCitizenProfile.full_name} (${currentCitizenProfile.mobile})`);
  }
  if (metaLines.length) desc = `${desc}\n\n${metaLines.join('\n')}`;

  // If the citizen used voice dictation, carry the original voice recording along with the complaint
  await finalizeDictation('c-desc');
  let voiceUrl = null;
  const voiceBlob = dictationAudioBlobs['c-desc'];
  if (voiceBlob) {
    if (isSupabaseConfigured) {
      const filename = `complaint_voice_${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage.from('documents').upload(filename, voiceBlob);
      if (upErr) {
        console.warn('Voice attachment upload failed, submitting complaint without it:', upErr.message);
      } else {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filename);
        voiceUrl = urlData.publicUrl;
      }
    } else {
      try { voiceUrl = await blobToBase64(voiceBlob); } catch (e) { console.warn('Voice attachment encoding failed:', e); }
    }
  }
  
  let recordId = '';
  if (isSupabaseConfigured) {
    // Pass empty id so DB trigger generates the proper SC prefixed ID
    const { data, error } = await supabase.from('complaints').insert({
      id: '',
      name: anon ? 'Anonymous Citizen' : name,
      mobile,
      email,
      district,
      police_station: station,
      category,
      incident_date: date,
      incident_time: time,
      location,
      description: desc,
      anonymous: anon,
      video_url: voiceUrl
    }).select('id').single();
    
    if (error) {
      showToast(`Complaint filing failed: ${error.message}`, "error");
      console.error('Complaint insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    // Simulator id
    recordId = 'SC2026' + Math.floor(1000 + Math.random()*9000);
    const complaints = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
    complaints.push({
      id: recordId,
      name: anon ? 'Anonymous Citizen' : name,
      mobile,
      email,
      district,
      police_station: station,
      category,
      incident_date: date,
      incident_time: time,
      location,
      description: desc,
      anonymous: anon,
      video_url: voiceUrl,
      status: 'Pending',
      created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_COMPLAINTS, JSON.stringify(complaints));
  }
  
  await insertHistoryLog(recordId, 'Pending', null, 'Complaint registered in database. Awaiting police verification.', email);
  showToast(`Complaint submitted successfully. Reference ID: ${recordId}`, "success");
  closeModal('modalRegisterComplaint');
  document.getElementById('complaintForm').reset();
  clearDictationVoicePreview('c-desc');
  const cLocStatus = document.getElementById('c-loc-status');
  const cLocMap = document.getElementById('c-loc-status-map');
  if (cLocStatus) { cLocStatus.textContent = ''; cLocStatus.classList.remove('show'); }
  if (cLocMap) cLocMap.innerHTML = '';
  
  if (currentSessionUser) {
    switchTab('dashboard');
    const catSel = document.getElementById('uFilterCategory');
    if (catSel) catSel.value = '';
    fetchUserDashboardData();
  }
};

// Form submit: Mahila Help Desk Call assistance
window.switchHdVictimType = function(type) {
  const selfBtn = document.getElementById('hdSelfBtn');
  const otherBtn = document.getElementById('hdOtherBtn');
  const otherNote = document.getElementById('hdOtherNote');
  if (selfBtn) selfBtn.classList.toggle('active', type === 'self');
  if (otherBtn) otherBtn.classList.toggle('active', type === 'other');
  if (otherNote) otherNote.style.display = type === 'other' ? 'block' : 'none';
  if (type === 'self' && currentSessionUser) {
    const profile = getStoredCitizenProfile(currentSessionUser.email);
    if (profile) {
      const nameEl = document.getElementById('hd-name');
      const phoneEl = document.getElementById('hd-phone');
      const districtEl = document.getElementById('hd-district');
      if (nameEl && profile.full_name) nameEl.value = profile.full_name;
      if (phoneEl && profile.mobile) phoneEl.value = profile.mobile;
      if (districtEl && profile.district) {
        districtEl.value = profile.district;
        window.populateHelpDeskStations(profile.district);
        setTimeout(() => {
          const stationEl = document.getElementById('hd-station');
          if (stationEl && profile.police_station) stationEl.value = profile.police_station;
        }, 50);
      }
    }
  } else if (type === 'other') {
    ['hd-name','hd-phone'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
};

window.addMhdQuickChip = function(text) {
  const field = document.getElementById('hd-desc');
  if (!field) return;
  const existing = field.value.trim();
  field.value = existing ? `${existing}. ${text}.` : `${text}.`;
  field.focus();
};

window.submitHelpDeskForm = async function() {
  const name = document.getElementById('hd-name').value.trim();
  const mobile = document.getElementById('hd-phone').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  const district = document.getElementById('hd-district').value;
  const station = document.getElementById('hd-station').value;
  const location = document.getElementById('hd-location') ? document.getElementById('hd-location').value.trim() : '';
  let desc = document.getElementById('hd-desc').value.trim();
  const callback = document.getElementById('hd-callback').checked;
  
  const urgency = (document.querySelector('input[name="hd-urgency"]:checked') || {}).value || 'Low';
  
  if (!name || !mobile || !district || !station || !desc) {
    showToast("Please fill all required fields.", "warning");
    return;
  }

  desc = `[Urgency: ${urgency}] ${desc}`;
  if (location) desc = `${desc}\n\n📍 Citizen's Location: ${location}`;

  const voiceUrl = await resolveVoiceAttachment('hd-desc');
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await insertWithOptionalVoice('mhd_requests', {
      id: '', name, mobile, email, district, police_station: station, description: desc, callback_requested: callback
    }, voiceUrl);
    if (error) {
      showToast(`Help desk submission failed: ${error.message}`, 'error');
      console.error('MHD insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'MHD-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
    list.push({
      id: recordId, name, mobile, email, district, police_station: station, description: desc, callback_requested: callback, video_url: voiceUrl, status: 'Submitted', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_MHD_REQUESTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Submitted', null, 'Mahila Help Desk callback requested.', email);
  showToast(`Request submitted successfully. Tracking ID: ${recordId}`, 'success');
  closeModal('modalHelpDesk');
  document.getElementById('helpDeskForm').reset();
  clearDictationVoicePreview('hd-desc');
  const hdLocStatus = document.getElementById('hd-loc-status');
  const hdLocMap = document.getElementById('hd-loc-status-map');
  if (hdLocStatus) { hdLocStatus.textContent = ''; hdLocStatus.classList.remove('show'); }
  if (hdLocMap) hdLocMap.innerHTML = '';
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Anti Romeo dispatch patrol
window.submitRomeoForm = async function() {
  const name = document.getElementById('ar-name').value.trim() || 'Anonymous';
  const mobile = document.getElementById('ar-phone').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  const location = document.getElementById('ar-location').value.trim();
  const district = document.getElementById('ar-district').value;
  const desc = document.getElementById('ar-desc').value.trim();
  
  if (!mobile || !location || !district || !desc) {
    showToast("Please complete required details.", "warning");
    return;
  }

  const voiceUrl = await resolveVoiceAttachment('ar-desc');
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await insertWithOptionalVoice('ars_reports', {
      id: '', name, mobile, email, location, district, description: desc
    }, voiceUrl);
    if (error) {
      showToast(`Anti-Romeo dispatch request failed: ${error.message}`, 'error');
      console.error('ARS insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'ARS-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
    list.push({
      id: recordId, name, mobile, email, location, district, description: desc, video_url: voiceUrl, status: 'Submitted', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_ARS_REPORTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Submitted', null, 'Distress patrol report logged. Dispatch pending review.', email);
  showToast(`Anti-Romeo Squad notified. Tracking ID: ${recordId}`, 'success');
  closeModal('modalRomeo');
  document.getElementById('romeoForm').reset();
  clearDictationVoicePreview('ar-desc');
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Domestic Violence SOS
window.submitDVForm = async function() {
  const name = document.getElementById('dv-name').value.trim();
  const mobile = document.getElementById('dv-phone').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  const district = document.getElementById('dv-district').value;
  const location = document.getElementById('dv-location').value.trim();
  const helpType = document.getElementById('dv-help-type').value;
  
  if (!name || !mobile || !district || !location) {
    showToast("Please fill all details to proceed.", "warning");
    return;
  }
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('emergency_requests').insert({
      id: '', name, mobile, email, district, location, type: helpType
    }).select('id').single();
    if (error) {
      showToast(`SOS distress trigger failed: ${error.message}`, 'error');
      console.error('SOS insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'SOS-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
    list.push({
      id: recordId, name, mobile, email, district, location, type: helpType, status: 'Submitted', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_EMERGENCY_REQUESTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Submitted', null, 'Emergency SOS alarm triggered at control center.', email);
  showToast(`DISTRESS SIGNAL DELIVERED. Patrol dispatch initiated. Tracking ID: ${recordId}`, 'success');
  closeModal('modalDV');
  document.getElementById('dvForm').reset();
  const dvLocStatus = document.getElementById('dv-loc-status');
  const dvLocMap = document.getElementById('dv-loc-status-map');
  if (dvLocStatus) { dvLocStatus.textContent = ''; dvLocStatus.classList.remove('show'); }
  if (dvLocMap) dvLocMap.innerHTML = '';
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Counselling Booking
window.submitCounsellorBooking = async function() {
  const name = document.getElementById('cn-name').value.trim();
  const mobile = document.getElementById('cn-phone').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  const district = document.getElementById('cn-district').value;
  const prefDate = document.getElementById('cn-pref-date').value;
  const prefTime = document.getElementById('cn-pref-time').value;
  const reason = document.getElementById('cn-reason').value.trim();
  
  if (!name || !mobile || !district || !prefDate || !prefTime || !reason) {
    showToast("Please fill all fields.", "warning");
    return;
  }

  const voiceUrl = await resolveVoiceAttachment('cn-reason');
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await insertWithOptionalVoice('counselling_bookings', {
      id: '', name, mobile, email, district, preferred_date: prefDate, preferred_time: prefTime, reason: reason
    }, voiceUrl);
    if (error) {
      showToast(`Counselling session booking failed: ${error.message}`, 'error');
      console.error('CNS insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'CNS-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    list.push({
      id: recordId, name, mobile, email, district, preferred_date: prefDate, preferred_time: prefTime, reason: reason, video_url: voiceUrl, status: 'Application Received', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_COUNSELLING_BOOKINGS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Application Received', null, 'Counselling booking received by center specialists.', email);
  showToast(`Counselling request booked successfully. Booking ID: ${recordId}`, 'success');
  closeModal('modalCounsel');
  document.getElementById('counselForm').reset();
  clearDictationVoicePreview('cn-reason');
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Welfare empowerment application (JSS / Self Defence)
window.submitProgramEnrollment = async function() {
  const schemeTitle = document.getElementById('emp-scheme-title').value;
  const name = document.getElementById('emp-name').value.trim();
  const mobile = document.getElementById('emp-phone').value.trim();
  const age = document.getElementById('emp-age').value.trim();
  const gender = document.getElementById('emp-gender').value;
  const district = document.getElementById('emp-district').value;
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  
  if (!name || !mobile || !age || !gender || !district) {
    showToast("Please fill all fields.", "warning");
    return;
  }
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('empowerment_applications').insert({
      id: '', scheme_title: schemeTitle, name, mobile, age: parseInt(age), gender, district, email
    }).select('id').single();
    if (error) {
      showToast(`Program enrollment failed: ${error.message}`, 'error');
      console.error('EMP insert error:', error);
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'SCH-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    list.push({
      id: recordId, scheme_title: schemeTitle, name, mobile, age: parseInt(age), gender, district, email, status: 'Application Received', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_EMPOWERMENT_APPLICATIONS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Application Received', null, `Applied for ${schemeTitle} program catalog.`, email);
  showToast(`Scheme Application registered. ID: ${recordId}`, 'success');
  closeModal('modalEmpowerApply');
  document.getElementById('empowerForm').reset();
  if (currentSessionUser) fetchUserDashboardData();
};

// Form submit: Legal Aid Referral / Callback Request
window.submitLegalForm = async function() {
  const name = document.getElementById('la-name').value.trim();
  const mobile = document.getElementById('la-phone').value.trim();
  const district = document.getElementById('la-district').value;
  const desc = document.getElementById('la-desc').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  
  if (!name || !mobile || !district || !desc) {
    showToast("Please fill all fields.", "warning");
    return;
  }

  const voiceUrl = await resolveVoiceAttachment('la-desc');
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const { data, error } = await insertWithOptionalVoice('callback_requests', {
      name, mobile, district, reason: desc, email, police_station: 'Legal Aid Cell'
    }, voiceUrl);
    if (error) {
      showToast(`Legal Aid referral filing failed: ${error.message}`, 'error');
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'FOB-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_CALLBACK_REQUESTS) || '[]');
    list.push({
      id: recordId, name, mobile, district, reason: desc, email, police_station: 'Legal Aid Cell', video_url: voiceUrl, status: 'Submitted', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_CALLBACK_REQUESTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Submitted', null, 'Legal Aid Referral filed successfully.', email);
  showToast(`Legal Consultation registered. Referral ID: ${recordId}`, 'success');
  closeModal('modalLegalAid');
  document.getElementById('legalAidForm').reset();
  clearDictationVoicePreview('la-desc');
  if (currentSessionUser) fetchUserDashboardData();
};

// ==========================================
// SAFE TRAVEL MONITOR — Full SOS System
// ==========================================
const ACTIVE_TRAVEL_KEY = 'shakti_active_travel_journeys';
let travelAutoCloseTimers = {};

function getActiveJourneys() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_TRAVEL_KEY) || '[]'); } catch (e) { return []; }
}
function saveActiveJourneys(list) { localStorage.setItem(ACTIVE_TRAVEL_KEY, JSON.stringify(list)); }

function startTravelAutoCloseTimer(journeyId, createdAt) {
  if (travelAutoCloseTimers[journeyId]) clearTimeout(travelAutoCloseTimers[journeyId]);
  const created = new Date(createdAt).getTime();
  const twoHours = 2 * 60 * 60 * 1000;
  const remaining = twoHours - (Date.now() - created);
  if (remaining <= 0) { autoCloseTravelJourney(journeyId); return; }
  travelAutoCloseTimers[journeyId] = setTimeout(() => autoCloseTravelJourney(journeyId), remaining);
}

async function autoCloseTravelJourney(journeyId) {
  const journeys = getActiveJourneys().filter(j => j.id !== journeyId);
  saveActiveJourneys(journeys);
  if (isSupabaseConfigured) {
    await supabase.from('emergency_requests').update({ status: 'Auto Closed — No SOS' }).eq('id', journeyId).eq('status', 'Submitted');
  }
  showToast(`Journey ${journeyId} auto-closed (2 hours, no action required).`, 'info');
  renderActiveTravelCards();
  checkTravelSOSFloat();
}

function checkTravelSOSFloat() {
  const journeys = getActiveJourneys().filter(j => j.userEmail === (currentSessionUser?.email));
  const floatBtn = document.getElementById('travelSOSFloat');
  const journeyIdLabel = document.getElementById('travelSOSJourneyId');
  if (floatBtn) floatBtn.style.display = journeys.length > 0 ? 'block' : 'none';
  if (journeyIdLabel && journeys.length > 0) journeyIdLabel.textContent = journeys[0].id;
}

function renderActiveTravelCards() {
  const container = document.getElementById('activeTravelCardsContainer');
  if (!container) return;
  const journeys = getActiveJourneys().filter(j => j.userEmail === (currentSessionUser?.email));
  if (journeys.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = journeys.map(j => {
    const created = new Date(j.createdAt);
    const elapsed = Math.floor((Date.now() - created.getTime()) / 60000);
    const remaining = Math.max(0, 120 - elapsed);
    return `
    <div class="active-travel-card">
      <div class="active-travel-header">
        <div class="active-travel-id">🛡️ ${j.id}</div>
        <div class="active-travel-status">🟢 MONITORING</div>
      </div>
      <div class="active-travel-details">
        🚗 ${j.transport} · ${j.plate}<br>
        📍 ${j.start} → ${j.end}<br>
        🏙️ ${j.district}
      </div>
      <div class="active-travel-timer">⏱️ Auto-closes in ${remaining} minutes if no SOS pressed</div>
      <div class="active-travel-sos-row">
        <button class="active-travel-sos-btn" onclick="triggerTravelSOS('${j.id}')">🆘 SOS — I AM UNSAFE</button>
        <button class="active-travel-close-btn" onclick="closeTravelJourneyManual('${j.id}')">✅ Journey Complete</button>
      </div>
    </div>`;
  }).join('');
}

window.triggerTravelSOS = async function(journeyId) {
  const journeys = getActiveJourneys();
  const journey = journeyId ? journeys.find(j => j.id === journeyId) : journeys.find(j => j.userEmail === currentSessionUser?.email);
  if (!journey) { showToast('No active journey found.', 'warning'); return; }

  showToast('🚨 SOS ALERT SENT! Police are being notified. Stay on the line.', 'error');

  // Capture live location for SOS
  const getSOSLocation = () => new Promise(resolve => {
    if (!navigator.geolocation) { resolve(''); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve(`[GPS: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} - Map: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}]`),
      () => resolve(''),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  });

  const liveLocation = await getSOSLocation();
  const sosDesc = `🚨 SOS DISTRESS SIGNAL from Safe Travel Monitor!\n\nJourney: ${journey.id}\nCitizen: ${journey.name} (${journey.mobile})\nVehicle: ${journey.transport} · ${journey.plate}\nRoute: ${journey.start} → ${journey.end}\n\n${liveLocation ? `Live Location: ${liveLocation}` : 'Live GPS unavailable — last known start: ' + journey.start}`;

  const sosRecord = {
    id: '', name: journey.name, mobile: journey.mobile,
    email: journey.userEmail || '',
    district: journey.district,
    location: liveLocation || `Start: ${journey.start}`,
    type: 'Safe Travel SOS 🚨',
    description: sosDesc,
    status: 'SOS ACTIVE',
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured) {
    await supabase.from('emergency_requests').insert(sosRecord);
    await supabase.from('emergency_requests').update({ status: 'SOS Triggered' }).eq('id', journey.id);
  } else {
    const sosId = 'SOS-2026-' + String(900 + Math.floor(Math.random()*99)).padStart(6,'0');
    sosRecord.id = sosId;
    const list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS)||'[]');
    list.push(sosRecord);
    localStorage.setItem(MOCK_EMERGENCY_REQUESTS, JSON.stringify(list));
    const journeyList = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS)||'[]');
    const idx = journeyList.findIndex(r => r.id === journey.id);
    if (idx !== -1) { journeyList[idx].status = 'SOS Triggered'; localStorage.setItem(MOCK_EMERGENCY_REQUESTS, JSON.stringify(journeyList)); }
  }

  // Update local active journey status
  const updated = getActiveJourneys().map(j => j.id === journey.id ? { ...j, sosTriggered: true } : j);
  saveActiveJourneys(updated);
  renderActiveTravelCards();

  // Notify admin via admin notifications
  if (isSupabaseConfigured) {
    await supabase.from('notifications').insert({
      user_email: 'admin',
      title: `🚨 SOS from Safe Travel: ${journey.name}`,
      message: `${journey.transport} · ${journey.plate} | Route: ${journey.start} → ${journey.end} | ${liveLocation ? 'Live GPS sent' : 'No GPS'}`
    });
  }
};

window.closeTravelJourneyManual = async function(journeyId) {
  if (!confirm('Journey complete ho gayi? Monitoring band ho jayegi.')) return;
  const journeys = getActiveJourneys().filter(j => j.id !== journeyId);
  saveActiveJourneys(journeys);
  if (isSupabaseConfigured) {
    await supabase.from('emergency_requests').update({ status: 'Journey Complete' }).eq('id', journeyId);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS)||'[]');
    const idx = list.findIndex(r => r.id === journeyId);
    if (idx !== -1) { list[idx].status = 'Journey Complete'; localStorage.setItem(MOCK_EMERGENCY_REQUESTS, JSON.stringify(list)); }
  }
  showToast('Journey successfully marked complete. Stay safe!', 'success');
  renderActiveTravelCards();
  checkTravelSOSFloat();
};

// Form submit: Safe Travel Monitor
window.submitTravelForm = async function() {
  const name = document.getElementById('tr-name').value.trim();
  const mobile = document.getElementById('tr-phone').value.trim();
  const district = document.getElementById('tr-district').value;
  const transport = document.getElementById('tr-transport').value;
  const plate = document.getElementById('tr-vehicle-num').value.trim();
  const start = document.getElementById('tr-start').value.trim();
  const end = document.getElementById('tr-end').value.trim();
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  
  if (!name || !mobile || !district || !plate || !start || !end) {
    showToast("Please fill all fields.", "warning");
    return;
  }
  
  let recordId = '';
  const desc = `Safe Travel monitored: Route ${start} to ${end} in ${transport} (${plate}).`;
  const createdAt = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('emergency_requests').insert({
      name, mobile, email, district, location: start, type: 'Safe Travel Mode', description: desc, remarks: desc, status: 'Submitted', created_at: createdAt
    }).select('id').single();
    if (error) { showToast(`Safe Travel mode start failed: ${error.message}`, 'error'); return; }
    recordId = data.id;
  } else {
    recordId = 'SOS-2026-' + lpad(Math.floor(101 + Math.random()*900).toString(), 6, '0');
    const list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
    list.push({ id: recordId, name, mobile, email, district, location: start, type: 'Safe Travel Mode', description: desc, remarks: desc, status: 'Submitted', created_at: createdAt });
    localStorage.setItem(MOCK_EMERGENCY_REQUESTS, JSON.stringify(list));
  }

  // Save to local active journeys list
  const activeJourneys = getActiveJourneys();
  activeJourneys.push({ id: recordId, name, mobile, userEmail: email, district, transport, plate, start, end, createdAt, sosTriggered: false });
  saveActiveJourneys(activeJourneys);

  // Start auto-close timer (2 hours)
  startTravelAutoCloseTimer(recordId, createdAt);

  await insertHistoryLog(recordId, 'Submitted', null, 'Safe Travel GPS monitoring activated. SOS available on dashboard.', email);
  showToast(`✅ Journey Monitor Started! ID: ${recordId} — SOS button is now on your dashboard.`, 'success');
  closeModal('modalTravel');
  document.getElementById('travelForm').reset();

  // Show floating SOS button + active travel card
  checkTravelSOSFloat();
  if (currentSessionUser) {
    switchTab('dashboard');
    fetchUserDashboardData();
    setTimeout(renderActiveTravelCards, 100);
  }
};


// ==========================================
// 9. REALTIME TIMELINE TRACKING SYSTEM
// ==========================================
window.trackRequestById = async function() {
  const queryId = document.getElementById('trackInputId').value.trim();
  const resultArea = document.getElementById('trackResultArea');
  
  if (!queryId) {
    showToast("Please input a tracking reference ID.", "warning");
    return;
  }
  
  resultArea.style.display = 'block';
  resultArea.innerHTML = '<div class="skeleton" style="height:120px; width:100%;"></div>';
  
  // Find record
  let record = null;
  let historyLogs = [];
  
  // Try querying table based on prefix ID
  const prefix = queryId.split('-')[0].toUpperCase();
  
  if (isSupabaseConfigured) {
    // 1. Query table
    let table = '';
    if (queryId.startsWith('SC')) table = 'complaints';
    else if (prefix === 'ARS') table = 'ars_reports';
    else if (prefix === 'MHD') table = 'mhd_requests';
    else if (prefix === 'CNS') table = 'counselling_bookings';
    else if (prefix === 'SCH') table = 'empowerment_applications';
    else if (prefix === 'FOB') table = 'callback_requests';
    else if (prefix === 'SOS') table = 'emergency_requests';
    
    if (table) {
      const { data } = await supabase.from(table).select('*').eq('id', queryId).single();
      record = data;
    }
    
    // 2. Fetch history logs
    const { data: logs } = await supabase.from('module_history').select('*').eq('tracking_id', queryId).order('created_at', { ascending: false });
    historyLogs = logs || [];
  } else {
    // Local storage simulator logic
    let list = [];
    if (queryId.startsWith('SC')) list = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
    else if (prefix === 'ARS') list = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
    else if (prefix === 'MHD') list = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
    else if (prefix === 'CNS') list = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    else if (prefix === 'SCH') list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    else if (prefix === 'FOB') list = JSON.parse(localStorage.getItem(MOCK_CALLBACK_REQUESTS) || '[]');
    else if (prefix === 'SOS') list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
    
    record = list.find(r => r.id === queryId);
    historyLogs = JSON.parse(localStorage.getItem(MOCK_MODULE_HISTORY) || '[]').filter(h => h.tracking_id === queryId);
    historyLogs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }
  
  if (!record) {
    resultArea.innerHTML = `<div style="color:var(--red); font-size:12px; font-weight:600;">⚠️ Reference ID "${queryId}" not found in registries.</div>`;
    return;
  }
  
  // Render details & timeline (chronological order: oldest first, so it reads like a journey)
  const chronoLogs = [...historyLogs].reverse();
  let timelineHTML = '';
  if (chronoLogs.length === 0) {
    timelineHTML = `
      <div class="track-step">
        <div class="track-step-dot">📝</div>
        <div class="track-step-title">Record Submitted</div>
        <div class="track-step-meta">${new Date(record.created_at || new Date()).toLocaleString()}</div>
        <div class="track-step-remarks">Case added to dispatcher pipeline.</div>
      </div>`;
  } else {
    timelineHTML = chronoLogs.map((log, i) => {
      const isLast = i === chronoLogs.length - 1;
      const icon = /resolved|closed|completed/i.test(log.status) ? '✅' : /assign/i.test(log.status) ? '👮' : /investigat|progress/i.test(log.status) ? '🔎' : '📝';
      return `
      <div class="track-step ${isLast ? '' : ''}">
        <div class="track-step-dot">${icon}</div>
        <div class="track-step-title">${log.status}</div>
        <div class="track-step-meta">${new Date(log.created_at).toLocaleString()}${log.officer_name ? ` · Officer: ${log.officer_name}` : ''}</div>
        ${log.remarks ? `<div class="track-step-remarks">${log.remarks}</div>` : ''}
      </div>`;
    }).join('');
  }
  
  resultArea.innerHTML = `
    <div style="background:#fff; border:1px solid var(--border); border-radius:10px; padding:14px; box-shadow: 0 4px 6px rgba(0,0,0,0.02)">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-size:12px; font-weight:700; color:var(--navy);">${record.id} [${prefix || 'COMPLAINT'}]</span>
        <span class="admin-badge ${getStatusClass(record.status || 'Submitted')}">${record.status || 'Submitted'}</span>
      </div>
      <div style="font-size:11px; color:var(--muted); margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:8px;">
        <strong>Details:</strong> ${linkifyGpsMentions((record.description || record.remarks || 'No details entered.').replace(/</g,'&lt;'))}
      </div>
      <div class="track-timeline">
        ${timelineHTML}
      </div>
      <div style="margin-top:14px; text-align:right;">
        <button class="admin-btn primary" style="padding:6px 14px; font-size:11px;" onclick="downloadReceiptPDF('${record.id}')">🖨️ Print Receipt</button>
      </div>
    </div>
  `;
};


// ==========================================
// 10. CITIZEN DASHBOARD LAYOUT CONTROLLERS
// ==========================================
const CITIZEN_MODULES = [
  { table: 'complaints', key: 'mock_complaints', label: '📝 Complaint' },
  { table: 'ars_reports', key: 'mock_ars_reports', label: '🚔 Anti-Romeo' },
  { table: 'mhd_requests', key: 'mock_mhd_requests', label: '👮 Help Desk' },
  { table: 'counselling_bookings', key: 'mock_counselling_bookings', label: '💬 Counselling' },
  { table: 'empowerment_applications', key: 'mock_empowerment_applications', label: '🎓 JSS Program' },
  { table: 'emergency_requests', key: 'mock_emergency_requests', label: '🆘 SOS' }
];
const REJECTED_STATUSES = new Set(['Rejected', 'Closed - Invalid', 'Declined']);
const RESOLVED_STATUSES_SET = new Set(['Resolved', 'Closed', 'Completed', 'Session Completed']);

window.fetchUserDashboardData = async function() {
  const tbody = document.getElementById('userDashboardTableBody');
  if (!tbody || !currentSessionUser) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><div class="skeleton" style="height:30px; width:100%;"></div></td></tr>';

  const query = (document.getElementById('uSearchQuery').value || '').trim().toLowerCase();
  const categoryFilter = document.getElementById('uFilterCategory').value;
  const statusFilter = document.getElementById('uFilterStatus').value;
  const dateFrom = document.getElementById('uFilterDateFrom').value;
  const dateTo = document.getElementById('uFilterDateTo').value;
  const email = currentSessionUser.email;

  const modulesToFetch = categoryFilter ? CITIZEN_MODULES.filter(m => m.table === categoryFilter) : CITIZEN_MODULES;

  let allRecords = [];
  if (isSupabaseConfigured) {
    const results = await Promise.all(modulesToFetch.map(m => supabase.from(m.table).select('*').eq('email', email)));
    results.forEach((res, i) => {
      (res.data || []).forEach(r => allRecords.push({ ...r, _module: modulesToFetch[i] }));
    });
  } else {
    modulesToFetch.forEach(m => {
      const list = JSON.parse(localStorage.getItem(m.key) || '[]').filter(r => r.email === email);
      list.forEach(r => allRecords.push({ ...r, _module: m }));
    });
  }

  await updateCitizenStats();

  // Apply filters
  if (statusFilter) allRecords = allRecords.filter(r => r.status === statusFilter);
  if (dateFrom) allRecords = allRecords.filter(r => new Date(r.created_at || 0) >= new Date(dateFrom));
  if (dateTo) allRecords = allRecords.filter(r => new Date(r.created_at || 0) <= new Date(dateTo + 'T23:59:59'));
  if (query) {
    allRecords = allRecords.filter(r =>
      (r.id || '').toLowerCase().includes(query) ||
      (r.name || '').toLowerCase().includes(query)
    );
  }

  allRecords.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (allRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">No request records found matching active filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = allRecords.map(r => `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td>${r._module.label}</td>
      <td>${r.name || '—'}</td>
      <td>${r.district || '—'}</td>
      <td><span class="admin-badge ${getStatusClass(r.status || 'Submitted')}">${r.status || 'Submitted'}</span></td>
      <td>${new Date(r.created_at || new Date()).toLocaleDateString()}</td>
      <td>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="admin-btn" style="padding:4px 8px; font-size:10.5px;" onclick="trackActiveTicket('${r.id}', '')">🔍 Track</button>
          <button class="admin-btn primary" style="padding:4px 8px; font-size:10.5px;" onclick="downloadReceiptPDF('${r.id}')">📥 Print</button>
        </div>
      </td>
    </tr>
  `).join('');
};

async function updateCitizenStats() {
  if (!currentSessionUser) return;

  const email = currentSessionUser.email;
  const modules = [
    { table: 'complaints', key: MOCK_COMPLAINTS },
    { table: 'ars_reports', key: MOCK_ARS_REPORTS },
    { table: 'mhd_requests', key: MOCK_MHD_REQUESTS },
    { table: 'counselling_bookings', key: MOCK_COUNSELLING_BOOKINGS },
    { table: 'empowerment_applications', key: MOCK_EMPOWERMENT_APPLICATIONS },
    { table: 'emergency_requests', key: MOCK_EMERGENCY_REQUESTS },
    { table: 'callback_requests', key: MOCK_CALLBACK_REQUESTS }
  ];
  let records = [];

  if (isSupabaseConfigured) {
    const results = await Promise.all(modules.map(module =>
      supabase.from(module.table).select('id, status, district, created_at').eq('email', email)
    ));
    records = results.flatMap(result => result.data || []);
  } else {
    records = modules.flatMap(module =>
      JSON.parse(localStorage.getItem(module.key) || '[]').filter(r => r.email === email)
    );
  }

  const total = records.length;
  const resolved = records.filter(r => RESOLVED_STATUSES_SET.has(r.status)).length;
  const rejected = records.filter(r => REJECTED_STATUSES.has(r.status)).length;
  const pending = total - resolved - rejected;

  const totalEl = document.getElementById('citizenTotalNum');
  const pendingEl = document.getElementById('citizenPendingNum');
  const resolvedEl = document.getElementById('citizenResolvedNum');
  const rejectedEl = document.getElementById('citizenRejectedNum');
  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (resolvedEl) resolvedEl.textContent = resolved;
  if (rejectedEl) rejectedEl.textContent = rejected;
}

// Global Receipt compiler
// jsPDF's built-in fonts only support Latin-1 — Devanagari (Hindi voice-typed text) or
// emoji in a description would otherwise render as corrupted symbol garbage in the PDF.
function sanitizePdfText(str) {
  if (!str) return '';
  let s = String(str)
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[\u{1F300}-\u{1FAFF}]|[\u2600-\u27BF]|[\u2190-\u21FF]/gu, '');
  if (/[\u0900-\u097F]/.test(s)) {
    s = s.replace(/[\u0900-\u097F][\u0900-\u097F\s.,!?()-]*/g, '[Hindi text - see full details in the online portal] ');
  }
  // Strip anything else outside basic Latin-1 that the PDF font cannot render
  s = s.replace(/[^\x00-\xFF]/g, '');
  return s.replace(/\s{2,}/g, ' ').trim();
}

window.downloadReceiptPDF = async function(id) {
  try {
    let record = null;
    const prefix = id.split('-')[0].toUpperCase();
    
    if (isSupabaseConfigured) {
      let table = '';
      if (id.startsWith('SC')) table = 'complaints';
      else if (prefix === 'ARS') table = 'ars_reports';
      else if (prefix === 'MHD') table = 'mhd_requests';
      else if (prefix === 'CNS') table = 'counselling_bookings';
      else if (prefix === 'SCH') table = 'empowerment_applications';
      else if (prefix === 'FOB') table = 'callback_requests';
      else if (prefix === 'SOS') table = 'emergency_requests';
      
      const { data } = await supabase.from(table).select('*').eq('id', id).single();
      record = data;
    } else {
      let list = [];
      if (id.startsWith('SC')) list = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
      else if (prefix === 'ARS') list = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
      else if (prefix === 'MHD') list = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
      else if (prefix === 'CNS') list = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
      else if (prefix === 'SCH') list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
      else if (prefix === 'FOB') list = JSON.parse(localStorage.getItem(MOCK_CALLBACK_REQUESTS) || '[]');
      else if (prefix === 'SOS') list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
      record = list.find(r => r.id === id);
    }
    
    if (!record) {
      showToast("Record not found for PDF download.", "error");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Styled PDF Border
    doc.setDrawColor(166, 30, 77); // Pink border
    doc.setLineWidth(1.5);
    doc.rect(10, 10, 190, 277);

    // Document header
    doc.setFillColor(11, 20, 55); // Navy banner
    doc.rect(12, 12, 186, 30, 'F');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("SHAKTICOP - REGISTRY RECEIPT", 20, 28);

    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text("UTTAR PRADESH POLICE WOMEN PORTAL", 20, 37);

    // Reference ID & Status
    doc.setTextColor(17, 28, 74);
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text(`TRACKING REFERENCE ID: ${record.id}`, 20, 60);

    doc.setFillColor(230, 73, 128);
    doc.rect(20, 65, 170, 0.5, 'F');

    // Details Grid layout
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    let y = 80;
    const details = [
      ["Citizen Name:", sanitizePdfText(record.name)],
      ["Contact Mobile:", sanitizePdfText(record.mobile)],
      ["Email Registered:", sanitizePdfText(record.email) || 'N/A'],
      ["District:", sanitizePdfText(record.district)],
      ["Police Station:", sanitizePdfText(record.police_station || record.station) || 'N/A'],
      ["Reference Module:", prefix || 'Complaint Registry'],
      ["Submitting Date:", new Date(record.created_at || new Date()).toLocaleDateString()],
      ["Investigation Status:", sanitizePdfText(record.status) || 'Submitted']
    ];

    details.forEach(item => {
      doc.setFont("Helvetica", "bold");
      doc.text(item[0], 20, y);
      doc.setFont("Helvetica", "normal");
      doc.text(String(item[1]), 70, y);
      y += 10;
    });

    // Location — shown as its own clearly-labeled field, with a plain-text map link if GPS was captured
    if (record.location) {
      const coordMatch = String(record.location).match(/GPS:\s*([0-9.\-]+),\s*([0-9.\-]+)/);
      doc.setFont("Helvetica", "bold");
      doc.text("Location:", 20, y);
      doc.setFont("Helvetica", "normal");
      const locText = coordMatch
        ? `GPS Coordinates: ${coordMatch[1]}, ${coordMatch[2]} (see portal for live map)`
        : sanitizePdfText(record.location);
      const splitLoc = doc.splitTextToSize(locText, 120);
      doc.text(splitLoc, 70, y);
      y += 10 + (splitLoc.length > 1 ? (splitLoc.length - 1) * 6 : 0);
    }

    if (record.description || record.reason || record.remarks) {
      doc.setFont("Helvetica", "bold");
      doc.text("Case Information Details:", 20, y + 5);
      doc.setFont("Helvetica", "normal");
      const rawText = sanitizePdfText(record.description || record.reason || record.remarks || '');
      const splitDesc = doc.splitTextToSize(rawText || '(No additional details provided)', 160);
      doc.text(splitDesc, 20, y + 15);
    }

    // Footer Disclaimer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("This receipt is automatically generated by the ShaktiCop system and serves as verification of filing.", 20, 260);
    doc.text("For updates, please log in with your credentials or contact helpline 1090.", 20, 265);

    doc.save(`ShaktiCop_Receipt_${record.id}.pdf`);
    showToast("PDF Receipt downloaded successfully.", "success");
  } catch (err) {
    showToast(`PDF generation failed: ${err.message}`, "error");
  }
};


// ==========================================
// 11. REALTIME USER NOTIFICATION CENTER
// ==========================================
const READ_NOTIFS_KEY = 'shakti_read_notification_ids';

function getReadNotificationIds() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_NOTIFS_KEY) || '[]')); } catch (e) { return new Set(); }
}

function markNotificationRead(id) {
  const ids = getReadNotificationIds();
  ids.add(id);
  localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify([...ids]));
}
window.markNotificationRead = markNotificationRead;

window.markAllNotificationsRead = function() {
  const items = document.querySelectorAll('#notifPopupList [data-notif-id]');
  const ids = getReadNotificationIds();
  items.forEach(el => ids.add(el.dataset.notifId));
  localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify([...ids]));
  fetchUserNotifications();
};

window.toggleNotificationsPopup = function() {
  const popup = document.getElementById('notifPopup');
  if (!popup) return;
  const isOpen = popup.style.display === 'block';
  popup.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) fetchUserNotifications();
};

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('notifBellWrap');
  const popup = document.getElementById('notifPopup');
  if (wrap && popup && popup.style.display === 'block' && !wrap.contains(e.target)) {
    popup.style.display = 'none';
  }
});

async function fetchUserNotifications() {
  const container = document.getElementById('notifPopupList');
  const bellWrap = document.getElementById('notifBellWrap');
  if (!container || !currentSessionUser) return;
  if (bellWrap) bellWrap.style.display = 'block';

  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_email', currentSessionUser.email)
      .order('created_at', { ascending: false })
      .limit(20);
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_NOTIFICATIONS) || '[]').filter(n => n.user_email === currentSessionUser.email);
    list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const readIds = getReadNotificationIds();
  const unreadCount = list.filter(n => !readIds.has(n.id)).length;

  const badge = document.getElementById('notifBellBadge');
  if (badge) {
    if (unreadCount > 0) { badge.textContent = unreadCount > 9 ? '9+' : unreadCount; badge.hidden = false; }
    else badge.hidden = true;
  }
  updateMobileNotificationBadges(unreadCount);

  if (list.length === 0) {
    container.innerHTML = `<div class="notif-empty">No notification alerts received.</div>`;
    return;
  }

  container.innerHTML = list.map(n => {
    const isUnread = !readIds.has(n.id);
    return `
    <div class="notif-item ${isUnread ? 'unread' : 'read'}" data-notif-id="${n.id}" onclick="markNotificationRead('${n.id}'); this.classList.remove('unread'); this.classList.add('read'); fetchUserNotifications();">
      <div class="notif-item-title">${isUnread ? '🔵 ' : ''}${n.title}</div>
      <div class="notif-item-msg">${n.message}</div>
      <div class="notif-item-time">${new Date(n.created_at).toLocaleString()}</div>
    </div>
  `;
  }).join('');
}


// ==========================================
// 12. ADMIN TAB ROUTING SYSTEMS
// ==========================================
window.switchAdminTab = function(tabName) {
  currentAdminTab = tabName;
  document.querySelectorAll('.admin-menu-item').forEach(li => {
    li.classList.toggle('active', li.id === `menu-${tabName}`);
  });
  
  document.querySelectorAll('.admin-subview').forEach(view => {
    view.style.display = 'none';
  });
  
  const activeView = document.getElementById(`admin-view-${tabName}`);
  if (activeView) activeView.style.display = 'block';
  
  // Set topbar title
  const titles = {
    dash: '📊 Dashboard Overview',
    complaints: '📝 Citizen Complaints Registry',
    ars: '🚔 Anti-Romeo Squad Patrol Queue',
    mhd: '👮 Mahila Help Desk Callbacks',
    counsel: '💬 Counselling bookings & calendar',
    empower: '💪 Empowerment JSS Applications',
    officers: '👮 Female Officers Database',
    counsellors: '👤 Counsellors Directory',
    emergency: '🚨 Emergency SOS Distress Alerts',
    travel: '🛡️ Safe Travel Monitor — Live Journeys',
    settings: '⚙️ Appearance & Preferences'
  };
  document.getElementById('adminActiveTabTitle').textContent = titles[tabName] || 'Admin Panel';
  
  // Trigger specific tab fetches (Lazy Loading)
  if (tabName === 'dash') renderGeneralDashboardOverview();
  if (tabName === 'complaints') {
    const catSel = document.getElementById('compFilterCategory');
    if (catSel) delete catSel.dataset.populated;
    fetchComplaintsAdmin();
  }
  if (tabName === 'ars') fetchARSAdmin();
  if (tabName === 'mhd') fetchMHDAdmin();
  if (tabName === 'counsel') fetchCNSAdmin();
  if (tabName === 'empower') fetchEmpowerAdmin();
  if (tabName === 'officers') fetchOfficersAdmin();
  if (tabName === 'counsellors') fetchCounsellorsAdmin();
  if (tabName === 'emergency') fetchEmergencySOSAdmin();
  if (tabName === 'travel') fetchTravelMonitorAdmin();
  if (tabName === 'settings') initSettingsPanel();
};

function reloadAdminView() {
  switchAdminTab(currentAdminTab);
}

// ==========================================
// ADMIN/OFFICER APPEARANCE SETTINGS
// ==========================================
const SETTINGS_KEYS = {
  theme: 'shakti_admin_theme_mode',
  accent: 'shakti_admin_accent',
  fontSize: 'shakti_admin_fontsize',
  fontFamily: 'shakti_admin_fontfamily',
  textColor: 'shakti_admin_text_color',
  tableStyle: 'shakti_admin_table_style',
  cardStyle: 'shakti_admin_card_style',
  sidebarStyle: 'shakti_admin_sidebar_style',
  animations: 'shakti_admin_animations'
};

const STYLE_CLASS_GROUPS = {
  tableStyle: ['table-striped', 'table-compact', 'table-bordered'],
  cardStyle: ['card-flat', 'card-sharp', 'card-glow'],
  sidebarStyle: ['sidebar-pill', 'sidebar-filled']
};

function applyStyleClass(groupKey, value, storageKey) {
  document.querySelectorAll('.admin-theme').forEach(el => {
    STYLE_CLASS_GROUPS[groupKey].forEach(cls => el.classList.remove(cls));
    if (value && value !== 'default') el.classList.add(value === 'striped' ? 'table-striped' : value === 'compact' ? 'table-compact' : value === 'bordered' ? 'table-bordered' : value === 'flat' ? 'card-flat' : value === 'sharp' ? 'card-sharp' : value === 'glow' ? 'card-glow' : value === 'pill' ? 'sidebar-pill' : value === 'filled' ? 'sidebar-filled' : '');
  });
  localStorage.setItem(storageKey, value);
}

window.applyTableStyle = function(value) { applyStyleClass('tableStyle', value, SETTINGS_KEYS.tableStyle); showToast('Table style updated.', 'success'); };
window.applyCardStyle = function(value) { applyStyleClass('cardStyle', value, SETTINGS_KEYS.cardStyle); showToast('Card style updated.', 'success'); };
window.applySidebarStyle = function(value) { applyStyleClass('sidebarStyle', value, SETTINGS_KEYS.sidebarStyle); showToast('Sidebar style updated.', 'success'); };

window.applyTextColor = function(color) {
  document.querySelectorAll('.admin-theme').forEach(el => { el.style.setProperty('color', color); });
  localStorage.setItem(SETTINGS_KEYS.textColor, color);
  showToast('Text color updated.', 'success');
};

window.applyAnimations = function(on) {
  document.querySelectorAll('.admin-theme').forEach(el => el.classList.toggle('anim-off', !on));
  localStorage.setItem(SETTINGS_KEYS.animations, on ? 'on' : 'off');
  const onBtn = document.getElementById('animOnBtn');
  const offBtn = document.getElementById('animOffBtn');
  if (onBtn && offBtn) {
    onBtn.style.background = on ? 'var(--pink2)' : '';
    onBtn.style.color = on ? '#fff' : '';
    offBtn.style.background = !on ? 'var(--pink2)' : '';
    offBtn.style.color = !on ? '#fff' : '';
  }
  showToast(`Animations turned ${on ? 'on' : 'off'}.`, 'success');
};

window.applyAdminTheme = function(mode) {
  document.querySelectorAll('.admin-theme').forEach(el => {
    el.classList.toggle('admin-dark-mode', mode === 'dark');
  });
  localStorage.setItem(SETTINGS_KEYS.theme, mode);
  const brightBtn = document.getElementById('themeBrightBtn');
  const darkBtn = document.getElementById('themeDarkBtn');
  if (brightBtn && darkBtn) {
    brightBtn.style.background = mode === 'bright' ? 'var(--pink2)' : '';
    brightBtn.style.color = mode === 'bright' ? '#fff' : '';
    darkBtn.style.background = mode === 'dark' ? 'var(--pink2)' : '';
    darkBtn.style.color = mode === 'dark' ? '#fff' : '';
  }
  showToast(`Theme set to ${mode === 'dark' ? 'Dark' : 'Bright'} mode.`, 'success');
};

window.applyAccentColor = function(primary, secondary) {
  document.querySelectorAll('.admin-theme').forEach(el => {
    el.style.setProperty('--pink', primary);
    el.style.setProperty('--pink2', secondary);
  });
  localStorage.setItem(SETTINGS_KEYS.accent, JSON.stringify({ primary, secondary }));
  showToast('Accent color updated.', 'success');
};

window.applyFontSize = function(size) {
  document.querySelectorAll('.admin-theme').forEach(el => { el.style.fontSize = size + 'px'; });
  localStorage.setItem(SETTINGS_KEYS.fontSize, size);
  showToast('Font size updated.', 'success');
};

window.applyFontFamily = function(family) {
  document.querySelectorAll('.admin-theme').forEach(el => { el.style.fontFamily = family; });
  localStorage.setItem(SETTINGS_KEYS.fontFamily, family);
  showToast('Font style updated.', 'success');
};

window.resetAdminAppearance = function() {
  Object.values(SETTINGS_KEYS).forEach(k => localStorage.removeItem(k));
  document.querySelectorAll('.admin-theme').forEach(el => {
    el.classList.remove('admin-dark-mode', 'anim-off');
    Object.values(STYLE_CLASS_GROUPS).flat().forEach(cls => el.classList.remove(cls));
    el.style.removeProperty('--pink');
    el.style.removeProperty('--pink2');
    el.style.removeProperty('font-size');
    el.style.removeProperty('font-family');
    el.style.removeProperty('color');
  });
  showToast('Appearance reset to default.', 'success');
  initSettingsPanel();
};

// Applies any saved appearance preferences — called on load and whenever a workspace becomes visible
function applySavedAdminAppearance() {
  const mode = localStorage.getItem(SETTINGS_KEYS.theme);
  const accent = localStorage.getItem(SETTINGS_KEYS.accent);
  const fontSize = localStorage.getItem(SETTINGS_KEYS.fontSize);
  const fontFamily = localStorage.getItem(SETTINGS_KEYS.fontFamily);
  const textColor = localStorage.getItem(SETTINGS_KEYS.textColor);
  const tableStyle = localStorage.getItem(SETTINGS_KEYS.tableStyle);
  const cardStyle = localStorage.getItem(SETTINGS_KEYS.cardStyle);
  const sidebarStyle = localStorage.getItem(SETTINGS_KEYS.sidebarStyle);
  const animations = localStorage.getItem(SETTINGS_KEYS.animations);
  document.querySelectorAll('.admin-theme').forEach(el => {
    if (mode) el.classList.toggle('admin-dark-mode', mode === 'dark');
    if (accent) { try { const { primary, secondary } = JSON.parse(accent); el.style.setProperty('--pink', primary); el.style.setProperty('--pink2', secondary); } catch (e) {} }
    if (fontSize) el.style.fontSize = fontSize + 'px';
    if (fontFamily) el.style.fontFamily = fontFamily;
    if (textColor) el.style.setProperty('color', textColor);
    if (animations) el.classList.toggle('anim-off', animations === 'off');
    Object.values(STYLE_CLASS_GROUPS).flat().forEach(cls => el.classList.remove(cls));
    [tableStyle, cardStyle, sidebarStyle].forEach(v => {
      if (v && v !== 'default') el.classList.add(v === 'striped' ? 'table-striped' : v === 'compact' ? 'table-compact' : v === 'bordered' ? 'table-bordered' : v === 'flat' ? 'card-flat' : v === 'sharp' ? 'card-sharp' : v === 'glow' ? 'card-glow' : v === 'pill' ? 'sidebar-pill' : v === 'filled' ? 'sidebar-filled' : '');
    });
  });
}

function initSettingsPanel() {
  applySavedAdminAppearance();
  const mode = localStorage.getItem(SETTINGS_KEYS.theme) || 'bright';
  const fontSize = localStorage.getItem(SETTINGS_KEYS.fontSize);
  const fontFamily = localStorage.getItem(SETTINGS_KEYS.fontFamily);
  const animations = localStorage.getItem(SETTINGS_KEYS.animations) || 'on';
  const brightBtn = document.getElementById('themeBrightBtn');
  const darkBtn = document.getElementById('themeDarkBtn');
  if (brightBtn && darkBtn) {
    brightBtn.style.background = mode === 'bright' ? 'var(--pink2)' : '';
    brightBtn.style.color = mode === 'bright' ? '#fff' : '';
    darkBtn.style.background = mode === 'dark' ? 'var(--pink2)' : '';
    darkBtn.style.color = mode === 'dark' ? '#fff' : '';
  }
  const fsSel = document.getElementById('fontSizeSelect');
  if (fsSel && fontSize) fsSel.value = fontSize;
  const ffSel = document.getElementById('fontFamilySelect');
  if (ffSel && fontFamily) ffSel.value = fontFamily;
  const tsSel = document.getElementById('tableStyleSelect');
  if (tsSel) tsSel.value = localStorage.getItem(SETTINGS_KEYS.tableStyle) || 'default';
  const csSel = document.getElementById('cardStyleSelect');
  if (csSel) csSel.value = localStorage.getItem(SETTINGS_KEYS.cardStyle) || 'default';
  const ssSel = document.getElementById('sidebarStyleSelect');
  if (ssSel) ssSel.value = localStorage.getItem(SETTINGS_KEYS.sidebarStyle) || 'default';
  const onBtn = document.getElementById('animOnBtn');
  const offBtn = document.getElementById('animOffBtn');
  if (onBtn && offBtn) {
    onBtn.style.background = animations === 'on' ? 'var(--pink2)' : '';
    onBtn.style.color = animations === 'on' ? '#fff' : '';
    offBtn.style.background = animations === 'off' ? 'var(--pink2)' : '';
    offBtn.style.color = animations === 'off' ? '#fff' : '';
  }
}

// ==========================================
// ADMIN PROFILE (name, photo, password)
// ==========================================
const ADMIN_PROFILE_KEY = 'shakti_admin_profile';
const ADMIN_PASSWORD_OVERRIDE_KEY = 'shakti_admin_password_override';

function getSavedAdminProfile() {
  try { return JSON.parse(localStorage.getItem(ADMIN_PROFILE_KEY) || 'null'); } catch (e) { return null; }
}

// ==========================================
// ADMIN TOPBAR — Live Clock + Quick Stats + Search
// ==========================================
let adminClockInterval = null;

function startAdminLiveClock() {
  if (adminClockInterval) clearInterval(adminClockInterval);
  const clockEl = document.getElementById('adminLiveClock');
  const dateEl = document.getElementById('adminLiveDate');
  const tick = () => {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
    if (dateEl) {
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }
  };
  tick();
  adminClockInterval = setInterval(tick, 1000);
}

async function updateTopbarQuickStats() {
  let pending = 0, sos = 0;
  if (isSupabaseConfigured) {
    const [{ count: p }, { count: s }] = await Promise.all([
      supabase.from('complaints').select('*', { count:'exact', head:true }).eq('status','Pending'),
      supabase.from('emergency_requests').select('*', { count:'exact', head:true }).not('status','eq','Resolved')
    ]);
    pending = p || 0; sos = s || 0;
  } else {
    pending = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS)||'[]').filter(r => r.status === 'Pending').length;
    sos = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS)||'[]').filter(r => r.status !== 'Resolved').length;
  }
  const pEl = document.getElementById('topbarPending');
  const sEl = document.getElementById('topbarSOS');
  if (pEl) pEl.textContent = pending;
  if (sEl) sEl.textContent = sos;
}

window.handleAdminGlobalSearch = async function(query) {
  const wrap = document.getElementById('adminGlobalSearchWrap') || document.querySelector('.admin-topbar-search-wrap');
  let dropdown = document.getElementById('adminSearchDropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'adminSearchDropdown';
    dropdown.className = 'admin-search-dropdown';
    wrap.appendChild(dropdown);
  }
  query = (query||'').trim().toLowerCase();
  if (!query || query.length < 2) { dropdown.classList.remove('open'); return; }
  dropdown.classList.add('open');
  dropdown.innerHTML = '<div class="admin-search-no-result">Searching...</div>';

  let results = [];
  const modules = [
    { key: MOCK_COMPLAINTS, label: 'Complaint', tab: 'complaints' },
    { key: MOCK_ARS_REPORTS, label: 'Anti-Romeo', tab: 'ars' },
    { key: MOCK_MHD_REQUESTS, label: 'Help Desk', tab: 'mhd' },
    { key: MOCK_EMERGENCY_REQUESTS, label: 'SOS', tab: 'emergency' }
  ];

  if (isSupabaseConfigured) {
    const searches = await Promise.all(modules.map(m =>
      supabase.from(m.key.replace('mock_','')).select('id, name, mobile, status').or(`id.ilike.%${query}%,name.ilike.%${query}%,mobile.ilike.%${query}%`).limit(4)
    ));
    searches.forEach((res, i) => (res.data||[]).forEach(r => results.push({ ...r, _m: modules[i] })));
  } else {
    modules.forEach(m => {
      JSON.parse(localStorage.getItem(m.key)||'[]')
        .filter(r => (r.id||'').toLowerCase().includes(query) || (r.name||'').toLowerCase().includes(query) || (r.mobile||'').includes(query))
        .slice(0,3).forEach(r => results.push({ ...r, _m: m }));
    });
  }

  if (results.length === 0) {
    dropdown.innerHTML = '<div class="admin-search-no-result">No results found for "'+query+'"</div>';
    return;
  }

  dropdown.innerHTML = results.slice(0,10).map(r => `
    <div class="admin-search-result-item" onclick="switchAdminTab('${r._m.tab}'); document.getElementById('adminGlobalSearch').value=''; document.getElementById('adminSearchDropdown').classList.remove('open');">
      <span class="admin-search-result-badge">${r._m.label}</span>
      <div>
        <div class="admin-search-result-id">${r.id}</div>
        <div class="admin-search-result-meta">${r.name||'—'} · ${r.mobile||'—'} · <span style="color:${r.status==='Pending'?'#f59e0b':r.status==='Resolved'?'#16a34a':'#64748b'}">${r.status||'Submitted'}</span></div>
      </div>
    </div>
  `).join('');
};

// Close search dropdown on outside click
document.addEventListener('click', e => {
  const dropdown = document.getElementById('adminSearchDropdown');
  const searchWrap = document.querySelector('.admin-topbar-search-wrap');
  if (dropdown && searchWrap && !searchWrap.contains(e.target)) dropdown.classList.remove('open');
});

function loadAdminProfileDisplay() {
  const saved = getSavedAdminProfile();
  const nameEl = document.getElementById('adminProfileName');
  const roleEl = document.getElementById('adminProfileRole');
  const avatarEl = document.getElementById('adminAvatarDisplay');
  const defaultName = currentSessionUser ? currentSessionUser.email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Admin User';

  if (nameEl) nameEl.textContent = (saved && saved.name) || defaultName;
  if (roleEl) roleEl.textContent = (saved && saved.role) || 'System Administrator — Etawah';
  if (avatarEl) {
    if (saved && saved.photo) avatarEl.innerHTML = `<img src="${saved.photo}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;"/>`;
    else avatarEl.textContent = ((saved && saved.name) || defaultName).charAt(0).toUpperCase();
  }
}

window.openAdminProfileModal = function() {
  const saved = getSavedAdminProfile();
  const defaultName = currentSessionUser ? currentSessionUser.email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Admin User';
  document.getElementById('ap-display-name').value = (saved && saved.name) || defaultName;
  document.getElementById('ap-role-title').value = (saved && saved.role) || 'System Administrator';
  const heroAvatar = document.getElementById('adminProfileHeroAvatar');
  if (heroAvatar) {
    if (saved && saved.photo) heroAvatar.innerHTML = `<img src="${saved.photo}"/>`;
    else heroAvatar.textContent = ((saved && saved.name) || defaultName).charAt(0).toUpperCase();
  }
  document.getElementById('adminChangePasswordForm').reset();
  const status = document.getElementById('adminPasswordStatus');
  if (status) { status.textContent = ''; status.classList.remove('show'); }
  window.openModal('modalAdminProfile');
};

window.handleAdminProfilePhotoUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const photoDataUrl = reader.result;
    const heroAvatar = document.getElementById('adminProfileHeroAvatar');
    if (heroAvatar) heroAvatar.innerHTML = `<img src="${photoDataUrl}"/>`;
    const saved = getSavedAdminProfile() || {};
    saved.photo = photoDataUrl;
    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(saved));
    loadAdminProfileDisplay();
    showToast('Profile photo updated.', 'success');
  };
  reader.readAsDataURL(file);
};

window.submitAdminProfileDetails = function() {
  const name = document.getElementById('ap-display-name').value.trim();
  const role = document.getElementById('ap-role-title').value.trim();
  if (!name) { showToast('Please enter a display name.', 'warning'); return; }
  const saved = getSavedAdminProfile() || {};
  saved.name = name;
  saved.role = role;
  localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(saved));
  loadAdminProfileDisplay();
  showToast('Profile updated successfully.', 'success');
};

window.submitAdminPasswordChange = async function() {
  const current = document.getElementById('ap-current-password').value;
  const next = document.getElementById('ap-new-password').value;
  const confirm = document.getElementById('ap-confirm-password').value;
  const status = document.getElementById('adminPasswordStatus');

  if (next !== confirm) {
    if (status) { status.textContent = 'New password and confirmation do not match.'; status.classList.add('show', 'error'); }
    return;
  }
  if (next.length < 6) {
    if (status) { status.textContent = 'New password must be at least 6 characters.'; status.classList.add('show', 'error'); }
    return;
  }

  if (isSupabaseConfigured) {
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: currentSessionUser.email, password: current });
      if (signInErr) {
        if (status) { status.textContent = 'Current password is incorrect.'; status.classList.add('show', 'error'); }
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) {
        if (status) { status.textContent = `Password update failed: ${error.message}`; status.classList.add('show', 'error'); }
        return;
      }
      if (status) { status.textContent = '✅ Password updated successfully.'; status.classList.remove('error'); status.classList.add('show'); }
      showToast('Password updated successfully.', 'success');
      document.getElementById('adminChangePasswordForm').reset();
    } catch (e) {
      if (status) { status.textContent = `Password update failed: ${e.message}`; status.classList.add('show', 'error'); }
    }
  } else {
    const storedPassword = localStorage.getItem(ADMIN_PASSWORD_OVERRIDE_KEY) || 'admin@098';
    if (current !== storedPassword) {
      if (status) { status.textContent = 'Current password is incorrect.'; status.classList.add('show', 'error'); }
      return;
    }
    localStorage.setItem(ADMIN_PASSWORD_OVERRIDE_KEY, next);
    if (status) { status.textContent = '✅ Password updated successfully (Local Mock Mode).'; status.classList.remove('error'); status.classList.add('show'); }
    showToast('Password updated successfully.', 'success');
    document.getElementById('adminChangePasswordForm').reset();
  }
};

// ==========================================
// ADMIN NOTIFICATIONS BELL (new/unactioned complaints)
// ==========================================
const ADMIN_READ_NOTIFS_KEY = 'shakti_admin_read_notification_ids';

function getAdminReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(ADMIN_READ_NOTIFS_KEY) || '[]')); } catch (e) { return new Set(); }
}

window.markAllAdminNotificationsRead = function() {
  const items = document.querySelectorAll('#adminNotifPopupList [data-notif-id]');
  const ids = getAdminReadIds();
  items.forEach(el => ids.add(el.dataset.notifId));
  localStorage.setItem(ADMIN_READ_NOTIFS_KEY, JSON.stringify([...ids]));
  fetchAdminNotifications();
};

window.toggleAdminNotificationsPopup = function() {
  const popup = document.getElementById('adminNotifPopup');
  if (!popup) return;
  const isOpen = popup.style.display === 'block';
  popup.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) fetchAdminNotifications();
};

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('adminNotifBellWrap');
  const popup = document.getElementById('adminNotifPopup');
  if (wrap && popup && popup.style.display === 'block' && !wrap.contains(e.target)) {
    popup.style.display = 'none';
  }
});

async function fetchAdminNotifications() {
  const list = document.getElementById('adminNotifPopupList');
  if (!list || !currentSessionUser || currentSessionUser.role !== 'admin') return;

  let complaints = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('complaints').select('id, name, status, created_at').order('created_at', { ascending: false }).limit(20);
    complaints = data || [];
  } else {
    complaints = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]')
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 20);
  }

  const readIds = getAdminReadIds();
  const unreadCount = complaints.filter(c => !readIds.has(c.id)).length;

  const badge = document.getElementById('adminNotifBellBadge');
  if (badge) {
    if (unreadCount > 0) { badge.textContent = unreadCount > 9 ? '9+' : unreadCount; badge.hidden = false; }
    else badge.hidden = true;
  }

  if (complaints.length === 0) {
    list.innerHTML = `<div class="notif-empty">No complaints filed yet.</div>`;
    return;
  }

  list.innerHTML = complaints.map(c => {
    const isUnread = !readIds.has(c.id);
    return `
    <div class="notif-item ${isUnread ? 'unread' : 'read'}" data-notif-id="${c.id}" onclick="markAdminNotificationRead('${c.id}'); this.classList.remove('unread'); this.classList.add('read'); switchAdminTab('complaints');">
      <div class="notif-item-title">${isUnread ? '🔵 ' : ''}New Complaint: ${c.id}</div>
      <div class="notif-item-msg">Filed by ${c.name || 'Citizen'} — Status: ${c.status}</div>
      <div class="notif-item-time">${new Date(c.created_at || new Date()).toLocaleString()}</div>
    </div>`;
  }).join('');
}

function markAdminNotificationRead(id) {
  const ids = getAdminReadIds();
  ids.add(id);
  localStorage.setItem(ADMIN_READ_NOTIFS_KEY, JSON.stringify([...ids]));
}
window.markAdminNotificationRead = markAdminNotificationRead;


// ==========================================
// 13. ADMIN WORKFLOW COMPONENT LOGIC
// ==========================================

// Dashboard Overview
let dashboardModuleBreakdown = {};
let complaintStatusChartInstance = null;

const DASH_MODULES = [
  { table: 'complaints', key: 'mock_complaints', label: 'Complaint' },
  { table: 'ars_reports', key: 'mock_ars_reports', label: 'Anti-Romeo' },
  { table: 'mhd_requests', key: 'mock_mhd_requests', label: 'Help Desk' },
  { table: 'counselling_bookings', key: 'mock_counselling_bookings', label: 'Counselling' },
  { table: 'emergency_requests', key: 'mock_emergency_requests', label: 'SOS' }
];

function classifyStatus(status) {
  if (['Resolved', 'Session Completed'].includes(status)) return 'complete';
  if (['Officer Assigned', 'Under Investigation', 'In Progress'].includes(status)) return 'assigned';
  if (['Rejected'].includes(status)) return 'rejected';
  return 'pending';
}

window.showStatusBreakdown = function(bucket) {
  const panel = document.getElementById('dashBreakdownPanel');
  const title = document.getElementById('dashBreakdownTitle');
  const body = document.getElementById('dashBreakdownBody');
  if (!panel || !dashboardModuleBreakdown[bucket]) return;

  const labels = { total: 'Total (All Modules)', pending: 'Pending', complete: 'Complete', assigned: 'Officer Assigned', rejected: 'Rejected' };
  title.textContent = `${labels[bucket]} — Breakdown by Module`;
  const data = dashboardModuleBreakdown[bucket];
  body.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-top:12px;">
      ${DASH_MODULES.map(m => `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; text-align:center;">
          <div style="font-size:22px; font-weight:800; color:#0f172a;">${data[m.table] || 0}</div>
          <div style="font-size:11px; color:#64748b;">${m.label}</div>
        </div>
      `).join('')}
    </div>
  `;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

async function renderGeneralDashboardOverview() {
  let allRecords = [];
  dashboardModuleBreakdown = { total: {}, pending: {}, complete: {}, assigned: {}, rejected: {} };

  for (const m of DASH_MODULES) {
    let list = [];
    if (isSupabaseConfigured) {
      const { data } = await supabase.from(m.table).select('id, status, created_at');
      list = data || [];
    } else {
      list = JSON.parse(localStorage.getItem(m.key) || '[]');
    }
    dashboardModuleBreakdown.total[m.table] = list.length;
    dashboardModuleBreakdown.pending[m.table] = list.filter(r => classifyStatus(r.status) === 'pending').length;
    dashboardModuleBreakdown.complete[m.table] = list.filter(r => classifyStatus(r.status) === 'complete').length;
    dashboardModuleBreakdown.assigned[m.table] = list.filter(r => classifyStatus(r.status) === 'assigned').length;
    dashboardModuleBreakdown.rejected[m.table] = list.filter(r => classifyStatus(r.status) === 'rejected').length;
    allRecords = allRecords.concat(list);
  }

  const total = allRecords.length;
  const pending = allRecords.filter(r => classifyStatus(r.status) === 'pending').length;
  const complete = allRecords.filter(r => classifyStatus(r.status) === 'complete').length;
  const assigned = allRecords.filter(r => classifyStatus(r.status) === 'assigned').length;
  const rejected = allRecords.filter(r => classifyStatus(r.status) === 'rejected').length;
  const rate = total > 0 ? Math.round((complete / total) * 100) : 0;

  document.getElementById('a-stat-total').textContent = total;
  document.getElementById('a-stat-pending').textContent = pending;
  document.getElementById('a-stat-complete').textContent = complete;
  document.getElementById('a-stat-assigned').textContent = assigned;
  document.getElementById('a-stat-rejected').textContent = rejected;
  document.getElementById('a-stat-rate').textContent = rate + '%';

  // SOS count (active/unresolved emergency requests specifically)
  let sosCount = 0;
  if (isSupabaseConfigured) {
    const { count } = await supabase.from('emergency_requests').select('*', { count: 'exact', head: true }).not('status', 'eq', 'Resolved');
    sosCount = count || 0;
  } else {
    sosCount = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]').filter(x => x.status !== 'Resolved').length;
  }
  const sosEl = document.getElementById('a-stat-sos');
  if (sosEl) sosEl.textContent = sosCount;

  // Render the combined status breakdown chart with distinct colors
  const chartCanvas = document.getElementById('complaintStatusChart');
  const legendBox = document.getElementById('chartLegendBox');
  if (chartCanvas && typeof Chart !== 'undefined') {
    const chartColors = ['#f59e0b', '#4f46e5', '#16a34a', '#dc2626'];
    const chartLabels = ['Pending', 'Officer Assigned', 'Resolved', 'Rejected'];
    const chartValues = [pending, assigned, complete, rejected];
    const chartData = {
      labels: chartLabels,
      datasets: [{ data: chartValues, backgroundColor: chartColors, borderWidth: 0, hoverOffset: 6 }]
    };
    if (complaintStatusChartInstance) complaintStatusChartInstance.destroy();
    complaintStatusChartInstance = new Chart(chartCanvas.getContext('2d'), {
      type: 'doughnut',
      data: chartData,
      options: { responsive: true, cutout: '68%', plugins: { legend: { display: false } } }
    });
    if (legendBox) {
      legendBox.innerHTML = chartLabels.map((label, i) => `
        <div class="chart-legend-item">
          <div class="chart-legend-dot" style="background:${chartColors[i]};"></div>
          <div class="chart-legend-label">${label}</div>
          <div class="chart-legend-count">${chartValues[i]}</div>
        </div>
      `).join('');
    }
  }

  // Render critical alerts & dispatch list
  renderCriticalDashboardWidgets();
  updateTopbarQuickStats();
}

async function renderCriticalDashboardWidgets() {
  const recentBody = document.getElementById('dashRecentComplaintsBody');
  const officersBody = document.getElementById('dashAvailableOfficersBody');
  if (!recentBody || !officersBody) return;

  let recentComplaints = [];
  let officers = [];

  if (isSupabaseConfigured) {
    const { data: comp } = await supabase.from('complaints').select('id, name, category, status, created_at').order('created_at', { ascending: false }).limit(8);
    recentComplaints = comp || [];
    const { data: off } = await supabase.from('officers').select('*').eq('availability', true).limit(6);
    officers = off || [];
  } else {
    recentComplaints = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]')
      .sort((a, b) => new Date(b.created_at||0) - new Date(a.created_at||0)).slice(0, 8);
    officers = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]')
      .filter(o => o.availability !== false).slice(0, 6);
  }

  // Render recent complaints
  recentBody.innerHTML = recentComplaints.length === 0
    ? '<tr><td colspan="5" style="text-align:center; padding:16px; color:#94a3b8;">No complaints filed yet.</td></tr>'
    : recentComplaints.map(r => `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.name || '—'}</td>
        <td>${r.category || 'Standard'}</td>
        <td><span class="admin-badge ${getStatusClass(r.status || 'Pending')}">${r.status || 'Pending'}</span></td>
        <td>${new Date(r.created_at || new Date()).toLocaleDateString()}</td>
      </tr>`).join('');

  // Render available officers
  officersBody.innerHTML = officers.length === 0
    ? '<tr><td colspan="4" style="text-align:center; padding:16px; color:#94a3b8;">No officers registered yet.</td></tr>'
    : officers.map(o => `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#0f766e,#0d9488); display:flex; align-items:center; justify-content:center; font-size:13px; color:#fff; overflow:hidden; flex-shrink:0;">
              ${o.photo_url ? `<img src="${o.photo_url}" style="width:100%; height:100%; object-fit:cover;">` : '👮'}
            </div>
            <span style="font-weight:700; font-size:12px;">${o.name}</span>
          </div>
        </td>
        <td>${o.designation || '—'}</td>
        <td>${o.station || o.district || '—'}</td>
        <td><span class="admin-badge" style="background:#d1fae5; color:#065f46; font-size:9.5px;">✅ Available</span></td>
      </tr>`).join('');
}

// Anti Romeo Squad Manager
// Complaints Registry Manager (citizen-filed complaints, incl. Voice FIR)
const ADMIN_REGISTRY_MODULES = [
  { table: 'complaints',             key: 'mock_complaints',              label: '📝 Complaint',    prefix: 'SC'  },
  { table: 'ars_reports',            key: 'mock_ars_reports',             label: '🚔 Anti-Romeo',   prefix: 'ARS' },
  { table: 'mhd_requests',           key: 'mock_mhd_requests',            label: '👮 Help Desk',    prefix: 'MHD' },
  { table: 'counselling_bookings',   key: 'mock_counselling_bookings',    label: '💬 Counselling',  prefix: 'CNS' },
  { table: 'emergency_requests',     key: 'mock_emergency_requests',      label: '🆘 SOS',          prefix: 'SOS' },
  { table: 'empowerment_applications', key: 'mock_empowerment_applications', label: '💪 JSS',       prefix: 'SCH' },
  { table: 'callback_requests',      key: 'mock_callback_requests',       label: '📞 Legal Aid',    prefix: 'FOB' }
];

window.fetchComplaintsAdmin = async function() {
  const tbody = document.getElementById('complaintsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:16px;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';

  const query    = (document.getElementById('compSearchQuery')?.value || '').trim().toLowerCase();
  const status   = document.getElementById('compFilterStatus')?.value || '';
  const category = document.getElementById('compFilterCategory')?.value || '';
  const station  = document.getElementById('compFilterStation')?.value || '';
  const dateFrom = document.getElementById('compFilterDateFrom')?.value || '';
  const dateTo   = document.getElementById('compFilterDateTo')?.value || '';
  const sortBy   = document.getElementById('compSortBy')?.value || 'date_desc';

  // Determine which modules to fetch (filter by category prefix if selected)
  const modulesToFetch = category
    ? ADMIN_REGISTRY_MODULES.filter(m => m.table === category)
    : ADMIN_REGISTRY_MODULES;

  let allRecords = [];

  if (isSupabaseConfigured) {
    const results = await Promise.all(modulesToFetch.map(m =>
      supabase.from(m.table).select('*').order('created_at', { ascending: false })
    ));
    results.forEach((res, i) => {
      (res.data || []).forEach(r => allRecords.push({ ...r, _module: modulesToFetch[i] }));
    });
  } else {
    modulesToFetch.forEach(m => {
      const list = JSON.parse(localStorage.getItem(m.key) || '[]');
      list.forEach(r => allRecords.push({ ...r, _module: m }));
    });
  }

  // Populate filter dropdowns only once
  populateComplaintFilterDropdowns(allRecords);

  // Apply filters
  if (status)   allRecords = allRecords.filter(r => r.status === status);
  if (station)  allRecords = allRecords.filter(r => (r.police_station || r.station || '') === station);
  if (dateFrom) allRecords = allRecords.filter(r => new Date(r.created_at || 0) >= new Date(dateFrom));
  if (dateTo)   allRecords = allRecords.filter(r => new Date(r.created_at || 0) <= new Date(dateTo + 'T23:59:59'));
  if (query) {
    allRecords = allRecords.filter(r =>
      (r.id || '').toLowerCase().includes(query) ||
      (r.name || '').toLowerCase().includes(query) ||
      (r.district || '').toLowerCase().includes(query) ||
      (r.mobile || '').includes(query)
    );
  }

  // Sort
  if (sortBy === 'date_asc') allRecords.sort((a, b) => new Date(a.created_at||0) - new Date(b.created_at||0));
  else if (sortBy === 'status') allRecords.sort((a, b) => (a.status||'').localeCompare(b.status||''));
  else if (sortBy === 'station') allRecords.sort((a, b) => (a.police_station||'').localeCompare(b.police_station||''));
  else allRecords.sort((a, b) => new Date(b.created_at||0) - new Date(a.created_at||0));

  if (allRecords.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:#94a3b8;">No records found. Try clearing the filters.</td></tr>';
    return;
  }

  tbody.innerHTML = allRecords.map(r => `
    <tr>
      <td><strong>${r.id || '—'}</strong><br><span style="font-size:10px; color:#94a3b8;">${r._module.label}</span></td>
      <td>${r.name || '—'}</td>
      <td>${r.mobile || '—'}</td>
      <td>${r.district || '—'} / ${r.police_station || r.station || 'Unassigned'}</td>
      <td>${r.category || r.type || r.scheme_title || r._module.label}</td>
      <td><span class="admin-badge ${getStatusClass(r.status || 'Submitted')}">${r.status || 'Submitted'}</span></td>
      <td>${r.officer_seen_at ? '✅ Seen' : '⏳ Not seen'}</td>
      <td style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="viewRecordFullDetail('${r._module.table}', '${r.id}')">👁️ View${r.video_url ? ' 🔊' : ''}</button>
        <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="downloadReceiptPDF('${r.id}')">🖨️ Print</button>
      </td>
    </tr>
  `).join('');
};

function populateComplaintFilterDropdowns(list) {
  const catSel = document.getElementById('compFilterCategory');
  const stationSel = document.getElementById('compFilterStation');
  if (!catSel || catSel.dataset.populated) return;

  const stations = [...new Set(list.map(r => r.police_station || r.station).filter(Boolean))];
  catSel.innerHTML = '<option value="">All Categories / Modules</option>' +
    ADMIN_REGISTRY_MODULES.map(m => `<option value="${m.table}">${m.label}</option>`).join('');
  stationSel.innerHTML = '<option value="">All Stations</option>' +
    stations.map(s => `<option value="${s}">${s}</option>`).join('');
  // Remove officer filter if exists (not meaningful across all modules)
  const officerSel = document.getElementById('compFilterOfficer');
  if (officerSel) officerSel.innerHTML = '<option value="">All Officers</option>';
  catSel.dataset.populated = 'true';
}

window.exportComplaintsData = async function(format) {
  let allRecords = [];
  if (isSupabaseConfigured) {
    const results = await Promise.all(ADMIN_REGISTRY_MODULES.map(m => supabase.from(m.table).select('*')));
    results.forEach((res, i) => {
      (res.data || []).forEach(r => allRecords.push({ module: ADMIN_REGISTRY_MODULES[i].label, ...r }));
    });
  } else {
    ADMIN_REGISTRY_MODULES.forEach(m => {
      JSON.parse(localStorage.getItem(m.key) || '[]').forEach(r => allRecords.push({ module: m.label, ...r }));
    });
  }
  if (allRecords.length === 0) { showToast('No records to export.', 'warning'); return; }

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(allRecords, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `registry_export_${Date.now()}.json`; a.click();
  } else {
    const headers = ['module', 'id', 'name', 'mobile', 'district', 'police_station', 'status', 'created_at'];
    const csvRows = [headers.join(',')];
    allRecords.forEach(r => csvRows.push(headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(',')));
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `registry_export_${Date.now()}.csv`; a.click();
  }
  showToast(`Exported ${allRecords.length} records as ${format.toUpperCase()}.`, 'success');
};

window.fetchARSAdmin = async function() {
  const tbody = document.getElementById('arsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  const query = document.getElementById('arsSearchQuery').value.trim();
  const status = document.getElementById('arsFilterStatus').value;
  
  let list = [];
  if (isSupabaseConfigured) {
    let q = supabase.from('ars_reports').select('*, assigned_officer_id(name)');
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
    if (status) list = list.filter(r => r.status === status);
  }
  
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.location.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No Anti-Romeo cases in active queue.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(r => {
    const offName = r.assigned_officer_id ? (typeof r.assigned_officer_id === 'object' ? r.assigned_officer_id.name : 'Allocated Officer') : 'Not Assigned';
    return `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.name}</td>
        <td>${r.mobile}</td>
        <td>${r.location}</td>
        <td>${offName}</td>
        <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="viewRecordFullDetail('ars_reports', '${r.id}')">👁️ View${r.video_url ? ' / 🔊' : ''}</button>
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openAdminActionModal('ars_reports', '${r.id}')">⚙️ Update Case</button>
        </td>
      </tr>
    `;
  }).join('');
};

// Mahila Help Desk Manager
window.fetchMHDAdmin = async function() {
  const tbody = document.getElementById('mhdTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  const query = document.getElementById('mhdSearchQuery').value.trim();
  const status = document.getElementById('mhdFilterStatus').value;
  
  let list = [];
  if (isSupabaseConfigured) {
    let q = supabase.from('mhd_requests').select('*, assigned_officer_id(name)');
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
    if (status) list = list.filter(r => r.status === status);
  }
  
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.police_station.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No help desk callbacks pending.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(r => {
    const offName = r.assigned_officer_id ? (typeof r.assigned_officer_id === 'object' ? r.assigned_officer_id.name : 'Allocated Officer') : 'Not Assigned';
    return `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.name}</td>
        <td>${r.mobile}</td>
        <td>${r.police_station}</td>
        <td>${r.callback_requested ? '⚠️ Yes (Urgent)' : 'No (Routine)'}</td>
        <td>${offName}</td>
        <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
        <td style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="viewRecordFullDetail('mhd_requests', '${r.id}')">👁️ View${r.video_url ? ' / 🔊' : ''}</button>
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openAdminActionModal('mhd_requests', '${r.id}')">⚙️ Update Case</button>
        </td>
      </tr>
    `;
  }).join('');
};

// Counselling Booking Manager
window.fetchCNSAdmin = async function() {
  const tbody = document.getElementById('cnsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  const query = document.getElementById('cnsSearchQuery').value.trim();
  const status = document.getElementById('cnsFilterStatus').value;
  
  let list = [];
  if (isSupabaseConfigured) {
    let q = supabase.from('counselling_bookings').select('*, assigned_counsellor_id(name)');
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    if (status) list = list.filter(r => r.status === status);
  }
  
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No counselling booking requests.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(r => {
    const cname = r.assigned_counsellor_name || (r.assigned_counsellor_id ? (typeof r.assigned_counsellor_id === 'object' ? r.assigned_counsellor_id.name : 'Specialist Counsellor') : 'Not Assigned');
    const schedule = r.session_date ? `${r.session_date} at ${r.session_time}` : 'Pending Slot Allocation';
    return `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.name}</td>
        <td>${r.mobile}</td>
        <td>${r.preferred_date} (${r.preferred_time})</td>
        <td>${cname}</td>
        <td>${schedule}</td>
        <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
        <td>
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openCounselActionModal('${r.id}')">📅 Schedule Slot</button>
        </td>
      </tr>
    `;
  }).join('');
};

// Women Empowerment applications List
window.fetchEmpowerAdmin = async function() {
  const tbody = document.getElementById('empTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  const query = document.getElementById('empSearchQuery').value.trim();
  const status = document.getElementById('empFilterStatus').value;
  
  let list = [];
  if (isSupabaseConfigured) {
    let q = supabase.from('empowerment_applications').select('*');
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    if (status) list = list.filter(r => r.status === status);
  }
  
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.scheme_title.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No empowerment scheme enrollments found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(r => `
    <tr>
      <td><input type="checkbox" class="emp-row-check" value="${r.id}"/></td>
      <td><strong>${r.id}</strong></td>
      <td>${r.scheme_title}</td>
      <td>${r.name}</td>
      <td>${r.mobile}</td>
      <td>Age: ${r.age} (${r.gender})</td>
      <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
      <td>${new Date(r.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
};

// Toggle JSS applications checkbox
window.toggleEmpSelectAll = function(chk) {
  document.querySelectorAll('.emp-row-check').forEach(box => box.checked = chk.checked);
};

// Bulk Actions for JSS / Self Defence scheme applicants
window.bulkExportSelected = async function(format) {
  const ids = Array.from(document.querySelectorAll('.emp-row-check:checked')).map(c => c.value);
  if (ids.length === 0) {
    showToast("Please select at least one application row.", "warning");
    return;
  }
  
  // Fetch details of selected
  let records = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('empowerment_applications').select('*').in('id', ids);
    records = data || [];
    
    // Auto-update status to Exported
    await supabase.from('empowerment_applications').update({ status: 'Exported' }).in('id', ids);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    records = list.filter(r => ids.includes(r.id));
    list.forEach(r => {
      if (ids.includes(r.id)) r.status = 'Exported';
    });
    localStorage.setItem(MOCK_EMPOWERMENT_APPLICATIONS, JSON.stringify(list));
  }
  
  // Write history log
  for (const r of records) {
    await insertHistoryLog(r.id, 'Exported', null, 'Application registry exported to e-Governance sheet.');
  }
  
  // Export CSV
  let csv = "Application ID,Scheme Title,Applicant Name,Mobile,Age,Gender,District,Status\n";
  records.forEach(r => {
    csv += `"${r.id}","${r.scheme_title}","${r.name}","${r.mobile}",${r.age},"${r.gender}","${r.district}","Exported"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `empowerment_export_${Date.now()}.csv`;
  a.click();
  
  showToast(`Bulk exported ${ids.length} applications and updated status to "Exported"`, 'success');
  fetchEmpowerAdmin();
};

window.bulkCloseSelected = async function() {
  const ids = Array.from(document.querySelectorAll('.emp-row-check:checked')).map(c => c.value);
  if (ids.length === 0) {
    showToast("Please select rows to close.", "warning");
    return;
  }
  
  if (isSupabaseConfigured) {
    await supabase.from('empowerment_applications').update({ status: 'Closed' }).in('id', ids);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
    list.forEach(r => {
      if (ids.includes(r.id)) r.status = 'Closed';
    });
    localStorage.setItem(MOCK_EMPOWERMENT_APPLICATIONS, JSON.stringify(list));
  }
  
  for (const id of ids) {
    await insertHistoryLog(id, 'Closed', null, 'Welfare Application marked closed.');
  }
  
  showToast(`Closed ${ids.length} applications successfully.`, 'success');
  fetchEmpowerAdmin();
};


// ==========================================
// 14. ADMIN WORKFLOW ACTION OVERLAYS
// ==========================================

// Action modal trigger (General workflow update)
window.openAdminActionModal = async function(moduleTable, id) {
  const modal = document.getElementById('modalAdminAction');
  if (!modal) return;
  
  document.getElementById('actionModuleTable').value = moduleTable;
  document.getElementById('actionRecordId').value = id;
  document.getElementById('actionRecordIdDisplay').value = id;
  
  // Setup specific workflow status items
  const statusSel = document.getElementById('actionStatus');
  statusSel.innerHTML = '';
  
  if (moduleTable === 'complaints') {
    statusSel.innerHTML = `
      <option value="Pending">Pending</option>
      <option value="Officer Assigned">Officer Assigned</option>
      <option value="Under Investigation">Under Investigation</option>
      <option value="Resolved">Resolved</option>
      <option value="Closed">Closed</option>
    `;
  } else if (moduleTable === 'ars_reports') {
    statusSel.innerHTML = `
      <option value="Submitted">Submitted</option>
      <option value="Pending Review">Pending Review</option>
      <option value="Officer Assigned">Officer Assigned</option>
      <option value="In Progress">In Progress</option>
      <option value="Resolved">Resolved</option>
    `;
  } else if (moduleTable === 'mhd_requests') {
    statusSel.innerHTML = `
      <option value="Submitted">Submitted</option>
      <option value="Call Back Requested">Call Back Requested</option>
      <option value="Officer Assigned">Officer Assigned</option>
      <option value="Issue Under Review">Issue Under Review</option>
      <option value="Resolved">Resolved</option>
    `;
  } else if (moduleTable === 'emergency_requests') {
    statusSel.innerHTML = `
      <option value="Submitted">Submitted</option>
      <option value="Dispatched">Dispatched</option>
      <option value="Resolved">Resolved</option>
    `;
  }
  
  // Populate officer list (Etawah list seed filter)
  const offSel = document.getElementById('actionOfficerId');
  offSel.innerHTML = '<option value="">-- No Officer Assigned --</option>';
  
  let officersList = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('officers').select('*').eq('type', 'police');
    officersList = data || [];
  } else {
    officersList = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]').filter(o => o.type === 'police');
  }
  
  officersList.forEach(o => {
    const dutyLabel = o.duty_status || (o.availability ? 'Available' : 'Unavailable');
    const dutyIcon = dutyLabel === 'Available' ? '🟢' : dutyLabel === 'On Leave' ? '🟡' : dutyLabel === 'Other Duty' ? '🔵' : '🔴';
    offSel.innerHTML += `<option value="${o.id}">${dutyIcon} ${o.name} (${o.designation} - ${o.station}) — ${dutyLabel}</option>`;
  });
  
  // Set current record values
  let record = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from(moduleTable).select('*').eq('id', id).single();
    record = data;
  } else {
    let key = '';
    if (moduleTable === 'complaints') key = MOCK_COMPLAINTS;
    if (moduleTable === 'ars_reports') key = MOCK_ARS_REPORTS;
    if (moduleTable === 'mhd_requests') key = MOCK_MHD_REQUESTS;
    if (moduleTable === 'emergency_requests') key = MOCK_EMERGENCY_REQUESTS;
    record = JSON.parse(localStorage.getItem(key) || '[]').find(r => r.id === id);
  }
  
  if (record) {
    statusSel.value = record.status;
    offSel.value = record.assigned_officer_id || '';
    document.getElementById('actionRemarks').value = record.remarks || '';
  }
  
  modal.classList.add('open');
};

window.toggleDelayReason = function(statusVal) {
  const container = document.getElementById('actionDelayReasonContainer');
  if (!container) return;
  
  // Show delay reason if case status updates to "In Progress" or "Resolved" and has taken time, or if admin marks escalation
  if (statusVal === 'In Progress' || statusVal === 'Resolved') {
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
};

window.submitAdminActionForm = async function() {
  const table = document.getElementById('actionModuleTable').value;
  const id = document.getElementById('actionRecordId').value;
  const status = document.getElementById('actionStatus').value;
  const officerId = document.getElementById('actionOfficerId').value;
  const remarks = document.getElementById('actionRemarks').value.trim();
  const delayReason = document.getElementById('actionDelayReason') ? document.getElementById('actionDelayReason').value.trim() : '';
  
  if (!remarks) {
    showToast("Please write updating remarks for audit.", "warning");
    return;
  }
  
  let officerName = null;
  let officerMobile = null;
  if (officerId) {
    let list = [];
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('officers').select('name, mobile').eq('id', officerId).single();
      if (data) { officerName = data.name; officerMobile = data.mobile; }
    } else {
      list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
      const o = list.find(x => x.id === officerId);
      if (o) { officerName = o.name; officerMobile = o.mobile; }
    }
  }
  
  // Build final logging remarks
  let logText = remarks;
  if (delayReason) {
    logText += ` [Delay Reason: ${delayReason}]`;
  }
  
  if (isSupabaseConfigured) {
    const updatePayload = {
      status: status,
      assigned_officer_id: officerId || null,
      remarks: remarks
    };
    await supabase.from(table).update(updatePayload).eq('id', id);
  } else {
    let key = '';
    if (table === 'complaints') key = MOCK_COMPLAINTS;
    if (table === 'ars_reports') key = MOCK_ARS_REPORTS;
    if (table === 'mhd_requests') key = MOCK_MHD_REQUESTS;
    if (table === 'emergency_requests') key = MOCK_EMERGENCY_REQUESTS;
    
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const r = list.find(x => x.id === id);
    if (r) {
      r.status = status;
      r.assigned_officer_id = officerId || null;
      r.remarks = remarks;
    }
    localStorage.setItem(key, JSON.stringify(list));
  }
  
  // Write timeline audit
  await insertHistoryLog(id, status, officerName, logText);
  
  // Trigger notification message to citizen user
  let userEmail = '';
  if (isSupabaseConfigured) {
    const { data } = await supabase.from(table).select('email').eq('id', id).single();
    userEmail = data ? data.email : null;
  } else {
    let key = '';
    if (table === 'complaints') key = MOCK_COMPLAINTS;
    if (table === 'ars_reports') key = MOCK_ARS_REPORTS;
    if (table === 'mhd_requests') key = MOCK_MHD_REQUESTS;
    if (table === 'emergency_requests') key = MOCK_EMERGENCY_REQUESTS;
    const r = JSON.parse(localStorage.getItem(key) || '[]').find(x => x.id === id);
    userEmail = r ? r.email : null;
  }
  
  if (userEmail) {
    const notiMsg = `Your request ID: ${id} status updated to "${status}". Assigned node: ${officerName || 'Patrol Unit'}. Remarks: ${remarks}`;
    if (isSupabaseConfigured) {
      await supabase.from('notifications').insert({ user_email: userEmail, title: 'Case Registry Update', message: notiMsg });
    } else {
      const notifications = JSON.parse(localStorage.getItem(MOCK_NOTIFICATIONS) || '[]');
      notifications.push({
        id: 'noti-' + Math.floor(Math.random()*10000),
        user_email: userEmail,
        title: 'Case Registry Update',
        message: notiMsg,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(MOCK_NOTIFICATIONS, JSON.stringify(notifications));
    }
  }
  
  showToast("Case details updated successfully.", "success");
  if (officerId && officerMobile) {
    const smsBody = `New case assigned: ${id} | Status: ${status} | Details: ${remarks}`.slice(0, 160);
    showToast(`📲 Demo SMS → +91 ${officerMobile} (${officerName}): "${smsBody}"`, 'info');
    console.info('DEMO SMS (configure a real SMS gateway like Twilio/MSG91 to actually deliver this):', { to: officerMobile, body: smsBody });
  }
  closeModal('modalAdminAction');
  reloadAdminView();
};

// Counselling Scheduler Actions
window.openCounselActionModal = async function(id) {
  const modal = document.getElementById('modalCounselAction');
  if (!modal) return;
  
  document.getElementById('counselActionId').value = id;
  document.getElementById('counselActionIdDisplay').value = id;
  
  // Load counselors
  const cSel = document.getElementById('counselAssignee');
  cSel.innerHTML = '<option value="">-- Select Specialist Counselor --</option>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('counsellors').select('*');
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem('mock_counsellors') || '[]');
  }
  
  list.forEach(c => {
    cSel.innerHTML += `<option value="${c.id}">${c.name} (${c.designation} - ${c.district})</option>`;
  });
  
  // Set current slot
  let record = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('counselling_bookings').select('*').eq('id', id).single();
    record = data;
  } else {
    record = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]').find(x => x.id === id);
  }
  
  if (record) {
    cSel.value = record.assigned_counsellor_id || '';
    document.getElementById('counselSessionDate').value = record.session_date || '';
    document.getElementById('counselSessionTime').value = record.session_time || '';
    document.getElementById('counselStatus').value = record.status;
    document.getElementById('counselRemarks').value = record.remarks || '';
  }
  
  modal.classList.add('open');
};

window.submitCounselActionForm = async function() {
  const id = document.getElementById('counselActionId').value;
  const cId = document.getElementById('counselAssignee').value;
  const date = document.getElementById('counselSessionDate').value;
  const time = document.getElementById('counselSessionTime').value;
  const status = document.getElementById('counselStatus').value;
  const remarks = document.getElementById('counselRemarks').value.trim();
  
  if (!cId || !date || !time || !remarks) {
    showToast("Please complete scheduling slots and remarks.", "warning");
    return;
  }
  
  let cname = '';
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('counsellors').select('name').eq('id', cId).single();
    if (data) cname = data.name;
  } else {
    const cnsList = JSON.parse(localStorage.getItem('mock_counsellors') || '[]');
    const c = cnsList.find(x => x.id === cId);
    if (c) cname = c.name;
  }
  
  if (isSupabaseConfigured) {
    await supabase.from('counselling_bookings').update({
      assigned_counsellor_id: cId,
      assigned_counsellor_name: cname,
      session_date: date,
      session_time: time,
      status: status,
      remarks: remarks
    }).eq('id', id);
  } else {
    const bookings = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    const b = bookings.find(x => x.id === id);
    if (b) {
      b.assigned_counsellor_id = cId;
      b.assigned_counsellor_name = cname;
      b.session_date = date;
      b.session_time = time;
      b.status = status;
      b.remarks = remarks;
    }
    localStorage.setItem(MOCK_COUNSELLING_BOOKINGS, JSON.stringify(bookings));
  }
  
  // Write timeline
  await insertHistoryLog(id, status, cname, `Counselling session scheduled on ${date} at ${time}. Remarks: ${remarks}`);
  
  // Trigger notification
  let userEmail = '';
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('counselling_bookings').select('email').eq('id', id).single();
    userEmail = data ? data.email : null;
  } else {
    const b = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]').find(x => x.id === id);
    userEmail = b ? b.email : null;
  }
  
  if (userEmail) {
    const notiMsg = `Counselling booking ${id} scheduled: ${date} at ${time} with ${cname}. Notes: ${remarks}`;
    if (isSupabaseConfigured) {
      await supabase.from('notifications').insert({ user_email: userEmail, title: 'Session Scheduled', message: notiMsg });
    } else {
      const notifications = JSON.parse(localStorage.getItem(MOCK_NOTIFICATIONS) || '[]');
      notifications.push({
        id: 'noti-' + Math.floor(Math.random()*10000),
        user_email: userEmail,
        title: 'Session Scheduled',
        message: notiMsg,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(MOCK_NOTIFICATIONS, JSON.stringify(notifications));
    }
  }
  
  showToast("Counselling session scheduled.", "success");
  closeModal('modalCounselAction');
  reloadAdminView();
};


// ==========================================
// 15. DIRECTORY & helplines (Etawah editable)
// ==========================================

// Officers CRUD
window.fetchOfficersAdmin = async function() {
  const tbody = document.getElementById('adminOfficersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('officers').select('*').order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
  }
  
  tbody.innerHTML = list.map(o => `
    <tr>
      <td>
        <div style="width:36px; height:36px; border-radius:50%; overflow:hidden; background:#1e293b;">
          <img src="${o.photo_url || 'https://via.placeholder.com/50'}" style="width:100%; height:100%; object-fit:cover;"/>
        </div>
      </td>
      <td><strong>${o.name}</strong></td>
      <td>${o.pno || '—'}</td>
      <td><span class="admin-badge">${o.type.toUpperCase()}</span></td>
      <td>${o.designation}</td>
      <td>${o.mobile}</td>
      <td>${o.station} (${o.district})</td>
      <td>
        <span class="admin-badge status-pending" style="background:${o.availability ? '#10b981' : '#ef4444'}1A; color:${o.availability ? '#10b981' : '#ef4444'};">
          ${o.availability ? 'Available' : 'Unavailable'}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openOfficerModalEdit('${o.id}')">✏️ Edit</button>
          <button class="admin-btn danger" style="padding:4px 8px; font-size:11px;" onclick="deleteOfficer('${o.id}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
};

window.openOfficerModalAdd = function() {
  const modal = document.getElementById('modalOfficerEdit');
  if (!modal) return;
  
  document.getElementById('officerModalTitle').textContent = 'Add New Officer Profile';
  document.getElementById('editOfficerId').value = '';
  document.getElementById('officerEditForm').reset();
  const preview = document.getElementById('officerEditAvatarPreview');
  if (preview) preview.textContent = '👮';
  modal.classList.add('open');
};

window.openOfficerModalEdit = async function(id) {
  const modal = document.getElementById('modalOfficerEdit');
  if (!modal) return;
  
  document.getElementById('officerModalTitle').textContent = 'Edit Officer Profile';
  document.getElementById('editOfficerId').value = id;
  
  let o = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('officers').select('*').eq('id', id).single();
    o = data;
  } else {
    o = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]').find(x => x.id === id);
  }
  
  if (o) {
    document.getElementById('eo-name').value = o.name;
    document.getElementById('eo-pno').value = o.pno || '';
    document.getElementById('eo-type').value = o.type;
    document.getElementById('eo-designation').value = o.designation;
    document.getElementById('eo-mobile').value = o.mobile;
    document.getElementById('eo-email').value = o.email || '';
    document.getElementById('eo-district').value = o.district;
    document.getElementById('eo-station').value = o.station;
    document.getElementById('eo-photo').value = o.photo_url || '';
    const preview = document.getElementById('officerEditAvatarPreview');
    if (preview) {
      if (o.photo_url) preview.innerHTML = `<img src="${o.photo_url}"/>`;
      else preview.textContent = '👮';
    }
  }
  
  modal.classList.add('open');
};

window.handleOfficerPhotoUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('eo-photo').value = reader.result;
    const preview = document.getElementById('officerEditAvatarPreview');
    if (preview) preview.innerHTML = `<img src="${reader.result}"/>`;
  };
  reader.readAsDataURL(file);
};

window.submitOfficerForm = async function() {
  const id = document.getElementById('editOfficerId').value;
  const name = document.getElementById('eo-name').value.trim();
  const pno = document.getElementById('eo-pno').value.trim();
  const type = document.getElementById('eo-type').value;
  const designation = document.getElementById('eo-designation').value.trim();
  const mobile = document.getElementById('eo-mobile').value.trim();
  const email = document.getElementById('eo-email').value.trim();
  const district = document.getElementById('eo-district').value;
  const station = document.getElementById('eo-station').value.trim();
  const photo = document.getElementById('eo-photo').value.trim();
  
  if (!name || !pno || !designation || !mobile || !station) {
    showToast("Please fill out required fields.", "warning");
    return;
  }
  
  const payload = {
    name, pno, type, designation, mobile, email, district, station, photo_url: photo
  };
  // New officers default to Available; existing officers keep managing their own availability from their portal
  if (!id) { payload.availability = true; payload.duty_status = 'Available'; }
  
  if (isSupabaseConfigured) {
    let result;
    if (id) {
      result = await supabase.from('officers').update(payload).eq('id', id);
    } else {
      result = await supabase.from('officers').insert(payload);
    }
    if (result.error && /pno/i.test(result.error.message || '')) {
      // "pno" column not added to the officers table yet — retry without it so the save still succeeds
      console.warn('officers.pno column not found, retrying without it:', result.error.message);
      const { pno: _drop, ...fallbackPayload } = payload;
      if (id) await supabase.from('officers').update(fallbackPayload).eq('id', id);
      else await supabase.from('officers').insert(fallbackPayload);
    }
    showToast(id ? "Profile updated successfully." : "New profile added to directory.", "success");
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
    if (id) {
      const idx = list.findIndex(x => x.id === id);
      if (idx !== -1) {
        list[idx] = { id, ...payload };
        showToast("Profile updated successfully.", "success");
      }
    } else {
      list.push({ id: 'off-' + Math.floor(Math.random()*1000), ...payload });
      showToast("New profile added to directory.", "success");
    }
    localStorage.setItem(MOCK_OFFICERS, JSON.stringify(list));
  }
  
  closeModal('modalOfficerEdit');
  fetchOfficersAdmin();
};

// ==========================================
// OFFICER PORTAL
// ==========================================
const OFFICER_CASE_TABLES = ['complaints', 'ars_reports', 'mhd_requests', 'emergency_requests'];

async function getOfficerRecord(officerId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('officers').select('*').eq('id', officerId).single();
    return data;
  }
  return JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]').find(o => o.id === officerId);
}

async function loadOfficerSelfProfile() {
  const officer = await getOfficerRecord(currentSessionUser.officerId);
  if (officer) {
    document.getElementById('officerSelfName').textContent = officer.name;
    document.getElementById('officerSelfMeta').textContent = `${officer.pno || 'PNO N/A'} · ${officer.station}`;
    document.getElementById('officerDutyStatus').value = officer.duty_status || (officer.availability ? 'Available' : 'Other Duty');
  }
  fetchOfficerAssignedCases();
}

window.updateOfficerDutyStatus = async function(status) {
  const officerId = currentSessionUser.officerId;
  const availability = status === 'Available';
  if (isSupabaseConfigured) {
    let result = await supabase.from('officers').update({ duty_status: status, availability }).eq('id', officerId);
    if (result.error && /duty_status/i.test(result.error.message || '')) {
      console.warn('officers.duty_status column not found, saving availability only:', result.error.message);
      await supabase.from('officers').update({ availability }).eq('id', officerId);
    }
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
    const o = list.find(x => x.id === officerId);
    if (o) { o.duty_status = status; o.availability = availability; }
    localStorage.setItem(MOCK_OFFICERS, JSON.stringify(list));
  }
  showToast(`Duty status updated to "${status}".`, 'success');
};

window.fetchOfficerAssignedCases = async function() {
  const tbody = document.getElementById('officerCasesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';

  const officerId = currentSessionUser.officerId;
  const query = (document.getElementById('officerSearchQuery').value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('officerFilterStatus').value;

  let allCases = [];
  for (const table of OFFICER_CASE_TABLES) {
    let list = [];
    if (isSupabaseConfigured) {
      const { data } = await supabase.from(table).select('*').eq('assigned_officer_id', officerId);
      list = data || [];
    } else {
      let key = table === 'complaints' ? MOCK_COMPLAINTS : table === 'ars_reports' ? MOCK_ARS_REPORTS : table === 'mhd_requests' ? MOCK_MHD_REQUESTS : MOCK_EMERGENCY_REQUESTS;
      list = JSON.parse(localStorage.getItem(key) || '[]').filter(r => r.assigned_officer_id === officerId);
    }
    list.forEach(r => allCases.push({ ...r, _table: table }));
  }

  if (statusFilter) allCases = allCases.filter(r => r.status === statusFilter);
  if (query) allCases = allCases.filter(r => (r.id || '').toLowerCase().includes(query) || (r.name || '').toLowerCase().includes(query));

  allCases.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  document.getElementById('officerStatTotal').textContent = allCases.length;
  document.getElementById('officerStatUnseen').textContent = allCases.filter(r => !r.officer_seen_at).length;
  document.getElementById('officerStatProgress').textContent = allCases.filter(r => ['Under Investigation', 'In Progress', 'Officer Assigned'].includes(r.status)).length;
  document.getElementById('officerStatResolved').textContent = allCases.filter(r => r.status === 'Resolved').length;

  if (allCases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No cases assigned to you yet.</td></tr>';
    return;
  }

  const typeLabels = { complaints: '📝 Complaint', ars_reports: '🚔 Anti-Romeo', mhd_requests: '👮 Help Desk', emergency_requests: '🚨 SOS' };

  tbody.innerHTML = allCases.map(r => `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td>${typeLabels[r._table] || r._table}</td>
      <td>${r.name || '—'}</td>
      <td>${r.mobile || '—'}</td>
      <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
      <td>${r.officer_seen_at ? `✅ ${new Date(r.officer_seen_at).toLocaleString()}` : '⏳ Not seen'}</td>
      <td>${new Date(r.created_at || new Date()).toLocaleDateString()}</td>
      <td><button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openOfficerCaseModal('${r._table}','${r.id}')">👁️ Open Case</button></td>
    </tr>
  `).join('');
};

window.openOfficerCaseModal = async function(table, id) {
  const modal = document.getElementById('modalOfficerCase');
  const body = document.getElementById('officerCaseDetailBody');
  document.getElementById('ocTable').value = table;
  document.getElementById('ocId').value = id;
  body.innerHTML = 'Loading...';
  modal.classList.add('open');

  let record = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from(table).select('*').eq('id', id).single();
    record = data;
  } else {
    let key = table === 'complaints' ? MOCK_COMPLAINTS : table === 'ars_reports' ? MOCK_ARS_REPORTS : table === 'mhd_requests' ? MOCK_MHD_REQUESTS : MOCK_EMERGENCY_REQUESTS;
    record = JSON.parse(localStorage.getItem(key) || '[]').find(r => r.id === id);
  }
  if (!record) { body.innerHTML = '<p style="color:#fca5a5;">Record not found.</p>'; return; }

  // Stamp "seen" the moment the officer opens the case, so admin knows it's been viewed
  if (!record.officer_seen_at) {
    const seenAt = new Date().toISOString();
    if (isSupabaseConfigured) {
      const result = await supabase.from(table).update({ officer_seen_at: seenAt }).eq('id', id);
      if (result.error) console.warn(`officer_seen_at column not found on ${table} — add it to persist "seen" status:`, result.error.message);
    } else {
      let key = table === 'complaints' ? MOCK_COMPLAINTS : table === 'ars_reports' ? MOCK_ARS_REPORTS : table === 'mhd_requests' ? MOCK_MHD_REQUESTS : MOCK_EMERGENCY_REQUESTS;
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      const r = list.find(x => x.id === id);
      if (r) r.officer_seen_at = seenAt;
      localStorage.setItem(key, JSON.stringify(list));
    }
    record.officer_seen_at = seenAt;
  }

  const rows = [
    ['Case ID', record.id],
    ['Citizen Name', record.name || '—'],
    ['Mobile', record.mobile || '—'],
    ['District / Station', `${record.district || '—'} / ${record.police_station || record.station || '—'}`],
    ['Status', record.status || '—'],
    ['Filed On', new Date(record.created_at || new Date()).toLocaleString()]
  ];

  let locationHtml = '';
  if (record.location) {
    locationHtml = `<div class="active-ticket-detail-row"><strong>Location:</strong> <span>${linkifyGpsMentions(record.location)}</span></div>`;
  }

  let descHtml = '';
  if (record.description || record.reason) {
    const rawDesc = (record.description || record.reason || '').replace(/</g,'&lt;');
    descHtml = `<div style="margin-top:12px; background:rgba(255,255,255,0.05); border-radius:8px; padding:12px;">
      <strong style="display:block; margin-bottom:6px; color:#f9a8d4;">📝 Description:</strong>
      <div style="white-space:pre-wrap;">${linkifyGpsMentions(rawDesc)}</div>
    </div>`;
  }

  let audioHtml = '';
  if (record.video_url) {
    audioHtml = `<div style="margin-top:12px; background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:12px;">
      <strong style="display:block; margin-bottom:8px; color:#38bdf8;">🔊 Citizen's Voice Recording:</strong>
      <audio controls style="width:100%;" src="${record.video_url}"></audio>
    </div>`;
  }

  const printHtml = `<div style="margin-top:16px;"><button class="admin-btn primary" type="button" onclick="downloadReceiptPDF('${record.id}')">🖨️ Print / Download PDF</button></div>`;

  body.innerHTML = rows.map(([l, v]) => `<div class="active-ticket-detail-row"><strong>${l}:</strong> <span>${v}</span></div>`).join('') + locationHtml + descHtml + audioHtml + printHtml;

  const statusSel = document.getElementById('ocStatus');
  statusSel.innerHTML = `
    <option value="Under Investigation">Under Investigation</option>
    <option value="In Progress">In Progress</option>
    <option value="Resolved">Resolved</option>
  `;
  statusSel.value = (record.status && record.status !== 'Officer Assigned') ? record.status : 'Under Investigation';
  document.getElementById('ocRemarks').value = '';
};

window.submitOfficerCaseUpdate = async function() {
  const table = document.getElementById('ocTable').value;
  const id = document.getElementById('ocId').value;
  const status = document.getElementById('ocStatus').value;
  const remarks = document.getElementById('ocRemarks').value.trim();
  if (!remarks) { showToast('Please describe the action taken.', 'warning'); return; }

  if (isSupabaseConfigured) {
    await supabase.from(table).update({ status, remarks }).eq('id', id);
  } else {
    let key = table === 'complaints' ? MOCK_COMPLAINTS : table === 'ars_reports' ? MOCK_ARS_REPORTS : table === 'mhd_requests' ? MOCK_MHD_REQUESTS : MOCK_EMERGENCY_REQUESTS;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const r = list.find(x => x.id === id);
    if (r) { r.status = status; r.remarks = remarks; }
    localStorage.setItem(key, JSON.stringify(list));
  }

  const officer = await getOfficerRecord(currentSessionUser.officerId);
  await insertHistoryLog(id, status, officer ? officer.name : null, remarks);
  showToast('Case updated — citizen and admin will see this live.', 'success');
  closeModal('modalOfficerCase');
  fetchOfficerAssignedCases();
};

window.deleteOfficer = async function(id) {
  if (!confirm("Are you sure you want to remove this officer?")) return;
  
  if (isSupabaseConfigured) {
    await supabase.from('officers').delete().eq('id', id);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
    localStorage.setItem(MOCK_OFFICERS, JSON.stringify(list.filter(x => x.id !== id)));
  }
  
  showToast("Profile deleted successfully.", "success");
  fetchOfficersAdmin();
};

// Counsellors CRUD
window.fetchCounsellorsAdmin = async function() {
  const tbody = document.getElementById('adminCounsellorsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('counsellors').select('*').order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem('mock_counsellors') || '[]');
  }

  const query = document.getElementById('searchCounsellor')?.value.toLowerCase().trim() || '';
  const dist = document.getElementById('filterCounsellorDistrict')?.value || '';
  const status = document.getElementById('filterCounsellorStatus')?.value || '';

  if (query) {
    list = list.filter(c => 
      c.name.toLowerCase().includes(query) ||
      (c.designation && c.designation.toLowerCase().includes(query)) ||
      c.mobile.includes(query)
    );
  }
  if (dist) {
    list = list.filter(c => c.district === dist);
  }
  if (status) {
    list = list.filter(c => c.status === status);
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.designation || 'Counsellor'}</td>
      <td>${c.mobile}</td>
      <td>${c.email || '-'}</td>
      <td>${c.police_station || '-'} (${c.district})</td>
      <td>
        <span class="admin-badge status-pending" style="background:${c.availability ? '#10b981' : '#ef4444'}1A; color:${c.availability ? '#10b981' : '#ef4444'};">
          ${c.availability ? 'Available' : 'Unavailable'}
        </span>
      </td>
      <td>
        <span class="admin-badge ${c.status === 'Active' ? 'status-resolved' : 'status-rejected'}">
          ${c.status}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openCounsellorModalEdit('${c.id}')">✏️ Edit</button>
          <button class="admin-btn danger" style="padding:4px 8px; font-size:11px;" onclick="deleteCounsellor('${c.id}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
};

window.openCounsellorModalAdd = function() {
  const modal = document.getElementById('modalCounsellorEdit');
  if (!modal) return;
  
  document.getElementById('counsellorModalTitle').textContent = '💬 Add New Counsellor';
  document.getElementById('editCounsellorId').value = '';
  document.getElementById('counsellorEditForm').reset();
  modal.classList.add('open');
};

window.openCounsellorModalEdit = async function(id) {
  const modal = document.getElementById('modalCounsellorEdit');
  if (!modal) return;
  
  document.getElementById('counsellorModalTitle').textContent = '💬 Edit Counsellor Profile';
  document.getElementById('editCounsellorId').value = id;
  
  let c = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('counsellors').select('*').eq('id', id).single();
    c = data;
  } else {
    c = JSON.parse(localStorage.getItem('mock_counsellors') || '[]').find(x => x.id === id);
  }
  
  if (c) {
    document.getElementById('eco-name').value = c.name;
    document.getElementById('eco-designation').value = c.designation || '';
    document.getElementById('eco-mobile').value = c.mobile;
    document.getElementById('eco-email').value = c.email || '';
    document.getElementById('eco-district').value = c.district;
    document.getElementById('eco-station').value = c.police_station || '';
    document.getElementById('eco-availability').value = c.availability ? 'true' : 'false';
    document.getElementById('eco-status').value = c.status;
  }
  
  modal.classList.add('open');
};

window.submitCounsellorForm = async function() {
  const id = document.getElementById('editCounsellorId').value;
  const name = document.getElementById('eco-name').value.trim();
  const designation = document.getElementById('eco-designation').value.trim();
  const mobile = document.getElementById('eco-mobile').value.trim();
  const email = document.getElementById('eco-email').value.trim();
  const district = document.getElementById('eco-district').value;
  const police_station = document.getElementById('eco-station').value.trim();
  const availability = document.getElementById('eco-availability').value === 'true';
  const status = document.getElementById('eco-status').value;
  
  if (!name || !designation || !mobile || !police_station) {
    showToast("Please fill out required fields.", "warning");
    return;
  }
  
  const payloadCns = {
    name, designation, mobile, email, district, police_station, availability, status
  };
  
  const payloadOff = {
    name, type: 'counsellor', designation, mobile, email, district, station: police_station, availability, photo_url: ''
  };
  
  if (isSupabaseConfigured) {
    try {
      if (id) {
        // Update both tables
        await supabase.from('counsellors').update(payloadCns).eq('id', id);
        await supabase.from('officers').update(payloadOff).eq('id', id);
        showToast("Counsellor profile updated successfully.", "success");
      } else {
        // Insert into officers first to get the generated UUID
        const { data: offData, error: offErr } = await supabase.from('officers').insert(payloadOff).select('id').single();
        if (offErr) throw offErr;
        
        // Insert into counsellors using the same UUID
        const { error: cnsErr } = await supabase.from('counsellors').insert({ id: offData.id, ...payloadCns });
        if (cnsErr) throw cnsErr;
        
        showToast("New counsellor profile added.", "success");
      }
    } catch (err) {
      console.error('submitCounsellorForm DB error:', err);
      showToast(`Database error: ${err.message}`, "error");
    }
  } else {
    // Simulator Dual Writes
    const cnsList = JSON.parse(localStorage.getItem('mock_counsellors') || '[]');
    const offList = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
    
    if (id) {
      const cIdx = cnsList.findIndex(x => x.id === id);
      if (cIdx !== -1) cnsList[cIdx] = { id, ...payloadCns, created_at: cnsList[cIdx].created_at };
      
      const oIdx = offList.findIndex(x => x.id === id);
      if (oIdx !== -1) offList[oIdx] = { id, ...payloadOff };
      
      showToast("Counsellor profile updated successfully.", "success");
    } else {
      const newId = 'cns-' + Math.floor(Math.random()*10000);
      cnsList.push({ id: newId, ...payloadCns, created_at: new Date().toISOString() });
      offList.push({ id: newId, ...payloadOff });
      showToast("New counsellor profile added.", "success");
    }
    localStorage.setItem('mock_counsellors', JSON.stringify(cnsList));
    localStorage.setItem(MOCK_OFFICERS, JSON.stringify(offList));
  }
  
  closeModal('modalCounsellorEdit');
  fetchCounsellorsAdmin();
};

window.deleteCounsellor = async function(id) {
  if (!confirm("Are you sure you want to remove this counsellor?")) return;
  
  if (isSupabaseConfigured) {
    try {
      // Delete from both tables
      await supabase.from('counsellors').delete().eq('id', id);
      await supabase.from('officers').delete().eq('id', id);
      showToast("Counsellor profile deleted successfully.", "success");
    } catch (err) {
      console.error('deleteCounsellor DB error:', err);
      showToast(`Database error: ${err.message}`, "error");
    }
  } else {
    const cnsList = JSON.parse(localStorage.getItem('mock_counsellors') || '[]');
    const offList = JSON.parse(localStorage.getItem(MOCK_OFFICERS) || '[]');
    
    localStorage.setItem('mock_counsellors', JSON.stringify(cnsList.filter(x => x.id !== id)));
    localStorage.setItem(MOCK_OFFICERS, JSON.stringify(offList.filter(x => x.id !== id)));
    showToast("Counsellor profile deleted successfully.", "success");
  }
  
  fetchCounsellorsAdmin();
};

// Helpline Contacts CRUD
window.fetchContactsAdmin = async function() {
  const tbody = document.getElementById('adminContactsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('contacts').select('*').order('priority', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_CONTACTS) || '[]');
  }
  
  tbody.innerHTML = list.map(c => `
    <tr>
      <td>
        <div style="width:36px; height:36px; border-radius:50%; overflow:hidden; background:#1e293b;">
          <img src="${c.photo_url || 'https://via.placeholder.com/50'}" style="width:100%; height:100%; object-fit:cover;"/>
        </div>
      </td>
      <td><strong>${c.department}</strong></td>
      <td>${c.designation || 'N/A'}</td>
      <td>${c.officer_name || 'N/A'}</td>
      <td>${c.phone_number}</td>
      <td>${c.priority}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openContactModalEdit('${c.id}')">✏️ Edit</button>
          <button class="admin-btn danger" style="padding:4px 8px; font-size:11px;" onclick="deleteContact('${c.id}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
};

window.openContactModalAdd = function() {
  const modal = document.getElementById('modalContactEdit');
  if (!modal) return;
  
  document.getElementById('contactModalTitle').textContent = '📞 Add Helpline Card';
  document.getElementById('editContactId').value = '';
  document.getElementById('contactEditForm').reset();
  modal.classList.add('open');
};

window.openContactModalEdit = async function(id) {
  const modal = document.getElementById('modalContactEdit');
  if (!modal) return;
  
  document.getElementById('contactModalTitle').textContent = '📞 Edit Helpline Card';
  document.getElementById('editContactId').value = id;
  
  let c = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('contacts').select('*').eq('id', id).single();
    c = data;
  } else {
    c = JSON.parse(localStorage.getItem(MOCK_CONTACTS) || '[]').find(x => x.id === id);
  }
  
  if (c) {
    document.getElementById('ec-department').value = c.department;
    document.getElementById('ec-officer').value = c.officer_name || '';
    document.getElementById('ec-designation').value = c.designation || '';
    document.getElementById('ec-phone').value = c.phone_number;
    document.getElementById('ec-priority').value = c.priority || 0;
    document.getElementById('ec-photo').value = c.photo_url || '';
  }
  
  modal.classList.add('open');
};

window.submitContactForm = async function() {
  const id = document.getElementById('editContactId').value;
  const dept = document.getElementById('ec-department').value.trim();
  const off = document.getElementById('ec-officer').value.trim();
  const desig = document.getElementById('ec-designation').value.trim();
  const phone = document.getElementById('ec-phone').value.trim();
  const priority = document.getElementById('ec-priority').value;
  const photo = document.getElementById('ec-photo').value.trim();
  
  if (!dept || !phone) {
    showToast("Department and phone number are required.", "warning");
    return;
  }
  
  const payload = {
    department: dept, officer_name: off || null, designation: desig || null, phone_number: phone, priority: parseInt(priority) || 0, photo_url: photo || null
  };
  
  if (isSupabaseConfigured) {
    if (id) {
      await supabase.from('contacts').update(payload).eq('id', id);
      showToast("Helpline updated.", "success");
    } else {
      await supabase.from('contacts').insert(payload);
      showToast("Helpline card added.", "success");
    }
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_CONTACTS) || '[]');
    if (id) {
      const idx = list.findIndex(x => x.id === id);
      if (idx !== -1) {
        list[idx] = { id, ...payload };
        showToast("Helpline updated.", "success");
      }
    } else {
      list.push({ id: 'c-' + Math.floor(Math.random()*1000), ...payload });
      showToast("Helpline card added.", "success");
    }
    localStorage.setItem(MOCK_CONTACTS, JSON.stringify(list));
  }
  
  closeModal('modalContactEdit');
  fetchContactsAdmin();
  fetchEmergencyContacts();
};

window.deleteContact = async function(id) {
  if (!confirm("Remove this helpline card?")) return;
  
  if (isSupabaseConfigured) {
    await supabase.from('contacts').delete().eq('id', id);
  } else {
    const list = JSON.parse(localStorage.getItem(MOCK_CONTACTS) || '[]');
    localStorage.setItem(MOCK_CONTACTS, JSON.stringify(list.filter(x => x.id !== id)));
  }
  
  showToast("Helpline deleted.", "success");
  fetchContactsAdmin();
  fetchEmergencyContacts();
};


// ==========================================
// 16. EMERGENCY SOS DISTRESS LIVE QUEUE
// ==========================================
// ==========================================
// SAFE TRAVEL MONITOR ADMIN
// ==========================================
window.fetchTravelMonitorAdmin = async function() {
  const tbody = document.getElementById('travelTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:16px;">Loading...</td></tr>';

  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('emergency_requests').select('*')
      .in('type', ['Safe Travel Mode', 'Safe Travel SOS 🚨'])
      .order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]')
      .filter(r => r.type === 'Safe Travel Mode' || r.type === 'Safe Travel SOS 🚨')
      .sort((a, b) => new Date(b.created_at||0) - new Date(a.created_at||0));
  }

  // Show SOS alerts at top
  const sosAlerts = list.filter(r => r.type === 'Safe Travel SOS 🚨' || r.status === 'SOS Triggered' || r.status === 'SOS ACTIVE');
  const sosArea = document.getElementById('travelAdminSOSAlerts');
  if (sosArea) {
    if (sosAlerts.length === 0) {
      sosArea.innerHTML = '';
    } else {
      sosArea.innerHTML = sosAlerts.map(r => {
        const coordMatch = (r.location||'').match(/GPS:\s*([0-9.\-]+),\s*([0-9.\-]+)/);
        const mapLink = coordMatch ? `<a href="https://maps.google.com/?q=${coordMatch[1]},${coordMatch[2]}" target="_blank" style="color:#fca5a5; font-weight:700;">📍 Open Live Location on Map</a> &nbsp;·&nbsp; <a href="https://www.google.com/maps/dir/?api=1&destination=${coordMatch[1]},${coordMatch[2]}" target="_blank" style="color:#fde68a; font-weight:700;">🧭 Get Directions</a>` : `<span style="color:#fca5a5;">GPS unavailable — Last known: ${r.location||'Unknown'}</span>`;
        return `<div class="travel-sos-alert-card">
          <div class="travel-sos-alert-header">🚨 SOS ALERT — ${r.name} (${r.mobile})</div>
          <div class="travel-sos-alert-detail">
            ${r.description || r.remarks || '—'}<br><br>
            ${mapLink}
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="admin-btn primary" onclick="openAdminActionModal('emergency_requests','${r.id}')">⚡ Take Action Now</button>
            <button class="admin-btn" onclick="viewRecordFullDetail('emergency_requests','${r.id}')">👁️ Full Details</button>
          </div>
        </div>`;
      }).join('');
    }
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px; color:#64748b;">No Safe Travel journeys filed yet.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(r => {
    const routeMatch = (r.remarks||r.description||'').match(/Route (.+?) to (.+?) in /);
    const start = routeMatch ? routeMatch[1] : r.location || '—';
    const end = routeMatch ? routeMatch[2] : '—';
    const plateMatch = (r.remarks||r.description||'').match(/\(([^)]+)\)/);
    const plate = plateMatch ? plateMatch[1] : '—';
    const transportMatch = (r.remarks||r.description||'').match(/ in (.+?) \(/);
    const transport = transportMatch ? transportMatch[1] : '—';
    const isSOS = r.type === 'Safe Travel SOS 🚨' || r.status === 'SOS ACTIVE' || r.status === 'SOS Triggered';
    return `
    <tr style="${isSOS ? 'background:#fff1f2; border-left:3px solid #dc2626;' : ''}">
      <td><strong>${r.id}</strong>${isSOS ? ' <span style="color:#dc2626; font-weight:900; font-size:11px;">🚨SOS</span>' : ''}</td>
      <td>${r.name || '—'}</td>
      <td>${r.mobile || '—'}</td>
      <td>${start} → ${end}</td>
      <td>${transport} · ${plate}</td>
      <td>${r.district || '—'}</td>
      <td><span class="admin-badge ${getStatusClass(r.status||'Submitted')}">${r.status||'Submitted'}</span></td>
      <td>${new Date(r.created_at||new Date()).toLocaleString()}</td>
      <td style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="admin-btn ${isSOS ? 'danger' : 'primary'}" style="padding:4px 8px; font-size:11px;" onclick="showTravelLocationAdmin('${r.id}', '${(r.location||'').replace(/'/g,"\\'")}', '${start.replace(/'/g,"\\'")}', '${end.replace(/'/g,"\\'")}', '${r.name||''}', '${r.mobile||''}', '${transport}', '${plate}')">📍 ${isSOS ? 'LIVE LOCATION' : 'View'}</button>
        ${isSOS ? `<button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openAdminActionModal('emergency_requests','${r.id}')">⚡ Act</button>` : ''}
      </td>
    </tr>`;
  }).join('');
};

window.showTravelLocationAdmin = function(id, locationRaw, start, end, name, mobile, transport, plate) {
  const mapArea = document.getElementById('travelAdminMapArea');
  const detailEl = document.getElementById('travelSelectedDetail');
  const mapEl = document.getElementById('travelLiveMapEmbed');
  const linksEl = document.getElementById('travelDirectionLinks');
  if (!mapArea || !mapEl) return;

  mapArea.style.display = 'block';
  mapArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Extract GPS coordinates from location string
  const coordMatch = locationRaw.match(/GPS:\s*([0-9.\-]+),\s*([0-9.\-]+)/);

  detailEl.innerHTML = `
    <div class="record-detail-field"><label>Traveller</label><span>${name} · ${mobile}</span></div>
    <div class="record-detail-field"><label>Route</label><span>${start} → ${end}</span></div>
    <div class="record-detail-field"><label>Vehicle</label><span>${transport} · ${plate}</span></div>
    <div class="record-detail-field"><label>Journey ID</label><span>${id}</span></div>
  `;

  if (coordMatch) {
    const lat = coordMatch[1], lng = coordMatch[2];
    mapEl.innerHTML = `<iframe class="travel-map-embed" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng)-.008},${parseFloat(lat)-.008},${parseFloat(lng)+.008},${parseFloat(lat)+.008}&marker=${lat},${lng}&layer=mapnik"></iframe>`;
    linksEl.innerHTML = `
      <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" class="admin-btn primary" style="text-decoration:none;">📍 Open on Google Maps</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="admin-btn" style="text-decoration:none;">🧭 Navigate / Directions</a>
    `;
  } else {
    // No GPS coords — show text-based map link
    const query = encodeURIComponent(locationRaw || start);
    mapEl.innerHTML = `<div style="background:#f1f5f9; border-radius:10px; padding:20px; text-align:center; color:#64748b;"><p>📍 Location: <strong>${locationRaw || start}</strong></p><p style="font-size:12px; margin-top:8px;">GPS coordinates not available. Citizen may have entered a text address.</p></div>`;
    linksEl.innerHTML = `<a href="https://maps.google.com/maps?q=${query}" target="_blank" class="admin-btn primary" style="text-decoration:none;">🔍 Search Location on Maps</a>`;
  }
};

window.fetchEmergencySOSAdmin = async function() {
  const tbody = document.getElementById('emergencyTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('emergency_requests').select('*').order('created_at', { ascending: false });
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
  }
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#a3b1cc;">No emergency alerts active.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(r => `
    <tr style="${r.status === 'Submitted' ? 'background:rgba(239, 68, 68, 0.05); border-left:3px solid #ef4444;' : ''}">
      <td><strong>${r.id}</strong></td>
      <td>${r.name}</td>
      <td>${r.mobile}</td>
      <td><span class="admin-badge status-pending" style="background:#ef44441A; color:#ef4444;">${r.type}</span></td>
      <td>${linkifyGpsMentions(r.location) || r.location}</td>
      <td><span class="admin-badge ${getStatusClass(r.status)}">${r.status}</span></td>
      <td>${new Date(r.created_at).toLocaleTimeString()}</td>
      <td style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="viewRecordFullDetail('emergency_requests', '${r.id}')">👁️ View</button>
        <button class="admin-btn" style="padding:4px 8px; font-size:11px;" onclick="openAdminActionModal('emergency_requests', '${r.id}')">🚨 Dispatch</button>
      </td>
    </tr>
  `).join('');
};


// ==========================================
// 17. SYSTEM LOGS & AUDIT TRAILS
// ==========================================
window.fetchLogsAdmin = async function() {
  const tbody = document.getElementById('adminLogsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;"><div class="skeleton" style="height:30px; width:100%;"></div></td></tr>';
  
  let list = [];
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('module_history').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) console.error('Logs fetch error:', error.message);
    list = data || [];
  } else {
    list = JSON.parse(localStorage.getItem(MOCK_MODULE_HISTORY) || '[]');
    list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }
  
  tbody.innerHTML = list.map(l => {
    let actClass = 'log-action-update';
    if (l.status === 'Pending' || l.status === 'Submitted' || l.status === 'Application Received') actClass = 'log-action-create';
    if (l.status === 'Resolved' || l.status === 'Closed' || l.status === 'Session Completed') actClass = 'log-action-delete';
    
    return `
      <tr>
        <td>${new Date(l.created_at).toLocaleString()}</td>
        <td>${l.updated_by_email || 'anonymous@shakticop.gov.in'}</td>
        <td><span class="log-action ${actClass}">${l.status}</span></td>
        <td>ID: ${l.tracking_id} - ${l.remarks}</td>
      </tr>
    `;
  }).join('');
};

window.clearActivityLogs = async function() {
  if (!confirm("Are you sure you want to wipe local history logs?")) return;
  localStorage.removeItem(MOCK_MODULE_HISTORY);
  showToast("History logs cleared.", "success");
  fetchLogsAdmin();
};


// ==========================================
// 18. CHART.JS ANALYTICS DASHBOARD INITS
// ==========================================
let chartTrend = null;
let chartCategory = null;
let chartDistrict = null;

window.initAnalyticsCharts = async function() {
  const trendCtx = document.getElementById('chartMonthlyTrend');
  const catCtx = document.getElementById('chartCategoryBreakdown');
  const distCtx = document.getElementById('chartDistrictDistribution');
  
  if (!trendCtx || !catCtx || !distCtx) return;
  
  if (chartTrend) chartTrend.destroy();
  if (chartCategory) chartCategory.destroy();
  if (chartDistrict) chartDistrict.destroy();

  // Fetch real data for charts
  let arsData = [], mhdData = [], cnsData = [], sosData = [], compData = [], empData = [];
  
  if (isSupabaseConfigured) {
    const [a, b, c, d, e, f] = await Promise.all([
      supabase.from('ars_reports').select('status, district, created_at'),
      supabase.from('mhd_requests').select('status, district, created_at'),
      supabase.from('counselling_bookings').select('status, district, created_at'),
      supabase.from('emergency_requests').select('status, district, created_at'),
      supabase.from('complaints').select('status, category, district, created_at'),
      supabase.from('empowerment_applications').select('status, district, created_at')
    ]);
    arsData = a.data || []; mhdData = b.data || []; cnsData = c.data || [];
    sosData = d.data || []; compData = e.data || []; empData = f.data || [];
  } else {
    arsData = JSON.parse(localStorage.getItem(MOCK_ARS_REPORTS) || '[]');
    mhdData = JSON.parse(localStorage.getItem(MOCK_MHD_REQUESTS) || '[]');
    cnsData = JSON.parse(localStorage.getItem(MOCK_COUNSELLING_BOOKINGS) || '[]');
    sosData = JSON.parse(localStorage.getItem(MOCK_EMERGENCY_REQUESTS) || '[]');
    compData = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
    empData = JSON.parse(localStorage.getItem(MOCK_EMPOWERMENT_APPLICATIONS) || '[]');
  }

  const allRecords = [...arsData, ...mhdData, ...cnsData, ...sosData, ...compData, ...empData];

  // Monthly trend (last 6 months)
  const now = new Date();
  const monthLabels = [];
  const monthCounts = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthLabels.push(label);
    const count = allRecords.filter(r => {
      if (!r.created_at) return false;
      const rd = new Date(r.created_at);
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    }).length;
    monthCounts.push(count);
  }

  const hasMonthlyData = monthCounts.some(c => c > 0);
  chartTrend = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Total Reports',
        data: hasMonthlyData ? monthCounts : [],
        borderColor: '#e64980',
        backgroundColor: 'rgba(230,73,128,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#e64980'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: !hasMonthlyData, text: 'No data available yet', color: '#a3b1cc', font: { size: 13 } }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a3b1cc' } },
        x: { ticks: { color: '#a3b1cc' } }
      }
    }
  });

  // Category breakdown (complaints only)
  const catMap = {};
  compData.forEach(r => { if (r.category) catMap[r.category] = (catMap[r.category] || 0) + 1; });
  const catLabels = Object.keys(catMap);
  const catValues = Object.values(catMap);

  chartCategory = new Chart(catCtx, {
    type: 'doughnut',
    data: {
      labels: catLabels.length ? catLabels : ['No Data'],
      datasets: [{
        data: catValues.length ? catValues : [1],
        backgroundColor: catValues.length
          ? ['#e64980', '#5f3dc4', '#0ea5e9', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6']
          : ['#334155']
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#a3b1cc', font: { size: 11 } } } }
    }
  });

  // District distribution
  const distMap = {};
  allRecords.forEach(r => { if (r.district) distMap[r.district] = (distMap[r.district] || 0) + 1; });
  const distLabels = Object.keys(distMap).sort((a,b) => distMap[b]-distMap[a]).slice(0, 6);
  const distValues = distLabels.map(d => distMap[d]);

  chartDistrict = new Chart(distCtx, {
    type: 'bar',
    data: {
      labels: distLabels.length ? distLabels : ['No Data'],
      datasets: [{
        label: 'Total Reports',
        data: distValues.length ? distValues : [0],
        backgroundColor: '#0ea5e9',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#a3b1cc' }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a3b1cc' } }
      }
    }
  });
};


// ==========================================
// 19. MASTER REPORTS EXPORTS REGISTRY
// ==========================================
window.runReportsQuery = async function() {
  const tableHead = document.getElementById('reportsTableHeader');
  const tableBody = document.getElementById('reportsTableBody');
  if (!tableHead || !tableBody) return;
  
  const moduleTable = document.getElementById('repModule').value;
  const district = document.getElementById('repDistrict').value;
  const status = document.getElementById('repStatus').value;
  const query = document.getElementById('repSearch').value.trim();
  
  tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><div class="skeleton" style="height:35px; width:100%;"></div></td></tr>';
  
  // Set headers dynamically
  if (moduleTable === 'complaints') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Category</th>
        <th>District</th>
        <th>Officer</th>
        <th>Status</th>
        <th>Filing Date</th>
        <th>Action</th>
      </tr>
    `;
  } else if (moduleTable === 'ars_reports') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Citizen Name</th>
        <th>Location</th>
        <th>Officer</th>
        <th>Status</th>
        <th>Report Date</th>
        <th>Action</th>
      </tr>
    `;
  } else if (moduleTable === 'mhd_requests') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Mobile</th>
        <th>Station</th>
        <th>Status</th>
        <th>Date</th>
        <th>Action</th>
      </tr>
    `;
  } else if (moduleTable === 'counselling_bookings') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Specialist</th>
        <th>Scheduled Time</th>
        <th>Status</th>
        <th>Preferred Date</th>
        <th>Action</th>
      </tr>
    `;
  } else if (moduleTable === 'empowerment_applications') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Welfare Program</th>
        <th>Applicant</th>
        <th>Age/Gender</th>
        <th>Status</th>
        <th>Date</th>
        <th>Action</th>
      </tr>
    `;
  } else if (moduleTable === 'emergency_requests') {
    tableHead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Distress Type</th>
        <th>Location</th>
        <th>Mobile</th>
        <th>Status</th>
        <th>Time</th>
        <th>Action</th>
      </tr>
    `;
  }

  let list = [];
  if (isSupabaseConfigured) {
    let q = supabase.from(moduleTable).select('*');
    if (district) q = q.eq('district', district);
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false });
    list = data || [];
  } else {
    let key = '';
    if (moduleTable === 'complaints') key = MOCK_COMPLAINTS;
    if (moduleTable === 'ars_reports') key = MOCK_ARS_REPORTS;
    if (moduleTable === 'mhd_requests') key = MOCK_MHD_REQUESTS;
    if (moduleTable === 'counselling_bookings') key = MOCK_COUNSELLING_BOOKINGS;
    if (moduleTable === 'empowerment_applications') key = MOCK_EMPOWERMENT_APPLICATIONS;
    if (moduleTable === 'emergency_requests') key = MOCK_EMERGENCY_REQUESTS;
    
    list = JSON.parse(localStorage.getItem(key) || '[]');
    if (district) list = list.filter(r => r.district === district);
    if (status) list = list.filter(r => r.status === status);
  }
  
  if (query) {
    list = list.filter(r => 
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      (r.name && r.name.toLowerCase().includes(query.toLowerCase())) ||
      (r.location && r.location.toLowerCase().includes(query.toLowerCase()))
    );
  }
  
  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#a3b1cc;">No registry records found.</td></tr>`;
    return;
  }
  
  tableBody.innerHTML = list.map(r => {
    let col1 = r.id;
    let col2 = r.category || r.scheme_title || r.type || 'Standard';
    let col3 = r.district || r.location || 'N/A';
    let col4 = r.assigned_officer_id || r.station || 'Unassigned';
    let col5 = r.status;
    let col6 = new Date(r.created_at || new Date()).toLocaleDateString();
    
    if (moduleTable === 'ars_reports') {
      col2 = r.name;
      col3 = r.location;
    } else if (moduleTable === 'mhd_requests') {
      col2 = r.name;
      col3 = r.mobile;
      col4 = r.police_station;
    } else if (moduleTable === 'counselling_bookings') {
      col2 = r.name;
      col3 = r.assigned_counsellor_name || r.assigned_counsellor_id || 'Pending assignment';
      col4 = r.session_date ? `${r.session_date} ${r.session_time}` : 'Pending Scheduling';
      col6 = r.preferred_date;
    } else if (moduleTable === 'empowerment_applications') {
      col2 = r.scheme_title;
      col3 = r.name;
      col4 = `Age: ${r.age} (${r.gender})`;
    } else if (moduleTable === 'emergency_requests') {
      col2 = r.type;
      col3 = r.location;
      col4 = r.mobile;
      col6 = new Date(r.created_at || new Date()).toLocaleTimeString();
    }
    
    return `
      <tr>
        <td><strong>${col1}</strong></td>
        <td>${col2}</td>
        <td>${col3}</td>
        <td>${col4}</td>
        <td><span class="admin-badge ${getStatusClass(col5)}">${col5}</span></td>
        <td>${col6}</td>
        <td><button type="button" class="admin-btn" style="padding:5px 10px; font-size:11px;" onclick="viewRecordFullDetail('${moduleTable}','${r.id}')">👁️ View${r.video_url ? ' / 🔊 Listen' : ''}</button></td>
      </tr>
    `;
  }).join('');
};

// ==========================================
// ADMIN: FULL RECORD DETAIL + VOICE PLAYBACK VIEWER
// ==========================================
// Finds [GPS: lat, lng ...] anywhere in a string (location field OR embedded in description text)
// and turns it into clickable map + directions links — needed because some forms fold location
// into the description when the table has no dedicated location column.
function linkifyGpsMentions(text) {
  if (!text) return String(text || '');
  const regex = /\[GPS:\s*([0-9.\-]+),\s*([0-9.\-]+)[^\]]*\]/g;
  return String(text).replace(regex, (match, lat, lng) => {
    return `📍 <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" style="color:#38bdf8;">View on Map</a> &nbsp;·&nbsp; <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="color:#4ade80; font-weight:700;">Get Directions</a>`;
  });
}

window.viewRecordFullDetail = async function(moduleTable, id) {
  const modal = document.getElementById('modalRecordDetail');
  const body = document.getElementById('recordDetailBody');
  const heroId = document.getElementById('recordDetailHeroId');
  const heroStatus = document.getElementById('recordDetailHeroStatus');
  const heroModule = document.getElementById('recordDetailHeroModule');
  if (!modal || !body) return;

  body.innerHTML = '<div style="text-align:center;padding:24px;color:#64748b;">Loading details...</div>';
  modal.classList.add('open');

  // Fetch record
  let record = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from(moduleTable).select('*, assigned_officer_id(name, designation, mobile)').eq('id', id).single();
    record = data;
  } else {
    const keyMap = { complaints: MOCK_COMPLAINTS, ars_reports: MOCK_ARS_REPORTS, mhd_requests: MOCK_MHD_REQUESTS, counselling_bookings: MOCK_COUNSELLING_BOOKINGS, emergency_requests: MOCK_EMERGENCY_REQUESTS, empowerment_applications: MOCK_EMPOWERMENT_APPLICATIONS, callback_requests: MOCK_CALLBACK_REQUESTS };
    record = JSON.parse(localStorage.getItem(keyMap[moduleTable]) || '[]').find(r => r.id === id);
  }
  if (!record) { body.innerHTML = '<p style="color:#dc2626;">Record not found.</p>'; return; }

  // Fetch history/timeline
  let historyLogs = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('module_history').select('*').eq('tracking_id', id).order('created_at', { ascending: false });
    historyLogs = data || [];
  } else {
    historyLogs = JSON.parse(localStorage.getItem(MOCK_MODULE_HISTORY) || '[]').filter(h => h.tracking_id === id).reverse();
  }

  // Module label
  const moduleLabels = { complaints:'📝 Complaint', ars_reports:'🚔 Anti-Romeo', mhd_requests:'👮 Help Desk', counselling_bookings:'💬 Counselling', emergency_requests:'🆘 SOS / Travel', empowerment_applications:'💪 JSS Program', callback_requests:'📞 Legal Aid' };
  if (heroId) heroId.textContent = record.id;
  if (heroStatus) heroStatus.textContent = record.status || 'Submitted';
  if (heroModule) heroModule.textContent = moduleLabels[moduleTable] || moduleTable;

  // Officer block
  const officerData = record.assigned_officer_id;
  const officerHtml = officerData && officerData.name ? `
    <div class="record-detail-officer-box">
      <div class="record-detail-officer-avatar">👮</div>
      <div class="record-detail-officer-info">
        <strong>👮 ${officerData.name}</strong>
        <span>${officerData.designation || 'Assigned Officer'} · ${officerData.mobile || '—'}</span>
        <span style="font-size:10.5px; color:#64748b;">Seen at: ${record.officer_seen_at ? new Date(record.officer_seen_at).toLocaleString() : 'Not yet seen'}</span>
      </div>
    </div>` : record.officer_seen_at ? `<div class="record-detail-officer-box"><div class="record-detail-officer-avatar">👮</div><div class="record-detail-officer-info"><strong>Officer assigned</strong><span>Seen: ${new Date(record.officer_seen_at).toLocaleString()}</span></div></div>` : '';

  // Location
  const locHtml = record.location ? `<div class="record-detail-field full"><label>📍 Location</label><span>${linkifyGpsMentions(record.location)}</span></div>` : '';

  // Description
  const rawDesc = record.description || record.reason || record.remarks || '';
  const descHtml = rawDesc ? `<div class="record-detail-desc-box"><div class="record-detail-desc-label">📝 Full Description / Complaint Text</div><div class="record-detail-desc-text">${linkifyGpsMentions(rawDesc.replace(/</g,'&lt;'))}</div></div>` : '';

  // Timeline
  const chronoLogs = [...historyLogs].reverse();
  const timelineHtml = `<div class="record-detail-progress"><div class="record-detail-progress-title">📊 Case Progress Timeline</div><div class="record-detail-timeline">${
    chronoLogs.length === 0
      ? `<div class="record-detail-step"><div class="record-detail-step-dot">📝</div><div class="record-detail-step-title">Submitted</div><div class="record-detail-step-time">${new Date(record.created_at||new Date()).toLocaleString()}</div></div>`
      : chronoLogs.map(log => {
          const icon = /resolved|closed|completed/i.test(log.status||'') ? '✅' : /assign/i.test(log.status||'') ? '👮' : /investigat|progress/i.test(log.status||'') ? '🔎' : '📝';
          const done = /resolved|closed|completed/i.test(log.status||'');
          return `<div class="record-detail-step"><div class="record-detail-step-dot ${done ? 'done' : ''}">${icon}</div><div class="record-detail-step-title">${log.status}</div><div class="record-detail-step-time">${new Date(log.created_at).toLocaleString()}${log.officer_name ? ' · ' + log.officer_name : ''}</div>${log.remarks ? `<div class="record-detail-step-remark">${log.remarks}</div>` : ''}</div>`;
        }).join('')
  }</div></div>`;

  // Audio
  const audioHtml = record.video_url ? `<div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px; margin-bottom:12px;"><div style="font-size:11px; font-weight:700; color:#1e3a8a; margin-bottom:8px;">🔊 Citizen's Voice Recording</div><audio controls style="width:100%;" src="${record.video_url}"></audio></div>` : '';

  body.innerHTML = `
    <div class="record-detail-grid">
      <div class="record-detail-field"><label>Name</label><span>${record.name || '—'}</span></div>
      <div class="record-detail-field"><label>Mobile</label><span>${record.mobile || '—'}</span></div>
      <div class="record-detail-field"><label>District</label><span>${record.district || '—'}</span></div>
      <div class="record-detail-field"><label>Police Station</label><span>${record.police_station || record.station || '—'}</span></div>
      <div class="record-detail-field"><label>Category / Type</label><span>${record.category || record.type || record.scheme_title || '—'}</span></div>
      <div class="record-detail-field"><label>Filed On</label><span>${new Date(record.created_at||new Date()).toLocaleString()}</span></div>
      ${locHtml}
    </div>
    ${officerHtml}
    ${descHtml}
    ${audioHtml}
    ${timelineHtml}
    <div class="record-detail-print-row">
      <button class="admin-btn primary" onclick="downloadReceiptPDF('${record.id}')">🖨️ Print / PDF</button>
      <button class="admin-btn" onclick="closeModal('modalRecordDetail')">✕ Close</button>
    </div>
  `;
};

window.exportMasterReportCSV = async function() {
  const table = document.getElementById('repModule').value;
  let list = [];
  
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) { showToast('Export failed: ' + error.message, 'error'); return; }
    list = data || [];
  } else {
    let key = '';
    if (table === 'complaints') key = MOCK_COMPLAINTS;
    if (table === 'ars_reports') key = MOCK_ARS_REPORTS;
    if (table === 'mhd_requests') key = MOCK_MHD_REQUESTS;
    if (table === 'counselling_bookings') key = MOCK_COUNSELLING_BOOKINGS;
    if (table === 'empowerment_applications') key = MOCK_EMPOWERMENT_APPLICATIONS;
    if (table === 'emergency_requests') key = MOCK_EMERGENCY_REQUESTS;
    list = JSON.parse(localStorage.getItem(key) || '[]');
  }
  
  if (list.length === 0) {
    showToast("No data to export.", "warning");
    return;
  }
  
  let csv = "ID,Name,Mobile,District,Status,Created At\n";
  list.forEach(r => {
    csv += `"${r.id}","${(r.name || 'Anonymous').replace(/"/g,'""')}","${r.mobile || ''}","${r.district || ''}","${r.status || ''}","${r.created_at || ''}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `shakticop_${table}_${Date.now()}.csv`;
  a.click();
  showToast(`CSV export downloaded: ${list.length} records.`, "success");
};


// ==========================================
// 20. REALTIME POSTGRES REPLICATION HOOKS
// ==========================================
function subscribeRealtimeEventsAdmin() {
  if (!isSupabaseConfigured) return;

  const trackedTables = ['complaints', 'ars_reports', 'mhd_requests', 'counselling_bookings', 'emergency_requests', 'callback_requests'];
  let channel = supabase.channel('admin-db-changes');

  trackedTables.forEach(table => {
    channel = channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, payload => {
        showToast(`New incoming ${table} report received!`, 'warning');
        reloadAdminView();
        fetchAdminNotifications();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, payload => {
        reloadAdminView();
      });
  });

  channel.subscribe();
}

function subscribeRealtimeEventsUser() {
  if (!isSupabaseConfigured || !currentSessionUser) return;

  const trackedTables = ['complaints', 'ars_reports', 'mhd_requests', 'counselling_bookings', 'emergency_requests', 'callback_requests'];
  let channel = supabase.channel('user-db-changes');

  trackedTables.forEach(table => {
    channel = channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, payload => {
      if (payload.new && payload.new.email === currentSessionUser.email) {
        showToast(`Case reference ${payload.new.id} status updated to: ${payload.new.status}`, 'success');
        fetchUserDashboardData();
        fetchUserNotifications();
        // If the citizen currently has this exact record's tracking panel open, refresh it live
        const trackInput = document.getElementById('trackInputId');
        if (trackInput && trackInput.value.trim() === payload.new.id) {
          trackRequestById();
        }
      }
    });
  });

  channel = channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
    if (payload.new && payload.new.user_email === currentSessionUser.email) {
      showToast(`Alert Notification: ${payload.new.title}`, 'info');
      fetchUserNotifications();
    }
  });

  channel.subscribe();
}


// ==========================================
// INSTANT LOCATION CAPTURE MODULE (for SOS / complaint / voice forms)
// ==========================================
// Auto-fills the citizen's profile address using GPS + free OpenStreetMap reverse geocoding (no API key needed)
window.captureProfileAddress = function() {
  const btn = document.getElementById('cp-loc-btn');
  const status = document.getElementById('cp-loc-status');
  const mapBox = document.getElementById('cp-loc-status-map');
  const addressField = document.getElementById('cp-address');
  if (!addressField) return;

  if (btn && !btn.dataset.origText) btn.dataset.origText = btn.textContent;

  if (!navigator.geolocation) {
    if (status) { status.textContent = 'Location is not supported on this device/browser. Please type your address manually.'; status.classList.add('show', 'error'); }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '📍 Detecting your location...'; }
  if (status) { status.textContent = 'Fetching your live GPS location, please allow location access...'; status.classList.add('show'); status.classList.remove('error'); }
  if (mapBox) mapBox.innerHTML = '';

  const onSuccess = async (pos) => {
    const lat = pos.coords.latitude.toFixed(6);
    const lng = pos.coords.longitude.toFixed(6);

    if (mapBox) mapBox.innerHTML = buildMapEmbedIframe(lat, lng);
    if (status) status.textContent = 'Looking up your address from these coordinates...';

    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await resp.json();
      if (data && data.display_name) {
        addressField.value = data.display_name;
        addressField.dispatchEvent(new Event('input'));
        if (status) { status.textContent = '✅ Address filled in from your live location — please check and edit if needed.'; status.classList.remove('error'); }
      } else {
        if (status) { status.textContent = `Got your coordinates (${lat}, ${lng}) but couldn't resolve a readable address. Please type it manually.`; status.classList.add('error'); }
      }
    } catch (e) {
      console.warn('Reverse geocoding failed:', e);
      if (status) { status.textContent = `Got your coordinates (${lat}, ${lng}) but the address lookup service didn't respond. Please type your address manually.`; status.classList.add('error'); }
    }

    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.origText; }
  };

  const onFinalError = (err) => {
    let msg = 'Could not fetch your location. Please enter your address manually.';
    if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser settings and try again.';
    else if (err.code === 3) msg = 'Could not get a GPS fix (common indoors or on desktops without GPS). Please move near a window or type your address manually.';
    if (status) { status.textContent = msg; status.classList.add('show', 'error'); }
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.origText; }
  };

  navigator.geolocation.getCurrentPosition(onSuccess, (err) => {
    if (err.code !== 3) { onFinalError(err); return; }
    if (status) status.textContent = 'GPS is taking longer than usual — trying a faster network-based location...';
    navigator.geolocation.getCurrentPosition(onSuccess, onFinalError, { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 });
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
};

// OpenStreetMap's embed endpoint is officially supported without any API key, unlike
// Google's undocumented output=embed trick which can silently fail to load in some contexts.
function buildMapEmbedIframe(lat, lng) {
  const d = 0.006; // small bounding box around the point
  const bbox = `${(parseFloat(lng) - d)},${(parseFloat(lat) - d)},${(parseFloat(lng) + d)},${(parseFloat(lat) + d)}`;
  const osmSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat},${lng}&layer=mapnik`;
  return `<div class="loc-map-preview"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${osmSrc}" title="Your live location on map"></iframe></div>`;
}

window.captureLocation = function(inputId, statusId, btnEl) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  const mapBox = document.getElementById(statusId + '-map');
  if (!input) return;

  if (btnEl && !btnEl.dataset.origText) btnEl.dataset.origText = btnEl.textContent;

  if (!navigator.geolocation) {
    if (status) { status.textContent = 'Location is not supported on this device/browser. Please type the address manually.'; status.classList.add('show', 'error'); }
    return;
  }

  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '📍 Detecting your location...'; }
  if (status) { status.textContent = 'Fetching your live GPS location, please allow location access...'; status.classList.add('show'); status.classList.remove('error'); }
  if (mapBox) mapBox.innerHTML = '';

  const onSuccess = (pos) => {
    const lat = pos.coords.latitude.toFixed(6);
    const lng = pos.coords.longitude.toFixed(6);
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    const existing = input.value.replace(/\s*\[GPS:.*?\]\s*$/, '').trim();
    const geoTag = `[GPS: ${lat}, ${lng} - Map: ${mapsLink}]`;
    input.value = existing ? `${existing} ${geoTag}` : geoTag;
    input.dispatchEvent(new Event('input'));

    if (status) { status.textContent = '✅ Live location added — officers can open this link directly on the map.'; status.classList.remove('error'); }
    if (mapBox) mapBox.innerHTML = buildMapEmbedIframe(lat, lng);
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.textContent = '📍 Location Added ✓';
      setTimeout(() => { btnEl.textContent = btnEl.dataset.origText; }, 2500);
    }
  };

  const onFinalError = (err) => {
    let msg = 'Could not fetch your location. Please enter it manually.';
    if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser settings and try again.';
    else if (err.code === 3) msg = 'Could not get a GPS fix (common indoors or on desktops without GPS). Please move near a window or enter your location manually.';
    if (status) { status.textContent = msg; status.classList.add('show', 'error'); }
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = btnEl.dataset.origText; }
  };

  // First attempt: high accuracy (GPS chip), generous timeout
  navigator.geolocation.getCurrentPosition(onSuccess, (err) => {
    if (err.code !== 3) { onFinalError(err); return; } // permission denied / unavailable — no point retrying
    // Retry with low accuracy (WiFi/IP-based) which is far more reliable on desktops/indoors, and allow a cached fix
    if (status) status.textContent = 'GPS is taking longer than usual — trying a faster network-based location...';
    navigator.geolocation.getCurrentPosition(onSuccess, onFinalError, { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 });
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
};

// ==========================================
// LIVE VOICE-TO-TEXT DICTATION MODULE (Web Speech API)
// ==========================================
let liveRecognition = null;
let activeDictationTarget = null;
let dictationBaseText = '';
let audioTranscriptFinal = '';
let dictationMediaRecorder = null;
let dictationAudioChunks = [];
let dictationAudioBlobs = {}; // targetId -> recorded voice Blob, kept until the form is submitted

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Resolves any voice recording captured during dictation on `targetId` into a
// storable URL (Supabase Storage public URL, or a base64 data URL in local mock mode).
async function resolveVoiceAttachment(targetId) {
  await finalizeDictation(targetId);
  const blob = dictationAudioBlobs[targetId];
  if (!blob) return null;
  if (isSupabaseConfigured) {
    try {
      const filename = `voice_${targetId}_${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage.from('documents').upload(filename, blob);
      if (upErr) { console.warn('Voice attachment upload failed:', upErr.message); return null; }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filename);
      return urlData.publicUrl;
    } catch (e) {
      console.warn('Voice attachment upload error:', e);
      return null;
    }
  }
  try { return await blobToBase64(blob); } catch (e) { console.warn('Voice attachment encoding failed:', e); return null; }
}

// Inserts into Supabase with the voice attachment; if the table doesn't have a
// video_url column yet, retries without it so the form still submits successfully.
async function insertWithOptionalVoice(table, payload, voiceUrl) {
  const fullPayload = voiceUrl ? { ...payload, video_url: voiceUrl } : payload;
  let result = await supabase.from(table).insert(fullPayload).select('id').single();
  if (result.error && voiceUrl && /video_url/i.test(result.error.message || '')) {
    console.warn(`video_url column not found on "${table}", retrying without voice attachment:`, result.error.message);
    result = await supabase.from(table).insert(payload).select('id').single();
  }
  return result;
}

// Records the citizen's actual microphone audio alongside live dictation, so the
// original voice is preserved and can be listened to later (by the citizen and by admin)
async function startDictationAudioCapture(targetId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    dictationMediaRecorder = new MediaRecorder(stream);
    dictationAudioChunks = [];
    dictationMediaRecorder.ondataavailable = e => dictationAudioChunks.push(e.data);
    dictationMediaRecorder.onstop = () => {
      dictationAudioBlobs[targetId] = new Blob(dictationAudioChunks, { type: 'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
      renderDictationVoicePreview(targetId);
    };
    dictationMediaRecorder.start();
  } catch (err) {
    console.warn('Mic audio capture unavailable, continuing with text-only dictation:', err.message);
  }
}

function stopDictationAudioCapture() {
  if (dictationMediaRecorder && dictationMediaRecorder.state !== 'inactive') {
    dictationMediaRecorder.stop();
  }
}

// Ensures dictation (speech-to-text + mic recording) for a field is fully stopped and its
// voice blob finalized before a form reads it — otherwise, if the citizen never explicitly
// tapped the mic button to stop, the recording is still "open" and no voice gets attached.
function finalizeDictation(targetId) {
  return new Promise((resolve) => {
    const stillActive = activeDictationTarget === targetId && (liveRecognition || (dictationMediaRecorder && dictationMediaRecorder.state !== 'inactive'));
    if (!stillActive) { resolve(); return; }

    dictationShouldContinue = false;
    if (liveRecognition) { try { liveRecognition.stop(); } catch (e) {} }
    stopDictationAudioCapture();

    let waited = 0;
    const poll = setInterval(() => {
      waited += 100;
      if (dictationAudioBlobs[targetId] || !dictationMediaRecorder || dictationMediaRecorder.state === 'inactive' || waited >= 2000) {
        clearInterval(poll);
        resolve();
      }
    }, 100);
  });
}

function renderDictationVoicePreview(targetId) {
  const field = document.getElementById(targetId);
  const blob = dictationAudioBlobs[targetId];
  if (!field || !blob) return;
  const previewId = targetId + '-voice-preview';
  let preview = document.getElementById(previewId);
  if (!preview) {
    preview = document.createElement('div');
    preview.id = previewId;
    field.insertAdjacentElement('afterend', preview);
  }
  const url = URL.createObjectURL(blob);
  preview.innerHTML = `<div class="live-transcript-hint">🔊 Your original voice has been saved and will be attached with this complaint (officers can listen to it too):</div><audio controls style="width:100%; margin-top:4px;" src="${url}"></audio>`;
}

function clearDictationVoicePreview(targetId) {
  delete dictationAudioBlobs[targetId];
  const preview = document.getElementById(targetId + '-voice-preview');
  if (preview) preview.remove();
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

let dictationShouldContinue = false; // true while the user intends to keep listening (survives browser auto-stops)

let dictationLangPreference = 'en-US'; // switched per-field via the EN/हिं toggle next to each mic button

function createRecognitionInstance() {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = dictationLangPreference;
  return rec;
}

// Toggles the speech recognition language for voice dictation, independent of the site's UI language
window.toggleDictationLang = function(btnId) {
  dictationLangPreference = dictationLangPreference === 'hi-IN' ? 'en-US' : 'hi-IN';
  const btn = document.getElementById(btnId);
  if (btn) btn.textContent = dictationLangPreference === 'hi-IN' ? 'हिं' : 'EN';
  showToast(dictationLangPreference === 'hi-IN' ? 'Voice typing set to Hindi (हिन्दी)' : 'Voice typing set to English', 'info');
};

// Generic "tap to speak" dictation into any text input/textarea (e.g. complaint description)
window.toggleVoiceDictation = async function(targetId, btnId) {
  const Ctor = getSpeechRecognitionCtor();
  const btn = document.getElementById(btnId);
  const field = document.getElementById(targetId);
  if (!field) return;

  if (!Ctor) {
    showToast('Voice typing needs Chrome (Android/Desktop) or Edge. Please type manually or try a supported browser.', 'warning');
    return;
  }

  // If already listening on this same field, stop it for good (user tapped again to stop)
  if (liveRecognition && activeDictationTarget === targetId) {
    dictationShouldContinue = false;
    liveRecognition.stop();
    return;
  }
  if (liveRecognition) { dictationShouldContinue = false; liveRecognition.stop(); }

  activeDictationTarget = targetId;
  dictationBaseText = field.value ? field.value.trim() : '';
  dictationShouldContinue = true;
  await startDictationAudioCapture(targetId);
  launchDictationRecognition(targetId, btn, field);
};

function launchDictationRecognition(targetId, btn, field) {
  liveRecognition = createRecognitionInstance();
  if (!liveRecognition) return;

  liveRecognition.onstart = () => {
    if (btn) { btn.classList.add('listening'); const s = btn.querySelector('span'); if (s) s.textContent = 'Listening... tap to stop'; }
  };
  liveRecognition.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t + ' '; else interim += t;
    }
    if (final) dictationBaseText = (dictationBaseText + ' ' + final).trim();
    field.value = (dictationBaseText + ' ' + interim).trim();
    field.dispatchEvent(new Event('input'));
  };
  liveRecognition.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      showToast('Microphone permission denied. Please allow mic access in your browser to use voice typing.', 'error');
      dictationShouldContinue = false;
    } else if (e.error === 'network') {
      showToast('Voice typing needs an active internet connection. Please check your connection and try again.', 'warning');
    }
    // 'no-speech' / 'aborted' are benign — onend below will seamlessly restart if still listening
  };
  liveRecognition.onend = () => {
    if (dictationShouldContinue && activeDictationTarget === targetId) {
      // The browser auto-stopped after a short pause in speech — restart immediately
      // so it feels continuous to the citizen instead of silently going dead.
      setTimeout(() => {
        if (dictationShouldContinue && activeDictationTarget === targetId) launchDictationRecognition(targetId, btn, field);
      }, 200);
      return;
    }
    if (btn) { btn.classList.remove('listening'); const s = btn.querySelector('span'); if (s) s.textContent = 'Speak / बोलकर लिखें'; }
    if (activeDictationTarget === targetId) { liveRecognition = null; activeDictationTarget = null; }
    stopDictationAudioCapture();
  };
  try { liveRecognition.start(); } catch (e) { console.error('Speech recognition start failed:', e); }
}

// Live transcript wired specifically into the Voice FIR audio recorder
function startLiveAudioTranscript() {
  const Ctor = getSpeechRecognitionCtor();
  const box = document.getElementById('audioLiveTranscript');
  if (!Ctor || !box) return;

  audioTranscriptFinal = '';
  activeDictationTarget = 'audioLiveTranscript';
  dictationShouldContinue = true;
  launchAudioTranscriptRecognition(box);
}

function launchAudioTranscriptRecognition(box) {
  liveRecognition = createRecognitionInstance();
  if (!liveRecognition) return;

  liveRecognition.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t + ' '; else interim += t;
    }
    if (final) audioTranscriptFinal = (audioTranscriptFinal + ' ' + final).trim();
    const shown = (audioTranscriptFinal + ' ' + interim).trim();
    box.textContent = shown;
    box.classList.toggle('empty', !shown);
  };
  liveRecognition.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      showToast('Mic permission denied for live text — your voice note will still be recorded and submitted.', 'warning');
      dictationShouldContinue = false;
    }
  };
  liveRecognition.onend = () => {
    if (dictationShouldContinue && activeDictationTarget === 'audioLiveTranscript') {
      setTimeout(() => {
        if (dictationShouldContinue && activeDictationTarget === 'audioLiveTranscript') launchAudioTranscriptRecognition(box);
      }, 200);
      return;
    }
    if (activeDictationTarget === 'audioLiveTranscript') { liveRecognition = null; activeDictationTarget = null; }
  };
  try { liveRecognition.start(); } catch (e) { console.error('Live transcript start failed:', e); }
}

function stopLiveAudioTranscript() {
  dictationShouldContinue = false;
  if (liveRecognition && activeDictationTarget === 'audioLiveTranscript') {
    liveRecognition.stop();
  }
}


// ==========================================
// AUDIO COMPLAINT RECORDER MODULE
// ==========================================
window.startAudioRecording = async function() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      activeRecordingBlob = new Blob(audioChunks, { type: 'audio/webm' });
      document.getElementById('audioPlayback').src = URL.createObjectURL(activeRecordingBlob);
      document.getElementById('audioPlayPreview').style.display = 'block';
      document.getElementById('audioSubmitBtn').removeAttribute('disabled');
    };
    
    mediaRecorder.start();
    isRecording = true;
    recSecs = 0;
    document.getElementById('recStartBtn').setAttribute('disabled', 'true');
    document.getElementById('recStopBtn').removeAttribute('disabled');
    startLiveAudioTranscript();
    
    recTimer = setInterval(() => {
      recSecs++;
      const m = String(Math.floor(recSecs / 60)).padStart(2, '0');
      const s = String(recSecs % 60).padStart(2, '0');
      document.getElementById('audioTimer').textContent = `${m}:${s}`;
      
      // Animate wave lines
      document.querySelectorAll('.wave-bar').forEach(b => {
        b.style.height = (Math.floor(Math.random() * 32) + 8) + 'px';
      });
    }, 1000);
    
  } catch (err) {
    showToast(`Mic access denied: ${err.message}`, 'error');
  }
};

window.stopAudioRecording = function() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    clearInterval(recTimer);
    isRecording = false;
    document.getElementById('recStopBtn').setAttribute('disabled', 'true');
    document.getElementById('recStartBtn').removeAttribute('disabled');
    document.querySelectorAll('.wave-bar').forEach(b => b.style.height = '8px');
    stopLiveAudioTranscript();
  }
};

window.submitAudioComplaint = async function() {
  const name = document.getElementById('aud-name').value.trim();
  const mobile = document.getElementById('aud-phone').value.trim();
  const district = document.getElementById('aud-district').value;
  const email = currentSessionUser ? currentSessionUser.email : 'guest@shakticop.gov.in';
  const locationInput = document.getElementById('aud-location');
  const location = (locationInput && locationInput.value.trim()) || 'Recorded Voice Input';
  const transcriptBox = document.getElementById('audioLiveTranscript');
  const liveText = (transcriptBox && !transcriptBox.classList.contains('empty')) ? transcriptBox.textContent.trim() : '';
  const description = liveText || 'Voice memo complaint submitted.';
  
  if (!name || !mobile || !district || !activeRecordingBlob) return;
  
  let recordId = '';
  if (isSupabaseConfigured) {
    const filename = `voice_${Date.now()}.webm`;
    const { error: uploadErr } = await supabase.storage.from('documents').upload(filename, activeRecordingBlob);
    if (uploadErr) {
      showToast(`Audio upload failed: ${uploadErr.message}`, 'error');
      return;
    }
    
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filename);
    const audioUrl = urlData.publicUrl;
    
    const { data, error } = await supabase.from('complaints').insert({
      name, mobile, email, district, police_station: 'Voice Registry Cell', category: 'Voice Complaint', incident_date: new Date().toISOString().split('T')[0], incident_time: '12:00', location, description, video_url: audioUrl
    }).select('id').single();
    
    if (error) {
      showToast(`Filing audio complaint failed: ${error.message}`, 'error');
      return;
    }
    recordId = data.id;
  } else {
    recordId = 'SC2026' + Math.floor(1000 + Math.random()*9000);
    let audioDataUrl = null;
    try { audioDataUrl = await blobToBase64(activeRecordingBlob); } catch (e) { console.warn('Voice note encoding failed:', e); }
    const list = JSON.parse(localStorage.getItem(MOCK_COMPLAINTS) || '[]');
    list.push({
      id: recordId, name, mobile, email, district, police_station: 'Voice Registry Cell', category: 'Voice Complaint', incident_date: new Date().toISOString().split('T')[0], incident_time: '12:00', location, description, video_url: audioDataUrl, status: 'Pending', created_at: new Date().toISOString()
    });
    localStorage.setItem(MOCK_COMPLAINTS, JSON.stringify(list));
  }
  
  await insertHistoryLog(recordId, 'Pending', null, 'Voice FIR audio complaint registered.', email);
  showToast(`Voice FIR complaint recorded. Reference ID: ${recordId}`, 'success');
  closeModal('modalAudio');
  document.getElementById('audioForm').reset();
  document.getElementById('audioPlayPreview').style.display = 'none';
  document.getElementById('audioTimer').textContent = '00:00';
  const locStatus = document.getElementById('aud-loc-status');
  const locMap = document.getElementById('aud-loc-status-map');
  if (locStatus) { locStatus.textContent = ''; locStatus.classList.remove('show'); }
  if (locMap) locMap.innerHTML = '';
  if (transcriptBox) {
    transcriptBox.textContent = 'Tap 🎤 and start speaking — your complaint text will appear here automatically...';
    transcriptBox.classList.add('empty');
  }
  audioTranscriptFinal = '';
  if (currentSessionUser) fetchUserDashboardData();
};


// ==========================================
// 21. STATIC DICTIONARY POPULATION
// ==========================================
window.populateComplaintStations = function(district) {
  const stationSel = document.getElementById('c-station');
  if (!stationSel) return;
  
  stationSel.innerHTML = '<option value="">Select Station</option>';
  if (!district) return;
  
  if (district === 'Etawah') {
    stationSel.innerHTML += `
      <option value="Civil Lines PS">Civil Lines PS</option>
      <option value="Jaswantnagar PS">Jaswantnagar PS</option>
      <option value="Chakarnagar PS">Chakarnagar PS</option>
    `;
  } else {
    stationSel.innerHTML += `
      <option value="Hazratganj PS">Hazratganj PS</option>
      <option value="Gomti Nagar PS">Gomti Nagar PS</option>
      <option value="Kalyanpur PS">Kalyanpur PS</option>
    `;
  }
};

window.populateHelpDeskStations = function(district) {
  const stationSel = document.getElementById('hd-station');
  if (!stationSel) return;
  stationSel.innerHTML = '<option value="">Select Station</option>';
  if (!district) return;
  
  if (district === 'Etawah') {
    stationSel.innerHTML += `
      <option value="Civil Lines PS">Civil Lines PS</option>
      <option value="Jaswantnagar PS">Jaswantnagar PS</option>
      <option value="Chakarnagar PS">Chakarnagar PS</option>
    `;
  } else {
    stationSel.innerHTML += `
      <option value="Hazratganj PS">Hazratganj PS</option>
      <option value="Gomti Nagar PS">Gomti Nagar PS</option>
      <option value="Kalyanpur PS">Kalyanpur PS</option>
    `;
  }
};


// ==========================================
// 22. SUPABASE DIAGNOSTIC TOOL (Admin Only)
// ==========================================
window.runSupabaseDiagnostic = async function() {
  const resultEl = document.getElementById('supabaseDiagnosticResults');
  if (!resultEl) {
    alert('Diagnostic panel not found. Open Admin → System tab or run from console.');
    return;
  }
  
  resultEl.innerHTML = '<p style="color:#a3b1cc; font-size:12px;">🔍 Running diagnostic...</p>';
  const results = [];
  
  // 1. Check env variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  results.push({ label: 'VITE_SUPABASE_URL', pass: !!(envUrl && envUrl !== 'https://your-project-id.supabase.co'), detail: envUrl ? `${envUrl.substring(0,30)}...` : 'NOT SET' });
  results.push({ label: 'VITE_SUPABASE_ANON_KEY', pass: !!(envKey && envKey.length > 20), detail: envKey ? `${envKey.substring(0,10)}...` : 'NOT SET' });
  results.push({ label: 'isSupabaseConfigured', pass: isSupabaseConfigured, detail: String(isSupabaseConfigured) });

  if (!isSupabaseConfigured) {
    results.push({ label: 'DB Connection', pass: false, detail: 'Supabase not configured — LocalStorage mode active' });
  } else {
    // 2. Test DB connectivity
    try {
      const { data, error } = await supabase.from('categories').select('id').limit(1);
      results.push({ label: 'DB Connection', pass: !error, detail: error ? error.message : `OK (${data?.length || 0} categories)` });
    } catch(e) { results.push({ label: 'DB Connection', pass: false, detail: e.message }); }
    
    // 3. Test each table
    const tables = ['complaints', 'ars_reports', 'mhd_requests', 'counselling_bookings', 'empowerment_applications', 'emergency_requests', 'officers', 'contacts', 'module_history', 'notifications'];
    for (const t of tables) {
      try {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        results.push({ label: `Table: ${t}`, pass: !error, detail: error ? error.message : `${count || 0} rows` });
      } catch(e) { results.push({ label: `Table: ${t}`, pass: false, detail: e.message }); }
    }
    
    // 4. Test Auth
    try {
      const { data: { session } } = await supabase.auth.getSession();
      results.push({ label: 'Auth Session', pass: true, detail: session ? `Logged in as ${session.user.email}` : 'No active session (expected if not logged in)' });
    } catch(e) { results.push({ label: 'Auth Session', pass: false, detail: e.message }); }
    
    // 5. Test Realtime
    try {
      const channel = supabase.channel('diag-test');
      results.push({ label: 'Realtime Channel', pass: true, detail: `Channel created (${channel.state})` });
    } catch(e) { results.push({ label: 'Realtime Channel', pass: false, detail: e.message }); }
  }
  
  // Render results
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass).length;
  
  resultEl.innerHTML = `
    <div style="margin-bottom:12px; font-weight:700; font-size:13px; color:${fail === 0 ? '#10b981' : '#f59e0b'};">
      ✅ Passed: ${pass} &nbsp;|&nbsp; ❌ Failed: ${fail} &nbsp;of&nbsp; ${results.length} checks
    </div>
    ${results.map(r => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:11px;">
        <div style="color:${r.pass ? '#10b981' : '#ef4444'}; font-weight:600;">${r.pass ? '✅' : '❌'} ${r.label}</div>
        <div style="color:#a3b1cc; font-family:monospace; font-size:10px; max-width:200px; text-align:right; word-break:break-all;">${r.detail}</div>
      </div>
    `).join('')}
    <div style="margin-top:12px; font-size:10px; color:#64748b;">Diagnostic completed at ${new Date().toLocaleString()}</div>
  `;
  
  console.log('Supabase Diagnostic Results:', results);
  return results;
};

// Console shortcut for quick diagnostic
window.diag = window.runSupabaseDiagnostic;


// ==========================================
// 23. MOBILE UX CONTROLS
// ==========================================
function getCompactEmail(email) {
  if (!email) return 'Guest';
  const [name, domain = ''] = String(email).split('@');
  if (name.length <= 8) return domain ? `${name}@${domain}` : name;
  return `${name.slice(0, 8)}...`;
}

function updateMobileUserChrome() {
  const emailEl = document.getElementById('mobileDrawerEmail');
  if (emailEl) emailEl.textContent = currentSessionUser ? currentSessionUser.email : 'Guest user';

  const badgeText = document.getElementById('userBadgeText');
  if (badgeText && currentSessionUser) badgeText.textContent = currentSessionUser.email;
}

function updateMobileNotificationBadges(count = 0) {
  ['mobileNotificationsBadge', 'mobileDashboardBadge'].forEach(id => {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count <= 0;
  });
}

function updateMobileNavState(tab = activePublicTab) {
  document.querySelectorAll('.mobile-bottom-nav button, .mobile-drawer-nav button').forEach(btn => {
    const action = btn.dataset.mobileAction;
    const dash = btn.dataset.mobileDashboard;
    const isActive =
      (tab === 'shakti' && (action === 'home' || action === 'shakti')) ||
      (tab === 'police' && action === 'police') ||
      (tab === 'dashboard' && (action === 'dashboard' || dash === currentUserDashTab));
    btn.classList.toggle('active', Boolean(isActive));
  });
}

function openMobileDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  const toggle = document.getElementById('mobileMenuToggle');
  if (!drawer || !toggle) return;
  document.body.classList.add('mobile-drawer-open');
  drawer.setAttribute('aria-hidden', 'false');
  toggle.setAttribute('aria-expanded', 'true');
  const first = drawer.querySelector('button');
  if (first) first.focus({ preventScroll: true });
}

function closeMobileDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  const toggle = document.getElementById('mobileMenuToggle');
  if (!drawer || !toggle) return;
  document.body.classList.remove('mobile-drawer-open');
  drawer.setAttribute('aria-hidden', 'true');
  toggle.setAttribute('aria-expanded', 'false');
}

window.closeMobileDrawer = closeMobileDrawer;

function goToDashboardSubtab(category) {
  if (!currentSessionUser) {
    openModal('modalLogin');
    return;
  }
  switchTab('dashboard');
  const catSel = document.getElementById('uFilterCategory');
  if (catSel && category && category !== 'complaints') catSel.value = category;
  fetchUserDashboardData();
  updateMobileNavState('dashboard');
}

function handleMobileNavigation(action) {
  if (action === 'more') {
    openMobileDrawer();
    return;
  }
  if (action === 'home') {
    switchTab('shakti');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (action === 'shakti') {
    switchTab('shakti');
    document.getElementById('publicMainWrap')?.scrollIntoView({ behavior: 'smooth' });
  } else if (action === 'police') {
    switchTab('police');
    document.getElementById('publicMainWrap')?.scrollIntoView({ behavior: 'smooth' });
  } else if (action === 'dashboard') {
    if (!currentSessionUser) openModal('modalLogin');
    else switchTab('dashboard');
  } else if (action === 'notifications') {
    if (!currentSessionUser) { openModal('modalLogin'); }
    else toggleNotificationsPopup();
  } else if (action === 'profile') {
    if (!currentSessionUser) { openModal('modalLogin'); }
    else openHeaderProfile();
  } else if (action === 'emergency') {
    switchTab('shakti');
    setTimeout(() => document.getElementById('publicEmergencyBar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  } else if (action === 'settings') {
    showToast('Settings panel is coming soon.', 'info');
  } else if (action === 'logout') {
    if (currentSessionUser) doLogout();
    else openModal('modalLogin');
  }
  closeMobileDrawer();
  updateMobileNavState();
}

function initMobileUx() {
  const toggle = document.getElementById('mobileMenuToggle');
  const close = document.getElementById('mobileDrawerClose');
  const overlay = document.getElementById('mobileDrawerOverlay');
  const dashboardToggle = document.getElementById('mobileDashboardToggle');
  const dashboardMenu = document.getElementById('mobileDashboardMenu');
  const backToTop = document.getElementById('backToTopBtn');

  toggle?.addEventListener('click', openMobileDrawer);
  close?.addEventListener('click', closeMobileDrawer);
  overlay?.addEventListener('click', closeMobileDrawer);
  dashboardToggle?.addEventListener('click', () => {
    const isOpen = !dashboardMenu?.classList.contains('open');
    dashboardMenu?.classList.toggle('open', isOpen);
    dashboardToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMobileDrawer();
  });

  document.querySelectorAll('[data-mobile-action]').forEach(btn => {
    btn.addEventListener('click', () => handleMobileNavigation(btn.dataset.mobileAction));
  });

  document.querySelectorAll('[data-mobile-dashboard]').forEach(btn => {
    btn.addEventListener('click', () => {
      goToDashboardSubtab(btn.dataset.mobileDashboard);
      closeMobileDrawer();
      updateMobileNavState('dashboard');
    });
  });

  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => {
    backToTop?.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  updateMobileUserChrome();
  updateMobileNavState();
}


// ==========================================
// 24. ANNOUNCEMENT BAR LOADER
// ==========================================
async function loadAnnouncementBar() {
  const bar = document.getElementById('announcementBar');
  const text = document.getElementById('announcementText');
  if (!bar || !text) return;
  
  let announcements = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('announcements').select('*').eq('active', true).order('created_at', { ascending: false }).limit(5);
    announcements = data || [];
  } else {
    announcements = JSON.parse(localStorage.getItem(MOCK_ANNOUNCEMENTS) || '[]').filter(a => a.active);
  }
  
  if (announcements.length === 0) return;
  
  bar.style.display = 'block';
  
  // Rotate through announcements every 4 seconds
  let idx = 0;
  const updateText = () => {
    const a = announcements[idx];
    text.textContent = `[${a.type || 'Notice'}] ${a.title}: ${a.content}`;
    idx = (idx + 1) % announcements.length;
  };
  updateText();
  if (announcements.length > 1) {
    setInterval(updateText, 4000);
  }
}

// Call on initial load for non-logged in users too
document.addEventListener('DOMContentLoaded', () => {
  loadAnnouncementBar();
});


async function seedDatabaseIfNeeded() {
  if (!isSupabaseConfigured) return;
  
  try {
    // 1. Upsert emergency contacts
    console.log('Upserting emergency contacts into Supabase...');
    const contactsToInsert = EMERGENCY_CONTACTS.map((c, idx) => ({
      department: c.department,
      officer_name: 'Nodal Officer',
      designation: 'Emergency Helpline',
      phone_number: c.phone_number,
      photo_url: '',
      priority: 10 - idx
    }));
    await supabase.from('contacts').upsert(contactsToInsert, { onConflict: 'department,phone_number' });

    // 2. Seed officers table if empty
    const { data: officersData } = await supabase.from('officers').select('id').limit(1);
    if (!officersData || officersData.length === 0) {
      console.log('Seeding female officers into Supabase...');
      const officersToInsert = DEFAULT_FEMALE_OFFICERS.map(o => ({
        name: o.name,
        designation: o.designation,
        mobile: o.mobile,
        type: 'police',
        station: o.station,
        district: o.district,
        email: o.email,
        photo_url: o.photo_url || '',
        availability: true
      }));
      // Add default counsellors as type = 'counsellor' for constraint compatibility
      DEFAULT_COUNSELLORS.forEach(c => {
        officersToInsert.push({
          name: c.name,
          designation: c.designation,
          mobile: c.mobile,
          type: 'counsellor',
          station: c.police_station,
          district: c.district,
          email: c.email,
          photo_url: '',
          availability: c.availability
        });
      });
      await supabase.from('officers').insert(officersToInsert);
    }

    // 3. Seed counsellors table if empty
    const { data: counsellorsData } = await supabase.from('counsellors').select('id').limit(1);
    if (!counsellorsData || counsellorsData.length === 0) {
      console.log('Seeding counsellors into Supabase...');
      const counsellorsToInsert = DEFAULT_COUNSELLORS.map(c => ({
        name: c.name,
        designation: c.designation,
        mobile: c.mobile,
        email: c.email,
        district: c.district,
        police_station: c.police_station,
        availability: c.availability,
        status: c.status
      }));
      await supabase.from('counsellors').insert(counsellorsToInsert);
    }
  } catch (err) {
    console.error('Seeding database error:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  seedSimulatorIfNeeded();
  if (isSupabaseConfigured) {
    await seedDatabaseIfNeeded();
  }
  initMobileUx();
  // Sync translator bar button states from saved language
  const savedLang = localStorage.getItem('shaktiLang') || 'en';
  const enBtn = document.getElementById('transEnBtn');
  const hiBtn = document.getElementById('transHiBtn');
  if (enBtn) enBtn.classList.toggle('active', savedLang === 'en');
  if (hiBtn) hiBtn.classList.toggle('active', savedLang === 'hi');
  applyLanguage();
  switchTab('shakti');
});

// Helper lpad
function lpad(str, len, char) {
  str = String(str);
  while(str.length < len) str = char + str;
  return str;
}

