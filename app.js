const DB_KEY = 'workouts';
let selectedEffort = 'medium';
let workouts = JSON.parse(localStorage.getItem(DB_KEY)) || [];
let editingIndex = null;

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
   tab.addEventListener('click', () => {
       document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
       tab.classList.add('active');
       document.getElementById(tab.dataset.tab).classList.add('active');
       if (tab.dataset.tab === 'history') renderHistory();
       if (tab.dataset.tab === 'trends') renderTrends();
   });
});

// Workout type switching
document.querySelectorAll('.type-btn').forEach(btn => {
   btn.addEventListener('click', () => {
       document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
       btn.classList.add('active');
       document.getElementById('lifting-form').classList.toggle('hidden', btn.dataset.type !== 'lifting');
       document.getElementById('cardio-form').classList.toggle('hidden', btn.dataset.type !== 'cardio');
   });
});

// Effort selection
document.querySelectorAll('.effort-btn').forEach(btn => {
   btn.addEventListener('click', () => {
       document.querySelectorAll('.effort-btn').forEach(b => b.classList.remove('selected'));
       btn.classList.add('selected');
       selectedEffort = btn.dataset.effort;
   });
});
document.querySelector('.effort-btn[data-effort="medium"]').classList.add('selected');

// Cardio type change
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

// Add lifting
document.getElementById('add-lifting').addEventListener('click', () => {
   const name = document.getElementById('exercise-name').value.trim();
   const sets = parseInt(document.getElementById('sets').value);
   const reps = parseInt(document.getElementById('reps').value);
   const weight = parseFloat(document.getElementById('weight').value);
   
   if (!name || !sets || !reps || weight < 0) return alert('Fill all fields');
   
   const workout = {
       type: 'lifting',
       name,
       sets,
       reps,
       weight,
       effort: selectedEffort,
       date: new Date().toISOString().split('T')[0],
       timestamp: Date.now()
   };
   
   workouts.push(workout);
   save();
   clearLiftingForm();
   renderToday();
   updateExerciseList();
});

// Add cardio
document.getElementById('add-cardio').addEventListener('click', () => {
   const cardioType = document.getElementById('cardio-type').value;
   const time = parseInt(document.getElementById('time').value);
   const distance = parseFloat(document.getElementById('distance').value);
   const elevation = cardioType === 'run' ? parseInt(document.getElementById('elevation').value) || 0 : 0;
   
   if (!time || !distance) return alert('Fill all fields');
   
   const workout = {
       type: 'cardio',
       cardioType,
       time,
       distance,
       elevation,
       date: new Date().toISOString().split('T')[0],
       timestamp: Date.now()
   };
   
   workouts.push(workout);
   save();
   clearCardioForm();
   renderToday();
});

// Edit modal handlers
document.getElementById('cancel-edit').addEventListener('click', () => {
   document.getElementById('edit-modal').classList.add('hidden');
   editingIndex = null;
});

document.getElementById('save-edit').addEventListener('click', () => {
   if (editingIndex === null) return;
   
   const workout = workouts[editingIndex];
   
   if (workout.type === 'lifting') {
       workout.name = document.getElementById('edit-name').value.trim();
       workout.sets = parseInt(document.getElementById('edit-sets').value);
       workout.reps = parseInt(document.getElementById('edit-reps').value);
       workout.weight = parseFloat(document.getElementById('edit-weight').value);
       workout.effort = document.querySelector('input[name="edit-effort"]:checked').value;
   } else {
       workout.time = parseInt(document.getElementById('edit-time').value);
       workout.distance = parseFloat(document.getElementById('edit-distance').value);
       if (workout.cardioType === 'run') {
           workout.elevation = parseInt(document.getElementById('edit-elevation').value) || 0;
       }
   }
   
   save();
   document.getElementById('edit-modal').classList.add('hidden');
   editingIndex = null;
   renderToday();
   renderHistory();
});

function showEditModal(index) {
   editingIndex = index;
   const workout = workouts[index];
   const form = document.getElementById('edit-form');
   
   if (workout.type === 'lifting') {
       form.innerHTML = `
           <input type="text" id="edit-name" value="${workout.name}" placeholder="Exercise name">
           <div class="input-row">
               <input type="number" id="edit-sets" value="${workout.sets}" placeholder="Sets" min="1">
               <input type="number" id="edit-reps" value="${workout.reps}" placeholder="Reps" min="1">
               <input type="number" id="edit-weight" value="${workout.weight}" placeholder="Weight (lbs)" min="0" step="0.5">
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
           `<input type="number" id="edit-elevation" value="${workout.elevation}" placeholder="Elevation (ft)" min="0">` : '';
       
       form.innerHTML = `
           <p><strong>${workout.cardioType.toUpperCase()}</strong></p>
           <div class="input-row">
               <input type="number" id="edit-time" value="${workout.time}" placeholder="Time (min)" min="1">
               <input type="number" id="edit-distance" value="${workout.distance}" placeholder="Distance (${distUnit})" min="0" step="0.1">
               ${elevField}
           </div>
       `;
   }
   
   document.getElementById('edit-modal').classList.remove('hidden');
}

function deleteWorkout(index) {
   if (confirm('Delete this workout?')) {
       workouts.splice(index, 1);
       save();
       renderToday();
       renderHistory();
   }
}

function save() {
   localStorage.setItem(DB_KEY, JSON.stringify(workouts));
}

function clearLiftingForm() {
   document.getElementById('exercise-name').value = '';
   document.getElementById('sets').value = '';
   document.getElementById('reps').value = '';
   document.getElementById('weight').value = '';
}

function clearCardioForm() {
   document.getElementById('time').value = '';
   document.getElementById('distance').value = '';
   document.getElementById('elevation').value = '';
}

function renderToday() {
   const today = new Date().toISOString().split('T')[0];
   const todayWorkouts = workouts.map((w, i) => ({ ...w, index: i })).filter(w => w.date === today);
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
                   <button onclick="showEditModal(${w.index})" class="btn-edit">✏️ Edit</button>
                   <button onclick="deleteWorkout(${w.index})" class="btn-delete">🗑️ Delete</button>
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
                   <button onclick="showEditModal(${w.index})" class="btn-edit">✏️ Edit</button>
                   <button onclick="deleteWorkout(${w.index})" class="btn-delete">🗑️ Delete</button>
               </div>
           </div>`;
       }
   }).join('');
}

function renderHistory() {
   const byDate = {};
   workouts.forEach((w, i) => {
       if (!byDate[w.date]) byDate[w.date] = [];
       byDate[w.date].push({ ...w, index: i });
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
                       <button onclick="showEditModal(${w.index})" class="btn-edit">✏️</button>
                       <button onclick="deleteWorkout(${w.index})" class="btn-delete">🗑️</button>
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
                       <button onclick="showEditModal(${w.index})" class="btn-edit">✏️</button>
                       <button onclick="deleteWorkout(${w.index})" class="btn-delete">🗑️</button>
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
   
   workouts.filter(w => w.type === 'lifting').forEach(w => {
       if (!liftingByExercise[w.name]) liftingByExercise[w.name] = [];
       liftingByExercise[w.name].push(w);
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
   
   const totalWeight = workouts.filter(w => w.type === 'lifting').reduce((sum, w) => sum + w.sets * w.reps * w.weight, 0);
   const totalDistance = workouts.filter(w => w.type === 'cardio').reduce((sum, w) => {
       const distInMiles = w.cardioType === 'row' ? w.distance / 1609.34 : w.distance;
       return sum + distInMiles;
   }, 0);
   
   insights.push(`📊 Total weight lifted: ${totalWeight.toLocaleString()}lbs`);
   insights.push(`🏃 Total distance: ${totalDistance.toFixed(1)}mi`);
   
   return insights.length > 0 ? insights : ['Keep logging workouts to see insights!'];
}

function updateExerciseList() {
   const exercises = [...new Set(workouts.filter(w => w.type === 'lifting').map(w => w.name))];
   document.getElementById('exercises').innerHTML = exercises.map(e => `<option value="${e}">`).join('');
}

renderToday();
updateExerciseList();

if ('serviceWorker' in navigator) {
   navigator.serviceWorker.register('./sw.js');
}
