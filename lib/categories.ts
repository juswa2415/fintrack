import { CategoryType } from "@prisma/client";

export const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary / Wages", icon: "briefcase", color: "#22c55e" },
  { name: "Business / Freelance", icon: "building-2", color: "#16a34a" },
  { name: "Investment Returns", icon: "trending-up", color: "#15803d" },
  { name: "Rental Income", icon: "home", color: "#166534" },
  { name: "Bonus / Gift", icon: "gift", color: "#4ade80" },
  { name: "Other Income", icon: "plus-circle", color: "#86efac" },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Housing", icon: "home", color: "#ef4444" },
  { name: "Utilities", icon: "zap", color: "#f97316" },
  { name: "Groceries", icon: "shopping-cart", color: "#f59e0b" },
  { name: "Dining & Entertainment", icon: "utensils", color: "#eab308" },
  { name: "Transport", icon: "car", color: "#84cc16" },
  { name: "Healthcare", icon: "heart-pulse", color: "#06b6d4" },
  { name: "Insurance", icon: "shield", color: "#3b82f6" },
  { name: "Debt Payments", icon: "credit-card", color: "#8b5cf6" },
  { name: "Subscriptions", icon: "repeat", color: "#a855f7" },
  { name: "Education", icon: "book-open", color: "#ec4899" },
  { name: "Shopping", icon: "bag", color: "#f43f5e" },
  { name: "Savings Contribution", icon: "piggy-bank", color: "#14b8a6" },
  { name: "Other Expenses", icon: "more-horizontal", color: "#6b7280" },
];

export async function seedDefaultCategories(userId: string, prisma: any) {
  const income = DEFAULT_INCOME_CATEGORIES.map((c) => ({
    ...c,
    userId,
    type: CategoryType.INCOME,
    isDefault: true,
  }));
  const expense = DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
    ...c,
    userId,
    type: CategoryType.EXPENSE,
    isDefault: true,
  }));
  await prisma.category.createMany({ data: [...income, ...expense] });
}
