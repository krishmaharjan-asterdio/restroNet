import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Loader } from 'lucide-react';
import api from '../services/api';

const QUICK_PROMPTS = [
  'Romantic dinner spots in Kathmandu',
  'Cozy cafe to work with good WiFi',
  'Best places for local momos under 500 NPR',
  'Luxury dining for family celebrations'
];

const ConciergeChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat window
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    if (!textToSend) {
      setInputValue('');
    }

    // Add user message to history
    const userMsg = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Send chat history and the new message to backend
      const response = await api.post('/chat', {
        message: text,
        history: messages
      });

      if (response.data.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: response.data.response }
        ]);
      }
    } catch (error) {
      console.error('Chat Concierge Error:', error);
      setMessages((prev) => [
        ...prev,
        { 
          role: 'model', 
          text: 'Forgive me, diner. I encountered an issue connecting to the kitchen. Please check your connection and try again.' 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-[380px] h-[550px] bg-card border border-border shadow-xl rounded-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-surface border-b border-border p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="text-primary" size={16} />
                </div>
                <div>
                  <h4 
                    className="text-md font-medium text-foreground leading-tight"
                    style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                  >
                    Maitre D' Concierge
                  </h4>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold font-mono">RestroNet AI</span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 hover:bg-border/30 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-background/50">
              {messages.length === 0 && (
                <div className="text-center py-6 px-4 space-y-4">
                  <p className="text-muted-foreground text-sm">
                    Welcome to RestroNet. I am your culinary concierge. How can I guide your dining journey in Kathmandu today?
                  </p>
                  
                  <div className="flex flex-col gap-2 pt-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-left">Suggested inquiries</span>
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(prompt)}
                        className="text-left text-xs bg-card hover:bg-surface border border-border py-2.5 px-4 rounded-xl text-muted-foreground hover:text-primary transition-all duration-200 shadow-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-card border border-border text-muted-foreground shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl p-3 text-sm text-muted-foreground shadow-sm flex items-center gap-2">
                    <Loader className="animate-spin text-primary" size={14} />
                    <span>Maitre D' is composing recommendations...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-border bg-card flex gap-2 items-center">
              <input
                type="text"
                placeholder="Ask about places, vibes, cuisines..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-grow h-10 px-3 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-foreground"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !inputValue.trim()}
                className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all duration-150"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-12 h-12 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg shadow-primary/20 transition-all duration-200"
      >
        {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
      </motion.button>
    </div>
  );
};

export default ConciergeChat;
