# Expense Tracker for iOS

A native SwiftUI app for the expense tracker. It signs in with the same Google account and reads and writes the same Firestore data (`users/{uid}/expenses`, `wallets`, `subscriptions`) as the web app, so changes made on the phone show up on the web in real time and vice versa.

## Features

| Screen | What it does |
| --- | --- |
| **Dashboard** | Net balance, income, expenses, transfers and wallet total for all time, this month, last month or a custom range, in USD or KHR. Also shows spending by category, recent transactions and a currency converter. |
| **Transactions** | Search, filters (type, category, wallet, period), entries grouped by day, swipe to edit or delete, and CSV export of the filtered list. |
| **Wallets** | Portfolio total, wallet details, balance adjustments, lock/unlock, rename (the new name is carried over to existing records), and transfers between wallets at the live exchange rate. |
| **Subscriptions** | Due-date badges, a tab badge for anything due today or overdue, "charge now" (records the expense and moves the next date forward), pause/resume and CSV export. |
| **Reports** | Monthly income-vs-expense chart, category donut, top categories, wallet activity and subscriptions, exported as CSV or a multi-page PDF through the share sheet. |
| **Settings** | CSV import (same format and duplicate check as the web importer), exchange-rate refresh, reminders, clear all data and sign out. |

Specific to iOS:

- **Offline:** Firestore's on-device cache keeps the app usable without a connection. Changes sync when you're back online.
- **Reminders:** local notifications on the day a subscription is due, plus an optional evening reminder on days with nothing logged. This replaces the Telegram reminder bot.
- **Safe concurrent edits:** wallet balances change with atomic increments, so editing on the phone and the web at the same time doesn't lose updates.
- Dark mode, Dynamic Type and VoiceOver labels.

## Requirements

- Xcode 16.3 or later (Xcode 26 recommended); the app targets iOS 17+.
- Access to the Firebase project that the web app uses.

## Setup

1. **Register the iOS app in Firebase.** In the [Firebase console](https://console.firebase.google.com/), open the web app's project, go to *Project settings → Your apps → Add app → iOS*, and choose a bundle ID (for example `com.yourname.expensetracker`).
2. **Make sure Google sign-in is enabled** under *Authentication → Sign-in method → Google*. The web app already uses it.
3. **Download `GoogleService-Info.plist`** and put it in `ios/ExpenseTracker/`. Xcode picks it up automatically, and the file is git-ignored. If you downloaded it before enabling Google sign-in, download it again so it contains `CLIENT_ID`.
4. **Create your local config:**
   ```sh
   cp ios/Config/Local.example.xcconfig ios/Config/Local.xcconfig
   ```
   Set `PRODUCT_BUNDLE_IDENTIFIER` to the bundle ID from step 1 and `GOOGLE_REVERSED_CLIENT_ID` to the `REVERSED_CLIENT_ID` value from the plist. Set `DEVELOPMENT_TEAM` too if you want to run on a real device.
5. **Open `ios/ExpenseTracker.xcodeproj`**, wait for Swift Package Manager to fetch Firebase and GoogleSignIn, choose an iPhone simulator and press Run.

If the plist is missing, the app shows these steps on launch instead of crashing. If the URL scheme is missing, the sign-in screen tells you which value to set.

## Project layout

```
ios/
├── ExpenseTracker.xcodeproj
├── Config/                 App.xcconfig, Local.example.xcconfig, Info.plist (Google URL scheme)
├── ExpenseTracker/         The app (folder synced with Xcode: new files are picked up automatically)
│   ├── App/                Entry point, Firebase bootstrap, root/tab views
│   ├── Services/           AuthService, DataStore (Firestore), ExchangeRateService, ReminderScheduler, FileExporter
│   ├── Theme/              "Lotus & warmth" palette shared with the web app
│   ├── Views/              Dashboard, Transactions, Wallets, Subscriptions, Reports, Settings, shared components
│   └── Assets.xcassets
└── ExpenseTrackerKit/      Swift package with the platform-independent logic, plus unit tests
```

`ExpenseTrackerKit` contains the data model and Firestore field mapping, the balance bookkeeping (ported from `hooks/use-firebase-data.ts`), currency conversion and formatting, period filters, report statistics, subscription scheduling and CSV import/export. It doesn't depend on Firebase or UIKit, so the tests run anywhere:

```sh
cd ios/ExpenseTrackerKit && swift test
```

In Xcode, ⌘U runs the same tests. The `iOS app` GitHub Actions workflow runs them and builds the app for the simulator whenever something under `ios/` changes.

## Compatibility with the web app

- Field names and value types match what the web app writes. Dates are stored as Firestore timestamps, and older documents without a `type` are treated as expenses, as on the web.
- Exchange rates come from the same API (`api.exchangerate-api.com`) and are cached for 6 hours, falling back to 1 USD = 4,100 KHR.
- CSV exports add a `Type` column, which the web importer already understands. This keeps income and transfers intact when you export from one app and import into the other.
- Imported CSV rows don't change wallet balances, matching the web importer.

## Notes

- **Firebase version:** the project is pinned to Firebase 12.x. Firebase 13 requires App Check 12, but the current GoogleSignIn release (10.0) still requires App Check 11, so Swift Package Manager can't resolve both. Move to Firebase 13 once GoogleSignIn ships a compatible release.
- **App Store review:** Apple's guideline 4.8 expects apps that offer Google sign-in to also offer an equivalent privacy-focused option such as Sign in with Apple. That only matters if you publish the app; it isn't needed for personal use or TestFlight.
