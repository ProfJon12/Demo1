import React, { useState, useRef, useEffect } from 'react';
import { Message, ExportFormat } from '../../types';
import { Send, Paperclip, Bot, User, Trash2, X } from 'lucide-react';
import { useChats } from '../../hooks/useChats';
import Header from '../Layout/Header';
import FileUploadOverlay from '../Files/FileUploadOverlay';
import DeleteChatModal from './DeleteChatModal';
import ChatSettings from './ChatSettings';

const ChatInterface = () => {
  // --- KORREKTUR: updateChatTitle aus dem Hook importiert ---
  const { currentChat, addMessageToCurrentChat, deleteChat, updateChatTitle } = useChats();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showUploadOverlay, setShowUploadOverlay] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  
  // --- KORREKTUR: Neue States für die Titelbearbeitung ---
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState(currentChat?.title || '');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = currentChat?.messages || [];

  // --- KORREKTUR: useEffect zum Synchronisieren des Titels ---
  useEffect(() => {
    if (currentChat) {
      setNewChatTitle(currentChat.title);
    }
  }, [currentChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const generateBotResponse = (userMessage: string, systemPrompt?: string, hasFiles?: boolean) => {
    let response = '';
    
    if (systemPrompt) {
      response = `Basierend auf dem System-Prompt "${systemPrompt.substring(0, 50)}..." und `;
    } else {
      response = 'Basierend auf ';
    }
    
    if (hasFiles) {
      response += 'den hochgeladenen Dateien kann ich Ihnen folgende Antwort geben: ';
    } else {
      response += 'meinem allgemeinen Wissen kann ich Ihnen folgende Antwort geben: ';
    }
    
    response += `Das ist eine beispielhafte Antwort auf "${userMessage}". In einer echten Implementierung würde hier die KI-Antwort stehen.`;
    
    return response;
  };

  const handleSend = async () => {
    if (!inputText.trim() || !currentChat) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    addMessageToCurrentChat(userMessage);
    setInputText('');
    setAttachedFiles([]);
    setIsTyping(true);

    setTimeout(() => {
      const botContent = generateBotResponse(
        inputText, 
        currentChat.systemPrompt,
        currentChat.files.length > 0 || attachedFiles.length > 0
      );
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: botContent,
        sender: 'bot',
        timestamp: new Date()
      };
      
      addMessageToCurrentChat(botResponse);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  // --- KORREKTUR: Neue Funktion zum Speichern des Titels ---
  const handleTitleSave = () => {
    if (currentChat && newChatTitle.trim() !== '' && newChatTitle.trim() !== currentChat.title) {
      updateChatTitle(currentChat.id, newChatTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
    e.target.value = '';
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleExport = (format: ExportFormat) => {
    if (!currentChat) return;
    const data = messages.map(msg => ({ sender: msg.sender, content: msg.content, timestamp: msg.timestamp.toISOString() }));
    let content = '';
    let mimeType = '';
    let filename = '';

    switch (format) {
      case 'json': content = JSON.stringify(data, null, 2); mimeType = 'application/json'; filename = 'chat-export.json'; break;
      case 'txt': content = data.map(msg => `[${msg.timestamp}] ${msg.sender === 'user' ? 'Sie' : 'Bot'}: ${msg.content}`).join('\n\n'); mimeType = 'text/plain'; filename = 'chat-export.txt'; break;
      case 'pdf': alert('PDF-Export würde hier implementiert werden'); return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteChat = () => {
    if (currentChat) {
      deleteChat(currentChat.id);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.overflowY = 'hidden';
    const style = window.getComputedStyle(textarea);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);
    const lineHeight = parseFloat(style.lineHeight);
    const maxHeightFor8Lines = (8 * lineHeight) + paddingTop + paddingBottom;
    const currentScrollHeight = textarea.scrollHeight;

    if (currentScrollHeight > maxHeightFor8Lines) {
      textarea.style.height = `${maxHeightFor8Lines}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${currentScrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText]);

  if (!currentChat) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Kein Chat ausgewählt
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Wählen Sie einen Chat aus der Seitenleiste oder erstellen Sie einen neuen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* --- KORREKTUR: Bedingtes Rendern für den Titel --- */}
            {isEditingTitle ? (
              <input
                type="text"
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleTitleSave();
                  }
                }}
                className="text-xl font-semibold bg-transparent border-b border-blue-500 focus:outline-none focus:border-blue-700 text-gray-900 dark:text-white"
                autoFocus
              />
            ) : (
              <h2
                className="text-xl font-semibold text-gray-900 dark:text-white cursor-pointer"
                onClick={() => setIsEditingTitle(true)}
              >
                {currentChat.title}
              </h2>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Chat löschen"
              title="Chat löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <Header
            onExport={handleExport}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>
      </div>

      {/* Chat Info Bar */}
      {(currentChat.systemPrompt || currentChat.files.length > 0) && (
        <div className="px-6 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-center text-sm text-blue-700 dark:text-blue-300">
            {currentChat.systemPrompt && (<span>System-Prompt aktiv</span>)}
            {currentChat.systemPrompt && currentChat.files.length > 0 && (<span className="mx-2">•</span>)}
            {currentChat.files.length > 0 && (<span>{currentChat.files.length} Datei{currentChat.files.length !== 1 ? 'en' : ''} hochgeladen</span>)}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex space-x-3 max-w-3xl ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.sender === 'user' ? 'bg-blue-600' : 'bg-gradient-to-r from-purple-600 to-blue-600'}`}>
                {message.sender === 'user' ? (<User className="w-4 h-4 text-white" />) : (<Bot className="w-4 h-4 text-white" />)}
              </div>
              <div className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl max-w-full ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-gray-200 dark:border-gray-700 p-6">
        {attachedFiles.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div key={index} className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600">
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-32 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">({formatFileSize(file.size)})</span>
                  <button onClick={() => removeAttachedFile(index)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" title="Datei entfernen">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors" title="Datei anhängen">
              <Paperclip className="w-5 h-5" />
            </button>
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="*/*" />
          </div>
          <div className="flex-1 relative">
           <textarea ref={textareaRef} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={handleKeyPress} placeholder="Nachricht eingeben..." className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none min-h-[48px] transition-all duration-200 custom-scrollbar" rows={1} />
          </div>
          <button onClick={handleSend} disabled={!inputText.trim() || isTyping} className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl transition-colors disabled:cursor-not-allowed">
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Drücken Sie Enter zum Senden, Shift + Enter für eine neue Zeile</p>
      </div>

      {showUploadOverlay && (<FileUploadOverlay onClose={() => setShowUploadOverlay(false)} onUpload={(files) => { console.log('Files uploaded:', files); setShowUploadOverlay(false); }} />)}
      <DeleteChatModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteChat} chatTitle={currentChat.title} />
      <ChatSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default ChatInterface;
