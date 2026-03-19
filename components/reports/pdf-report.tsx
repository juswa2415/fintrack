import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#4f46e5",
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  appName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#4f46e5",
  },
  reportTitle: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  dateRange: {
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "right",
  },
  generatedAt: {
    fontSize: 8,
    color: "#d1d5db",
    textAlign: "right",
    marginTop: 2,
  },
  householdName: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "right",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
  },
  summaryCardIncome: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  summaryCardExpense: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  summaryCardNet: {
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  summaryLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  summaryValueIncome: { color: "#16a34a" },
  summaryValueExpense: { color: "#dc2626" },
  summaryValueNet: { color: "#4f46e5" },
  summaryValueNegative: { color: "#dc2626" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 8,
    marginTop: 16,
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  colCategory: { flex: 3 },
  colAmount: { flex: 2, textAlign: "right" },
  colDate: { flex: 1.5 },
  colDesc: { flex: 3 },
  colCat: { flex: 2 },
  colMember: { flex: 1.5 },
  colTxAmount: { flex: 1.5, textAlign: "right" },
  tableCell: {
    fontSize: 9,
    color: "#374151",
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  monthlyRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  colMonth: { flex: 2 },
  colMonthIncome: { flex: 2, textAlign: "right" },
  colMonthExpense: { flex: 2, textAlign: "right" },
  colMonthNet: { flex: 2, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
    marginTop: 1,
  },
  categoryNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});

interface ReportData {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  byCategory: { name: string; color: string; type: string; total: number }[];
  monthly: { month: string; income: number; expense: number }[];
  transactions: any[];
}

interface Props {
  data: ReportData;
  from: string;
  to: string;
  householdName?: string;
  currency?: string;
}

function fmt(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function FinTrackPDFReport({ data, from, to, householdName, currency = "USD" }: Props) {
  const fromLabel = new Date(from).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const toLabel = new Date(to).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const generatedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  const sortedCategories = [...data.byCategory].sort((a, b) => b.total - a.total);
  const expenseCategories = sortedCategories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = sortedCategories.filter((c) => c.type === "INCOME");

  return (
    <Document title={`FinTrack Report ${from} to ${to}`} author="FinTrack">

      {/* PAGE 1: Summary + Category Breakdown */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.appName}>FinTrack</Text>
              <Text style={styles.reportTitle}>Financial Report</Text>
            </View>
            <View>
              {householdName && <Text style={styles.householdName}>{householdName}</Text>}
              <Text style={styles.dateRange}>{fromLabel} — {toLabel}</Text>
              <Text style={styles.generatedAt}>Generated {generatedAt}</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardIncome]}>
            <Text style={styles.summaryLabel}>TOTAL INCOME</Text>
            <Text style={[styles.summaryValue, styles.summaryValueIncome]}>{fmt(data.totalIncome, currency)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardExpense]}>
            <Text style={styles.summaryLabel}>TOTAL EXPENSES</Text>
            <Text style={[styles.summaryValue, styles.summaryValueExpense]}>{fmt(data.totalExpense, currency)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardNet]}>
            <Text style={styles.summaryLabel}>NET SAVINGS</Text>
            <Text style={[styles.summaryValue, data.netSavings >= 0 ? styles.summaryValueNet : styles.summaryValueNegative]}>
              {fmt(data.netSavings, currency)}
            </Text>
          </View>
        </View>

        {data.monthly.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Monthly Summary</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colMonth]}>Month</Text>
                <Text style={[styles.tableHeaderText, styles.colMonthIncome]}>Income</Text>
                <Text style={[styles.tableHeaderText, styles.colMonthExpense]}>Expenses</Text>
                <Text style={[styles.tableHeaderText, styles.colMonthNet]}>Net</Text>
              </View>
              {data.monthly.map((m, i) => {
                const net = m.income - m.expense;
                return (
                  <View key={i} style={[styles.monthlyRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, styles.colMonth]}>{m.month}</Text>
                    <Text style={[styles.tableCell, styles.colMonthIncome, { color: "#16a34a" }]}>{fmt(m.income, currency)}</Text>
                    <Text style={[styles.tableCell, styles.colMonthExpense, { color: "#dc2626" }]}>{fmt(m.expense, currency)}</Text>
                    <Text style={[styles.tableCell, styles.colMonthNet, { color: net >= 0 ? "#4f46e5" : "#dc2626" }]}>{fmt(net, currency)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {expenseCategories.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Expense Categories</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colCategory]}>Category</Text>
                <Text style={[styles.tableHeaderText, styles.colAmount]}>Total</Text>
              </View>
              {expenseCategories.map((c, i) => (
                <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                  <View style={[styles.colCategory, styles.categoryNameRow]}>
                    <View style={[styles.dot, { backgroundColor: c.color }]} />
                    <Text style={styles.tableCell}>{c.name}</Text>
                  </View>
                  <Text style={[styles.tableCellBold, styles.colAmount, { color: "#dc2626" }]}>{fmt(c.total, currency)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {incomeCategories.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Income Categories</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colCategory]}>Category</Text>
                <Text style={[styles.tableHeaderText, styles.colAmount]}>Total</Text>
              </View>
              {incomeCategories.map((c, i) => (
                <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                  <View style={[styles.colCategory, styles.categoryNameRow]}>
                    <View style={[styles.dot, { backgroundColor: c.color }]} />
                    <Text style={styles.tableCell}>{c.name}</Text>
                  </View>
                  <Text style={[styles.tableCellBold, styles.colAmount, { color: "#16a34a" }]}>{fmt(c.total, currency)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>FinTrack — Family Finance Tracker</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* PAGE 2: Transaction list */}
      {data.transactions.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.appName}>FinTrack</Text>
                <Text style={styles.reportTitle}>Transaction Detail</Text>
              </View>
              <View>
                {householdName && <Text style={styles.householdName}>{householdName}</Text>}
                <Text style={styles.dateRange}>{fromLabel} — {toLabel}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>All Transactions ({data.transactions.length})</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
              <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colCat]}>Category</Text>
              <Text style={[styles.tableHeaderText, styles.colMember]}>Member</Text>
              <Text style={[styles.tableHeaderText, styles.colTxAmount]}>Amount</Text>
            </View>
            {data.transactions.map((t: any, i: number) => (
              <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]} wrap={false}>
                <Text style={[styles.tableCell, styles.colDate]}>
                  {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Text>
                <Text style={[styles.tableCell, styles.colDesc]}>
                  {(t.description || t.category.name).slice(0, 35)}
                </Text>
                <Text style={[styles.tableCell, styles.colCat]}>
                  {t.category.name.slice(0, 20)}
                </Text>
                <Text style={[styles.tableCell, styles.colMember]}>
                  {t.user.name.slice(0, 15)}
                </Text>
                <Text style={[styles.tableCellBold, styles.colTxAmount, { color: t.type === "INCOME" ? "#16a34a" : "#dc2626" }]}>
                  {t.type === "INCOME" ? "+" : "-"}{fmt(t.amount, currency)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>FinTrack — Family Finance Tracker</Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </Page>
      )}
    </Document>
  );
}