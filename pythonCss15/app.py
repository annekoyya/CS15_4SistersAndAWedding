from flask import Flask, render_template, request, jsonify
import json
from datetime import datetime

app = Flask(__name__)

# In-memory data storage
accounts = []
account_counter = 1

class BankAccount:
    def __init__(self, account_number, holder_name, account_type, balance=0):
        global account_counter
        self.id = account_counter
        account_counter += 1
        self.account_number = account_number
        self.holder_name = holder_name
        self.account_type = account_type
        self.balance = float(balance)
        self.transactions = []
        self.created_at = datetime.now().isoformat()
    
    def to_dict(self):
        return {
            'id': self.id,
            'account_number': self.account_number,
            'holder_name': self.holder_name,
            'account_type': self.account_type,
            'balance': self.balance,
            'transactions': self.transactions,
            'created_at': self.created_at
        }
    
    def deposit(self, amount):
        amount = float(amount)
        if amount <= 0:
            return False, "Deposit amount must be positive"
        
        self.balance += amount
        transaction = {
            'type': 'deposit',
            'amount': amount,
            'timestamp': datetime.now().isoformat(),
            'balance_after': self.balance
        }
        self.transactions.append(transaction)
        return True, f"Successfully deposited ${amount:.2f}"
    
    def withdraw(self, amount):
        amount = float(amount)
        if amount <= 0:
            return False, "Withdrawal amount must be positive"
        
        if amount > self.balance:
            return False, "Insufficient funds"
        
        self.balance -= amount
        transaction = {
            'type': 'withdrawal',
            'amount': amount,
            'timestamp': datetime.now().isoformat(),
            'balance_after': self.balance
        }
        self.transactions.append(transaction)
        return True, f"Successfully withdrew ${amount:.2f}"

def initialize_sample_data():
    global accounts, account_counter
    accounts = [
    ]
    account_counter = len(accounts) + 1

initialize_sample_data()

@app.route('/')
def index():
    return render_template('index.html')

# Account CRUD Operations
@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    return jsonify([account.to_dict() for account in accounts])

@app.route('/api/accounts', methods=['POST'])
def create_account():
    data = request.get_json()
    
    # Validation
    required_fields = ['account_number', 'holder_name', 'account_type', 'balance']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Check if account number already exists
    if any(acc.account_number == data['account_number'] for acc in accounts):
        return jsonify({'error': 'Account number already exists'}), 400
    
    try:
        initial_balance = float(data['balance'])
        if initial_balance < 0:
            return jsonify({'error': 'Initial balance cannot be negative'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid balance amount'}), 400
    
    # Create new account
    new_account = BankAccount(
        account_number=data['account_number'],
        holder_name=data['holder_name'],
        account_type=data['account_type'],
        balance=initial_balance
    )
    
    accounts.append(new_account)
    return jsonify(new_account.to_dict()), 201

@app.route('/api/accounts/<int:account_id>', methods=['PUT'])
def update_account(account_id):
    data = request.get_json()
    
    account = next((acc for acc in accounts if acc.id == account_id), None)
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    # Update fields
    if 'holder_name' in data:
        account.holder_name = data['holder_name']
    if 'account_type' in data:
        account.account_type = data['account_type']
    
    return jsonify(account.to_dict())

@app.route('/api/accounts/<int:account_id>', methods=['DELETE'])
def delete_account(account_id):
    global accounts
    account = next((acc for acc in accounts if acc.id == account_id), None)
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    accounts = [acc for acc in accounts if acc.id != account_id]
    return jsonify({'message': 'Account deleted successfully'})

# Transaction Operations
@app.route('/api/accounts/<int:account_id>/deposit', methods=['POST'])
def deposit(account_id):
    data = request.get_json()
    amount = data.get('amount')
    
    if not amount:
        return jsonify({'error': 'Amount is required'}), 400
    
    try:
        amount = float(amount)
    except ValueError:
        return jsonify({'error': 'Invalid amount'}), 400
    
    account = next((acc for acc in accounts if acc.id == account_id), None)
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    success, message = account.deposit(amount)
    if success:
        return jsonify(account.to_dict())
    else:
        return jsonify({'error': message}), 400

@app.route('/api/accounts/<int:account_id>/withdraw', methods=['POST'])
def withdraw(account_id):
    data = request.get_json()
    amount = data.get('amount')
    
    if not amount:
        return jsonify({'error': 'Amount is required'}), 400
    
    try:
        amount = float(amount)
    except ValueError:
        return jsonify({'error': 'Invalid amount'}), 400
    
    account = next((acc for acc in accounts if acc.id == account_id), None)
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    success, message = account.withdraw(amount)
    if success:
        return jsonify(account.to_dict())
    else:
        return jsonify({'error': message}), 400

@app.route('/api/summary', methods=['GET'])
def get_summary():
    total_balance = sum(acc.balance for acc in accounts)
    total_accounts = len(accounts)
    
    account_type_summary = {}
    for acc in accounts:
        if acc.account_type not in account_type_summary:
            account_type_summary[acc.account_type] = 0
        account_type_summary[acc.account_type] += acc.balance
    
    return jsonify({
        'total_balance': total_balance,
        'total_accounts': total_accounts,
        'account_type_summary': account_type_summary
    })

if __name__ == '__main__':
    app.run(debug=True)
