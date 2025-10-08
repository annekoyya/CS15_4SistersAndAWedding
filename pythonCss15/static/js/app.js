// Global variables
let accounts = [];
let accountModal = null;
let transactionModal = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    accountModal = new bootstrap.Modal(document.getElementById('accountModal'));
    transactionModal = new bootstrap.Modal(document.getElementById('transactionModal'));
    loadAccounts();
    loadSummary();
});

// Load all accounts
async function loadAccounts() {
    try {
        const response = await fetch('/api/accounts');
        accounts = await response.json();
        displayAccounts();
        loadSummary();
    } catch (error) {
        console.error('Error loading accounts:', error);
        alert('Error loading accounts');
    }
}

// Load summary data
async function loadSummary() {
    try {
        const response = await fetch('/api/summary');
        const summary = await response.json();
        
        document.getElementById('totalBalance').textContent = `$${summary.total_balance.toFixed(2)}`;
        document.getElementById('totalAccounts').textContent = summary.total_accounts;
        
        const accountTypesDiv = document.getElementById('accountTypes');
        accountTypesDiv.innerHTML = '';
        
        for (const [type, balance] of Object.entries(summary.account_type_summary)) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary me-1';
            badge.textContent = `${type}: $${balance.toFixed(2)}`;
            accountTypesDiv.appendChild(badge);
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// Display accounts in the UI
function displayAccounts() {
    const accountsList = document.getElementById('accountsList');
    accountsList.innerHTML = '';
    
    if (accounts.length === 0) {
        accountsList.innerHTML = `
            <div class="col-12 text-center py-4">
                <p class="text-muted">No accounts found. Create your first account to get started.</p>
            </div>
        `;
        return;
    }
    
    accounts.forEach(account => {
        const accountCard = createAccountCard(account);
        accountsList.appendChild(accountCard);
    });
}

// Create account card HTML
function createAccountCard(account) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';
    
    const typeClass = account.account_type.toLowerCase();
    const formattedBalance = account.balance.toFixed(2);
    
    col.innerHTML = `
        <div class="card account-card ${typeClass}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title">${account.holder_name}</h5>
                    <span class="badge bg-${getTypeBadgeColor(account.account_type)}">
                        ${account.account_type}
                    </span>
                </div>
                <p class="card-text mb-1">
                    <small class="text-muted">Account #: ${account.account_number}</small>
                </p>
                <h4 class="text-primary mb-3">$${formattedBalance}</h4>
                
                <div class="d-flex flex-wrap transaction-buttons">
                    <button class="btn btn-success btn-sm" onclick="showTransactionModal(${account.id}, 'deposit')">
                        <i class="fas fa-arrow-down"></i> Deposit
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="showTransactionModal(${account.id}, 'withdraw')">
                        <i class="fas fa-arrow-up"></i> Withdraw
                    </button>
                    <button class="btn btn-info btn-sm" onclick="editAccount(${account.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteAccount(${account.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Get badge color based on account type
function getTypeBadgeColor(type) {
    switch (type.toLowerCase()) {
        case 'savings': return 'success';
        case 'checking': return 'primary';
        case 'business': return 'purple';
        default: return 'secondary';
    }
}

// Show add account modal
function showAddAccountModal() {
    document.getElementById('accountModalTitle').textContent = 'Add New Account';
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
    accountModal.show();
}

// Edit account
function editAccount(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    document.getElementById('accountModalTitle').textContent = 'Edit Account';
    document.getElementById('accountId').value = account.id;
    document.getElementById('accountNumber').value = account.account_number;
    document.getElementById('holderName').value = account.holder_name;
    document.getElementById('accountType').value = account.account_type;
    document.getElementById('balance').value = account.balance;
    
    // Make account number read-only when editing
    document.getElementById('accountNumber').readOnly = true;
    
    accountModal.show();
}

// Save account (create or update)
async function saveAccount() {
    const form = document.getElementById('accountForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const accountId = document.getElementById('accountId').value;
    const accountData = {
        account_number: document.getElementById('accountNumber').value,
        holder_name: document.getElementById('holderName').value,
        account_type: document.getElementById('accountType').value,
        balance: parseFloat(document.getElementById('balance').value)
    };
    
    try {
        let response;
        if (accountId) {
            // Update existing account
            response = await fetch(`/api/accounts/${accountId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(accountData)
            });
        } else {
            // Create new account
            response = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(accountData)
            });
        }
        
        if (response.ok) {
            accountModal.hide();
            loadAccounts();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error saving account:', error);
        alert('Error saving account');
    }
}

// Delete account
async function deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/accounts/${accountId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadAccounts();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Error deleting account');
    }
}

// Show transaction modal
function showTransactionModal(accountId, type) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    document.getElementById('transactionAccountId').value = accountId;
    document.getElementById('transactionType').value = type;
    document.getElementById('currentBalance').textContent = account.balance.toFixed(2);
    document.getElementById('amount').value = '';
    
    updateTransactionTitle();
    transactionModal.show();
}

// Update transaction modal title
function updateTransactionTitle() {
    const type = document.getElementById('transactionType').value;
    const title = type === 'deposit' ? 'Deposit Money' : 'Withdraw Money';
    document.getElementById('transactionModalTitle').textContent = title;
}

// Process transaction
async function processTransaction() {
    const form = document.getElementById('transactionForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const accountId = document.getElementById('transactionAccountId').value;
    const type = document.getElementById('transactionType').value;
    const amount = parseFloat(document.getElementById('amount').value);
    
    try {
        const response = await fetch(`/api/accounts/${accountId}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        
        if (response.ok) {
            transactionModal.hide();
            loadAccounts();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error processing transaction:', error);
        alert('Error processing transaction');
    }
}