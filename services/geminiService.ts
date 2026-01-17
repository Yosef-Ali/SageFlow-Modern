import { GoogleGenAI } from "@google/genai";
import { Transaction, KPI, CopilotResponse, CopilotWidget } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using the recommended model for basic text analysis and reasoning
const MODEL_NAME = 'gemini-3-flash-preview';

export const analyzeFinancialData = async (transactions: Transaction[], query: string): Promise<CopilotResponse> => {
  try {
    const transactionSummary = transactions.map(t => 
      `${t.date}: ${t.type} #${t.id} for ${t.entity} - $${t.amount} (${t.status})`
    ).join('\n');

    const prompt = `
      You are an expert financial assistant embedded in an accounting application (similar to Sage 50).
      
      Here is a summary of recent transactions:
      ${transactionSummary}

      User Query: "${query}"

      Please provide a concise, professional, and actionable response. 
      If the user asks for a summary, highlight cash flow risks or opportunities.
      Format the response with Markdown for readability (bold key figures).
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for faster simple responses
      }
    });

    return {
        text: response.text || "I couldn't generate an analysis at this time."
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "I'm having trouble connecting to the financial intelligence service right now." };
  }
};

export const identifyPayableBills = async (transactions: Transaction[]): Promise<CopilotResponse> => {
    const pendingBills = transactions.filter(t => t.type === 'Bill' && (t.status === 'Pending' || t.status === 'Overdue'));
    
    if (pendingBills.length === 0) {
        return { text: "Great news! You have no pending bills at the moment." };
    }

    const totalAmount = pendingBills.reduce((acc, t) => acc + t.amount, 0);

    return {
        text: `You have ${pendingBills.length} outstanding bills totaling **$${totalAmount.toLocaleString()}**. Select the ones you'd like to schedule for payment.`,
        widget: {
            type: 'list-card',
            title: 'Pending Bills',
            description: 'Select bills to pay',
            data: {
                items: pendingBills.map(bill => ({
                    id: bill.id,
                    title: bill.entity,
                    subtitle: `Due: ${bill.dueDate || 'N/A'}`,
                    value: `$${bill.amount.toLocaleString()}`,
                    status: bill.status
                }))
            },
            actions: [
                { label: 'Schedule Payment', type: 'primary', actionId: 'pay_bills' }
            ],
            status: 'pending'
        }
    };
};

export const draftCollectionEmail = async (customerName: string, amount: number, daysOverdue: number): Promise<CopilotResponse> => {
  try {
    const prompt = `
      Draft a professional, yet firm collection email to customer "${customerName}".
      They owe $${amount} and are ${daysOverdue} days overdue.
      Keep it polite but clear about the need for payment.
      
      Return ONLY the email body content. Do not include 'Subject:' in the body.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const emailBody = response.text || "Could not generate email draft.";
    const subject = `Overdue Payment Reminder - Invoice Pending ($${amount})`;

    return {
        text: "I've drafted a collection email for your review. You can edit or send it directly.",
        widget: {
            type: 'review-card',
            title: 'Email Draft Review',
            description: `To: ${customerName}`,
            data: {
                subject: subject,
                body: emailBody
            },
            actions: [
                { label: 'Send Email', type: 'primary', actionId: 'send_email' },
                { label: 'Edit Draft', type: 'secondary', actionId: 'edit_draft' }
            ],
            status: 'pending'
        }
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Error generating email draft." };
  }
};

export const generateProactiveInsight = async (kpis: KPI[], transactions: Transaction[], companyName: string): Promise<CopilotResponse> => {
  try {
    const kpiSummary = kpis.map(k =>
      `${k.label}: ${k.value} (${k.trend}% ${k.trendDirection})`
    ).join('\n');

    const overdueInvoices = transactions.filter(t => t.type === 'Invoice' && t.status === 'Overdue');
    const overdueSummary = overdueInvoices.length > 0 
      ? `Overdue Invoices: ${overdueInvoices.length} (Total: $${overdueInvoices.reduce((acc, t) => acc + t.amount, 0)})`
      : "No overdue invoices.";

    const prompt = `
      You are an intelligent financial assistant for ${companyName}.
      
      Current Financial KPIs:
      ${kpiSummary}

      Operational Context:
      ${overdueSummary}

      Provide a concise, proactive insight (2-3 sentences) to greet the user.
      
      RULES FOR SUGGESTIONS:
      1. If there are overdue invoices, you MUST explicitly suggest: "I noticed you have overdue invoices. Shall I draft a collection email?"
      2. If 'Total Expenses' are trending 'up' (trendDirection: 'up' and trend > 0), you MUST suggest: "Expenses are trending up. Would you like to review recent vendor bills?"
      3. Otherwise, highlight a positive trend or general status.

      Be professional and encouraging. Format with Markdown (bold key figures).
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      }
    });

    const text = response.text || `Welcome to ${companyName}. I am ready to analyze your financial data.`;
    
    // Determine if we should attach an action widget based on the AI's response text
    let widget: CopilotWidget | undefined;

    if (text.toLowerCase().includes('collection email') || text.toLowerCase().includes('draft')) {
        widget = {
            type: 'action-card',
            title: 'Suggested Action',
            description: 'Draft collection emails for overdue invoices?',
            actions: [{ label: 'Yes, Draft Email', type: 'primary', actionId: 'draft_collection_email' }]
        };
    } else if (text.toLowerCase().includes('vendor bills') || text.toLowerCase().includes('review')) {
         widget = {
            type: 'action-card',
            title: 'Suggested Action',
            description: 'Review outstanding vendor bills?',
            actions: [{ label: 'Review Bills', type: 'primary', actionId: 'review_bills' }]
        };
    }

    return { text, widget };

  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return { text: `Welcome to ${companyName}. How can I assist you today?` };
  }
};

export const extractBillData = async (base64Image: string): Promise<Partial<Transaction> | null> => {
  try {
    const prompt = `
      Analyze this image of a vendor bill or invoice.
      Extract the following information and return it in JSON format ONLY:
      - entity: The name of the vendor or company issuing the bill.
      - amount: The total amount due (number).
      - date: The invoice/bill date (YYYY-MM-DD).
      - dueDate: The due date (YYYY-MM-DD).
      - id: The invoice or bill number.

      If a field cannot be found, use null.
      Ensure the response is valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG for simplicity, though API supports others
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return null;
  }
};