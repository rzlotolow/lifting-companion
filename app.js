import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
   apiKey: "AIzaSyBWOb8ITzTaKWP2nKtFE2O0TBdnW7Q1XN4",
   authDomain: "lifting-companion-26cf8.firebaseapp.com",
   projectId: "lifting-companion-26cf8",
   storageBucket: "lifting-companion-26cf8.firebasestorage.app",
   messagingSenderId: "148509178620",
   appId: "1:148509178620:web:0c0b0f0e3e0f3e0f0e0f0e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let workouts = [];
let currentUser = null;
let selectedEffort = 'medium';
let currentCardioType = 'run';
let currentWorkoutSection = 'lifting';
let liftingExercises = [];
let coreExercises = [];
let currentMetric = 'weight';
let currentRange = 'daily';

onAuthStateChanged(auth, (user) => {
   if (user) {
       currentUser = user;
       document.getElementById('auth-section').style.display = 'none';
       document.getElementById('app-section').style.display = 'block';
       loadWorkouts();
   } else {
       currentUser = null;
       document.getElementById('auth-section').style.display = 'block';
       document.getElementById('app-section').style.display = 'none';
   }
});

document.getElementById('sign-in-btn').addEventListener('click', async () => {
   const provider = new GoogleAuthProvider();
   try {
       await signInWithPopup(auth, provider);
   } catch (error) {
       alert('Sign in failed: ' + error.message);
   }
});

document.getElementById('sign-out-btn').addEventListener('click', async () => {
   await signOut(auth);
});

document.querySelectorAll('.tab').forEach(tab => {
   tab.addEventListener('click', () => {
       const tabName = tab.dataset.tab;
       document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
       document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
       tab.classList.add('active');
       document.getElementById(`${tabName}-tab`).classList.add('active');
       
       if (tabName === 'today') renderToday();
       if (tabName === 'history') renderHistory();
       if (tabName === 'trends') renderTrends();
   });
});

document.querySelectorAll('.section-tab').forEach(tab => {
   tab.addEventListener('click', () => {
       const section = tab.dataset.section;
       currentWorkoutSection = section;
       document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
       document.querySelectorAll('.workout-section').forEach(s => s.classList.remove('active'));
       tab.classList.add('active');
       document.getElementById(`${section}-section`).classList.add('active');
   });
});

document.querySelectorAll('.effort-btn').forEach(btn => {
   btn.addEventListener('click', () => {
       const section = btn.closest('.workout-section');
       section.querySelectorAll('.effort-btn').forEach(b => b.classList.remove('selected'));
       btn.classList.add('selected');
       selectedEffort = btn.dataset.effort;
   });
});

document.querySelectorAll('.cardio-tab').forEach(tab => {
   tab.addEventListener('click', () => {
       currentCardioType = tab.dataset.cardio;
       document.querySelectorAll('.cardio-tab').forEach(t => t.classList.remove('active'));
       document.querySelectorAll('.cardio-inputs').forEach(i => i.classList.remove('active'));
       tab.classList.add('active');
       document.getElementById(`${currentCardioType}-inputs`).classList.add('active');
   });
});

document.getElementById('lifting-exercise').addEventListener('change', (e) => {
   const newExerciseInput = document.getElementById('new-lifting-exercise');
   if (e.target.value === '__new__') {
       newExerciseInput.style.display = 'block';
       newExerciseInput.focus();
   } else {
       newExerciseInput.style.display = 'none';
   }
});

document.getElementById('core-exercise').addEventListener('change', (e) => {
   const newExerciseInput = document.getElementById('new-core-exercise');
   if (e.target.value === '__new__') {
       newExerciseInput.style.display = 'block';
       newExerciseInput.focus();
   } else {
       newExerciseInput.style.display = 'none';
   }
});

document.querySelectorAll('.toggle-btn[data-metric]').forEach(btn => {
   btn.addEventListener('click', () => {
       currentMetric = btn.dataset.metric;
       document.querySelectorAll('.toggle-btn[data-metric]').forEach(b => b.classList.remove('active'));
       btn.classList.add('active');
       renderTrends();
   });
});

document.querySelectorAll('.toggle-btn[data-range]').forEach(btn => {
   btn.addEventListener('click', () => {
       if (!btn.disabled) {
           currentRange = btn.dataset.range;
           document.querySelectorAll('.toggle-btn[data-range]').forEach(b => b.classList.remove('active'));
           btn.classList.add('active');
           renderTrends();
       }
   });
});

document.getElementById('log-lifting-btn').addEventListener('click', async () => {
   const exerciseSelect = document.getElementById('lifting-exercise');
   const newExerciseInput = document.getElementById('new-lifting-exercise');
   let name = exerciseSelect.value === '__new__' ? newExerciseInput.value.trim() : exerciseSelect.value;
   
   const sets = parseInt(document.getElementById('sets').value) || 0;
   const reps = parseInt(document.getElementById('reps').value) || 0;
   const weight = parseInt(document.getElementById('weight').value) || 0;
   
   if (!name || sets === 0 || reps === 0 || weight === 0) {
       alert('Please fill in all fields');
       return;
   }
   
   await addDoc(collection(db, 'workouts'), {
       type: 'lifting',
       name,
       sets,
       reps,
       weight,
       effort: selectedEffort,
       date: new Date().toLocaleDateString('en-CA'),
       timestamp: new Date(),
       userId: currentUser.uid,
       is_deleted: 'N'
   });
   
   document.getElementById('sets').value = '';
   document.getElementById('reps').value = '';
   document.getElementById('weight').value = '';
   newExerciseInput.value = '';
   newExerciseInput.style.display = 'none';
   exerciseSelect.value = '';
   document.querySelectorAll('#lifting-section .effort-btn').forEach(b => b.classList.remove('selected'));
   document.querySelector('#lifting-section .effort-btn.medium').classList.add('selected');
   selectedEffort = 'medium';
});

document.getElementById('log-core-btn').addEventListener('click', async () => {
   const exerciseSelect = document.getElementById('core-exercise');
   const newExerciseInput = document.getElementById('new-core-exercise');
   let name = exerciseSelect.value === '__new__' ? newExerciseInput.value.trim() : exerciseSelect.value;
   
   const sets = parseInt(document.getElementById('core-sets').value) || 0;
   const reps = parseInt(document.getElementById('core-reps').value) || 0;
   const time = parseInt(document.getElementById('core-time').value) || 0;
   
   if (!name || (sets === 0 && reps === 0 && time === 0)) {
       alert('Please fill in exercise name and at least one field');
       return;
   }
   
   const workout = {
       type: 'core',
       name,
       effort: selectedEffort,
       date: new Date().toLocaleDateString('en-CA'),
       timestamp: new Date(),
       userId: currentUser.uid,
       is_deleted: 'N'
   };
   
   if (sets > 0) workout.sets = sets;
   if (reps > 0) workout.reps = reps;
   if (time > 0) workout.time = time;
   
   await addDoc(collection(db, 'workouts'), workout);
   
   document.getElementById('core-sets').value = '';
   document.getElementById('core-reps').value = '';
   document.getElementById('core-time').value = '';
   newExerciseInput.value = '';
   newExerciseInput.style.display = 'none';
   exerciseSelect.value = '';
   document.querySelectorAll('#core-section .effort-btn').forEach(b => b.classList.remove('selected'));
   document.querySelector('#core-section .effort-btn.medium').classList.add('selected');
   selectedEffort = 'medium';
});

document.getElementById('log-run-btn').addEventListener('click', async () => {
   const time = parseInt(document.getElementById('run-time').value) || 0;
   const distance = parseFloat(document.getElementById('run-distance').value) || 0;
   const elevation = parseInt(document.getElementById('run-elevation').value) || 0;
   
   if (time === 0 || distance === 0) {
       alert('Please fill in time and distance');
       return;
   }
   
   const workout = {
       type: 'cardio',
       cardioType: 'run',
       time,
       distance,
       date: new Date().toLocaleDateString('en-CA'),
       timestamp: new Date(),
       userId: currentUser.uid,
       is_deleted: 'N'
   };
   
   if (elevation > 0) workout.elevation = elevation;
   
   await addDoc(collection(db, 'workouts'), workout);
   
   document.getElementById('run-time').value = '';
   document.getElementById('run-distance').value = '';
   document.getElementById('run-elevation').value = '';
});

document.getElementById('log-spin-btn').addEventListener('click', async () => {
   const time = parseInt(document.getElementById('spin-time').value) || 0;
   const distance = parseFloat(document.getElementById('spin-distance').value) || 0;
   
   if (time === 0 || distance === 0) {
       alert('Please fill in time and distance');
       return;
   }
   
   await addDoc(collection(db, 'workouts'), {
       type: 'cardio',
       cardioType: 'spin',
       time,
       distance,
       date: new Date().toLocaleDateString('en-CA'),
       timestamp: new Date(),
       userId: currentUser.uid,
       is_deleted: 'N'
   });
   
   document.getElementById('spin-time').value = '';
   document.getElementById('spin-distance').value = '';
});

document.getElementById('log-row-btn').addEventListener('click', async () => {
   const time = parseInt(document.getElementById('row-time').value) || 0;
   const distance = parseInt(document.getElementById('row-distance').value) || 0;
   
   if (time === 0 || distance === 0) {
       alert('Please fill in time and distance');
       return;
   }
   
   await addDoc(collection(db, 'workouts'), {
       type: 'cardio',
       cardioType: 'row',
       time,
       distance,
       date: new Date().toLocaleDateString('en-CA'),
       timestamp: new Date(),
       userId: currentUser.uid,
       is_deleted: 'N'
   });
   
   document.getElementById('row-time').value = '';
   document.getElementById('row-distance').value = '';
});

function loadWorkouts() {
   const q = query(
       collection(db, 'workouts'),
       where('userId', '==', currentUser.uid),
       where('is_deleted', '==', 'N'),
       orderBy('timestamp', 'desc')
   );
   
   onSnapshot(q, (snapshot) => {
       workouts = snapshot.docs.map(doc => ({
           id: doc.id,
           ...doc.data()
       }));
       updateExerciseLists();
       renderToday();
   });
}

function updateExerciseLists() {
   const liftingSet = new Set();
   const coreSet = new Set();
   
   workouts.forEach(w => {
       if (w.type === 'lifting') liftingSet.add(w.name);
       if (w.type === 'core') coreSet.add(w.name);
   });
   
   liftingExercises = Array.from(liftingSet).sort();
   coreExercises = Array.from(coreSet).sort();
   
   const liftingSelect = document.getElementById('lifting-exercise');
   liftingSelect.innerHTML = '<option value="">Select exercise...</option>' +
       liftingExercises.map(e => `<option value="${e}">${e}</option>`).join('') +
       '<option value="__new__">+ Add New Exercise</option>';
   
   const coreSelect = document.getElementById('core-exercise');
   coreSelect.innerHTML = '<option value="">Select exercise...</option>' +
       coreExercises.map(e => `<option value="${e}">${e}</option>`).join('') +
       '<option value="__new__">+ Add New Exercise</option>';
}


function renderToday() {
   const today = new Date().toLocaleDateString('en-CA');
   const todayWorkouts = workouts.filter(w => w.date === today);
   const container = document.getElementById('today-entries');
   
   if (todayWorkouts.length === 0) {
       container.innerHTML = '<p style="color: #999;">No workouts logged today</p>';
       return;
   }
   
   container.innerHTML = todayWorkouts.map(w => {
       if (w.type === 'lifting') {
           return `<div class="entry ${w.effort}">
               <div class="entry-header">
                   <span>${w.name}</span>
                   <span>${w.sets}×${w.reps} @ ${w.weight}lbs</span>
               </div>
               <div class="entry-details">Total: ${w.sets * w.reps * w.weight}lbs</div>
               <div class="entry-actions">
                   <button onclick="showEditModal('${w.id}')" class="btn-edit">✏️ Edit</button>
                   <button onclick="deleteWorkout('${w.id}')" class="btn-delete">🗑️ Delete</button>
               </div>
           </div>`;
       } else if (w.type === 'core') {
           const details = [];
           if (w.sets) details.push(`${w.sets} sets`);
           if (w.reps) details.push(`${w.reps} reps`);
           if (w.time) details.push(`${w.time}s`);
           return `<div class="entry ${w.effort}">
               <div class="entry-header">
                   <span>${w.name}</span>
                   <span>${details.join(' • ')}</span>
               </div>
               <div class="entry-actions">
                   <button onclick="showEditModal('${w.id}')" class="btn-edit">✏️ Edit</button>
                   <button onclick="deleteWorkout('${w.id}')" class="btn-delete">🗑️ Delete</button>
               </div>
           </div>`;
       } else {
           const distUnit = w.cardioType === 'row' ? 'm' : 'mi';
           const elevText = w.elevation ? `, ${w.elevation}ft` : '';
           const pace = w.cardioType === 'row' ? 
               `${(w.time / (w.distance / 500)).toFixed(1)} min/500m` :
               `${(w.time / w.distance).toFixed(1)} min/mi`;
           
           return `<div class="entry">
               <div class="entry-header">
                   <span>${w.cardioType.toUpperCase()}</span>
                   <span>${w.distance}${distUnit} in ${w.time}min</span>
               </div>
               <div class="entry-details">Pace: ${pace}${elevText}</div>
               <div class="entry-actions">
                   <button onclick="showEditModal('${w.id}')" class="btn-edit">✏️ Edit</button>
                   <button onclick="deleteWorkout('${w.id}')" class="btn-delete">🗑️ Delete</button>
               </div>
           </div>`;
       }
   }).join('');
}

function renderHistory() {
   const byDate = {};
   workouts.forEach(w => {
       if (!byDate[w.date]) byDate[w.date] = [];
       byDate[w.date].push(w);
   });
   
   const dates = Object.keys(byDate).sort().reverse();
   const container = document.getElementById('history-list');
   
   if (dates.length === 0) {
       container.innerHTML = '<p style="color: #999;">No workout history</p>';
       return;
   }
   
   container.innerHTML = dates.map(date => {
       const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { 
           weekday: 'short', 
           year: 'numeric', 
           month: 'short', 
           day: 'numeric' 
       });
       
       const entries = byDate[date].map(w => {
           if (w.type === 'lifting') {
               return `<div class="entry ${w.effort}">
                   <div class="entry-header">
                       <span>${w.name}</span>
                       <span>${w.sets}×${w.reps} @ ${w.weight}lbs</span>
                   </div>
                   <div class="entry-actions">
                       <button onclick="showEditModal('${w.id}')" class="btn-edit">✏️</button>
                       <button onclick="deleteWorkout('${w.id}')" class="btn-delete">🗑️</button>
                   </div>
               </div>`;
           } else if (w.type === 'core') {
               const details = [];
               if (w.sets) details.push(`${w.sets} sets`);
               if (w.reps) details.push(`${w.reps} reps`);
               if (w.time) details.push(`${w.time}s`);
               return `<div class="entry ${w.effort}">
                   <div class="entry-header">
                       <span>${w.name}</span>
                       <span>${details.join(' • ')}</span>
                   </div>
                   <div class="entry-actions">
                       <button onclick="showEditModal('${w.id}')" class="btn-edit">✏️</button>
                       <button onclick="deleteWorkout('${w.id}')" class="btn-delete">🗑️</button>
                   </div>
               </div>`;
           } else {
               const distUnit = w.cardioType === 'row' ? 'm' : 'mi';
               const elevText = w.elevation ? `, ${w.elevation}ft` : '';
               const pace = w.cardioType === 'row' ? 
                   `${(w.time / (w.distance / 500)).toFixed(1)} min/500m` :
                   `${(w.time / w.distance).toFixed(1)} min/mi`;
               
               return `<div class="entry">
                   <div class="entry-header">
                       <span>${w.cardioType.toUpperCase()}</span>
                       <span>${w.distance}${distUnit} in ${w.time}min</span>
                   </div>
                   <div class="entry-details">Pace: ${pace}${elevText}</div>
                   <div class="entry-actions">
                       <button onclick="showEditModal('${w.id}')" class="btn-edit">✏️</button>
                       <button onclick="deleteWorkout('${w.id}')" class="btn-delete">🗑️</button>
                   </div>
               </div>`;
           }
       }).join('');
       
       return `<div class="date-group">
           <div class="date-header">${displayDate}</div>
           ${entries}
       </div>`;
   }).join('');
}

function aggregateData() {
   const byDate = {};
   const byWeek = {};
   const byMonth = {};
   
   workouts.forEach(w => {
       if (!byDate[w.date]) byDate[w.date] = { weight: 0, distance: 0 };
       
       if (w.type === 'lifting') {
           byDate[w.date].weight += w.sets * w.reps * w.weight;
       } else if (w.type === 'cardio' && w.cardioType !== 'row') {
           byDate[w.date].distance += w.distance;
       }
       
       const date = new Date(w.date + 'T12:00:00');
       const sunday = new Date(date);
       sunday.setDate(date.getDate() - date.getDay());
       const weekKey = sunday.toLocaleDateString('en-CA');
       
       if (!byWeek[weekKey]) byWeek[weekKey] = { weight: 0, distance: 0 };
       if (w.type === 'lifting') {
           byWeek[weekKey].weight += w.sets * w.reps * w.weight;
       } else if (w.type === 'cardio' && w.cardioType !== 'row') {
           byWeek[weekKey].distance += w.distance;
       }
       
       const monthKey = w.date.substring(0, 7);
       if (!byMonth[monthKey]) byMonth[monthKey] = { weight: 0, distance: 0 };
       if (w.type === 'lifting') {
           byMonth[monthKey].weight += w.sets * w.reps * w.weight;
       } else if (w.type === 'cardio' && w.cardioType !== 'row') {
           byMonth[monthKey].distance += w.distance;
       }
   });
   
   return { byDate, byWeek, byMonth };
}

function formatMonthLabel(monthKey) {
   const [year, month] = monthKey.split('-');
   const date = new Date(year, parseInt(month) - 1);
   return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function updateTimeRangeToggles() {
   const { byWeek, byMonth } = aggregateData();
   const weekCount = Object.keys(byWeek).length;
   const monthCount = Object.keys(byMonth).length;
   
   const weeklyBtn = document.querySelector('.toggle-btn[data-range="weekly"]');
   const monthlyBtn = document.querySelector('.toggle-btn[data-range="monthly"]');
   
   if (weekCount < 6) {
       weeklyBtn.disabled = true;
       if (currentRange === 'weekly') {
           currentRange = 'daily';
           document.querySelector('.toggle-btn[data-range="daily"]').classList.add('active');
           weeklyBtn.classList.remove('active');
       }
   } else {
       weeklyBtn.disabled = false;
   }
   
   if (monthCount < 5) {
       monthlyBtn.disabled = true;
       if (currentRange === 'monthly') {
           currentRange = 'daily';
           document.querySelector('.toggle-btn[data-range="daily"]').classList.add('active');
           monthlyBtn.classList.remove('active');
       }
   } else {
       monthlyBtn.disabled = false;
   }
}

function renderTrends() {
   updateTimeRangeToggles();
   
   const canvas = document.getElementById('chart');
   const ctx = canvas.getContext('2d');
   
   canvas.width = canvas.offsetWidth;
   canvas.height = 300;
   
   const { byDate, byWeek, byMonth } = aggregateData();
   
   let data, labels;
   if (currentRange === 'weekly') {
       const weeks = Object.keys(byWeek).sort();
       labels = weeks.map(w => {
           const date = new Date(w + 'T12:00:00');
           return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
       });
       data = weeks.map(w => currentMetric === 'weight' ? byWeek[w].weight : byWeek[w].distance);
   } else if (currentRange === 'monthly') {
       const months = Object.keys(byMonth).sort();
       labels = months.map(m => formatMonthLabel(m));
       data = months.map(m => currentMetric === 'weight' ? byMonth[m].weight : byMonth[m].distance);
   } else {
       const dates = Object.keys(byDate).sort();
       labels = dates.map(d => {
           const date = new Date(d + 'T12:00:00');
           return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
       });
       data = dates.map(d => currentMetric === 'weight' ? byDate[d].weight : byDate[d].distance);
   }
   
   if (data.length === 0) {
       ctx.fillStyle = '#666';
       ctx.font = '14px sans-serif';
       ctx.textAlign = 'center';
       ctx.fillText('No data to display', canvas.width / 2, canvas.height / 2);
       document.getElementById('insights').innerHTML = '<p>Log workouts to see insights</p>';
       return;
   }
   
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   
   const padding = 60;
   const bottomPadding = 80;
   const chartWidth = canvas.width - padding * 2;
   const chartHeight = canvas.height - padding - bottomPadding;
   const maxValue = Math.max(...data, 1);
   
   ctx.strokeStyle = '#ddd';
   ctx.lineWidth = 1;
   ctx.fillStyle = '#666';
   ctx.font = '12px sans-serif';
   ctx.textAlign = 'right';
   
   for (let i = 0; i <= 5; i++) {
       const y = padding + (chartHeight / 5) * i;
       const value = Math.round(maxValue - (maxValue / 5) * i);
       
       ctx.beginPath();
       ctx.moveTo(padding, y);
       ctx.lineTo(canvas.width - padding, y);
       ctx.stroke();
       
       ctx.fillText(value.toString(), padding - 10, y + 4);
   }
   
   ctx.strokeStyle = '#007bff';
   ctx.lineWidth = 2;
   ctx.beginPath();
   
   for (let i = 0; i < data.length; i++) {
       const x = padding + (i / Math.max(data.length - 1, 1)) * chartWidth;
       const y = padding + chartHeight - (data[i] / maxValue) * chartHeight;
       
       if (i === 0) {
           ctx.moveTo(x, y);
       } else {
           ctx.lineTo(x, y);
       }
   }
   ctx.stroke();
   
   ctx.fillStyle = '#007bff';
   for (let i = 0; i < data.length; i++) {
       const x = padding + (i / Math.max(data.length - 1, 1)) * chartWidth;
       const y = padding + chartHeight - (data[i] / maxValue) * chartHeight;
       
       ctx.beginPath();
       ctx.arc(x, y, 4, 0, Math.PI * 2);
       ctx.fill();
   }
   
   ctx.fillStyle = '#666';
   ctx.font = '10px sans-serif';
   ctx.textAlign = 'left';
   
   const maxLabels = Math.min(labels.length, 10);
   const step = Math.ceil(labels.length / maxLabels);
   
   for (let i = 0; i < labels.length; i += step) {
       const x = padding + (i / Math.max(data.length - 1, 1)) * chartWidth;
       
       ctx.save();
       ctx.translate(x, canvas.height - bottomPadding + 40);
       ctx.rotate(-Math.PI / 2);
       ctx.fillText(labels[i], 0, 5);
       ctx.restore();
   }
   
   const unit = currentMetric === 'weight' ? 'lbs' : 'mi';
   ctx.save();
   ctx.translate(20, canvas.height / 2);
   ctx.rotate(-Math.PI / 2);
   ctx.textAlign = 'center';
   ctx.fillText(unit, 0, 0);
   ctx.restore();
   
   const insights = generateInsights();
   document.getElementById('insights').innerHTML = insights;
}

function generateInsights() {
   const byExercise = {};
   const liftingWorkouts = workouts.filter(w => w.type === 'lifting');
   
   liftingWorkouts.forEach(w => {
       if (!byExercise[w.name]) byExercise[w.name] = [];
       byExercise[w.name].push(w);
   });
   
   const suggestions = [];
   const celebrations = [];
   
   Object.keys(byExercise).forEach(exercise => {
       const sessions = byExercise[exercise].sort((a, b) => 
           new Date(b.date + 'T12:00:00') - new Date(a.date + 'T12:00:00')
       );
       
       if (sessions.length >= 10) {
           const latest = sessions[0];
           const last10 = sessions.slice(0, 10);
           const maxInLast10 = Math.max(...last10.map(s => s.weight));
           
           if (latest.weight === maxInLast10) {
               celebrations.push(`🎉 ${exercise}: New personal best in last 10 sessions at ${latest.weight}lbs!`);
           }
       }
       
       if (sessions.length >= 20) {
           const last20 = sessions.slice(0, 20);
           const maxWeight = Math.max(...last20.map(s => s.weight));
           const last25 = sessions.slice(0, Math.min(25, sessions.length));
           const atMaxWeight = last25.filter(s => s.weight === maxWeight);
           
           if (atMaxWeight.length >= 5) {
               const last5AtMax = atMaxWeight.slice(0, 5);
               const allEasy = last5AtMax.every(s => s.effort === 'easy');
               
               if (allEasy) {
                   suggestions.push(`💪 ${exercise}: Consider increasing weight from ${maxWeight}lbs to ${maxWeight + 5}lbs (5 easy sessions at max weight)`);
               }
           }
       }
   });
   
   const today = new Date();
   const sunday = new Date(today);
   sunday.setDate(today.getDate() - today.getDay());
   const lastSunday = new Date(sunday);
   lastSunday.setDate(sunday.getDate() - 7);
   
   const currentWeekStart = sunday.toLocaleDateString('en-CA');
   const lastWeekStart = lastSunday.toLocaleDateString('en-CA');
   const lastWeekEnd = new Date(sunday);
   lastWeekEnd.setDate(sunday.getDate() - 1);
   const lastWeekEndStr = lastWeekEnd.toLocaleDateString('en-CA');
   
   let currentWeekWeight = 0;
   let lastWeekWeight = 0;
   let lifetimeWeight = 0;
   let currentWeekDistance = 0;
   let lastWeekDistance = 0;
   let lifetimeDistance = 0;
   
   workouts.forEach(w => {
       if (w.type === 'lifting') {
           const total = w.sets * w.reps * w.weight;
           lifetimeWeight += total;
           
           if (w.date >= currentWeekStart) {
               currentWeekWeight += total;
           } else if (w.date >= lastWeekStart && w.date <= lastWeekEndStr) {
               lastWeekWeight += total;
           }
       } else if (w.type === 'cardio' && w.cardioType !== 'row') {
           lifetimeDistance += w.distance;
           
           if (w.date >= currentWeekStart) {
               currentWeekDistance += w.distance;
           } else if (w.date >= lastWeekStart && w.date <= lastWeekEndStr) {
               lastWeekDistance += w.distance;
           }
       }
   });
   
   let html = '<div class="weekly-totals"><h3>Weekly Totals</h3>';
   html += `<p>Weight: ${currentWeekWeight.toLocaleString()}lbs (Prev Wk: ${lastWeekWeight.toLocaleString()}lbs) (Lifetime: ${lifetimeWeight.toLocaleString()}lbs)</p>`;
   html += `<p>Distance: ${currentWeekDistance.toFixed(1)}mi (Prev Wk: ${lastWeekDistance.toFixed(1)}mi) (Lifetime: ${lifetimeDistance.toFixed(1)}mi)</p>`;
   html += '</div>';
   
   if (celebrations.length > 0) {
       html += '<h3>🎉 Celebrations</h3><ul>';
       celebrations.forEach(c => html += `<li>${c}</li>`);
       html += '</ul>';
   }
   
   if (suggestions.length > 0) {
       html += '<h3>💡 Suggestions</h3><ul>';
       suggestions.forEach(s => html += `<li>${s}</li>`);
       html += '</ul>';
   }
   
   if (celebrations.length === 0 && suggestions.length === 0) {
       html += '<p>Keep logging workouts to see personalized insights!</p>';
   }
   
   return html;
}

window.showEditModal = function(workoutId) {
   const workout = workouts.find(w => w.id === workoutId);
   if (!workout) return;
   
   const modal = document.getElementById('edit-modal');
   const form = document.getElementById('edit-form');
   
   if (workout.type === 'lifting') {
       form.innerHTML = `
           <input type="text" id="edit-name" value="${workout.name}" placeholder="Exercise name">
           <input type="number" id="edit-sets" value="${workout.sets}" placeholder="Sets">
           <input type="number" id="edit-reps" value="${workout.reps}" placeholder="Reps">
           <input type="number" id="edit-weight" value="${workout.weight}" placeholder="Weight">
           <div class="effort-buttons">
               <button class="effort-btn easy ${workout.effort === 'easy' ? 'selected' : ''}" data-effort="easy">Easy</button>
               <button class="effort-btn medium ${workout.effort === 'medium' ? 'selected' : ''}" data-effort="medium">Medium</button>
               <button class="effort-btn hard ${workout.effort === 'hard' ? 'selected' : ''}" data-effort="hard">Hard</button>
           </div>
           <button onclick="saveEdit('${workoutId}')" class="btn">Save Changes</button>
       `;
   } else if (workout.type === 'core') {
       form.innerHTML = `
           <input type="text" id="edit-name" value="${workout.name}" placeholder="Exercise name">
           <input type="number" id="edit-sets" value="${workout.sets || ''}" placeholder="Sets (optional)">
           <input type="number" id="edit-reps" value="${workout.reps || ''}" placeholder="Reps (optional)">
           <input type="number" id="edit-time" value="${workout.time || ''}" placeholder="Time (optional)">
           <div class="effort-buttons">
               <button class="effort-btn easy ${workout.effort === 'easy' ? 'selected' : ''}" data-effort="easy">Easy</button>
               <button class="effort-btn medium ${workout.effort === 'medium' ? 'selected' : ''}" data-effort="medium">Medium</button>
               <button class="effort-btn hard ${workout.effort === 'hard' ? 'selected' : ''}" data-effort="hard">Hard</button>
           </div>
           <button onclick="saveEdit('${workoutId}')" class="btn">Save Changes</button>
       `;
   } else {
       const distUnit = workout.cardioType === 'row' ? 'meters' : 'miles';
       form.innerHTML = `
           <input type="number" id="edit-time" value="${workout.time}" placeholder="Time (minutes)">
           <input type="number" id="edit-distance" value="${workout.distance}" placeholder="Distance (${distUnit})" step="${workout.cardioType === 'row' ? '1' : '0.01'}">
           ${workout.cardioType === 'run' ? `<input type="number" id="edit-elevation" value="${workout.elevation || ''}" placeholder="Elevation (ft, optional)">` : ''}
           <button onclick="saveEdit('${workoutId}')" class="btn">Save Changes</button>
       `;
   }
   
   form.querySelectorAll('.effort-btn').forEach(btn => {
       btn.addEventListener('click', () => {
           form.querySelectorAll('.effort-btn').forEach(b => b.classList.remove('selected'));
           btn.classList.add('selected');
       });
   });
   
   modal.style.display = 'block';
};

window.saveEdit = async function(workoutId) {
   const workout = workouts.find(w => w.id === workoutId);
   if (!workout) return;
   
   const updates = {};
   
   if (workout.type === 'lifting') {
       updates.name = document.getElementById('edit-name').value;
       updates.sets = parseInt(document.getElementById('edit-sets').value) || 0;
       updates.reps = parseInt(document.getElementById('edit-reps').value) || 0;
       updates.weight = parseInt(document.getElementById('edit-weight').value) || 0;
       const selectedBtn = document.querySelector('#edit-form .effort-btn.selected');
       updates.effort = selectedBtn ? selectedBtn.dataset.effort : 'medium';
   } else if (workout.type === 'core') {
       updates.name = document.getElementById('edit-name').value;
       const sets = parseInt(document.getElementById('edit-sets').value) || 0;
       const reps = parseInt(document.getElementById('edit-reps').value) || 0;
       const time = parseInt(document.getElementById('edit-time').value) || 0;
       if (sets > 0) updates.sets = sets;
       if (reps > 0) updates.reps = reps;
       if (time > 0) updates.time = time;
       const selectedBtn = document.querySelector('#edit-form .effort-btn.selected');
       updates.effort = selectedBtn ? selectedBtn.dataset.effort : 'medium';
   } else {
       updates.time = parseInt(document.getElementById('edit-time').value) || 0;
       updates.distance = workout.cardioType === 'row' ? 
           parseInt(document.getElementById('edit-distance').value) || 0 :
           parseFloat(document.getElementById('edit-distance').value) || 0;
       if (workout.cardioType === 'run') {
           const elevation = parseInt(document.getElementById('edit-elevation').value) || 0;
           if (elevation > 0) updates.elevation = elevation;
       }
   }
   
   await updateDoc(doc(db, 'workouts', workoutId), updates);
   document.getElementById('edit-modal').style.display = 'none';
};

window.deleteWorkout = async function(workoutId) {
   if (confirm('Delete this workout?')) {
       await updateDoc(doc(db, 'workouts', workoutId), { is_deleted: 'Y' });
   }
};

document.querySelector('.close').addEventListener('click', () => {
   document.getElementById('edit-modal').style.display = 'none';
});

window.addEventListener('click', (e) => {
   const modal = document.getElementById('edit-modal');
   if (e.target === modal) {
       modal.style.display = 'none';
   }
});

if ('serviceWorker' in navigator) {
   navigator.serviceWorker.register('sw.js');
}
