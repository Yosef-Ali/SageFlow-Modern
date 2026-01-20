import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

interface FinancialSummaryWidgetProps {
  data: {
    revenue: number
    expenses: number
    netIncome: number
    trend: 'up' | 'down' | 'neutral'
  }
}

export function FinancialSummaryWidget({ data }: FinancialSummaryWidgetProps) {
  return (
    <Card className="w-full max-w-sm bg-card text-card-foreground shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
             <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold flex items-center gap-1">
                   <DollarSign className="h-4 w-4 text-emerald-500" />
                   {data.revenue.toLocaleString()}
                </p>
             </div>
             <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold text-red-500 flex items-center gap-1">
                   <DollarSign className="h-4 w-4" />
                   {data.expenses.toLocaleString()}
                </p>
             </div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
             <span className="text-sm font-medium">Net Income</span>
             <span className={`text-xl font-bold flex items-center gap-1 ${data.netIncome >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {data.netIncome >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                ${data.netIncome.toLocaleString()}
             </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
