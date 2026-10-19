import Foundation

public struct CategoryInfo: Identifiable, Hashable, Sendable {
    public let id: String
    public let name: String
    /// `#rrggbb`
    public let colorHex: String
    public let icon: String

    public init(id: String, name: String, colorHex: String, icon: String) {
        self.id = id
        self.name = name
        self.colorHex = colorHex
        self.icon = icon
    }
}

public enum Categories {
    /// Mirrors `defaultCategories` in data/default-data.ts.
    public static let expense: [CategoryInfo] = [
        CategoryInfo(id: "1", name: "Food & Dining", colorHex: "#ef4444", icon: "🍽️"),
        CategoryInfo(id: "2", name: "Transportation", colorHex: "#3b82f6", icon: "🚗"),
        CategoryInfo(id: "3", name: "Shopping", colorHex: "#8b5cf6", icon: "🛍️"),
        CategoryInfo(id: "4", name: "Groceries", colorHex: "#f97316", icon: "🥦"),
        CategoryInfo(id: "5", name: "Entertainment", colorHex: "#f59e0b", icon: "🎬"),
        CategoryInfo(id: "6", name: "Bills & Utilities", colorHex: "#10b981", icon: "💡"),
        CategoryInfo(id: "7", name: "Healthcare", colorHex: "#ec4899", icon: "🏥"),
        CategoryInfo(id: "8", name: "Education", colorHex: "#06b6d4", icon: "📚"),
        CategoryInfo(id: "9", name: "Travel", colorHex: "#84cc16", icon: "✈️"),
        CategoryInfo(id: "10", name: "Transfer", colorHex: "#6366f1", icon: "💸"),
        CategoryInfo(id: "11", name: "Income/Deposit", colorHex: "#22c55e", icon: "💰"),
        CategoryInfo(id: "12", name: "Fees/Withdrawal", colorHex: "#ef4444", icon: "🏧"),
    ]

    /// Mirrors `incomeCategories` in components/income-form.tsx.
    public static let income: [CategoryInfo] = [
        CategoryInfo(id: "salary", name: "Salary", colorHex: "#16a34a", icon: "💼"),
        CategoryInfo(id: "freelance", name: "Freelance", colorHex: "#16a34a", icon: "💻"),
        CategoryInfo(id: "business", name: "Business", colorHex: "#16a34a", icon: "🏢"),
        CategoryInfo(id: "investment", name: "Investment", colorHex: "#16a34a", icon: "📈"),
        CategoryInfo(id: "gift", name: "Gift", colorHex: "#16a34a", icon: "🎁"),
        CategoryInfo(id: "refund", name: "Refund", colorHex: "#16a34a", icon: "↩️"),
        CategoryInfo(id: "other-income", name: "Other Income", colorHex: "#16a34a", icon: "💰"),
    ]

    public static let fallbackColorHex = "#6b7280"

    /// The known category with this name, or a neutral placeholder carrying the name.
    public static func named(_ name: String) -> CategoryInfo {
        expense.first { $0.name == name }
            ?? income.first { $0.name == name }
            ?? CategoryInfo(id: "custom-\(name)", name: name, colorHex: fallbackColorHex, icon: "💰")
    }
}
