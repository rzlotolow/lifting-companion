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
           <div class="day-header">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
           ${entries}
       </div>`;
   }).join('');
}

function renderTrends() {
   const canvas = document.getElementById('chart');
   const ctx = canvas.getContext('2d');
   canvas.width = canvas.offsetWidth;
   canvas.height = 300;
   
   const byDate = {};
   workouts.forEach(w => {
       if (!byDate[w.date]) byDate[w.date] = { weight: 0, distance: 0 };
       if (w.type === 'lifting') byDate[w.date].weight += w.sets * w.reps * w.weight;
       if (w.type === 'cardio') {
           const distInMiles = w.cardioType === 'row' ? w.distance / 1609.34 : w.distance;
           byDate[w.date].distance += distInMiles;
       }
   });
   
   const dates = Object.keys(byDate).sort();
   if (dates.length === 0) {
       ctx.fillText('No data to display', canvas.width / 2 - 50, canvas.height / 2);
       document.getElementById('insights').innerHTML = '<p>Log workouts to see insights</p>';
       return;
   }
   
   const weights = dates.map(d => byDate[d].weight);
   const maxWeight = Math.max(...weights, 1);
   
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   ctx.strokeStyle = '#007bff';
   ctx.lineWidth = 2;
   ctx.beginPath();
   
   dates.forEach((date, i) => {
       const x = (i / (dates.length - 1 || 1)) * (canvas.width - 40) + 20;
       const y = canvas.height - 40 - (weights[i] / maxWeight) * (canvas.height - 60);
       if (i === 0) ctx.moveTo(x, y);
       else ctx.lineTo(x, y);
   });
   ctx.stroke();
   
   const insights = generateInsights();
   document.getElementById('insights').innerHTML = '<h3>Insights</h3>' + insights.map(i => 
       `<div class="insight-item">${i}</div>`
   ).join('');
}

function generateInsights() {
   const insights = [];
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
   
   Object.keys(liftingByExercise).forEach(exercise => {
       const exercises = liftingByExercise[exercise].sort((a, b) => a.timestamp - b.timestamp);
       const recent = exercises.slice(-5);
       const easyCount = recent.filter(e => e.effort === 'easy').length;
       
       if (easyCount >= 3) {
           insights.push(`<span class="suggestion">💪 Consider increasing weight for ${exercise}</span> - You've had ${easyCount} easy sessions recently`);
       }
       
       if (exercises.length >= 2) {
           const latest = exercises[exercises.length - 1];
           const previous = exercises[exercises.length - 2];
           if (latest.weight > previous.weight) {
               insights.push(`🎉 Progress on ${exercise}! Up from ${previous.weight}lbs to ${latest.weight}lbs`);
           }
       }
   });
   
   Object.keys(coreByExercise).forEach(exercise => {
       const exercises = coreByExercise[exercise].sort((a, b) => a.timestamp - b.timestamp);
       const recent = exercises.slice(-5);
       const easyCount = recent.filter(e => e.effort === 'easy').length;
       
       if (easyCount >= 3) {
           insights.push(`<span class="suggestion">💪 ${exercise} getting easier</span> - Consider increasing difficulty`);
       }
   });
   
   const totalWeight = workouts.filter(w => w.type === 'lifting').reduce((sum, w) => sum + w.sets * w.reps * w.weight, 0);
   const totalDistance = workouts.filter(w => w.type === 'cardio').reduce((sum, w) => {
       const distInMiles = w.cardioType === 'row' ? w.distance / 1609.34 : w.distance;
       return sum + distInMiles;
   }, 0);
   const totalCoreTime = workouts.filter(w => w.type === 'core' && w.time).reduce((sum, w) => sum + w.time, 0);
   
   insights.push(`📊 Total weight lifted: ${totalWeight.toLocaleString()}lbs`);
   insights.push(`🏃 Total distance: ${totalDistance.toFixed(1)}mi`);
   if (totalCoreTime > 0) {
       insights.push(`⏱️ Total core time: ${Math.floor(totalCoreTime / 60)}min ${totalCoreTime % 60}s`);
   }
   
   return insights.length > 0 ? insights : ['Keep logging workouts to see insights!'];
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
