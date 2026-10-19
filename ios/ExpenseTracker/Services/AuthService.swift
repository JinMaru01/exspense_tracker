import FirebaseAuth
import GoogleSignIn
import Observation
import UIKit

struct Account: Equatable {
    let uid: String
    let email: String?
    let displayName: String?
    let photoURL: URL?
}

/// Google sign-in through Firebase Auth — the same accounts the web app uses, so the
/// same `users/{uid}` data shows up on both.
@MainActor
@Observable
final class AuthService {
    private(set) var account: Account?
    /// True until Firebase reports the persisted session (or its absence) at launch.
    private(set) var isRestoring = true
    private(set) var isSigningIn = false
    var errorMessage: String?

    @ObservationIgnored private var listener: NSObjectProtocol?

    init() {
        guard FirebaseBootstrap.isConfigured else {
            isRestoring = false
            return
        }
        listener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            let account = user.map {
                Account(uid: $0.uid, email: $0.email, displayName: $0.displayName, photoURL: $0.photoURL)
            }
            Task { @MainActor in
                self?.account = account
                self?.isRestoring = false
            }
        }
    }

    func signInWithGoogle() async {
        errorMessage = nil
        if let problem = FirebaseBootstrap.googleSignInProblem {
            errorMessage = problem
            return
        }
        guard let presenter = UIApplication.shared.topViewController else { return }

        isSigningIn = true
        defer { isSigningIn = false }
        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
            guard let idToken = result.user.idToken?.tokenString else {
                errorMessage = "Google didn't return an ID token. Please try again."
                return
            }
            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )
            _ = try await Auth.auth().signIn(with: credential)
        } catch let error as GIDSignInError where error.code == .canceled {
            // User closed the Google sheet.
        } catch {
            errorMessage = "Sign-in failed. Please try again."
        }
    }

    func signOut() {
        GIDSignIn.sharedInstance.signOut()
        do {
            try Auth.auth().signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

extension UIApplication {
    /// The view controller currently on screen, for presenting UIKit-based flows.
    var topViewController: UIViewController? {
        let scenes = connectedScenes.compactMap { $0 as? UIWindowScene }
        let scene = scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
        var top = scene?.keyWindow?.rootViewController
        while let presented = top?.presentedViewController {
            top = presented
        }
        return top
    }
}
