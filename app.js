
+      1: const DB_KEY = 'workouts';
+      2: let selectedEffort = 'medium';
+      3: let workouts = JSON.parse(localStorage.getItem(DB_KEY)) || [];
+      4: 
+      5: // Tab switching
+      6: document.querySelectorAll('.tab').forEach(tab => {
+      7:     tab.addEventListener('click', () => {
+      8:         document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
+      9:         tab.classList.add('active');
+     10:         document.getElementById(tab.dataset.tab).classList.add('active');
+     11:         if (tab.dataset.tab === 'history') renderHistory();
+     12:         if (tab.dataset.tab === 'trends') renderTrends();
+     13:     });
+     14: });
+     15: 
+     16: // Workout type switching
+     17: document.querySelectorAll('.type-btn').forEach(btn => {
+     18:     btn.addEventListener('click', () => {
+     19:         document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
+     20:         btn.classList.add('active');
+     21:         document.getElementById('lifting-form').classList.toggle('hidden', btn.dataset.type !== 'lifting');
+     22:         document.getElementById('cardio-form').classList.toggle('hidden', btn.dataset.type !== 'cardio');
+     23:     });
+     24: });
+     25: 
+     26: // Effort selection
+     27: document.querySelectorAll('.effort-btn').forEach(btn => {
+     28:     btn.addEventListener('click', () => {
+     29:         document.querySelectorAll('.effort-btn').forEach(b => b.classList.remove('selected'));
+     30:         btn.classList.add('selected');
+     31:         selectedEffort = btn.dataset.effort;
+     32:     });
+     33: });
+     34: document.querySelector('.effort-btn[data-effort="medium"]').classList.add('selected');
+     35: 
+     36: // Cardio type change
+     37: document.getElementById('cardio-type').addEventListener('change', (e) => {
+     38:     document.querySelector('.elevation-input').style.display = e.target.value === 'run' ? 'block' : 'none';
+     39: });
+     40: 
+     41: // Add lifting
+     42: document.getElementById('add-lifting').addEventListener('click', () => {
+     43:     const name = document.getElementById('exercise-name').value.trim();
+     44:     const sets = parseInt(document.getElementById('sets').value);
+     45:     const reps = parseInt(document.getElementById('reps').value);
+     46:     const weight = parseFloat(document.getElementById('weight').value);
+     47:     
+     48:     if (!name || !sets || !reps || weight < 0) return alert('Fill all fields');
+     49:     
+     50:     const workout = {
+     51:         type: 'lifting',
+     52:         name,
+     53:         sets,
+     54:         reps,
+     55:         weight,
+     56:         effort: selectedEffort,
+     57:         date: new Date().toISOString().split('T')[0],
+     58:         timestamp: Date.now()
+     59:     };
+     60:     
+     61:     workouts.push(workout);
+     62:     save();
+     63:     clearLiftingForm();
+     64:     renderToday();
+     65:     updateExerciseList();
+     66: });
+     67: 
+     68: // Add cardio
+     69: document.getElementById('add-cardio').addEventListener('click', () => {
+     70:     const cardioType = document.getElementById('cardio-type').value;
+     71:     const time = parseInt(document.getElementById('time').value);
+     72:     const distance = parseFloat(document.getElementById('distance').value);
+     73:     const elevation = cardioType === 'run' ? parseInt(document.getElementById('elevation').value) || 0 : 0;
+     74:     
+     75:     if (!time || !distance) return alert('Fill all fields');
+     76:     
+     77:     const workout = {
+     78:         type: 'cardio',
+     79:         cardioType,
+     80:         time,
+     81:         distance,
+     82:         elevation,
+     83:         date: new Date().toISOString().split('T')[0],
+     84:         timestamp: Date.now()
+     85:     };
+     86:     
+     87:     workouts.push(workout);
+     88:     save();
+     89:     clearCardioForm();
+     90:     renderToday();
+     91: });
+     92: 
+     93: function save() {
+     94:     localStorage.setItem(DB_KEY, JSON.stringify(workouts));
+     95: }
+     96: 
+     97: function clearLiftingForm() {
+     98:     document.getElementById('exercise-name').value = '';
+     99:     document.getElementById('sets').value = '';
+    100:     document.getElementById('reps').value = '';
+    101:     document.getElementById('weight').value = '';
+    102: }
+    103: 
+    104: function clearCardioForm() {
+    105:     document.getElementById('time').value = '';
+    106:     document.getElementById('distance').value = '';
+    107:     document.getElementById('elevation').value = '';
+    108: }
+    109: 
+    110: function renderToday() {
+    111:     const today = new Date().toISOString().split('T')[0];
+    112:     const todayWorkouts = workouts.filter(w => w.date === today);
+    113:     const container = document.getElementById('today-entries');
+    114:     
+    115:     if (todayWorkouts.length === 0) {
+    116:         container.innerHTML = '<p style="color: #999;">No workouts logged today</p>';
+    117:         return;
+    118:     }
+    119:     
+    120:     container.innerHTML = todayWorkouts.map(w => {
+    121:         if (w.type === 'lifting') {
+    122:             return `<div class="entry ${w.effort}">
+    123:                 <div class="entry-header">
+    124:                     <span>${w.name}</span>
+    125:                     <span>${w.sets}×${w.reps} @ ${w.weight}lbs</span>
+    126:                 </div>
+    127:                 <div class="entry-details">Total: ${w.sets * w.reps * w.weight}lbs</div>
+    128:             </div>`;
+    129:         } else {
+    130:             const elevText = w.elevation ? `, ${w.elevation}ft` : '';
+    131:             return `<div class="entry">
+    132:                 <div class="entry-header">
+    133:                     <span>${w.cardioType.toUpperCase()}</span>
+    134:                     <span>${w.distance}mi in ${w.time}min</span>
+    135:                 </div>
+    136:                 <div class="entry-details">Pace: ${(w.time / w.distance).toFixed(1)} min/mi${elevText}</div>
+    137:             </div>`;
+    138:         }
+    139:     }).join('');
+    140: }
+    141: 
+    142: function renderHistory() {
+    143:     const byDate = {};
+    144:     workouts.forEach(w => {
+    145:         if (!byDate[w.date]) byDate[w.date] = [];
+    146:         byDate[w.date].push(w);
+    147:     });
+    148:     
+    149:     const dates = Object.keys(byDate).sort().reverse();
+    150:     const container = document.getElementById('history-list');
+    151:     
+    152:     if (dates.length === 0) {
+    153:         container.innerHTML = '<p style="color: #999;">No workout history</p>';
+    154:         return;
+    155:     }
+    156:     
+    157:     container.innerHTML = dates.map(date => {
+    158:         const entries = byDate[date].map(w => {
+    159:             if (w.type === 'lifting') {
+    160:                 return `<div class="entry ${w.effort}">
+    161:                     <div class="entry-header">
+    162:                         <span>${w.name}</span>
+    163:                         <span>${w.sets}×${w.reps} @ ${w.weight}lbs</span>
+    164:                     </div>
+    165:                 </div>`;
+    166:             } else {
+    167:                 return `<div class="entry">
+    168:                     <div class="entry-header">
+    169:                         <span>${w.cardioType.toUpperCase()}</span>
+    170:                         <span>${w.distance}mi in ${w.time}min</span>
+    171:                     </div>
+    172:                 </div>`;
+    173:             }
+    174:         }).join('');
+    175:         
+    176:         return `<div class="day-section">
+    177:             <div class="day-header">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
+    178:             ${entries}
+    179:         </div>`;
+    180:     }).join('');
+    181: }
+    182: 
+    183: function renderTrends() {
+    184:     const canvas = document.getElementById('chart');
+    185:     const ctx = canvas.getContext('2d');
+    186:     canvas.width = canvas.offsetWidth;
+    187:     canvas.height = 300;
+    188:     
+    189:     const byDate = {};
+    190:     workouts.forEach(w => {
+    191:         if (!byDate[w.date]) byDate[w.date] = { weight: 0, distance: 0 };
+    192:         if (w.type === 'lifting') byDate[w.date].weight += w.sets * w.reps * w.weight;
+    193:         if (w.type === 'cardio') byDate[w.date].distance += w.distance;
+    194:     });
+    195:     
+    196:     const dates = Object.keys(byDate).sort();
+    197:     if (dates.length === 0) {
+    198:         ctx.fillText('No data to display', canvas.width / 2 - 50, canvas.height / 2);
+    199:         document.getElementById('insights').innerHTML = '<p>Log workouts to see insights</p>';
+    200:         return;
+    201:     }
+    202:     
+    203:     const weights = dates.map(d => byDate[d].weight);
+    204:     const maxWeight = Math.max(...weights, 1);
+    205:     
+    206:     ctx.clearRect(0, 0, canvas.width, canvas.height);
+    207:     ctx.strokeStyle = '#007bff';
+    208:     ctx.lineWidth = 2;
+    209:     ctx.beginPath();
+    210:     
+    211:     dates.forEach((date, i) => {
+    212:         const x = (i / (dates.length - 1 || 1)) * (canvas.width - 40) + 20;
+    213:         const y = canvas.height - 40 - (weights[i] / maxWeight) * (canvas.height - 60);
+    214:         if (i === 0) ctx.moveTo(x, y);
+    215:         else ctx.lineTo(x, y);
+    216:     });
+    217:     ctx.stroke();
+    218:     
+    219:     // Insights
+    220:     const insights = generateInsights();
+    221:     document.getElementById('insights').innerHTML = '<h3>Insights</h3>' + insights.map(i => 
+    222:         `<div class="insight-item">${i}</div>`
+    223:     ).join('');
+    224: }
+    225: 
+    226: function generateInsights() {
+    227:     const insights = [];
+    228:     const liftingByExercise = {};
+    229:     
+    230:     workouts.filter(w => w.type === 'lifting').forEach(w => {
+    231:         if (!liftingByExercise[w.name]) liftingByExercise[w.name] = [];
+    232:         liftingByExercise[w.name].push(w);
+    233:     });
+    234:     
+    235:     Object.keys(liftingByExercise).forEach(exercise => {
+    236:         const exercises = liftingByExercise[exercise].sort((a, b) => a.timestamp - b.timestamp);
+    237:         const recent = exercises.slice(-5);
+    238:         const easyCount = recent.filter(e => e.effort === 'easy').length;
+    239:         
+    240:         if (easyCount >= 3) {
+    241:             insights.push(`<span class="suggestion">💪 Consider increasing weight for ${exercise}</span> - You've had ${easyCount} easy sessions recently`);
+    242:         }
+    243:         
+    244:         if (exercises.length >= 2) {
+    245:             const latest = exercises[exercises.length - 1];
+    246:             const previous = exercises[exercises.length - 2];
+    247:             if (latest.weight > previous.weight) {
+    248:                 insights.push(`🎉 Progress on ${exercise}! Up from ${previous.weight}lbs to ${latest.weight}lbs`);
+    249:             }
+    250:         }
+    251:     });
+    252:     
+    253:     const totalWeight = workouts.filter(w => w.type === 'lifting').reduce((sum, w) => sum + w.sets * w.reps * w.weight, 0);
+    254:     const totalDistance = workouts.filter(w => w.type === 'cardio').reduce((sum, w) => sum + w.distance, 0);
+    255:     
+    256:     insights.push(`📊 Total weight lifted: ${totalWeight.toLocaleString()}lbs`);
+    257:     insights.push(`🏃 Total distance: ${totalDistance.toFixed(1)}mi`);
+    258:     
+    259:     return insights.length > 0 ? insights : ['Keep logging workouts to see insights!'];
+    260: }
+    261: 
+    262: function updateExerciseList() {
+    263:     const exercises = [...new Set(workouts.filter(w => w.type === 'lifting').map(w => w.name))];
+    264:     document.getElementById('exercises').innerHTML = exercises.map(e => `<option value="${e}">`).join('');
+    265: }
+    266: 
+    267: // Initialize
+    268: renderToday();
+    269: updateExerciseList();
+    270: 
+    271: // Service worker registration
+    272: if ('serviceWorker' in navigator) {
+    273:     navigator.serviceWorker.register('sw.js');
+    274: }

