// swift-tools-version:5.9
import PackageDescription

// Platform-independent core of the iOS app: data model, Firestore field mapping,
// balance math, analytics and CSV. No Firebase or UI imports, so `swift test`
// runs anywhere (including Linux CI).
let package = Package(
    name: "ExpenseTrackerKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "ExpenseTrackerKit", targets: ["ExpenseTrackerKit"]),
    ],
    targets: [
        .target(name: "ExpenseTrackerKit"),
        .testTarget(name: "ExpenseTrackerKitTests", dependencies: ["ExpenseTrackerKit"]),
    ]
)
