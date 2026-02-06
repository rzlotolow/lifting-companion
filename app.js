import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
   apiKey: "AIzaSyBWOb8ITzTaKWP2nKtFE2O0TBdnW7Q1XN4",
   authDomain: "lifting-companion-26cf8.firebaseapp.com",
   projectId: "lifting-companion-26cf8",
   storageBucket: "lifting-companion-26cf8.firebasestorage.app",
   messagingSenderId: "328077423664",
   appId: "1:328077423664:web:45ca20dab58a4b40c429f5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let selectedLiftingEffort = 'medium';
let selectedCoreEffort = 'medium';
let workouts = [];
let editingId = null;
let currentUser = null;
let unsubscribe = null;
let currentMetric = 'weight';
let currentRange = 'daily';

onAuthStateChanged(auth, (user) => {
   if (user) {
       currentUser = user;
       document.getElementById('auth-screen').classList.add('hidden');
       document.getElementById('app').classList.remove('hidden');
       setupRealtimeSync();
   } else {
       currentUser = null;
       if (unsubscribe) unsubscribe();
       document.getElementById('auth-screen').classList.remove('hidden');
       document.getElementById('app').classList.add('hidden');
   }
});

function setupRealtimeSync() {
   const q = query(
       collection(db, 'workouts'),
       where('userId', '==', currentUser.uid),
       where('is_deleted', '==', 'N'),
       orderBy('timestamp', 'desc')
   );
   
   unsubscribe = onSnapshot(q, (snapshot) => {
       workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       renderToday();
       updateExerciseLists();
       if (document.getElementById('history').classList.contains('active')) {
           renderHistory();
       }
       if (document.getElementById('trends').classList.contains('active')) {
           renderTrends();
       }
   });
}

document.getElementById('google-signin').addEventListener('click', async () => {
   const provider = new GoogleAuthProvider();
   try {
       await signInWithPopup(auth, provider);
   } catch (error) {
       alert('Sign in failed: ' + error.message);
   }
});

document.getElementById('signout-btn').addEventListener('click', async () => {
   await signOut(auth);
   workouts = [];
});

document.querySelectorAll('.tab').forEach(tab => {
   tab.addEventListener('click', () => {
       document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
       tab.classList.add('active');
       document.getElementById(tab.dataset.tab).classList.add('active');
       if (tab.dataset.tab === 'history') renderHistory();
       if (tab.dataset.tab === 'trends') renderTrends();
   });
});

document.querySelectorAll('.type-btn').forEach(btn => {
   btn.addEventListener('click', () => {
       document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
       btn.classList.add('active');
       document.getElementById('lifting-form').classList.toggle('hidden', btn.dataset.type !== 'lifting');
       document.getElementById('core-form').classList.toggle('hidden', btn.dataset.type !== 'core');
       document.getElementById('cardio-form').classList.toggle('hidden', btn.dataset.type !== 'cardio');
   });
});

document.querySelectorAll('[data-metric]').forEach(btn => {
   btn.addEventListener('click', () => {
       document.querySelectorAll('[data-metric]').forEach(b => b.classList.remove('active'));
       btn.classList.add('active');
       currentMetric = btn.dataset.metric;
       renderTrends();
   });
});

document.getElementById('lifting-exercise-select').addEventListener('change', (e) => {
   const nameInput = document.getElementById('lifting-exercise-name');
   if (e.target.value === '__new__') {
       nameInput.classList.remove('hidden');
       nameInput.focus();
   } else {
       nameInput.classList.add('hidden');
       nameInput.value = '';
   }
});

document.getElementById('core-exercise-select').addEventListener('change', (e) => {
   const nameInput = document.getElementById('core-exercise-name');
   if (e.target.value === '__new__') {
       nameInput.classList.remove('hidden');
       nameInput.focus();
   } else {
       nameInput.classList.add('hidden');
       nameInput.value = '';
   }
});

document.querySelectorAll('.lifting-effort').forEach(btn => {
   btn.addEventListener('click', () => {
       document.querySelectorAll('.lifting-effort').forEach(b => b.classList.remove('selected'));
       btn.classList.add('selected');
       selectedLiftingEffort = btn.dataset.effort;
   });
});
document.querySelector('.lifting-effort[data-effort="medium"]').classList.add('selected');

document.querySelectorAll('.core-effort').forEach(btn => {
   btn.addEventListener('click', () => {
       document.querySelectorAll('.core-effort').forEach(b => b.classList.remove('selected'));
       btn.classList.add('selected');
       selectedCoreEffort = btn.dataset.effort;
   });
});
document.querySelector('.core-effort[data-effort="medium"]').classList.add('selected');

document.getElementById('cardio-type').addEventListener('change', (e) => {
   const distanceInput = document.getElementById('distance');
   const elevationInput = document.querySelector('.elevation-input');
   
   if (e.target.value === 'row') {
       distanceInput.placeholder = 'Distance (m)';
       elevationInput.style.display = 'none';
   } else if (e.target.value === 'run') {
       distanceInput.placeholder = 'Distance (mi)';
       elevationInput.style.display = 'block';
   } else {
       distanceInput.placeholder = 'Distance (mi)';
       elevationInput.style.display = 'none';
   }
});

document.getElementById('add-lifting').addEventListener('click', async () => {
   const select = document.getElementById('lifting-exercise-select');
   const nameInput = document.getElementById('lifting-exercise-name');
   const name = select.value === '__new__' ? nameInput.value.trim() : select.value;
   const sets = parseInt(document.getElementById('lifting-sets').value) || 0;
   const reps = parseInt(document.getElementById('lifting-reps').value) || 0;
   const weight = parseInt(document.getElementById('lifting-weight').value) || 0;
   
   if (!name) return alert('Select or enter exercise name');
   
   const workout = {
       type: 'lifting',
       name,
       sets,
       reps,
       weight,
       effort: selectedLiftingEffort,
       date: new Date().toLocaleDateString('en-CA'),
       timestamp: Date.now(),
       userId: currentUser.uid,
       is_deleted: 'N'
   };
   
   await addDoc(collection(db, 'workouts'), workout);
   clearLiftingForm();
});

document.getElementById('add-core').addEventListener('click', async () => {
   const select = document.getElementById('core-exercise-select');
   const nameInput = document.getElementById('core-exercise-name');
   const name = select.value === '__new__' ? nameInput.value.trim() : select.value;
   const sets = parseInt(document.getElementById('core-sets').value) || 0;
   const reps = parseInt(document.getElementById('core-reps').value) || 0;
   const time = parseInt(document.getElementById('core-time').value) || 0;
   
   if (!name) return alert('Select or enter exercise name');
   
   const workout = {
       type: 'core',
       name,
       sets,
       reps,
       time,
       effort: selectedCoreEffort,
       date: new Date().toLocaleDateString('en-CA'),
       timestamp: Date.now(),
       userId: currentUser.uid,
       is_deleted: 'N'
   };
   
   await addDoc(collection(db, 'workouts'), workout);
   clearCoreForm();
});

document.getElementById('add-cardio').addEventListener('click', async () => {
   const cardioType = document.getElementById('cardio-type').value;
   const time = parseInt(document.getElementById('time').value) || 0;
   const distance = parseInt(document.getElementById('distance').value) || 0;
   const elevation = cardioType === 'run' ? parseInt(document.getElementById('elevation').value) || 0 : 0;
   
   const workout = {
       type: 'cardio',
       cardioType,
       time,
       distance,
       elevation,
       date: new Date().toLocaleDateString('en-CA'),
       timestamp: Date.now(),
       userId: currentUser.uid,
       is_deleted: 'N'
   };
   
   await addDoc(collection(db, 'workouts'), workout);
   clearCardioForm();
});

document.getElementById('cancel-edit').addEventListener('click', () => {
   document.getElementById('edit-modal').classList.add('hidden');
   editingId = null;
});

document.getElementById('save-edit').addEventListener('click', async () => {
   if (!editingId) return;
   
   const workout = workouts.find(w => w.id === editingId);
   const updates = {};
   
   if (workout.type === 'lifting') {
       updates.name = document.getElementById('edit-name').value.trim();
       updates.sets = parseInt(document.getElementById('edit-sets').value) || 0;
       updates.reps = parseInt(document.getElementById('edit-reps').value) || 0;
       updates.weight = parseInt(document.getElementById('edit-weight').value) || 0;
       updates.effort = document.querySelector('input[name="edit-effort"]:checked').value;
   } else if (workout.type === 'core') {
       updates.name = document.getElementById('edit-name').value.trim();
       updates.sets = parseInt(document.getElementById('edit-sets').value) || 0;
       updates.reps = parseInt(document.getElementById('edit-reps').value) || 0;
       updates.time = parseInt(document.getElementById('edit-time').value) || 0;
       updates.effort = document.querySelector('input[name="edit-effort"]:checked').value;
   } else {
       updates.time = parseInt(document.getElementById('edit-time').value) || 0;
       updates.distance = parseInt(document.getElementById('edit-distance').value) || 0;
       if (workout.cardioType === 'run') {
           updates.elevation = parseInt(document.getElementById('edit-elevation').value) || 0;
       }
   }
   
   await updateDoc(doc(db, 'workouts', editingId), updates);
   
   document.getElementById('edit-modal').classList.add('hidden');
   editingId = null;
});

window.showEditModal = function(id) {
   editingId = id;
   const workout = workouts.find(w => w.id === id);
   const form = document.getElementById('edit-form');
   
   if (workout.type === 'lifting') {
       form.innerHTML = `
           <input type="text" id="edit-name" value="${workout.name}" placeholder="Exercise name">
           <div class="input-row">
               <input type="number" id="edit-sets" value="${workout.sets}" placeholder="Sets" min="0" step="1">
               <input type="number" id="edit-reps" value="${workout.reps}" placeholder="Reps" min="0" step="1">
               <input type="number" id="edit-weight" value="${workout.weight}" placeholder="Weight (lbs)" min="0" step="1">
           </div>
           <div class="effort-selector">
               <label>Effort:</label>
               <label><input type="radio" name="edit-effort" value="easy" ${workout.effort === 'easy' ? 'checked' : ''}> 🟢 Easy</label>
               <label><input type="radio" name="edit-effort" value="medium" ${workout.effort === 'medium' ? 'checked' : ''}> 🟡 Medium</label>
               <label><input type="radio" name="edit-effort" value="hard" ${workout.effort === 'hard' ? 'checked' : ''}> 🔴 Hard</label>
           </div>
       `;
   } else if (workout.type === 'core') {
       form.innerHTML = `
           <input type="text" id="edit-name" value="${workout.name}" placeholder="Exercise name">
           <div class="input-row">
               <input type="number" id="edit-sets" value="${workout.sets || 0}" placeholder="Sets" min="0" step="1">
               <input type="number" id="edit-reps" value="${workout.reps || 0}" placeholder="Reps" min="0" step="1">
               <input type="number" id="edit-time" value="${workout.time || 0}" placeholder="Time (sec)" min="0" step="1">
           </div>
           <div class="effort-selector">
               <label>Effort:</label>
               <label><input type="radio" name="edit-effort" value="easy" ${workout.effort === 'easy' ? 'checked' : ''}> 🟢 Easy</label>
               <label><input type="radio" name="edit-effort" value="medium" ${workout.effort === 'medium' ? 'checked' : ''}> 🟡 Medium</label>
               <label><input type="radio" name="edit-effort" value="hard" ${workout.effort === 'hard' ? 'checked' : ''}> 🔴 Hard</label>
           </div>
       `;
   } else {
       const distUnit = workout.cardioType === 'row' ? 'm' : 'mi';
       const elevField = workout.cardioType === 'run' ? 
           `<input type="number" id="edit-elevation" value="${workout.elevation}" placeholder="Elevation (ft)" min="0" step="1">` : '';
       
       form.innerHTML = `
           <p><strong>${workout.cardioType.toUpperCase()}</strong></p>
           <div class="input-row">
               <input type="number" id="edit-time" value="${workout.time}" placeholder="Time (min)" min="0" step="1">
               <input type="number" id="edit-distance" value="${workout.distance}" placeholder="Distance (${distUnit})" min="0" step="1">
               ${elevField}
           </div>
       `;
   }
   
   document.getElementById('edit-modal').classList.remove('hidden');
};

window.deleteWorkout = async function(id) {
   if (confirm('Delete this workout?')) {
       await updateDoc(doc(db, 'workouts', id), { is_deleted: 'Y' });
   }
};

function clearLiftingForm() {
   document.getElementById('lifting-exercise-select').value = '';
   document.getElementById('lifting-exercise-name').value = '';
   document.getElementById('lifting-exercise-name').classList.add('hidden');
   document.getElementById('lifting-sets').value = '';
   document.getElementById('lifting-reps').value = '';
   document.getElementById('lifting-weight').value = '';
}

function clearCoreForm() {
   document.getElementById('core-exercise-select').value = '';
   document.getElementById('core-exercise-name').value = '';
   document.getElementById('core-exercise-name').classList.add('hidden');
   document.getElementById('core-sets').value = '';
   document.getElementById('core-reps').value = '';
   document.getElementById('core-time').value = '';
}

function clearCardioForm() {
   document.getElementById('time').value = '';
   document.getElementById('distance').value = '';
   document.getElementById('elevation').value = '';
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
               return `<div class="entry">
                   <div class="entry-header">
                       <span>${w.cardioType.toUpperCase()}</span>
                       <span>${w.distance}${distUnit} in ${w.time}min</span>
                   </div>
                   <div class="entry-actions">
                       <button onclick="showEditModal('${w.id}')" class="btn-edit">✏️</button>
                       <button onclick="deleteWorkout('${w.id}')" class="btn-delete">🗑️</button>
                   </div>
               </div>`;
           }
       }).join('');
       
       return `<div class="day-section">
           <div class="day-header">${new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
           ${entries}
       </div>`;
   }).join('');
}

function getWeekStart(date) {
   const d = new Date(date + 'T12:00:00');
   const day = d.getDay();
   const diff = d.getDate() - day;
   return new Date(d.setDate(diff)).toLocaleDateString('en-CA');
}

function getMonthKey(date) {
   const d = new Date(date + 'T12:00:00');
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey) {
   const [year, month] = monthKey.split('-');
   const d = new Date(year, month - 1);
   return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function aggregateData() {
   const byDate = {};
   const byWeek = {};
   const byMonth = {};
   
   workouts.forEach(w => {
       if (!byDate[w.date]) byDate[w.date] = { weight: 0, distance: 0 };
       if (w.type === 'lifting') byDate[w.date].weight += w.sets * w.reps * w.weight;
       if (w.type === 'cardio') {
           const distInMiles = w.cardioType === 'row' ? w.distance / 1609.34 : w.distance;
           byDate[w.date].distance += distInMiles;
       }
       
       const weekStart = getWeekStart(w.date);
       if (!byWeek[weekStart]) byWeek[weekStart] = { weight: 0, distance: 0 };
       if (w.type === 'lifting') byWeek[weekStart].weight += w.sets * w.reps * w.weight;
       if (w.type === 'cardio') {
           const distInMiles = w.cardioType === 'row' ? w.distance / 1609.34 : w.distance;
           byWeek[weekStart].distance += distInMiles;
       }
       
       const monthKey = getMonthKey(w.date);
       if (!byMonth[monthKey]) byMonth[monthKey] = { weight: 0, distance: 0 };
       if (w.type === 'lifting') byMonth[monthKey].weight += w.sets * w.reps * w.weight;
       if (w.type === 'cardio') {
           const distInMiles = w.cardioType === 'row' ? w.distance / 1609.34 : w.distance;
           byMonth[monthKey].distance += distInMiles;
       }
   });
   
   return { byDate, byWeek, byMonth };
}

function updateTimeRangeToggles() {
   const { byDate, byWeek, byMonth } = aggregateData();
   const weekCount = Object.keys(byWeek).length;
   const monthCount = Object.keys(byMonth).length;
   
   const container = document.getElementById('time-range-toggles');
   let html = '<button class="toggle-btn active" data-range="daily">Daily</button>';
   
   if (weekCount >= 6) {
       html += '<button class="toggle-btn" data-range="weekly">Weekly</button>';
   }
   
   if (monthCount >= 5) {
       html += '<button class="toggle-btn" data-range="monthly">Monthly</button>';
   }
   
   container.innerHTML = html;
   
   container.querySelectorAll('[data-range]').forEach(btn => {
       btn.addEventListener('click', () => {
           container.querySelectorAll('[data-range]').forEach(b => b.classList.remove('active'));
           btn.classList.add('active');
           currentRange = btn.dataset.range;
           renderTrends();
       });
   });
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
       labels = weeks.map(w => new Date(w + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
       data = weeks.map(w => currentMetric === 'weight' ? byWeek[w].weight : byWeek[w].distance);
   } else if (currentRange === 'monthly') {
       const months = Object.keys(byMonth).sort();
       labels = months.map(m => formatMonthLabel(m));
       data = months.map(m => currentMetric === 'weight' ? byMonth[m].weight : byMonth[m].distance);
   } else {
       const dates = Object.keys(byDate).sort();
       labels = dates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
       data = dates.map(d => currentMetric === 'weight' ? byDate[d].weight : byDate[d].distance);
   }
   
   if (data.length === 0) {
       ctx.fillText('No data to display', canvas.width / 2 - 50, canvas.height / 2);
       document.getElementById('insights').innerHTML = '<p>Log workouts to see insights</p>';
       return;
   }
   
   const maxValue = Math.max(...data, 1);
   const padding = 50;
   const chartWidth = canvas.width - padding * 2;
   const chartHeight = canvas.height - padding * 2;
   
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   
   ctx.strokeStyle = '#e0e0e0';
   ctx.lineWidth = 1;
   for (let i = 0; i <= 5; i++) {
       const y = padding + (chartHeight / 5) * i;
       ctx.beginPath();
       ctx.moveTo(padding, y);
       ctx.lineTo(canvas.width - padding, y);
       ctx.stroke();
       
       const value = maxValue - (maxValue / 5) * i;
       ctx.fillStyle = '#666';
       ctx.font = '12px sans-serif';
       ctx.textAlign = 'right';
       ctx.fillText(Math.round(value), padding - 5, y + 4);
   }
   
   ctx.strokeStyle = '#007bff';
   ctx.lineWidth = 3;
   ctx.beginPath();
   
   data.forEach((value, i) => {
       const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
       const y = padding + chartHeight - (value / maxValue) * chartHeight;
       if (i === 0) ctx.moveTo(x, y);
       else ctx.lineTo(x, y);
       
       ctx.fillStyle = '#007bff';
       ctx.beginPath();
       ctx.arc(x, y, 4, 0, Math.PI * 2);
       ctx.fill();
   });
   ctx.stroke();
   
   ctx.fillStyle = '#666';
   ctx.font = '11px sans-serif';
   ctx.textAlign = 'center';
   labels.forEach((label, i) => {
       const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
       ctx.fillText(label, x, canvas.height - 10);
   });
   
   const unit = currentMetric === 'weight' ? 'lbs' : 'mi';
   ctx.save();
   ctx.translate(15, canvas.height / 2);
   ctx.rotate(-Math.PI / 2);
   ctx.textAlign = 'center';
   ctx.fillText(unit, 0, 0);
   ctx.restore();
   
   const insights = generateInsights();
   document.getElementById('insights').innerHTML = insights;
}

function generateInsights() {
   const liftingByExercise = {};
   const coreByExercise = {};
   
   workouts.filter(w => w.type === 'lifting').forEach(w => {
       if (!liftingByExercise[w.name]) liftingByExercise[w.name] = [];
       liftingByExercise[w.name].push(w);
   });
   
   workouts.filter(w => w.type === 'core').forEach(w => {
       if (!coreByExercise[w.name]) coreByExercise[w.name] = [];
       coreByExercise[w.name].push(w);
   });
   
   const insights = [];
   
   Object.keys(liftingByExercise).forEach(exercise => {
       const exercises = liftingByExercise[exercise].sort((a, b) => a.timestamp - b.timestamp);
       const recent20 = exercises.slice(-20);
       const maxWeight = Math.max(...recent20.map(e => e.weight));
       const maxWeightWorkouts = recent20.filter(e => e.weight === maxWeight);
       const recent25 = exercises.slice(-25);
       const maxWeightIn25 = recent25.filter(e => e.weight === maxWeight);
       const last5AtMax = maxWeightIn25.slice(-5);
       
       if (last5AtMax.length === 5 && last5AtMax.every(e => e.effort === 'easy')) {
           insights.push(`<span class="suggestion">💪 Consider increasing weight for ${exercise} to ${maxWeight + 5}lbs</span> - Last 5 sessions at ${maxWeight}lbs were all easy`);
       }
       
       const last10 = exercises.slice(-10);
       const maxInLast10 = Math.max(...last10.map(e => e.weight));
       const latest = exercises[exercises.length - 1];
       if (latest.weight === maxInLast10 && last10.filter(e => e.weight === maxInLast10).length === 1) {
           insights.push(`🎉 New record for ${exercise}! ${latest.weight}lbs is your highest in the last 10 sessions`);
       }
   });
   
   Object.keys(coreByExercise).forEach(exercise => {
       const exercises = coreByExercise[exercise].sort((a, b) => a.timestamp - b.timestamp);
       const recent25 = exercises.slice(-25);
       const last5 = recent25.slice(-5);
       
       if (last5.length === 5 && last5.every(e => e.effort === 'easy')) {
           insights.push(`<span class="suggestion">💪 ${exercise} getting easier</span> - Last 5 sessions were all easy, consider increasing difficulty`);
       }
   });
   
   const today = new Date();
   const currentWeekStart = getWeekStart(new Date().toLocaleDateString('en-CA'));
   const lastWeekStart = new Date(new Date(currentWeekStart + 'T12:00:00').getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
   
   const currentWeekWorkouts = workouts.filter(w => getWeekStart(w.date) === currentWeekStart);
   const lastWeekWorkouts = workouts.filter(w => getWeekStart(w.date) === lastWeekStart);
   
   const currentWeekWeight = currentWeekWorkouts.filter(w => w.type === 'lifting').reduce((sum, w) => sum + w.sets * w.reps * w.weight, 0);
   const lastWeekWeight = lastWeekWorkouts.filter(w => w.type === 'lifting').reduce((sum, w) => sum + w.sets * w.reps * w.weight, 0);
   
   const currentWeekDistance = currentWeekWorkouts.filter(w => w.type === 'cardio').reduce((sum, w) => {
       const distInMiles = w.cardioType === 'row' ? w.distance / 1609.34 : w.distance;
       return sum + distInMiles;
   }, 0);
   const lastWeekDistance = lastWeekWorkouts.filter(w => w.type === 'cardio').reduce((sum, w) => {
       const distInMiles = w.cardioType === 'row' ? w.distance / 1609.34 : w.distance;
       return sum + distInMiles;
   }, 0);
   
   const currentWeekCoreTime = currentWeekWorkouts.filter(w => w.type === 'core' && w.time).reduce((sum, w) => sum + w.time, 0);
   const lastWeekCoreTime = lastWeekWorkouts.filter(w => w.type === 'core' && w.time).reduce((sum, w) => sum + w.time, 0);
   
   const totalWeight = workouts.filter(w => w.type === 'lifting').reduce((sum, w) => sum + w.sets * w.reps * w.weight, 0);
   const totalDistance = workouts.filter(w => w.type === 'cardio').reduce((sum, w) => {
       const distInMiles = w.cardioType === 'row' ? w.distance / 1609.34 : w.distance;
       return sum + distInMiles;
   }, 0);
   const totalCoreTime = workouts.filter(w => w.type === 'core' && w.time).reduce((sum, w) => sum + w.time, 0);
   
   const weeklyTotals = `
       <div class="weekly-totals">
           <h3>Weekly Totals</h3>
           <div>Weight: ${currentWeekWeight.toLocaleString()}lbs (Prev Wk: ${lastWeekWeight.toLocaleString()}lbs) (Lifetime: ${totalWeight.toLocaleString()}lbs)</div>
           <div>Distance: ${currentWeekDistance.toFixed(1)}mi (Prev Wk: ${lastWeekDistance.toFixed(1)}mi) (Lifetime: ${totalDistance.toFixed(1)}mi)</div>
           <div>Core Time: ${Math.floor(currentWeekCoreTime / 60)}min (Prev Wk: ${Math.floor(lastWeekCoreTime / 60)}min) (Lifetime: ${Math.floor(totalCoreTime / 60)}min)</div>
       </div>
   `;
   
   return weeklyTotals + (insights.length > 0 ? '<h3>Insights</h3>' + insights.map(i => `<div class="insight-item">${i}</div>`).join('') : '');
}

function updateExerciseLists() {
   const liftingExercises = [...new Set(workouts.filter(w => w.type === 'lifting').map(w => w.name))].sort();
   const coreExercises = [...new Set(workouts.filter(w => w.type === 'core').map(w => w.name))].sort();
   
   const liftingSelect = document.getElementById('lifting-exercise-select');
   liftingSelect.innerHTML = '<option value="">Select exercise...</option>' +
       liftingExercises.map(e => `<option value="${e}">${e}</option>`).join('') +
       '<option value="__new__">+ Add New Exercise</option>';
   
   const coreSelect = document.getElementById('core-exercise-select');
   coreSelect.innerHTML = '<option value="">Select exercise...</option>' +
       coreExercises.map(e => `<option value="${e}">${e}</option>`).join('') +
       '<option value="__new__">+ Add New Exercise</option>';
}
