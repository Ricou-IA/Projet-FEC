import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Loader2, Sparkles, AlertTriangle, FileText, X, Settings, Key } from 'lucide-react';
import { AIService } from '../services/aiService';

const AgentPanel = ({ context }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoAnalysisDone, setAutoAnalysisDone] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Vérifier si une clé API est configurée au chargement
  useEffect(() => {
    const savedKey = AIService.getApiKey();
    if (savedKey) {
      setApiKeySaved(true);
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  // Analyse automatique au chargement si données disponibles et clé API configurée
  useEffect(() => {
    if (context.parseResult && !autoAnalysisDone && context.sig && AIService.getApiKey()) {
      performAutoAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.parseResult, context.sig, apiKeySaved]);

  const performAutoAnalysis = async () => {
    setLoading(true);
    setAutoAnalysisDone(true);
    
    try {
      const analysis = await AIService.analyzeFECData(context);
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: analysis,
        type: 'auto-analysis',
        timestamp: new Date()
      }]);
    } catch (error) {
      let errorMessage = `❌ Erreur lors de l'analyse automatique : ${error.message}`;
      
      // Message d'aide si la clé API n'est pas configurée
      if (error.message.includes('Clé API') && error.message.includes('non configurée')) {
        errorMessage += `\n\n📋 **Instructions :**\n`;
        errorMessage += `1. Obtenez votre clé API sur https://openrouter.ai/keys\n`;
        errorMessage += `2. Saisissez votre clé API OpenRouter dans les paramètres ci-dessus\n`;
        errorMessage += `3. La clé est stockée localement dans votre navigateur`;
      }
      
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: errorMessage,
        type: 'error',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await AIService.answerQuestion(input, context);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ Erreur : ${error.message}\n\nVérifiez votre connexion internet et votre clé API OpenRouter.`,
        type: 'error',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    if (loading) return;
    
    setLoading(true);
    try {
      let response;
      let actionName;
      
      switch (action) {
        case 'anomalies':
          actionName = 'Détection d\'anomalies';
          response = await AIService.detectAnomalies(context);
          break;
        case 'report':
          actionName = 'Rapport complet';
          response = await AIService.generateReport(context);
          break;
        case 'reanalyze':
          actionName = 'Analyse automatique';
          response = await AIService.analyzeFECData(context);
          break;
        default:
          return;
      }
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: response,
        type: action,
        actionName,
        timestamp: new Date()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `❌ Erreur lors de ${action === 'anomalies' ? 'la détection d\'anomalies' : 'la génération du rapport'} : ${error.message}`,
        type: 'error',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setAutoAnalysisDone(false);
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      AIService.setApiKey(apiKey);
      setApiKeySaved(true);
      setShowApiKeyInput(false);
      setApiKey('');
      // Relancer l'analyse automatique si des données sont disponibles
      if (context.parseResult && context.sig) {
        setAutoAnalysisDone(false);
        performAutoAnalysis();
      }
    }
  };

  const handleRemoveApiKey = () => {
    AIService.clearApiKey();
    setApiKeySaved(false);
    setShowApiKeyInput(true);
    setMessages([]);
    setAutoAnalysisDone(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-indigo-600" size={24} />
          <h3 className="text-lg font-bold text-gray-800">Assistant IA Comptable</h3>
        </div>
        <div className="flex items-center gap-2">
          {apiKeySaved && (
            <button
              onClick={handleRemoveApiKey}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
              title="Supprimer la clé API"
            >
              <Key size={14} className="inline mr-1" />
              Clé configurée
            </button>
          )}
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Paramètres API"
          >
            <Settings size={18} />
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Effacer l'historique"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Configuration de la clé API */}
      {showApiKeyInput && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Key className="text-yellow-600" size={18} />
            <h4 className="font-semibold text-yellow-900">Configuration de la clé API OpenRouter</h4>
          </div>
          <p className="text-xs text-yellow-700 mb-3">
            Pour utiliser l'assistant IA, vous devez saisir votre clé API OpenRouter. 
            La clé est stockée localement dans votre navigateur et n'est jamais transmise à nos serveurs.
            <br />
            <span className="text-yellow-600">Obtenez votre clé sur <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">openrouter.ai/keys</a></span>
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="flex-1 px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-mono text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleSaveApiKey()}
            />
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim()}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              Enregistrer
            </button>
          </div>
          <p className="text-xs text-yellow-600 mt-2">
            💡 Vous pouvez obtenir une clé API sur <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">openrouter.ai/keys</a>
          </p>
        </div>
      )}

      {/* Actions rapides */}
      {apiKeySaved && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => handleQuickAction('reanalyze')}
            disabled={loading || !context.parseResult}
            className="px-3 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
          >
            <Sparkles size={14} />
            Analyser
          </button>
          <button
            onClick={() => handleQuickAction('anomalies')}
            disabled={loading || !context.parseResult}
            className="px-3 py-1.5 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
          >
            <AlertTriangle size={14} />
            Anomalies
          </button>
          <button
            onClick={() => handleQuickAction('report')}
            disabled={loading || !context.parseResult}
            className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
          >
            <FileText size={14} />
            Rapport
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[300px] max-h-[500px] pr-2">
        {!apiKeySaved && messages.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            <Key size={48} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium mb-2">Clé API requise</p>
            <p className="text-xs text-gray-400">Saisissez votre clé API OpenRouter ci-dessus pour commencer</p>
          </div>
        )}
        {apiKeySaved && messages.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            <Bot size={48} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm">L'analyse automatique se lancera une fois les données chargées</p>
            <p className="text-xs text-gray-400 mt-2">Ou posez une question sur vos données comptables</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Bot size={18} className="text-indigo-600" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : msg.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : msg.type === 'auto-analysis'
                  ? 'bg-green-50 text-gray-800 border border-green-200'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.actionName && (
                <div className="text-xs font-semibold mb-2 text-gray-600 border-b border-gray-200 pb-1">
                  {msg.actionName}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Bot size={18} className="text-indigo-600" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="animate-spin text-indigo-600" size={18} />
              <span className="text-sm text-gray-600">Analyse en cours...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {apiKeySaved && (
        <div className="flex gap-2 border-t border-gray-200 pt-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Posez une question sur vos données comptables..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            title="Envoyer (Entrée)"
          >
            <Send size={18} />
          </button>
        </div>
      )}

      {/* Info */}
      {apiKeySaved && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          Powered by OpenRouter AI
        </div>
      )}
    </div>
  );
};

export default AgentPanel;

