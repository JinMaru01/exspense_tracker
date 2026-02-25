# CSV Import Guide

## How to Import Your Expense Data

### 1. **Prepare Your CSV File**

Your CSV file must have the following columns:
- **Date** - Date in format MM/DD/YYYY (e.g., 2/25/2026)
- **Category** - Expense category (e.g., Food & Dining, Bills & Utilities, Transportation)
- **Description** - Description of the transaction (e.g., "Dinner", "Laptop Charger")
- **Wallet** - Wallet name (e.g., "Daily", "Cash (Dollar)")
- **Amount** - Transaction amount as a number
- **Currency** - Currency code (USD, KHR, etc.)

### 2. **Important Notes on Amount Field**

- **Expenses**: Use positive numbers (e.g., 50 for a $50 expense)
- **Income**: Use negative numbers (e.g., -500 for $500 income)
- **Transfers**: Positive numbers (will be marked as transfers if "Transfer" is in the description)

The system will automatically:
- Convert negative amounts to income entries
- Store all amounts as positive values
- Tag transactions with the correct type (expense, income, or transfer)

### 3. **Example CSV Format**

```
Date,Category,Description,Wallet,Amount,Currency
2/25/2026,Salary,Income,Daily,-290,USD
2/24/2026,Bills & Utilities,Laptop Charger,Daily,16,USD
2/25/2026,Food & Dining,Fruits,Cash (Dollar),10000,KHR
2/25/2026,Food & Dining,Dinner,Cash (Dollar),12000,KHR
2/25/2026,Transportation,Petroleum,Daily,3.99,USD
```

### 4. **How to Import**

1. Click the **"Import CSV"** button in the top-right area of the app
2. Select your CSV file from your computer
3. The app will:
   - Parse the file
   - Validate the data
   - Check for duplicates
   - Import only new entries
4. You'll see a success message with the number of expenses imported

### 5. **Automatic Migration**

When you open the app, if there's any old data:
- Any negative amounts will be converted to income
- All entries will automatically get a "type" field (expense, income, or transfer)
- This happens automatically - no action needed!

### 6. **Duplicate Detection**

The import system prevents duplicates by checking:
- Description
- Wallet
- Amount
- Date

If an entry matches an existing one exactly, it will be skipped.

### 7. **Data Separation**

After import, your data is organized as:
- **Total Income** - All money coming in (shown in green)
- **Total Expenses** - All money going out (shown in red)
- **Transfers** - Money moved between wallets or currency conversions (shown in blue)
- **Net Balance** - Income minus expenses (automatic calculation)

### 8. **Viewing Imported Data**

1. Go to the **Expenses** tab
2. Use the filters to view:
   - All transactions: "All Types"
   - Income only: Filter by "Income"
   - Expenses only: Filter by "Expense"
   - Transfers only: Filter by "Transfer"

## Troubleshooting

### "CSV must contain columns: Date, Category, Description, Wallet, Amount, Currency"
- Make sure your CSV has exactly these column headers
- Check for any typos in the header row

### "No new expenses to import. All entries may be duplicates."
- All entries in your CSV already exist in the app
- Check if you've imported this file before

### Dates are incorrect
- Make sure dates are in MM/DD/YYYY format
- Example: February 25, 2026 should be 2/25/2026

### Amount format issues
- Use numbers only (no currency symbols like $ or ៛)
- Use decimal points for decimal values: 3.99 instead of 3,99
- Income should be negative: -290 instead of 290
