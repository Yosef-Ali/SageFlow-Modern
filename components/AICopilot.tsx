import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, Loader2, Mail, CheckCircle, Edit3, ArrowRight, ListCheck, CreditCard, AlertCircle, Save, Lightbulb } from 'lucide-react';
import { analyzeFinancialData, draftCollectionEmail, generateProactiveInsight, identifyPayableBills } from '../services/geminiService';
import { Transaction, KPI, CopilotWidget, WidgetAction, ViewState } from '../types';

interface AICopilotProps {
  transactions: Transaction[];
  kpis: KPI[];
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
  currentView: ViewState;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  widget?: CopilotWidget;
}

const SUGGESTIONS: Record<ViewState, string[]> = {
  [ViewState.DASHBOARD]: [
    "Analyze cash flow trends",
    "Summarize financial health",
    "Predict next month's revenue",
    "Identify spending risks"
  ],
  [ViewState.SALES]: [
    "Draft invoice for Acme Corp",
    "List overdue invoices",
    "Draft collection email",
    "Who are my top customers?"
  ],
  [ViewState.EXPENSES]: [
    "Review recent bills",
    "Identify high expenses",
    "Pay outstanding bills",
    "Categorize recent purchases"
  ],
  [ViewState.INVENTORY]: [
    "Check low stock items",
    "Analyze inventory value",
    "Suggest reorder quantities",
    "Identify slow-moving items"
  ],
  [ViewState.REPORTS]: [
    "Generate P&L summary",
    "Explain profit margins",
    "Create executive summary",
    "Compare vs last month"
  ],
  [ViewState.SETTINGS]: [
    "How do I add users?",
    "Backup data",
    "Change company details"
  ]
};

const AICopilot: React.FC<AICopilotProps> = ({ transactions, kpis, companyName, isOpen, onClose, currentView }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Widget States
  const [selections, setSelections] = useState<Record<number, string[]>>({});
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editBody, setEditBody] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, editingMessageIndex]);

  // Fetch proactive insight when opened or company changes
  useEffect(() => {
    const initCopilot = async () => {
      // Avoid re-fetching if already done for this company session
      if (initializedRef.current === companyName) return;
      
      setIsInitializing(true);
      setMessages([]); // Clear previous context
      
      const response = await generateProactiveInsight(kpis, transactions, companyName);
      
      setMessages([{ role: 'ai', content: response.text, widget: response.widget }]);
      setIsInitializing(false);
      initializedRef.current = companyName;
    };

    if (isOpen) {
      initCopilot();
    }
  }, [isOpen, companyName, kpis, transactions]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
        let aiResponse;
        
        const lowerMsg = userMsg.toLowerCase();

        // Router Logic
        if (lowerMsg.includes('email') || lowerMsg.includes('draft') || lowerMsg.includes('collection')) {
            await triggerEmailDraft();
            setLoading(false);
            return;
        } else if (lowerMsg.includes('bill') || lowerMsg.includes('pay') || lowerMsg.includes('outstanding')) {
            aiResponse = await identifyPayableBills(transactions);
        } else {
            aiResponse = await analyzeFinancialData(transactions, userMsg);
        }

        setMessages(prev => [...prev, { role: 'ai', content: aiResponse.text, widget: aiResponse.widget }]);
    } catch (error) {
        setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error processing your request." }]);
    } finally {
        setLoading(false);
    }
  };

  const triggerEmailDraft = async () => {
      // Find an overdue invoice to act upon
      const overdueInvoice = transactions.find(t => t.type === 'Invoice' && t.status === 'Overdue');
      
      if (overdueInvoice) {
          const daysOverdue = 15; // Mock calculation
          const aiResponse = await draftCollectionEmail(overdueInvoice.entity, overdueInvoice.amount, daysOverdue);
          setMessages(prev => [...prev, { role: 'ai', content: aiResponse.text, widget: aiResponse.widget }]);
      } else {
          setMessages(prev => [...prev, { role: 'ai', content: "I couldn't find any overdue invoices to draft a collection email for." }]);
      }
  };

  const triggerBillReview = async () => {
      const aiResponse = await identifyPayableBills(transactions);
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse.text, widget: aiResponse.widget }]);
  };

  const toggleSelection = (msgIndex: number, itemId: string) => {
      setSelections(prev => {
          const current = prev[msgIndex] || [];
          if (current.includes(itemId)) {
              return { ...prev, [msgIndex]: current.filter(id => id !== itemId) };
          } else {
              return { ...prev, [msgIndex]: [...current, itemId] };
          }
      });
  };

  const handleWidgetAction = async (messageIndex: number, action: WidgetAction) => {
    // Handle Actions that don't immediately close the widget (like Edit)
    if (action.actionId === 'edit_draft') {
        setEditBody(messages[messageIndex].widget?.data?.body || '');
        setEditingMessageIndex(messageIndex);
        return;
    }

    // 1. Update the widget state to indicate action taken
    const updatedMessages = [...messages];
    const msg = updatedMessages[messageIndex];
    
    if (msg.widget) {
        msg.widget.status = 'completed';
    }
    setMessages(updatedMessages);

    // 2. Perform the action
    if (action.actionId === 'send_email') {
        const recipient = msg.widget?.description?.replace('To: ', '') || 'Customer';
        setTimeout(() => {
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: `✅ Email successfully sent to ${recipient}.` 
            }]);
        }, 500);
    } else if (action.actionId === 'save_send_email') {
        // This comes from the edit mode
        const recipient = msg.widget?.description?.replace('To: ', '') || 'Customer';
        setTimeout(() => {
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: `✅ Edited email successfully sent to ${recipient}.` 
            }]);
            setEditingMessageIndex(null);
        }, 500);
    } else if (action.actionId === 'pay_bills') {
        const selectedIds = selections[messageIndex] || [];
        const count = selectedIds.length;
        setTimeout(() => {
           setMessages(prev => [...prev, { 
               role: 'ai', 
               content: count > 0 
                ? `✅ I've scheduled payments for ${count} bill${count !== 1 ? 's' : ''}. Approval workflow initiated.` 
                : `⚠️ No bills were selected.`
           }]);
       }, 500);
    } else if (action.actionId === 'draft_collection_email') {
        setLoading(true);
        await triggerEmailDraft();
        setLoading(false);
    } else if (action.actionId === 'review_bills') {
        setLoading(true);
        await triggerBillReview();
        setLoading(false);
    }
  };

  const renderWidget = (widget: CopilotWidget, msgIndex: number) => {
      const isCompleted = widget.status === 'completed';
      const isEditing = editingMessageIndex === msgIndex;
      
      // --- REVIEW CARD (Email/Content) ---
      if (widget.type === 'review-card') {
          return (
              <div className={`mt-3 border rounded-xl overflow-hidden transition-all duration-300 shadow-sm ${isCompleted ? 'border-emerald-200 bg-emerald-50/50 opacity-80' : 'border-slate-200 bg-white'}`}>
                  {/* Header */}
                  <div className={`px-4 py-3 border-b flex justify-between items-center ${isCompleted ? 'border-emerald-100' : 'border-slate-100 bg-slate-50'}`}>
                      <div className="flex items-center space-x-2">
                          <Mail className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-slate-500'}`} />
                          <span className={`text-sm font-semibold ${isCompleted ? 'text-emerald-800' : 'text-slate-700'}`}>{widget.title}</span>
                      </div>
                      {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 space-y-3">
                      {widget.description && <p className="text-xs font-medium text-slate-500 uppercase">{widget.description}</p>}
                      {widget.data && (
                          <div className="space-y-2">
                              {widget.data.subject && (
                                  <div className="text-sm">
                                      <span className="text-slate-400 font-medium">Subject: </span>
                                      <span className="text-slate-700 font-medium">{widget.data.subject}</span>
                                  </div>
                              )}
                              {isEditing ? (
                                  <textarea 
                                    value={editBody}
                                    onChange={(e) => setEditBody(e.target.value)}
                                    className="w-full h-48 p-3 text-sm border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-serif resize-none"
                                    autoFocus
                                  />
                              ) : (
                                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 italic leading-relaxed font-serif whitespace-pre-wrap">
                                      {editBody || widget.data.body}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  {/* Actions */}
                  {!isCompleted && (
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                          {isEditing ? (
                               <>
                                <button
                                    onClick={() => setEditingMessageIndex(null)}
                                    className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleWidgetAction(msgIndex, { label: 'Send', type: 'primary', actionId: 'save_send_email' })}
                                    className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center"
                                >
                                    <Send className="w-3 h-3 mr-1" /> Send Now
                                </button>
                               </>
                          ) : (
                              widget.actions?.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleWidgetAction(msgIndex, action)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 transition-colors ${
                                        action.type === 'primary' 
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' 
                                            : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    {action.label === 'Send Email' && <Send className="w-3 h-3 mr-1" />}
                                    {action.label.includes('Edit') && <Edit3 className="w-3 h-3 mr-1" />}
                                    <span>{action.label}</span>
                                </button>
                              ))
                          )}
                      </div>
                  )}
              </div>
          );
      } 
      
      // --- LIST CARD (Selection) ---
      else if (widget.type === 'list-card') {
          const selectedItems = selections[msgIndex] || [];
          
          return (
            <div className={`mt-3 border rounded-xl overflow-hidden transition-all duration-300 shadow-sm ${isCompleted ? 'border-emerald-200 bg-emerald-50/50 opacity-80' : 'border-slate-200 bg-white'}`}>
                <div className={`px-4 py-3 border-b flex justify-between items-center ${isCompleted ? 'border-emerald-100' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex items-center space-x-2">
                        <ListCheck className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-slate-500'}`} />
                        <span className={`text-sm font-semibold ${isCompleted ? 'text-emerald-800' : 'text-slate-700'}`}>{widget.title}</span>
                    </div>
                    {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                </div>

                <div className="max-h-60 overflow-y-auto">
                    {widget.data?.items?.map((item: any) => {
                        const isSelected = selectedItems.includes(item.id);
                        return (
                            <div 
                                key={item.id} 
                                onClick={() => !isCompleted && toggleSelection(msgIndex, item.id)}
                                className={`px-4 py-3 flex items-center justify-between border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${!isCompleted ? 'hover:bg-slate-50' : ''}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                        isSelected 
                                            ? 'bg-emerald-600 border-emerald-600' 
                                            : 'border-slate-300 bg-white'
                                    }`}>
                                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>{item.title}</p>
                                        <p className="text-xs text-slate-400">{item.subtitle}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">{item.status}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {!isCompleted && widget.actions && (
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                          {widget.actions.map((action, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => handleWidgetAction(msgIndex, action)}
                                  disabled={selectedItems.length === 0 && action.type === 'primary'}
                                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 transition-all ${
                                      action.type === 'primary' 
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed' 
                                          : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                                  }`}
                              >
                                  {action.label === 'Schedule Payment' && <CreditCard className="w-3 h-3 mr-1" />}
                                  <span>{action.label} {selectedItems.length > 0 && `(${selectedItems.length})`}</span>
                              </button>
                          ))}
                      </div>
                  )}
            </div>
          );
      }
      
      // --- ACTION CARD (Simple) ---
      else if (widget.type === 'action-card') {
        return (
            <div className={`mt-3 border rounded-xl overflow-hidden transition-all duration-300 shadow-sm ${isCompleted ? 'border-emerald-200 bg-emerald-50/50 opacity-80' : 'border-slate-200 bg-white'}`}>
                <div className="p-4 flex items-start space-x-3">
                    <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-800 mb-1">{widget.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">{widget.description}</p>
                        
                        {!isCompleted && widget.actions && (
                            <div className="flex gap-2">
                                {widget.actions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleWidgetAction(msgIndex, action)}
                                        className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                                            action.type === 'primary' 
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {isCompleted && <span className="text-xs font-medium text-emerald-600 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Action Completed</span>}
                    </div>
                </div>
            </div>
        );
      }

      return null;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentSuggestions = SUGGESTIONS[currentView] || SUGGESTIONS[ViewState.DASHBOARD];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <h3 className="font-semibold">SageFlow Intelligence</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 scrollbar-hide">
        {isInitializing && messages.length === 0 && (
           <div className="flex justify-start">
             <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-200 flex items-center space-x-2">
               <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
               <span className="text-xs text-slate-500">Analyzing {companyName} data...</span>
             </div>
           </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-br-none' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none prose prose-sm'
            }`}>
              {msg.role === 'ai' ? (
                <div className="flex space-x-2">
                   <Bot className="w-4 h-4 text-emerald-600 mt-1 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                       <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                       {/* Render Widget if exists */}
                       {msg.widget && renderWidget(msg.widget, idx)}
                   </div>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        
        {loading && (
           <div className="flex justify-start">
             <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-200 flex items-center space-x-2">
               <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
               <span className="text-xs text-slate-500">Thinking...</span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions and Input */}
      <div className="bg-white border-t border-slate-200">
         {/* Dynamic Suggestions Chips */}
         <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar mask-gradient">
              {currentSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="whitespace-nowrap px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 rounded-full text-xs font-medium text-slate-600 transition-colors flex items-center"
                >
                  <Lightbulb className="w-3 h-3 mr-1.5 opacity-70" />
                  {suggestion}
                </button>
              ))}
         </div>

        {/* Input Field */}
        <div className="p-4 pt-2">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask to draft emails or pay bills..."
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none text-sm bg-slate-50 focus:bg-white transition-all outline-none h-[50px] min-h-[50px]"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            AI can make mistakes. Verify important financial data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AICopilot;