import FirebaseCore
import Foundation
import GoogleSignIn

/// Configures Firebase from `GoogleService-Info.plist` without crashing when it's missing,
/// so a fresh checkout shows setup instructions instead of an exception.
enum FirebaseBootstrap {
    static var isConfigured: Bool { FirebaseApp.app() != nil }

    static func configure() {
        guard FirebaseApp.app() == nil,
              let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
              let options = FirebaseOptions(contentsOfFile: path)
        else { return }
        FirebaseApp.configure(options: options)
        if let clientID = options.clientID {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        }
    }

    /// Why Google sign-in can't start, if it can't. GoogleSignIn raises an Objective-C
    /// exception (an uncatchable crash) when the reversed client ID URL scheme isn't registered.
    static var googleSignInProblem: String? {
        guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
              let plist = NSDictionary(contentsOfFile: path),
              let reversed = plist["REVERSED_CLIENT_ID"] as? String, !reversed.isEmpty
        else {
            return "GoogleService-Info.plist has no CLIENT_ID. Enable Google sign-in in the Firebase console, then download the plist again."
        }
        let urlTypes = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]] ?? []
        let schemes = urlTypes.flatMap { $0["CFBundleURLSchemes"] as? [String] ?? [] }
        guard schemes.contains(reversed) else {
            return "Set GOOGLE_REVERSED_CLIENT_ID in ios/Config/Local.xcconfig to \(reversed) and rebuild."
        }
        return nil
    }
}
