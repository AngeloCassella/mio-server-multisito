


    // Primo avvio: archivio vuoto, senza classi o studenti dimostrativi.
    // I dati già salvati con la chiave school_register_v3_data vengono mantenuti.
    const defaultStructure = [];

    // Struttura Dati globale
    let appData = {
      classes: [],
      records: {},
      activities: {}
    };

    window.onload = async function() {
      // Imposta data di oggi come default
      const today = getLocalDateString();
      document.getElementById('lessonDatePicker').value = today;

      try { await loadAppData(); } catch (_) { alert('Impossibile caricare il registro. Ricarica per riprovare.'); document.body.style.pointerEvents = 'none'; return; }
      populateClassSelects();
      renderRegister();
    };

    let revision = 0;
    let pending = 0;
    let failed = false;
    let queue = Promise.resolve();
    async function loadAppData() {
      const response = await fetch('/api/state', {cache: 'no-store'});
      if (!response.ok) throw new Error('Caricamento fallito');
      const state = await response.json();
      appData = state.data;
      revision = state.revision;
    }
    function saveData() {
      if (failed) return false;
      const snapshot = JSON.parse(JSON.stringify(appData));
      pending++;
      queue = queue.then(async () => {
        if (failed) return;
        const response = await fetch('/api/state', {
          method: 'PUT', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({data: snapshot, revision})
        });
        if (!response.ok) throw new Error(response.status === 409
          ? 'Dati modificati da un altro dispositivo. Esporta un backup e ricarica la pagina.'
          : 'Salvataggio fallito. Esporta un backup prima di ricaricare.');
        revision = (await response.json()).revision;
        showSaveIndicator(true);
      }).catch(error => {
        failed = true;
        showSaveIndicator(false);
        alert(error.message);
      }).finally(() => { pending--; });
      return true;
    }
    window.addEventListener('beforeunload', event => {
      if (pending || failed) { event.preventDefault(); event.returnValue = ''; }
    });
    setInterval(async () => {
      if (pending || failed || document.hidden || document.querySelector('[id^="modal"]:not(.hidden)')) return;
      try {
        const response = await fetch('/api/state', {cache: 'no-store'});
        if (!response.ok || pending) return;
        const state = await response.json();
        if (state.revision !== revision) {
          appData = state.data; revision = state.revision;
          populateClassSelects(); renderRegister();
        }
      } catch (_) {}
    }, 10000);

    // GESTIONE TAB NAVIGAZIONE
    function switchTab(tabName) {
      document.getElementById('view-register').classList.add('hidden');
      document.getElementById('view-management').classList.add('hidden');
      document.getElementById('view-export').classList.add('hidden');

      ['register', 'management', 'export'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        btn.classList.remove('text-brand-400', 'border-brand-500');
        btn.classList.add('text-slate-400', 'border-transparent');
      });

      const activeBtn = document.getElementById(`tab-${tabName}`);
      activeBtn.classList.remove('text-slate-400', 'border-transparent');
      activeBtn.classList.add('text-brand-400', 'border-brand-500');

      if (tabName === 'register') {
        document.getElementById('view-register').classList.remove('hidden');
        renderRegister();
      } else if (tabName === 'management') {
        document.getElementById('view-management').classList.remove('hidden');
        renderManagement();
      } else if (tabName === 'export') {
        document.getElementById('view-export').classList.remove('hidden');
        populateExportSelect();
      }
    }

    // AGGIORNA SELECT CLASSI IN TUTTI I COMPONENTI
    function populateClassSelects() {
      const regSelect = document.getElementById('registerClassSelect');
      const mgmtSelect = document.getElementById('manageStudentsClassSelect');

      const currentRegVal = regSelect.value;
      const currentMgmtVal = mgmtSelect.value;

      regSelect.innerHTML = '';
      mgmtSelect.innerHTML = '';

      appData.classes.forEach(c => {
        const catLabel = c.category ? ` (${c.category})` : '';
        const opt1 = new Option(`${c.name}${catLabel}`, c.id);
        const opt2 = new Option(`${c.name}${catLabel}`, c.id);
        regSelect.add(opt1);
        mgmtSelect.add(opt2);
      });

      if (currentRegVal && appData.classes.some(c => c.id === currentRegVal)) {
        regSelect.value = currentRegVal;
      }
      if (currentMgmtVal && appData.classes.some(c => c.id === currentMgmtVal)) {
        mgmtSelect.value = currentMgmtVal;
      }
    }

    // ================= 1. REGISTRO GIORNALIERO LOGIC =================

    function onDateOrClassChange() {
      renderRegister();
    }

    function getRecordKey(dateStr, classId) {
      return `${dateStr}_${classId}`;
    }

    function getLocalDateString(date = new Date()) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function saveLessonActivity() {
      const dateVal = document.getElementById('lessonDatePicker').value;
      const classId = document.getElementById('registerClassSelect').value;
      if (!dateVal || !classId) return;
      const key = getRecordKey(dateVal, classId);
      const value = document.getElementById('lessonActivity').value;
      if (!appData.activities) appData.activities = {};
      if (value.trim()) appData.activities[key] = value;
      else delete appData.activities[key];
      saveData();
    }

    function renderRegister() {
      const dateVal = document.getElementById('lessonDatePicker').value;
      const classId = document.getElementById('registerClassSelect').value;
      const listEl = document.getElementById('registerStudentsList');

      listEl.innerHTML = '';
      const activityInput = document.getElementById('lessonActivity');
      if (activityInput) {
        const activityKey = dateVal && classId ? getRecordKey(dateVal, classId) : '';
        activityInput.value = (appData.activities && appData.activities[activityKey]) || '';
        activityInput.disabled = !classId || !dateVal;
      }

      if (!classId) {
        listEl.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Nessuna classe selezionata.</p>`;
        return;
      }

      const targetClass = appData.classes.find(c => c.id === classId);
      if (!targetClass) return;

      const catBadge = targetClass.category ? ` <span class="text-xs font-normal text-slate-400">(${escapeHtml(targetClass.category)})</span>` : '';
      document.getElementById('registerTitle').innerHTML = `Registro ${escapeHtml(targetClass.name)}${catBadge} - ${formatItalianDate(dateVal)}`;
      document.getElementById('registerCounter').innerText = `${targetClass.students.length} Studenti`;

      if (targetClass.students.length === 0) {
        listEl.innerHTML = `
          <div class="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 text-center">
            <p class="text-xs text-slate-400">Nessuno studente iscritto in questa classe.</p>
            <button onclick="switchTab('management')" class="mt-2 text-xs text-brand-400 hover:underline">Vai in Gestione per aggiungere o spostare studenti</button>
          </div>
        `;
        return;
      }

      const recordKey = getRecordKey(dateVal, classId);
      const dayRecord = appData.records[recordKey] || {};

      targetClass.students.forEach(st => {
        // Valori predefiniti: Presenza = 'present', Esito Attività = 'idle'
        const stData = dayRecord[st.id] || { presence: 'present', outcome: 'idle' };

        const card = document.createElement('div');
        card.className = "bg-slate-800/90 border border-slate-700/70 rounded-2xl p-3 shadow-sm space-y-2.5";

        card.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs">
                ${st.name.charAt(0).toUpperCase()}
              </div>
              <span class="text-xs font-bold text-white">${escapeHtml(st.name)}</span>
            </div>
          </div>

          <!-- BOTTONI SEPARATI PER PRESENZA ED ESITO -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-700/50">
            
            <!-- SEZIONE PRESENZA (INDEPENDENTE) -->
            <div class="flex items-center space-x-1.5">
              <span class="text-[10px] text-slate-400 font-medium w-14">Presenza:</span>
              
              <!-- PRESENTE -->
              <button onclick="setStudentState('${dateVal}', '${classId}', '${st.id}', 'presence', 'present')"
                      class="flex-1 py-1.5 rounded-xl text-[11px] font-semibold border border-slate-700 bg-slate-900/60 text-slate-300 flex items-center justify-center gap-1.5 transition ${stData.presence === 'present' ? 'btn-active-present' : ''}">
                <i class="fa-solid fa-user-check text-xs"></i>
                <span>Presente</span>
              </button>

              <!-- ASSENTE -->
              <button onclick="setStudentState('${dateVal}', '${classId}', '${st.id}', 'presence', 'absent')"
                      class="flex-1 py-1.5 rounded-xl text-[11px] font-semibold border border-slate-700 bg-slate-900/60 text-slate-300 flex items-center justify-center gap-1.5 transition ${stData.presence === 'absent' ? 'btn-active-absent' : ''}">
                <i class="fa-solid fa-user-xmark text-xs"></i>
                <span>Assente</span>
              </button>
            </div>

            <!-- SEZIONE ESITO / ATTIVITÀ (INDIPENDENTE) -->
            <div class="flex items-center space-x-1.5">
              <span class="text-[10px] text-slate-400 font-medium w-14">Attività:</span>
              
              <!-- VINTO -->
              <button ${stData.presence === 'absent' ? 'disabled' : ''} onclick="setStudentState('${dateVal}', '${classId}', '${st.id}', 'outcome', 'win')"
                      class="flex-1 py-1.5 rounded-xl text-[10px] font-semibold border border-slate-700 bg-slate-900/60 text-slate-300 flex items-center justify-center gap-1 transition ${stData.outcome === 'win' && stData.presence !== 'absent' ? 'btn-active-win' : ''} ${stData.presence === 'absent' ? 'opacity-30 cursor-not-allowed' : ''}">
                <i class="fa-solid fa-trophy text-xs"></i>
                <span>Vinto</span>
              </button>

              <!-- PERSO -->
              <button ${stData.presence === 'absent' ? 'disabled' : ''} onclick="setStudentState('${dateVal}', '${classId}', '${st.id}', 'outcome', 'loss')"
                      class="flex-1 py-1.5 rounded-xl text-[10px] font-semibold border border-slate-700 bg-slate-900/60 text-slate-300 flex items-center justify-center gap-1 transition ${stData.outcome === 'loss' && stData.presence !== 'absent' ? 'btn-active-loss' : ''} ${stData.presence === 'absent' ? 'opacity-30 cursor-not-allowed' : ''}">
                <i class="fa-solid fa-thumbs-down text-xs"></i>
                <span>Perso</span>
              </button>

              <!-- RIPOSO / NON GIOCATO -->
              <button ${stData.presence === 'absent' ? 'disabled' : ''} onclick="setStudentState('${dateVal}', '${classId}', '${st.id}', 'outcome', 'idle')"
                      class="flex-1 py-1.5 rounded-xl text-[10px] font-semibold border border-slate-700 bg-slate-900/60 text-slate-300 flex items-center justify-center gap-1 transition ${stData.outcome === 'idle' && stData.presence !== 'absent' ? 'btn-active-idle' : ''} ${stData.presence === 'absent' ? 'opacity-30 cursor-not-allowed' : ''}">
                <i class="fa-solid fa-pause text-xs"></i>
                <span>Riposo</span>
              </button>
            </div>

          </div>
        `;
        listEl.appendChild(card);
      });
    }

    function setStudentState(dateVal, classId, studentId, field, value) {
      const recordKey = getRecordKey(dateVal, classId);
      if (!appData.records[recordKey]) appData.records[recordKey] = {};
      if (!appData.records[recordKey][studentId]) {
        appData.records[recordKey][studentId] = { presence: 'present', outcome: 'idle' };
      }

      const studentRecord = appData.records[recordKey][studentId];
      // Non è possibile assegnare un esito a uno studente assente.
      if (field === 'outcome' && studentRecord.presence === 'absent') {
        showToast('Uno studente assente non può ricevere un esito', 'warning');
        return;
      }

      studentRecord[field] = value;
      // Quando uno studente viene segnato assente, l'esito torna a Riposo.
      if (field === 'presence' && value === 'absent') studentRecord.outcome = 'idle';
      saveData();
      renderRegister();
    }


    // ================= 2. GESTIONE, SPOSTAMENTI & RINOMINA =================

    function renderManagement() {
      renderManageClasses();
      renderManageStudents();
    }

    // RENDER LISTA CLASSI IN GESTIONE CON SPOSTAMENTO E EDITING
    function renderManageClasses() {
      const listEl = document.getElementById('managementClassesList');
      listEl.innerHTML = '';

      appData.classes.forEach((c, idx) => {
        const item = document.createElement('div');
        item.className = "bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-2";
        
        const isFirst = idx === 0;
        const isLast = idx === appData.classes.length - 1;

        item.innerHTML = `
          <!-- CONTROLLI ORDINAMENTO SPOSTA CLASSE -->
          <div class="flex flex-col gap-1">
            <button onclick="moveClass(${idx}, -1)" ${isFirst ? 'disabled class="text-slate-700 cursor-not-allowed"' : 'class="text-slate-400 hover:text-white"'} title="Sposta Su">
              <i class="fa-solid fa-chevron-up text-xs"></i>
            </button>
            <button onclick="moveClass(${idx}, 1)" ${isLast ? 'disabled class="text-slate-700 cursor-not-allowed"' : 'class="text-slate-400 hover:text-white"'} title="Sposta Giù">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </div>

          <!-- DETTAGLI CLASSE -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-white text-xs truncate">${escapeHtml(c.name)}</h4>
              ${c.category ? `<span class="text-[10px] bg-slate-800 text-brand-400 border border-slate-700 px-2 py-0.5 rounded-full">${escapeHtml(c.category)}</span>` : ''}
            </div>
            <span class="text-[10px] text-slate-400">${c.students.length} Studenti iscritti</span>
          </div>

          <!-- AZIONI CLASSE (EDIT & DELETE) -->
          <div class="flex items-center gap-1.5">
            <button onclick="openEditClassModal('${c.id}')" class="text-slate-400 hover:text-brand-400 p-1.5 rounded-lg hover:bg-slate-800 transition" title="Rinomina / Modifica">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="confirmDeleteClass('${c.id}')" class="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition" title="Elimina Classe">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        `;
        listEl.appendChild(item);
      });
    }

    // RENDER LISTA STUDENTI IN GESTIONE CON SPOSTAMENTO ED EDITING
    function renderManageStudents() {
      const classId = document.getElementById('manageStudentsClassSelect').value;
      const listEl = document.getElementById('managementStudentsList');
      listEl.innerHTML = '';

      if (!classId) {
        listEl.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">Seleziona una classe.</p>`;
        return;
      }

      const cls = appData.classes.find(c => c.id === classId);
      if (!cls || cls.students.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">Nessuno studente iscritto in questa classe.</p>`;
        return;
      }

      cls.students.forEach((st, idx) => {
        const row = document.createElement('div');
        row.className = "bg-slate-900/70 border border-slate-700/60 rounded-xl px-3 py-2 flex items-center justify-between gap-2";
        
        const isFirst = idx === 0;
        const isLast = idx === cls.students.length - 1;

        row.innerHTML = `
          <!-- CONTROLLI ORDINAMENTO STUDENTI -->
          <div class="flex flex-col gap-0.5">
            <button onclick="moveStudent('${cls.id}', ${idx}, -1)" ${isFirst ? 'disabled class="text-slate-700 cursor-not-allowed"' : 'class="text-slate-400 hover:text-white"'} title="Sposta Su">
              <i class="fa-solid fa-chevron-up text-[10px]"></i>
            </button>
            <button onclick="moveStudent('${cls.id}', ${idx}, 1)" ${isLast ? 'disabled class="text-slate-700 cursor-not-allowed"' : 'class="text-slate-400 hover:text-white"'} title="Sposta Giù">
              <i class="fa-solid fa-chevron-down text-[10px]"></i>
            </button>
          </div>

          <span class="text-xs font-medium text-slate-200 flex-1 truncate">${escapeHtml(st.name)}</span>

          <!-- MODIFICA / SPOSTA / CANCELLA STUDENTE -->
          <div class="flex items-center gap-1">
            <button onclick="openEditStudentModal('${cls.id}', '${st.id}')" class="text-slate-400 hover:text-brand-400 p-1.5 rounded-lg hover:bg-slate-800 transition" title="Modifica Nome o Sposta di Classe">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="confirmDeleteStudent('${cls.id}', '${st.id}')" class="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition" title="Rimuovi">
              <i class="fa-solid fa-user-minus text-xs"></i>
            </button>
          </div>
        `;
        listEl.appendChild(row);
      });
    }

    // FUNZIONALITÀ SPOSTAMENTO CLASSI (SU/GIÙ)
    function moveClass(index, direction) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= appData.classes.length) return;
      
      const temp = appData.classes[index];
      appData.classes[index] = appData.classes[targetIndex];
      appData.classes[targetIndex] = temp;

      saveData();
      populateClassSelects();
      renderManagement();
    }

    // FUNZIONALITÀ SPOSTAMENTO STUDENTI NELLA CLASSE (SU/GIÙ)
    function moveStudent(classId, index, direction) {
      const cls = appData.classes.find(c => c.id === classId);
      if (!cls) return;

      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= cls.students.length) return;

      const temp = cls.students[index];
      cls.students[index] = cls.students[targetIndex];
      cls.students[targetIndex] = temp;

      saveData();
      renderManageStudents();
    }

    // EDITING CLASSE (MODALE)
    function openEditClassModal(classId) {
      const cls = appData.classes.find(c => c.id === classId);
      if (!cls) return;

      document.getElementById('editClassId').value = cls.id;
      document.getElementById('editClassName').value = cls.name;
      document.getElementById('editClassCategory').value = cls.category || '';
      openModal('modalEditClass');
    }

    function saveEditClass() {
      const classId = document.getElementById('editClassId').value;
      const name = document.getElementById('editClassName').value.trim();
      const category = document.getElementById('editClassCategory').value.trim();

      if (!name) return showToast('Il nome della classe è obbligatorio', 'warning');

      const cls = appData.classes.find(c => c.id === classId);
      if (cls) {
        cls.name = name;
        cls.category = category;
        saveData();
        populateClassSelects();
        renderManagement();
        closeModal('modalEditClass');
        showToast('Classe aggiornata con successo');
      }
    }

    // EDITING E SPOSTAMENTO TRA CLASSI STUDENTE (MODALE)
    function openEditStudentModal(classId, studentId) {
      const cls = appData.classes.find(c => c.id === classId);
      if (!cls) return;
      const st = cls.students.find(s => s.id === studentId);
      if (!st) return;

      document.getElementById('editStudentClassId').value = classId;
      document.getElementById('editStudentId').value = studentId;
      document.getElementById('editStudentName').value = st.name;

      // Popola select classe di destinazione
      const targetSelect = document.getElementById('editStudentTargetClass');
      targetSelect.innerHTML = '';
      appData.classes.forEach(c => {
        targetSelect.add(new Option(c.name + (c.category ? ` (${c.category})` : ''), c.id));
      });
      targetSelect.value = classId;

      openModal('modalEditStudent');
    }

    function saveEditStudent() {
      const currentClassId = document.getElementById('editStudentClassId').value;
      const studentId = document.getElementById('editStudentId').value;
      const newName = document.getElementById('editStudentName').value.trim();
      const targetClassId = document.getElementById('editStudentTargetClass').value;

      if (!newName) return showToast('Inserisci il nome dello studente', 'warning');

      const currentCls = appData.classes.find(c => c.id === currentClassId);
      if (!currentCls) return;

      const stIndex = currentCls.students.findIndex(s => s.id === studentId);
      if (stIndex === -1) return;

      const studentObj = currentCls.students[stIndex];
      studentObj.name = newName;

      // Se la classe di destinazione è cambiata, trasferisci lo studente
      if (currentClassId !== targetClassId) {
        const targetCls = appData.classes.find(c => c.id === targetClassId);
        if (targetCls) {
          currentCls.students.splice(stIndex, 1);
          targetCls.students.push(studentObj);
          showToast(`Spostato ${newName} in ${targetCls.name}`);
        }
      } else {
        showToast(`Dati di ${newName} aggiornati`);
      }

      saveData();
      renderManagement();
      closeModal('modalEditStudent');
    }

    // CANCELLAZIONE SICURA
    function confirmDeleteClass(classId) {
      const cls = appData.classes.find(c => c.id === classId);
      if (!cls) return;

      const hasHistory = Object.keys(appData.records || {}).some(key => key.endsWith('_' + classId)) || Object.keys(appData.activities || {}).some(key => key.endsWith('_' + classId));
      const warning = hasHistory
        ? `La classe "${cls.name}" ha registrazioni o attività nello storico. Se la rimuovi, lo storico resterà nell'archivio salvato ma non sarà più visibile nei normali report.\n\nVuoi continuare?`
        : `Sei sicuro di voler eliminare la classe "${cls.name}" e i suoi studenti dalla struttura?`;
      if (confirm(warning)) {
        appData.classes = appData.classes.filter(c => c.id !== classId);
        saveData();
        populateClassSelects();
        renderManagement();
        showToast(`Classe "${cls.name}" eliminata`);
      }
    }

    function confirmDeleteStudent(classId, studentId) {
      const cls = appData.classes.find(c => c.id === classId);
      if (!cls) return;
      const st = cls.students.find(s => s.id === studentId);

      const hasHistory = Object.values(appData.records || {}).some(day => day && Object.prototype.hasOwnProperty.call(day, studentId));
      const warning = hasHistory
        ? `Lo studente "${st ? st.name : ''}" ha registrazioni nello storico. La rimozione lo toglie dall'elenco attivo; i dati già salvati resteranno nell'archivio ma potrebbero non comparire nei report standard.\n\nContinuare?`
        : `Rimuovere lo studente "${st ? st.name : ''}" dalla classe ${cls.name}?`;
      if (confirm(warning)) {
        cls.students = cls.students.filter(s => s.id !== studentId);
        saveData();
        renderManagement();
        showToast(`Studente rimosso`);
      }
    }

    // CREAZIONE NUOVA CLASSE / STUDENTE
    function addClass() {
      const name = document.getElementById('inputClassName').value.trim();
      const category = document.getElementById('inputClassCategory').value.trim();

      if (!name) return showToast('Inserisci un nome valido per la classe', 'warning');

      const newCls = { id: 'c_' + Date.now(), name: name, category: category, students: [] };
      appData.classes.push(newCls);
      saveData();
      populateClassSelects();
      renderManagement();
      closeModal('modalAddClass');
      document.getElementById('inputClassName').value = '';
      document.getElementById('inputClassCategory').value = '';
      showToast(`Classe ${name} creata`);
    }

    function addStudent() {
      const classId = document.getElementById('manageStudentsClassSelect').value;
      const name = document.getElementById('inputStudentName').value.trim();

      if (!classId) return showToast('Seleziona prima una classe', 'warning');
      if (!name) return showToast('Inserisci il nome dello studente', 'warning');

      const cls = appData.classes.find(c => c.id === classId);
      if (cls) {
        cls.students.push({ id: 's_' + Date.now(), name: name });
        saveData();
        renderManagement();
        closeModal('modalAddStudent');
        document.getElementById('inputStudentName').value = '';
        showToast(`${name} aggiunto/a a ${cls.name}`);
      }
    }


    // ================= 3. EXPORT EXCEL (PULITO E SENZA DATI FANTASMA) =================

    function populateExportSelect() {
      const select = document.getElementById('exportClassFilter');
      select.innerHTML = '<option value="ALL">-- Tutte le Classi --</option>';
      appData.classes.forEach(c => {
        select.add(new Option(c.name + (c.category ? ` (${c.category})` : ''), c.id));
      });
    }

    function exportToExcelCSV() {
      const filterClassId = document.getElementById('exportClassFilter').value;
      const dateFilterMode = document.getElementById('exportDateFilter').value;
      const currentDateVal = document.getElementById('lessonDatePicker').value;
      const targetClasses = filterClassId === 'ALL'
        ? appData.classes
        : appData.classes.filter(c => c.id === filterClassId);

      if (targetClasses.length === 0) {
        return showToast('Nessuna classe valida trovata per l\'esportazione', 'warning');
      }

      // Raccoglie tutte le date presenti nei registri o nelle attività.
      const keys = new Set([
        ...Object.keys(appData.records || {}),
        ...Object.keys(appData.activities || {})
      ]);
      let combinations = Array.from(keys).map(key => {
        const separator = key.indexOf('_');
        return { key, date: key.slice(0, separator), classId: key.slice(separator + 1) };
      }).filter(item => item.date && item.classId);

      if (dateFilterMode === 'CURRENT_DATE') {
        combinations = combinations.filter(item => item.date === currentDateVal);
      }
      combinations = combinations.filter(item => targetClasses.some(cls => cls.id === item.classId));

      const datesByClass = new Map();
      for (const cls of targetClasses) {
        const dates = [...new Set(combinations
          .filter(item => item.classId === cls.id)
          .map(item => item.date))].sort((a, b) => a.localeCompare(b));
        if (dates.length) datesByClass.set(cls.id, dates);
      }

      if (datesByClass.size === 0) {
        return showToast('Nessun dato registrato da esportare', 'warning');
      }

      // Il CSV è organizzato come una tabella per classe:
      // prima riga = classe e date; seconda riga = attività; righe successive = studenti ed esiti.
      // Le tabelle delle diverse classi sono separate da una riga vuota.
      const rows = [];
      const presenceMap = { present: 'Presente', absent: 'Assente' };
      const outcomeMap = { win: 'Vinto', loss: 'Perso', idle: 'Riposo' };
      let exportedClasses = 0;

      for (const cls of targetClasses) {
        const dates = datesByClass.get(cls.id);
        if (!dates || dates.length === 0) continue;

        if (exportedClasses > 0) rows.push([]);
        rows.push([`Classe ${cls.name}`, ...dates.map(formatExportDate)]);
        rows.push(['Attività', ...dates.map(date => (appData.activities || {})[getRecordKey(date, cls.id)] || '')]);

        // Unisce gli studenti attualmente nella classe a quelli presenti nello storico,
        // così una rimozione/spostamento non cancella silenziosamente le righe passate.
        const studentMap = new Map();
        (cls.students || []).forEach(st => studentMap.set(st.id, st.name));
        for (const date of dates) {
          const dayRecord = (appData.records || {})[getRecordKey(date, cls.id)] || {};
          for (const studentId of Object.keys(dayRecord)) {
            if (!studentMap.has(studentId)) {
              studentMap.set(studentId, `Studente rimosso (${studentId})`);
            }
          }
        }

        for (const [studentId, studentName] of studentMap) {
          const values = dates.map(date => {
            const dayRecord = (appData.records || {})[getRecordKey(date, cls.id)] || {};
            const data = dayRecord[studentId];
            if (!data) return '';
            if (data.presence === 'absent') return 'Assente';
            if (data.outcome && outcomeMap[data.outcome]) return outcomeMap[data.outcome];
            if (data.presence === 'present') return presenceMap.present;
            return '';
          });
          // Non esporta righe completamente vuote, ad esempio studenti aggiunti dopo le date registrate.
          if (values.some(value => value !== '')) rows.push([studentName, ...values]);
        }
        exportedClasses++;
      }

      const csvContent = '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Registro_Smart_${getLocalDateString()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Report esportato: ${exportedClasses} ${exportedClasses === 1 ? 'classe' : 'classi'}`);
    }

    function formatExportDate(dateStr) {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
    }

    function csvCell(value) {
      const text = String(value ?? '').replace(/"/g, '""');
      return `"${text}"`;
    }

    function exportJSONBackup() {
      const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Backup_Registro_${getLocalDateString()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast('Backup JSON esportato');
    }

    function importJSONBackup(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const imported = JSON.parse(e.target.result);
          if (!imported || !Array.isArray(imported.classes) || !imported.records || typeof imported.records !== 'object') {
            showToast('File JSON non compatibile', 'warning');
            return;
          }
          if (!confirm('Importare questo backup sostituirà i dati attualmente presenti in questo browser. Hai esportato un backup dei dati attuali?')) return;
          imported.activities = imported.activities && typeof imported.activities === 'object' ? imported.activities : {};
          imported.classes.forEach(cls => { if (!Array.isArray(cls.students)) cls.students = []; });
          const previousData = appData;
          appData = imported;
          if (!saveData()) {
            appData = previousData;
            showToast('Importazione non salvata: dati precedenti mantenuti in memoria', 'warning');
            return;
          }
          populateClassSelects();
          renderRegister();
          renderManagement();
          showToast('Backup caricato con successo!');
        } catch (err) {
          console.error(err);
          showToast('Errore nel caricamento del file JSON', 'warning');
        } finally {
          event.target.value = '';
        }
      };
      reader.readAsText(file);
    }


    // ================= UTILITIES & MODALI =================

    function openModal(modalId) {
      document.getElementById(modalId).classList.remove('hidden');
    }

    function closeModal(modalId) {
      document.getElementById(modalId).classList.add('hidden');
    }

    function showSaveIndicator(success = true) {
      const el = document.getElementById('saveStatus');
      if (!el) return;
      el.innerHTML = success
        ? '<i class="fa-solid fa-floppy-disk text-xs"></i> Salvato sul server'
        : '<i class="fa-solid fa-triangle-exclamation text-xs"></i> Errore salvataggio';
      el.classList.toggle('text-emerald-400', success);
      el.classList.toggle('text-amber-400', !success);
      el.classList.remove('opacity-40');
      setTimeout(() => el.classList.add('opacity-40'), 1800);
    }

    function showToast(msg, type = 'info') {
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toastMsg');
      const toastIcon = document.getElementById('toastIcon');

      toastMsg.innerText = msg;
      toastIcon.className = type === 'warning' ? 'fa-solid fa-triangle-exclamation text-amber-400' : 'fa-solid fa-circle-check text-emerald-400';

      toast.classList.remove('opacity-0', 'pointer-events-none');
      toast.classList.add('opacity-100');

      setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0', 'pointer-events-none');
      }, 2500);
    }

    function formatItalianDate(dateStr) {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function escapeHtml(text) {
      return (text || '').replace(/[&<"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '"': '&quot;', "'": '&#039;' }[m];
      });
    }

    function escapeCsv(text) {
      return (text || '').replace(/"/g, '""');
    }
  