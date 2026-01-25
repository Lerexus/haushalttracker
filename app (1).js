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
        this.currentUser = null;
        this.unsubscribe = null;
        this.personNames = {
            'Person 1': 'Person 1',
            'Person 2': 'Person 2'
        };
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

        // Enter key for auth
        document.getElementById('email').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
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
            
            this.renderExpenses();
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
        
        if (this.expenses.length === 0) {
            container.innerHTML = '<div class="no-entries">Noch keine Ausgaben erfasst.</div>';
            return;
        }

        // Gruppiere nach Personen
        const groupedExpenses = this.expenses.reduce((groups, expense) => {
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

            html += `
                <div class="person-group">
                    <div class="person-header">
                        <div class="person-name">${displayName}</div>
                        <div class="person-total">Offen: CHF ${personTotal.toFixed(2)}</div>
                    </div>
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
                const actionBtnText = expense.status === 'paid' ? 'Wieder öffnen' : 'Als bezahlt markieren';

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
                            <button class="action-btn ${actionBtnClass}" onclick="tracker.togglePaymentStatus('${expense.id}')">
                                ${actionBtnText}
                            </button>
                            <button class="delete-btn" onclick="tracker.deleteExpense('${expense.id}')">
                                Löschen
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        container.innerHTML = html;
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
}

// Settings Toggle Funktion
function toggleSettings() {
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

// App initialisieren
window.tracker = new HouseholdTracker();