import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, PiggyBank, Send, Loader2, Sparkles, MessageCircle, Activity, X, Calculator, Plus, Trash2, RotateCcw, Moon, Sun } from 'lucide-react';
import './index.css';

const EXAMPLE_QUESTIONS = [
  "Should I finance a new car or buy a used one with cash?",
  "I have $5,000 in credit card debt. What's the best way to pay it off?",
  "How much should I save for an emergency fund?",
  "Is it better to invest or pay off my student loans first?",
  "Should I buy or rent a home given my current financial situation?",
  "What's the smartest way to save for retirement?"
];

const calculateHealthScore = (data) => {
  const income = parseFloat(data.monthlyIncome) || 0;
  const expenses = parseFloat(data.monthlyExpenses) || 0;
  const savings = parseFloat(data.savings) || 0;
  const debts = parseFloat(data.debts) || 0;

  if (income === 0) return null;

  const monthlySavings = income - expenses;
  const savingsRate = (monthlySavings / income) * 100;
  let savingsScore = 0;
  if (savingsRate >= 20) savingsScore = 40;
  else if (savingsRate >= 15) savingsScore = 35;
  else if (savingsRate >= 10) savingsScore = 25;
  else if (savingsRate >= 5) savingsScore = 15;
  else if (savingsRate > 0) savingsScore = 5;

  const annualIncome = income * 12;
  const debtRatio = annualIncome > 0 ? (debts / annualIncome) * 100 : 0;
  let debtScore = 0;
  if (debtRatio === 0) debtScore = 30;
  else if (debtRatio < 10) debtScore = 25;
  else if (debtRatio < 20) debtScore = 20;
  else if (debtRatio < 36) debtScore = 10;
  else debtScore = 0;

  const monthsOfExpenses = expenses > 0 ? savings / expenses : 0;
  let emergencyScore = 0;
  if (monthsOfExpenses >= 6) emergencyScore = 30;
  else if (monthsOfExpenses >= 3) emergencyScore = 20;
  else if (monthsOfExpenses >= 1) emergencyScore = 10;
  else if (monthsOfExpenses > 0) emergencyScore = 5;

  const totalScore = Math.round(savingsScore + debtScore + emergencyScore);

  return {
    total: totalScore,
    savingsRate: { value: savingsRate, score: savingsScore, max: 40 },
    debtRatio: { value: debtRatio, score: debtScore, max: 30 },
    emergencyFund: { value: monthsOfExpenses, score: emergencyScore, max: 30 }
  };
};

const getScoreRating = (score) => {
  if (score >= 80) return { rating: 'Excellent', color: '#10b981', icon: '🌟' };
  if (score >= 60) return { rating: 'Good', color: '#3b82f6', icon: '✅' };
  if (score >= 40) return { rating: 'Fair', color: '#f59e0b', icon: '⚠️' };
  return { rating: 'Needs Improvement', color: '#ef4444', icon: '🚨' };
};

const getImprovementTips = (healthData) => {
  const tips = [];
  if (healthData.savingsRate.score < 30) {
    tips.push(`Increase your savings rate: Currently saving ${healthData.savingsRate.value.toFixed(1)}%, aim for 15-20%`);
  }
  if (healthData.debtRatio.score < 20 && healthData.debtRatio.value > 0) {
    tips.push(`Reduce debt: Current debt is ${healthData.debtRatio.value.toFixed(1)}% of annual income, target below 20%`);
  }
  if (healthData.emergencyFund.score < 20) {
    tips.push(`Build emergency fund: Currently ${healthData.emergencyFund.value.toFixed(1)} months of expenses, target 6 months`);
  }
  if (tips.length === 0) {
    tips.push('Great work! Keep maintaining these healthy financial habits.');
  }
  return tips;
};

const calculateRecommendedPayment = (financialData, totalDebt, totalMinPayment) => {
  const income = parseFloat(financialData.monthlyIncome) || 0;
  const expenses = parseFloat(financialData.monthlyExpenses) || 0;
  const savings = parseFloat(financialData.savings) || 0;

  if (income === 0 || expenses === 0) {
    return Math.round(totalDebt * 0.03);
  }

  const surplus = income - expenses - totalMinPayment;
  const monthsOfSavings = expenses > 0 ? savings / expenses : 0;

  let recommendedPercentage = 0.5;

  if (monthsOfSavings >= 6) {
    recommendedPercentage = 0.7;
  } else if (monthsOfSavings >= 3) {
    recommendedPercentage = 0.5;
  } else {
    recommendedPercentage = 0.3;
  }

  const recommended = Math.max(0, Math.round(surplus * recommendedPercentage));

  if (recommended < 100) {
    return Math.round(totalDebt * 0.03);
  }

  return Math.round(recommended / 50) * 50;
};

const calculateStrategy = (debts, extraPayment, strategy) => {
  let debtsList = debts.map(d => ({
    name: d.name,
    balance: parseFloat(d.balance),
    rate: parseFloat(d.interestRate) / 100 / 12,
    minPayment: parseFloat(d.minPayment),
    originalBalance: parseFloat(d.balance)
  }));

  const totalMinPayment = debts.reduce((sum, d) => sum + parseFloat(d.minPayment), 0);
  const fixedMonthlyPayment = totalMinPayment + extraPayment;

  let months = 0;
  let totalPaid = 0;
  let currentExtraPayment = extraPayment;

  while (debtsList.some(d => d.balance > 0.01) && months < 600) {
    months++;

    debtsList.forEach(debt => {
      if (debt.balance > 0) {
        const interest = debt.balance * debt.rate;
        const minPayment = debt.minPayment;
        totalPaid += minPayment;
        debt.balance = debt.balance + interest - minPayment;
        if (debt.balance < 0) debt.balance = 0;
      }
    });

    let activeDebts = debtsList.filter(d => d.balance > 0);
    
    if (activeDebts.length > 0) {
      if (strategy === 'avalanche') {
        activeDebts.sort((a, b) => b.rate - a.rate);
      } else {
        activeDebts.sort((a, b) => a.balance - b.balance);
      }

      const targetDebt = activeDebts[0];
      const extraApplied = Math.min(currentExtraPayment, targetDebt.balance);
      
      targetDebt.balance -= extraApplied;
      totalPaid += extraApplied;
      
      if (targetDebt.balance <= 0.01) {
        targetDebt.balance = 0;
        currentExtraPayment += targetDebt.minPayment;
      }
    }
  }

  const totalOriginal = debts.reduce((sum, d) => sum + parseFloat(d.balance), 0);
  const totalInterest = totalPaid - totalOriginal;

  return {
    months,
    years: Math.floor(months / 12),
    remainingMonths: months % 12,
    totalPaid,
    totalInterest,
    monthlyPayment: fixedMonthlyPayment
  };
};

const calculateMultipleDebts = (debts, customExtra = null, financialData = null) => {
  if (!debts || debts.length === 0) return null;

  const validDebts = debts.filter(d => 
    parseFloat(d.balance) > 0 && 
    parseFloat(d.interestRate) >= 0 && 
    parseFloat(d.minPayment) > 0
  );

  if (validDebts.length === 0) return null;

  const totalDebt = validDebts.reduce((sum, d) => sum + parseFloat(d.balance), 0);
  const totalMinPayment = validDebts.reduce((sum, d) => sum + parseFloat(d.minPayment), 0);

  const extraPayment = customExtra !== null && customExtra !== '' ? parseFloat(customExtra) : Math.round(totalDebt * 0.02);
  const recommendedExtra = financialData ? calculateRecommendedPayment(financialData, totalDebt, totalMinPayment) : Math.round(totalDebt * 0.05);

  const avalanche = calculateStrategy([...validDebts], extraPayment, 'avalanche');
  const snowball = calculateStrategy([...validDebts], extraPayment, 'snowball');
  
  const recommendedAvalanche = calculateStrategy([...validDebts], recommendedExtra, 'avalanche');
  const recommendedSnowball = calculateStrategy([...validDebts], recommendedExtra, 'snowball');

  return {
    totalDebt,
    totalMinPayment,
    recommendedExtra,
    scenarios: [
      {
        name: 'Current',
        extraPayment: extraPayment,
        avalanche: avalanche,
        snowball: snowball
      }
    ],
    recommended: {
      extraPayment: recommendedExtra,
      avalanche: recommendedAvalanche,
      snowball: recommendedSnowball
    },
    debts: validDebts
  };
};

const formatMessage = (text) => {
  const paragraphs = text.split('\n\n');
  
  return paragraphs.map((para, idx) => {
    if (para.includes('\n*') || para.includes('\n-')) {
      const lines = para.split('\n').filter(line => line.trim());
      const listItems = [];
      let currentText = [];
      
      lines.forEach(line => {
        if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
          if (currentText.length > 0) {
            listItems.push({ type: 'text', content: currentText.join(' ') });
            currentText = [];
          }
          listItems.push({ type: 'bullet', content: line.replace(/^[*-]\s*/, '').trim() });
        } else {
          currentText.push(line.trim());
        }
      });
      
      if (currentText.length > 0) {
        listItems.push({ type: 'text', content: currentText.join(' ') });
      }
      
      return (
        <div key={idx} className="formatted-section">
          {listItems.map((item, itemIdx) => 
            item.type === 'bullet' ? (
              <div key={itemIdx} className="bullet-item">
                <span className="bullet">•</span>
                <span>{item.content}</span>
              </div>
            ) : (
              <p key={itemIdx} className="formatted-text">{item.content}</p>
            )
          )}
        </div>
      );
    }
    
    return <p key={idx} className="formatted-paragraph">{para}</p>;
  });
};

export default function FinancialAdvisor() {
  const [financialData, setFinancialData] = useState({
    monthlyIncome: '',
    monthlyExpenses: '',
    savings: '',
    debts: '',
    goals: ''
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHealthScore, setShowHealthScore] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const [debtsList, setDebtsList] = useState([
    { id: 1, name: 'Credit Card', balance: '', interestRate: '', minPayment: '' }
  ]);
  
  const [extraPayment, setExtraPayment] = useState('');

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.body.classList.add('dark-mode');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    
    if (newDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  // Clear chat function
  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Hello! I\'m your AI financial advisor. I have your financial information and I\'m here to help you save money and achieve your goals. What would you like to know?'
    }]);
    setInput('');
  };

  const handleFinancialDataChange = (e) => {
    setFinancialData({
      ...financialData,
      [e.target.name]: e.target.value
    });
  };

  const addDebt = () => {
    const newId = Math.max(...debtsList.map(d => d.id), 0) + 1;
    setDebtsList([...debtsList, { 
      id: newId, 
      name: '', 
      balance: '', 
      interestRate: '', 
      minPayment: '' 
    }]);
  };

  const removeDebt = (id) => {
    if (debtsList.length > 1) {
      setDebtsList(debtsList.filter(d => d.id !== id));
    }
  };

  const updateDebt = (id, field, value) => {
    setDebtsList(debtsList.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const startChat = () => {
    setShowChat(true);
    setMessages([{
      role: 'assistant',
      content: 'Hello! I\'m your AI financial advisor. I have your financial information and I\'m here to help you save money and achieve your goals. What would you like to know?'
    }]);
  };

  const handleExampleClick = (question) => {
    setInput(question);
  };

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          financialData: financialData,
          message: textToSend,
          history: messages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();

      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please make sure the Java backend is running on port 8080.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const healthScore = calculateHealthScore(financialData);
  const scoreRating = healthScore ? getScoreRating(healthScore.total) : null;
  const improvementTips = healthScore ? getImprovementTips(healthScore) : [];

  const payoffResults = calculateMultipleDebts(debtsList, extraPayment, financialData);

  if (showChat) {
    const showExamples = messages.length === 1;

    return (
      <div className="app-container">
        {/* Dark Mode Toggle */}
        <button 
          className="dark-mode-toggle"
          onClick={toggleDarkMode}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button 
          className="calculator-btn"
          onClick={() => setShowCalculator(true)}
          title="Debt Payoff Calculator"
        >
          <Calculator size={24} />
          <span>Debt Payoff Calculator</span>
        </button>

        <div className="chat-container-large">
          <div className="chat-header">
            <div className="chat-header-content">
              <h1>
                <DollarSign size={32} />
                SmartMoney
              </h1>
              <button 
                className="clear-chat-btn"
                onClick={clearChat}
                title="Clear Chat"
              >
                <RotateCcw size={18} />
                <span>Clear Chat</span>
              </button>
            </div>
            <p className="ai-badge">
              <Sparkles size={16} />
              Powered by AI
            </p>
          </div>

          <div className="messages-area">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-bubble">
                  {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {showExamples && !loading && (
              <div className="example-questions">
                <div className="example-header">
                  <MessageCircle size={18} />
                  <span>Try asking:</span>
                </div>
                <div className="example-grid">
                  {EXAMPLE_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      className="example-btn"
                      onClick={() => handleExampleClick(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="loading">
                <div className="loading-bubble">
                  <div className="spinner"></div>
                </div>
              </div>
            )}
          </div>

          <div className="input-area">
            <button 
              className="health-score-btn"
              onClick={() => setShowHealthScore(true)}
            >
              <Activity size={18} />
              Want to know your Financial Health Score? Click here
            </button>

            <div className="input-row">
              <input
                type="text"
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about saving money, budgeting, or your financial goals..."
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Health Score Modal */}
        {showHealthScore && (
          <div className="modal-overlay" onClick={() => setShowHealthScore(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowHealthScore(false)}>
                <X size={24} />
              </button>

              <div className="health-score-card">
                <div className="health-header">
                  <Activity size={24} />
                  <h2>Your Financial Health Score</h2>
                </div>

                {healthScore ? (
                  <>
                    <div className="score-circle" style={{ borderColor: scoreRating.color }}>
                      <div className="score-number" style={{ color: scoreRating.color }}>
                        {healthScore.total}
                      </div>
                      <div className="score-label">out of 100</div>
                    </div>

                    <div className="score-rating" style={{ color: scoreRating.color }}>
                      <span className="rating-icon">{scoreRating.icon}</span>
                      <span className="rating-text">{scoreRating.rating}</span>
                    </div>

                    <div className="encouragement-message">
                      <p>Don't worry if your financial health isn't where you want it to be right now. We can work on it together! Every small step toward better financial habits makes a difference.</p>
                    </div>

                    <div className="score-breakdown">
                      <div className="breakdown-item">
                        <div className="breakdown-header">
                          <span className="breakdown-label">Savings Rate</span>
                          <span className="breakdown-score">{healthScore.savingsRate.score}/{healthScore.savingsRate.max}</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${(healthScore.savingsRate.score / healthScore.savingsRate.max) * 100}%`,
                              backgroundColor: scoreRating.color
                            }}
                          ></div>
                        </div>
                        <div className="breakdown-detail">{healthScore.savingsRate.value.toFixed(1)}% of income</div>
                      </div>

                      <div className="breakdown-item">
                        <div className="breakdown-header">
                          <span className="breakdown-label">Debt-to-Income</span>
                          <span className="breakdown-score">{healthScore.debtRatio.score}/{healthScore.debtRatio.max}</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${(healthScore.debtRatio.score / healthScore.debtRatio.max) * 100}%`,
                              backgroundColor: scoreRating.color
                            }}
                          ></div>
                        </div>
                        <div className="breakdown-detail">{healthScore.debtRatio.value.toFixed(1)}% of annual income</div>
                      </div>

                      <div className="breakdown-item">
                        <div className="breakdown-header">
                          <span className="breakdown-label">Emergency Fund</span>
                          <span className="breakdown-score">{healthScore.emergencyFund.score}/{healthScore.emergencyFund.max}</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${(healthScore.emergencyFund.score / healthScore.emergencyFund.max) * 100}%`,
                              backgroundColor: scoreRating.color
                            }}
                          ></div>
                        </div>
                        <div className="breakdown-detail">{healthScore.emergencyFund.value.toFixed(1)} months saved</div>
                      </div>
                    </div>

                    <div className="improvement-tips">
                      <h3>How to Improve</h3>
                      {improvementTips.map((tip, idx) => (
                        <div key={idx} className="tip-item">
                          <span className="tip-bullet">•</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="no-score">
                    <p>Enter your financial information to see your health score</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Debt Payoff Calculator Modal */}
        {showCalculator && (
          <div className="modal-overlay" onClick={() => setShowCalculator(false)}>
            <div className="modal-content modal-content-mega" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowCalculator(false)}>
                <X size={24} />
              </button>

              <div className="calculator-card">
                <div className="calculator-header">
                  <Calculator size={24} />
                  <h2>Debt Payoff Calculator</h2>
                </div>

                <div className="debts-list">
                  <div className="debts-list-header">
                    <h3>Your Debts</h3>
                    <button className="add-debt-btn" onClick={addDebt}>
                      <Plus size={16} />
                      Add Debt
                    </button>
                  </div>

                  {debtsList.map((debt, index) => (
                    <div key={debt.id} className="debt-row">
                      <div className="debt-row-number">{index + 1}</div>
                      <input
                        type="text"
                        placeholder="Name (e.g., Credit Card)"
                        value={debt.name}
                        onChange={(e) => updateDebt(debt.id, 'name', e.target.value)}
                        className="debt-input debt-name"
                      />
                      <div className="debt-input-group">
                        <span className="input-prefix">$</span>
                        <input
                          type="number"
                          placeholder="Balance"
                          value={debt.balance}
                          onChange={(e) => updateDebt(debt.id, 'balance', e.target.value)}
                          className="debt-input"
                        />
                      </div>
                      <div className="debt-input-group">
                        <input
                          type="number"
                          placeholder="Rate"
                          value={debt.interestRate}
                          onChange={(e) => updateDebt(debt.id, 'interestRate', e.target.value)}
                          className="debt-input"
                        />
                        <span className="input-suffix">%</span>
                      </div>
                      <div className="debt-input-group">
                        <span className="input-prefix">$</span>
                        <input
                          type="number"
                          placeholder="Min Payment"
                          value={debt.minPayment}
                          onChange={(e) => updateDebt(debt.id, 'minPayment', e.target.value)}
                          className="debt-input"
                        />
                      </div>
                      <button 
                        className="remove-debt-btn"
                        onClick={() => removeDebt(debt.id)}
                        disabled={debtsList.length === 1}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                {payoffResults && (
                  <>
                    <div className="extra-payment-section-single">
                      <label>Extra Monthly Payment (Applied to Target Debt)</label>
                      <div className="debt-input-group">
                        <span className="input-prefix">$</span>
                        <input
                          type="number"
                          value={extraPayment}
                          onChange={(e) => setExtraPayment(e.target.value)}
                          className="debt-input"
                          placeholder="1000"
                        />
                      </div>
                    </div>

                    <div className="total-summary">
                      <div className="summary-item">
                        <span className="summary-label">Total Debt:</span>
                        <span className="summary-value">${payoffResults.totalDebt.toFixed(2)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Total Min Payment:</span>
                        <span className="summary-value">${payoffResults.totalMinPayment.toFixed(2)}/mo</span>
                      </div>
                    </div>

                    <div className="strategies-grid-three">
                      <div className="strategy-card-full strategy-avalanche">
                        <div className="strategy-badge">💰 Best for Savings</div>
                        <h3>Debt Avalanche</h3>
                        <p className="strategy-desc">Highest interest rate first</p>
                        
                        <div className="strategy-main">
                          <div className="strategy-time">
                            {payoffResults.scenarios[0].avalanche.years > 0 && `${payoffResults.scenarios[0].avalanche.years} year${payoffResults.scenarios[0].avalanche.years > 1 ? 's' : ''}`}
                            {payoffResults.scenarios[0].avalanche.years > 0 && payoffResults.scenarios[0].avalanche.remainingMonths > 0 && ', '}
                            {payoffResults.scenarios[0].avalanche.remainingMonths > 0 && `${payoffResults.scenarios[0].avalanche.remainingMonths} month${payoffResults.scenarios[0].avalanche.remainingMonths > 1 ? 's' : ''}`}
                          </div>
                        </div>

                        <div className="strategy-details">
                          <div className="strategy-row">
                            <span>Monthly Payment:</span>
                            <span>${payoffResults.scenarios[0].avalanche.monthlyPayment.toFixed(2)}</span>
                          </div>
                          <div className="strategy-row">
                            <span>Total Paid:</span>
                            <span>${payoffResults.scenarios[0].avalanche.totalPaid.toFixed(2)}</span>
                          </div>
                          <div className="strategy-row highlight">
                            <span>Total Interest:</span>
                            <span>${payoffResults.scenarios[0].avalanche.totalInterest.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="timeline-chart">
                          <div className="timeline-fill timeline-avalanche" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      <div className="strategy-card-full strategy-snowball">
                        <div className="strategy-badge">🎯 Best for Motivation</div>
                        <h3>Debt Snowball</h3>
                        <p className="strategy-desc">Smallest balance first</p>
                        
                        <div className="strategy-main">
                          <div className="strategy-time">
                            {payoffResults.scenarios[0].snowball.years > 0 && `${payoffResults.scenarios[0].snowball.years} year${payoffResults.scenarios[0].snowball.years > 1 ? 's' : ''}`}
                            {payoffResults.scenarios[0].snowball.years > 0 && payoffResults.scenarios[0].snowball.remainingMonths > 0 && ', '}
                            {payoffResults.scenarios[0].snowball.remainingMonths > 0 && `${payoffResults.scenarios[0].snowball.remainingMonths} month${payoffResults.scenarios[0].snowball.remainingMonths > 1 ? 's' : ''}`}
                          </div>
                        </div>

                        <div className="strategy-details">
                          <div className="strategy-row">
                            <span>Monthly Payment:</span>
                            <span>${payoffResults.scenarios[0].snowball.monthlyPayment.toFixed(2)}</span>
                          </div>
                          <div className="strategy-row">
                            <span>Total Paid:</span>
                            <span>${payoffResults.scenarios[0].snowball.totalPaid.toFixed(2)}</span>
                          </div>
                          <div className="strategy-row highlight">
                            <span>Total Interest:</span>
                            <span>${payoffResults.scenarios[0].snowball.totalInterest.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="timeline-chart">
                          <div 
                            className="timeline-fill timeline-snowball" 
                            style={{ 
                              width: `${(payoffResults.scenarios[0].snowball.months / Math.max(payoffResults.scenarios[0].avalanche.months, payoffResults.scenarios[0].snowball.months)) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="strategy-card-full strategy-recommended">
                        <div className="strategy-badge">💡 Recommended</div>
                        <h3>Smart Payment Plan</h3>
                        <p className="strategy-desc">Recommended extra payment of ${payoffResults.recommendedExtra}/mo</p>
                        
                        <div className="strategy-main">
                          <div className="strategy-time">
                            {payoffResults.recommended.avalanche.years > 0 && `${payoffResults.recommended.avalanche.years} year${payoffResults.recommended.avalanche.years > 1 ? 's' : ''}`}
                            {payoffResults.recommended.avalanche.years > 0 && payoffResults.recommended.avalanche.remainingMonths > 0 && ', '}
                            {payoffResults.recommended.avalanche.remainingMonths > 0 && `${payoffResults.recommended.avalanche.remainingMonths} month${payoffResults.recommended.avalanche.remainingMonths > 1 ? 's' : ''}`}
                          </div>
                        </div>

                        <div className="strategy-details">
                          <div className="strategy-row">
                            <span>Monthly Payment:</span>
                            <span>${payoffResults.recommended.avalanche.monthlyPayment.toFixed(2)}</span>
                          </div>
                          <div className="strategy-row">
                            <span>Total Paid:</span>
                            <span>${payoffResults.recommended.avalanche.totalPaid.toFixed(2)}</span>
                          </div>
                          <div className="strategy-row highlight">
                            <span>Total Interest:</span>
                            <span>${payoffResults.recommended.avalanche.totalInterest.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="timeline-chart">
                          <div 
                            className="timeline-fill timeline-recommended" 
                            style={{ 
                              width: `${(payoffResults.recommended.avalanche.months / Math.max(payoffResults.scenarios[0].avalanche.months, payoffResults.recommended.avalanche.months)) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!payoffResults && (
                  <div className="calculator-prompt">
                    Add your debts above to see payoff strategies
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Dark Mode Toggle on Landing Page */}
      <button 
        className="dark-mode-toggle"
        onClick={toggleDarkMode}
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="form-container-centered">
        <div className="header">
          <div className="icon-circle">
            <TrendingUp size={40} />
          </div>
          <h1>SmartMoney</h1>
          <p className="subtitle">Get personalized advice to save money and achieve your financial goals</p>
          <div className="status-badge">
            <Sparkles size={14} />
            Powered by AI
          </div>
        </div>

        <div className="section-header">
          <PiggyBank size={20} />
          Your Financial Information
        </div>

        <div className="form-group">
          <label className="form-label">Monthly Income</label>
          <div className="input-wrapper">
            <span className="dollar-sign">$</span>
            <input
              type="number"
              name="monthlyIncome"
              value={financialData.monthlyIncome}
              onChange={handleFinancialDataChange}
              placeholder="5000"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Monthly Expenses</label>
          <div className="input-wrapper">
            <span className="dollar-sign">$</span>
            <input
              type="number"
              name="monthlyExpenses"
              value={financialData.monthlyExpenses}
              onChange={handleFinancialDataChange}
              placeholder="3500"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Current Savings</label>
          <div className="input-wrapper">
            <span className="dollar-sign">$</span>
            <input
              type="number"
              name="savings"
              value={financialData.savings}
              onChange={handleFinancialDataChange}
              placeholder="10000"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Outstanding Debts</label>
          <div className="input-wrapper">
            <span className="dollar-sign">$</span>
            <input
              type="number"
              name="debts"
              value={financialData.debts}
              onChange={handleFinancialDataChange}
              placeholder="5000"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Financial Goals</label>
          <textarea
            name="goals"
            value={financialData.goals}
            onChange={handleFinancialDataChange}
            placeholder="E.g., Save for a house down payment, pay off credit card debt, build emergency fund..."
            rows="3"
          />
        </div>

        <button className="submit-btn" onClick={startChat}>
          Start Getting Financial Advice
        </button>

        <div className="disclaimer-inline">
          This is for educational purposes. Always consult with a licensed financial advisor for important decisions.
        </div>
      </div>
    </div>
  );
}