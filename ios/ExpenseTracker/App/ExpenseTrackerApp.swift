import GoogleSignIn
import SwiftUI

@main
struct ExpenseTrackerApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var auth: AuthService
    @State private var rates = ExchangeRateService()

    init() {
        // Firebase must be configured before AuthService touches `Auth.auth()`.
        FirebaseBootstrap.configure()
        _auth = State(initialValue: AuthService())
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .environment(rates)
                .tint(Theme.lotus)
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}
