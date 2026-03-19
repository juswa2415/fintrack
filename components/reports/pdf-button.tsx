"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { FinTrackPDFReport } from "./pdf-report";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  currency: string;
}

export function PDFExportButton({ data, from, to, currency }: Props) {
  return (
    <PDFDownloadLink
      document={<FinTrackPDFReport data={data} from={from} to={to} currency={currency} />}
      fileName={`fintrack-report-${from}-to-${to}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" disabled={loading}>
          <FileText className="h-4 w-4 mr-1.5" />
          {loading ? "Building PDF..." : "Export PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}