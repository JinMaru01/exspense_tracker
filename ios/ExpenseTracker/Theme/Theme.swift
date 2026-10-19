import ExpenseTrackerKit
import SwiftUI
import UIKit

/// "Lotus & warmth" palette from the web app (tailwind.config.ts), with dark-mode variants.
enum Theme {
    static let lotus = Color(light: 0xC5345D, dark: 0xEA7C9B)
    static let lotusSoft = Color(light: 0xFDF4F6, dark: 0x3A1A25)
    static let lotusBorder = Color(light: 0xF9D2DC, dark: 0x5C2A3A)

    static let income = Color(light: 0x16A34A, dark: 0x4ADE80)
    static let expense = Color(light: 0xEF4444, dark: 0xF87171)
    static let transfer = Color(light: 0x3B82F6, dark: 0x60A5FA)

    /// Warm off-white page background in light mode, the system background in dark mode.
    static let background = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? .systemGroupedBackground : UIColor(hex: 0xFAF7F2)
    })
    static let card = Color(uiColor: .secondarySystemGroupedBackground)

    static func color(for type: EntryType) -> Color {
        switch type {
        case .income: income
        case .expense: expense
        case .transfer: transfer
        }
    }
}

extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: alpha
        )
    }
}

extension Color {
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }

    /// `#rrggbb`; unparseable values fall back to gray.
    init(hex: String) {
        let digits = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        self.init(uiColor: UIColor(hex: UInt32(digits, radix: 16) ?? 0x6B7280))
    }
}

extension CategoryInfo {
    var color: Color { Color(hex: colorHex) }
}

enum Haptics {
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    static func warning() {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }
}

extension Binding where Value == Bool {
    /// True while `item` holds a value; setting false clears it. For alerts and dialogs driven by an optional.
    init<T>(isPresent item: Binding<T?>) {
        self.init(
            get: { item.wrappedValue != nil },
            set: { if !$0 { item.wrappedValue = nil } }
        )
    }
}
