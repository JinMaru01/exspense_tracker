import GoogleSignInSwift
import SwiftUI

struct SignInView: View {
    @Environment(AuthService.self) private var auth
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 28) {
            Spacer()
            LotusBadge(size: 88)
            VStack(spacing: 8) {
                Text("Expense Tracker")
                    .font(.largeTitle.weight(.bold))
                Text("Sign in to sync your data across all devices in real time.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            Spacer()

            VStack(spacing: 16) {
                if let error = auth.errorMessage {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote)
                        .foregroundStyle(Theme.expense)
                        .multilineTextAlignment(.leading)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.expense.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
                }

                ZStack {
                    GoogleSignInButton(
                        scheme: colorScheme == .dark ? .dark : .light,
                        style: .wide,
                        state: auth.isSigningIn ? .disabled : .normal
                    ) {
                        Task { await auth.signInWithGoogle() }
                    }
                    .disabled(auth.isSigningIn)
                    if auth.isSigningIn {
                        ProgressView()
                    }
                }
                .frame(maxWidth: 360)

                Text("Your data is private. Only you can see it.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            LinearGradient(
                colors: [Theme.lotusSoft, Theme.background, Color(light: 0xFFFBEB, dark: 0x1C1917)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
        )
    }
}

/// Shown when the app was built without `GoogleService-Info.plist`.
struct SetupRequiredView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                LotusBadge(size: 64)
                Text("Firebase setup needed")
                    .font(.title.weight(.bold))
                Text("This build doesn't include GoogleService-Info.plist, so it can't reach your data yet.")
                    .foregroundStyle(.secondary)
                VStack(alignment: .leading, spacing: 10) {
                    step(1, "Open the Firebase project the web app uses and add an iOS app with this app's bundle ID.")
                    step(2, "Download GoogleService-Info.plist and drop it into ios/ExpenseTracker/.")
                    step(3, "Copy ios/Config/Local.example.xcconfig to Local.xcconfig and fill in REVERSED_CLIENT_ID from the plist.")
                    step(4, "Build and run again.")
                }
                Text("Full instructions are in ios/README.md.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding(24)
        }
        .background(Theme.background)
    }

    private func step(_ number: Int, _ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text("\(number)")
                .font(.footnote.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 22, height: 22)
                .background(Theme.lotus, in: Circle())
            Text(text)
        }
    }
}
