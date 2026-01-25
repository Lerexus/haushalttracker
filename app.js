// Firebase configuration - DIESE WERTE MÜSSEN SIE NACH DER FIREBASE-EINRICHTUNG ERSETZEN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, setDoc, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// WICHTIG: Diese Konfiguration müssen Sie nach der Firebase-Einrichtung ersetzen
const firebaseConfig = {
    apiKey: "AIzaSyATV_F1dO41SKGC9g14l8RgXxYHGEKoOA4",
    authDomain: "haushalttracker-db.firebaseapp.com",
    databaseURL: "https://haushalttracker-db-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "haushalttracker-db",
    storageBucket: "haushalttracker-db.firebasestorage.app",
    messagingSenderId: "1064744774696",
    appId: "1:1064744774696:web:4504f8422fe731bb63591d",
    measurementId: "G-VT32X6Y5LE"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

class HouseholdTracker {
    constructor() {
        this.expenses = [];
        this.filteredExpenses = [];
        this.currentUser = null;
        this.unsubscribe = null;
        this.personNames = {
            'Person 1': 'Person 1',
            'Person 2': 'Person 2'
        };
        // Kollaps-Status für Personen-Gruppen
        this.personGroupsCollapsed = {
            'Person 1': false,
            'Person 2': false
        };
        // Filter-Status
        this.currentStatusFilter = 'unpaid'; // Standard: nur offene Einträge
        this.currentTimeFilter = 'all';
        // Pagination
        this.itemsPerPage = 20;
        this.currentPage = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setTodayDate();
        this.showLoading();
        
        // Auth state listener
        onAuthStateChanged(auth, (user) => {
            this.hideLoading();
            if (user) {
                this.currentUser = user;
                this.showApp();
                this.loadPersonNames();
                this.setupRealtimeListener();
            } else {
                this.currentUser = null;
                this.showAuth();
                if (this.unsubscribe) {
                    this.unsubscribe();
                }
            }
        });
    }

    setupEventListeners() {
        // Auth events
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('register-btn').addEventListener('click', () => this.register());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Form events
        document.getElementById('expense-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        // Name change events
        document.getElementById('person1-name').addEventListener('blur', () => this.updatePersonName('Person 1'));
        document.getElementById('person2-name').addEventListener('blur', () => this.updatePersonName('Person 2'));

        // Settings toggle event
        document.getElementById('settings-header').addEventListener('click', () => this.toggleSettings());

        // Filter events
        document.getElementById('filter-unpaid').addEventListener('click', () => this.setStatusFilter('unpaid'));
        document.getElementById('filter-paid').addEventListener('click', () => this.setStatusFilter('paid'));
        document.getElementById('filter-all').addEventListener('click', () => this.setStatusFilter('all'));
        document.getElementById('month-filter').addEventListener('change', (e) => this.setTimeFilter(e.target.value));

        // Load more event
        document.getElementById('load-more-btn').addEventListener('click', () => this.loadMoreEntries());

        // Enter key for auth
        document.getElementById('email').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
    }

    // Feature 1: Scroll-Navigation zu Personen-Gruppen
    scrollToPersonGroup(person) {
        const personGroupId = `person-group-${person.replace(' ', '-').toLowerCase()}`;
        const element = document.getElementById(personGroupId);
        
        if (element) {
            // Smooth scroll zur Personen-Gruppe
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
            
            // Kurze Highlight-Animation
            element.style.boxShadow = '0 0 20px rgba(79, 70, 229, 0.6)';
            setTimeout(() => {
                element.style.boxShadow = '';
            }, 2000);
            
            // Wenn die Gruppe kollabiert ist, automatisch öffnen
            if (this.personGroupsCollapsed[person]) {
                this.togglePersonGroup(person);
            }
        }
    }

    // Feature 2: Toggle-Funktionalität für Personen-Gruppen
    togglePersonGroup(person) {
        const personGroupId = `person-group-${person.replace(' ', '-').toLowerCase()}`;
        const header = document.querySelector(`#${personGroupId} .person-header`);
        const content = document.querySelector(`#${personGroupId} .person-content`);
        
        if (header && content) {
            const isCollapsed = this.personGroupsCollapsed[person];
            
            if (isCollapsed) {
                // Öffnen
                content.classList.remove('collapsed');
                header.classList.remove('collapsed');
                this.personGroupsCollapsed[person] = false;
            } else {
                // Schließen
                content.classList.add('collapsed');
                header.classList.add('collapsed');
                this.personGroupsCollapsed[person] = true;
            }
        }
    }

    // Filter-Funktionen
    setStatusFilter(status) {
        this.currentStatusFilter = status;
        this.currentPage = 1;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`filter-${status}`).classList.add('active');
        
        this.applyFilters();
    }

    setTimeFilter(timeRange) {
        this.currentTimeFilter = timeRange;
        this.currentPage = 1;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.expenses];

        // Status Filter
        if (this.currentStatusFilter === 'paid') {
            filtered = filtered.filter(e => e.status === 'paid');
        } else if (this.currentStatusFilter === 'unpaid') {
            filtered = filtered.filter(e => e.status === 'unpaid');
        }
        // 'all' zeigt alle Einträge

        // Time Filter
        if (this.currentTimeFilter !== 'all') {
            const now = new Date();
            let startDate;

            switch (this.currentTimeFilter) {
                case 'current':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'last3':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
            }

            if (startDate) {
                filtered = filtered.filter(e => new Date(e.date) >= startDate);
            }
        }

        this.filteredExpenses = filtered;
        this.updateFilterCounts();
        this.renderExpenses();
    }

    updateFilterCounts() {
        const unpaidCount = this.expenses.filter(e => e.status === 'unpaid').length;
        const paidCount = this.expenses.filter(e => e.status === 'paid').length;
        const totalCount = this.expenses.length;

        document.getElementById('unpaid-count').textContent = unpaidCount;
        document.getElementById('paid-count').textContent = paidCount;
        document.getElementById('total-count').textContent = totalCount;
    }

    loadMoreEntries() {
        this.currentPage++;
        this.renderExpenses();
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('app-content').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showAuth() {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('app-content').style.display = 'none';
    }

    showApp() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('user-email').textContent = `Angemeldet als: ${this.currentUser.email}`;
        
        // Event Listener für klickbare Summary-Cards hinzufügen
        this.setupSummaryCardListeners();
    }

    setupSummaryCardListeners() {
        // Warten bis DOM geladen ist
        setTimeout(() => {
            const person1Card = document.querySelector('.summary-card:first-child');
            const person2Card = document.querySelector('.summary-card:last-child');
            
            if (person1Card) {
                person1Card.addEventListener('click', () => this.scrollToPersonGroup('Person 1'));
            }
            if (person2Card) {
                person2Card.addEventListener('click', () => this.scrollToPersonGroup('Person 2'));
            }
        }, 100);
    }

    async login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showNotification('Bitte E-Mail und Passwort eingeben', 'error');
            return;
        }

        try {
            this.setButtonLoading('login-btn', true);
            await signInWithEmailAndPassword(auth, email, password);
            this.showNotification('Erfolgreich angemeldet!', 'success');
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Anmeldung fehlgeschlagen: ' + this.getErrorMessage(error), 'error');
        } finally {
            this.setButtonLoading('login-btn', false);
        }
    }

    async register() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showNotification('Bitte E-Mail und Passwort eingeben', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Passwort muss mindestens 6 Zeichen lang sein', 'error');
            return;
        }

        try {
            this.setButtonLoading('register-btn', true);
            await createUserWithEmailAndPassword(auth, email, password);
            this.showNotification('Account erfolgreich erstellt!', 'success');
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Registrierung fehlgeschlagen: ' + this.getErrorMessage(error), 'error');
        } finally {
            this.setButtonLoading('register-btn', false);
        }
    }

    async logout() {
        try {
            await signOut(auth);
            this.showNotification('Erfolgreich abgemeldet', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Abmeldung fehlgeschlagen', 'error');
        }
    }

    async loadPersonNames() {
        if (!this.currentUser) return;

        try {
            const namesDoc = doc(db, 'settings', this.currentUser.uid);
            onSnapshot(namesDoc, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    this.personNames = {
                        'Person 1': data.person1Name || 'Person 1',
                        'Person 2': data.person2Name || 'Person 2'
                    };
                }
                this.updatePersonNamesDisplay();
            });
        } catch (error) {
            console.error('Error loading person names:', error);
        }
    }

    async updatePersonName(personKey) {
        if (!this.currentUser) return;

        const inputId = personKey === 'Person 1' ? 'person1-name' : 'person2-name';
        const newName = document.getElementById(inputId).value.trim();
        
        if (newName && newName !== this.personNames[personKey]) {
            try {
                const namesDoc = doc(db, 'settings', this.currentUser.uid);
                const updateData = {};
                updateData[personKey === 'Person 1' ? 'person1Name' : 'person2Name'] = newName;
                
                await setDoc(namesDoc, updateData, { merge: true });
                this.showNotification(`Name für ${personKey} aktualisiert!`, 'success');
            } catch (error) {
                console.error('Error updating person name:', error);
                this.showNotification('Fehler beim Speichern des Namens', 'error');
            }
        }
    }

    updatePersonNamesDisplay() {
        // Update input fields
        document.getElementById('person1-name').value = this.personNames['Person 1'];
        document.getElementById('person2-name').value = this.personNames['Person 2'];

        // Update summary titles
        document.getElementById('person1-summary-title').textContent = `${this.personNames['Person 1']} - Offen`;
        document.getElementById('person2-summary-title').textContent = `${this.personNames['Person 2']} - Offen`;

        // Update select options
        const personSelect = document.getElementById('person');
        personSelect.innerHTML = `
            <option value="">Bitte wählen...</option>
            <option value="Person 1">${this.personNames['Person 1']}</option>
            <option value="Person 2">${this.personNames['Person 2']}</option>
        `;

        // Re-render expenses to show updated names
        this.renderExpenses();
    }

    setupRealtimeListener() {
        if (!this.currentUser) return;

        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', this.currentUser.uid)
        );

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            this.expenses = [];
            snapshot.forEach((doc) => {
                this.expenses.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Sortierung im JavaScript statt in Firestore
            this.expenses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            this.applyFilters();
            this.updateSummary();
        });
    }

    async addExpense() {
        if (!this.currentUser) return;

        const expense = {
            person: document.getElementById('person').value,
            category: document.getElementById('category').value,
            amount: parseFloat(document.getElementById('amount').value),
            remarks: document.getElementById('remarks').value,
            date: document.getElementById('date').value,
            status: 'unpaid',
            timestamp: new Date(),
            userId: this.currentUser.uid
        };

        try {
            this.setButtonLoading('submit-btn', true);
            await addDoc(collection(db, 'expenses'), expense);
            
            // Form zurücksetzen
            document.getElementById('expense-form').reset();
            this.setTodayDate();
            
            this.showNotification('Ausgabe erfolgreich hinzugefügt!', 'success');
        } catch (error) {
            console.error('Error adding expense:', error);
            this.showNotification('Fehler beim Hinzufügen der Ausgabe', 'error');
        } finally {
            this.setButtonLoading('submit-btn', false);
        }
    }

    async togglePaymentStatus(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (!expense) return;

        try {
            const newStatus = expense.status === 'paid' ? 'unpaid' : 'paid';
            await updateDoc(doc(db, 'expenses', id), {
                status: newStatus
            });
            
            const statusText = newStatus === 'paid' ? 'als bezahlt markiert' : 'wieder geöffnet';
            this.showNotification(`Ausgabe ${statusText}`, 'success');
        } catch (error) {
            console.error('Error updating expense:', error);
            this.showNotification('Fehler beim Aktualisieren der Ausgabe', 'error');
        }
    }

    async deleteExpense(id) {
        if (!confirm('Möchten Sie diese Ausgabe wirklich löschen?')) return;

        try {
            await deleteDoc(doc(db, 'expenses', id));
            this.showNotification('Ausgabe gelöscht!', 'success');
        } catch (error) {
            console.error('Error deleting expense:', error);
            this.showNotification('Fehler beim Löschen der Ausgabe', 'error');
        }
    }

    renderExpenses() {
        const container = document.getElementById('entries-container');
        
        if (this.filteredExpenses.length === 0) {
            container.innerHTML = '<div class="no-entries">Keine Ausgaben für die gewählten Filter gefunden.</div>';
            this.updateLoadMoreSection();
            return;
        }

        // Pagination
        const startIndex = 0;
        const endIndex = this.currentPage * this.itemsPerPage;
        const expensesToShow = this.filteredExpenses.slice(startIndex, endIndex);

        // Gruppiere nach Personen
        const groupedExpenses = expensesToShow.reduce((groups, expense) => {
            if (!groups[expense.person]) {
                groups[expense.person] = [];
            }
            groups[expense.person].push(expense);
            return groups;
        }, {});

        let html = '';
        
        Object.keys(groupedExpenses).forEach(person => {
            const personExpenses = groupedExpenses[person];
            const personTotal = personExpenses
                .filter(e => e.status === 'unpaid')
                .reduce((sum, e) => sum + e.amount, 0);

            const displayName = this.personNames[person] || person;
            const personGroupId = `person-group-${person.replace(' ', '-').toLowerCase()}`;
            const isCollapsed = this.personGroupsCollapsed[person];

            html += `
                <div class="person-group" id="${personGroupId}">
                    <div class="person-header ${isCollapsed ? 'collapsed' : ''}" onclick="tracker.togglePersonGroup('${person}')">
                        <div class="person-name">${displayName}</div>
                        <div class="person-total">Offen: CHF ${personTotal.toFixed(2)}</div>
                    </div>
                    <div class="person-content ${isCollapsed ? 'collapsed' : ''}">
                        <div class="table-container">
                            <table class="entries-table">
                                <thead>
                                    <tr>
                                        <th>Datum</th>
                                        <th>Kategorie</th>
                                        <th>Betrag</th>
                                        <th>Status</th>
                                        <th>Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            personExpenses.forEach(expense => {
                const statusClass = expense.status === 'paid' ? 'status-paid' : 'status-unpaid';
                const statusText = expense.status === 'paid' ? 'Bezahlt' : 'Offen';
                const actionBtnClass = expense.status === 'paid' ? 'paid' : '';
                const actionIcon = expense.status === 'paid' ? '🔄' : '✅';
                const actionTooltip = expense.status === 'paid' ? 'Wieder öffnen' : 'Als bezahlt markieren';

                html += `
                    <tr>
                        <td>${this.formatDate(expense.date)}</td>
                        <td>
                            ${expense.category}
                            ${expense.remarks ? `<br><small style="color: #94a3b8;">${expense.remarks}</small>` : ''}
                        </td>
                        <td>CHF ${expense.amount.toFixed(2)}</td>
                        <td><span class="${statusClass}">${statusText}</span></td>
                        <td>
                            <div class="actions-container">
                                <button class="action-btn ${actionBtnClass}" onclick="tracker.togglePaymentStatus('${expense.id}')">
                                    ${actionIcon}
                                    <div class="tooltip">${actionTooltip}</div>
                                </button>
                                <button class="delete-btn" onclick="tracker.deleteExpense('${expense.id}')">
                                    🗑️
                                    <div class="tooltip">Löschen</div>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.updateLoadMoreSection();
        
        // Event Listener für Summary-Cards nach dem Rendern erneut setzen
        this.setupSummaryCardListeners();
    }

    updateLoadMoreSection() {
        const loadMoreSection = document.getElementById('load-more-section');
        const shownCount = Math.min(this.currentPage * this.itemsPerPage, this.filteredExpenses.length);
        const totalFiltered = this.filteredExpenses.length;

        document.getElementById('shown-count').textContent = shownCount;
        document.getElementById('total-filtered').textContent = totalFiltered;

        if (shownCount < totalFiltered) {
            loadMoreSection.style.display = 'block';
        } else {
            loadMoreSection.style.display = 'none';
        }
    }

    updateSummary() {
        const person1Total = this.expenses
            .filter(e => e.person === 'Person 1' && e.status === 'unpaid')
            .reduce((sum, e) => sum + e.amount, 0);

        const person2Total = this.expenses
            .filter(e => e.person === 'Person 2' && e.status === 'unpaid')
            .reduce((sum, e) => sum + e.amount, 0);

        document.getElementById('person1-total').textContent = `CHF ${person1Total.toFixed(2)}`;
        document.getElementById('person2-total').textContent = `CHF ${person2Total.toFixed(2)}`;
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-CH');
    }

    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (loading) {
            button.disabled = true;
            button.textContent = 'Lädt...';
        } else {
            button.disabled = false;
            // Restore original text
            if (buttonId === 'login-btn') button.textContent = 'Anmelden';
            if (buttonId === 'register-btn') button.textContent = 'Registrieren';
            if (buttonId === 'submit-btn') button.textContent = '💾 Ausgabe hinzufügen';
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'Benutzer nicht gefunden';
            case 'auth/wrong-password':
                return 'Falsches Passwort';
            case 'auth/email-already-in-use':
                return 'E-Mail bereits registriert';
            case 'auth/weak-password':
                return 'Passwort zu schwach';
            case 'auth/invalid-email':
                return 'Ungültige E-Mail Adresse';
            default:
                return error.message;
        }
    }

    toggleSettings() {
        const content = document.getElementById('settings-content');
        const toggle = document.getElementById('settings-toggle');
        
        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            toggle.classList.remove('expanded');
        } else {
            content.classList.add('expanded');
            toggle.classList.add('expanded');
        }
    }
}

// App initialisieren
window.tracker = new HouseholdTracker();