import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Users, Tag, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import {
  getConversations,
  getMessages,
  sendMessage,
  subscribeToConversation,
  subscribeToConversations,
  setTypingIndicator,
  clearTypingIndicator,
  markMessagesAsRead,
  markConversationAsRead,
  type ChatConversation,
  type ChatMessage,
  type TypingIndicator,
} from '../lib/realtime-chat-utils';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const priorityColors = {
  urgent: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  normal: 'bg-blue-100 text-blue-800 border-blue-300',
  low: 'bg-gray-100 text-gray-800 border-gray-300',
};

const priorityLabels = {
  urgent: 'Urgent',
  high: 'Haute',
  normal: 'Normale',
  low: 'Basse',
};

export default function RealtimeChat() {
  const { user, organizationId } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>();
  const conversationsChannelRef = useRef<any>();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [organizationId]);

  // Subscribe to conversations updates
  useEffect(() => {
    if (!organizationId) return;

    conversationsChannelRef.current = subscribeToConversations(
      organizationId,
      (updatedConversation) => {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === updatedConversation.id ? updatedConversation : conv
          )
        );
      }
    );

    return () => {
      conversationsChannelRef.current?.unsubscribe();
    };
  }, [organizationId]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markConversationAsRead(selectedConversation.id, 'staff');
    }
  }, [selectedConversation]);

  // Subscribe to selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    channelRef.current = subscribeToConversation(selectedConversation.id, {
      onMessage: (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();

        // Mark as read immediately
        markMessagesAsRead(selectedConversation.id, 'staff');

        // Show toast for new customer messages
        if (newMessage.sender_type === 'customer') {
          showToast(`Nouveau message de ${newMessage.sender_name}`, 'info');
        }
      },
      onTyping: (indicator) => {
        if (new Date(indicator.expires_at) > new Date()) {
          setTypingIndicators((prev) => {
            const filtered = prev.filter((t) => t.user_id !== indicator.user_id);
            return [...filtered, indicator];
          });
        } else {
          setTypingIndicators((prev) =>
            prev.filter((t) => t.user_id !== indicator.user_id)
          );
        }
      },
    });

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [selectedConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingIndicators((prev) =>
        prev.filter((t) => new Date(t.expires_at) > new Date())
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);
      const data = await getConversations(organizationId);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
      showToast('Erreur lors du chargement des conversations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      showToast('Erreur lors du chargement des messages', 'error');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim() || !selectedConversation || !user || isSending) return;

    try {
      setIsSending(true);

      await sendMessage({
        conversation_id: selectedConversation.id,
        sender_type: 'staff',
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || user.email || 'Staff',
        content: messageInput.trim(),
      });

      setMessageInput('');

      // Clear typing indicator
      if (user.id) {
        await clearTypingIndicator(
          selectedConversation.id,
          'staff',
          user.id
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Erreur lors de l\'envoi du message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = () => {
    if (!selectedConversation || !user) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing indicator
    setTypingIndicator(
      selectedConversation.id,
      'staff',
      user.id,
      user.user_metadata?.full_name || user.email || 'Staff'
    );

    // Clear after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      if (user.id) {
        clearTypingIndicator(selectedConversation.id, 'staff', user.id);
      }
    }, 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
      case 'archived':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Sidebar - Conversations List */}
      <div className="w-96 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-gray-900">Conversations</h2>
            </div>
            <span className="bg-primary text-white rounded-full px-3 py-1 text-sm font-medium">
              {conversations.filter((c) => c.unread_count_staff > 0).length}
            </span>
          </div>

          <div className="flex space-x-2">
            <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Toutes
            </button>
            <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100">
              Non lues
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Aucune conversation</p>
              <p className="text-sm text-gray-400 mt-1">
                Les nouvelles conversations apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 truncate">
                          {conversation.customer_name}
                        </span>
                        {conversation.unread_count_staff > 0 && (
                          <span className="bg-primary text-white rounded-full px-2 py-0.5 text-xs font-medium">
                            {conversation.unread_count_staff}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.customer_email}
                      </p>
                    </div>
                    {getStatusIcon(conversation.status)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                        priorityColors[conversation.priority]
                      }`}
                    >
                      {priorityLabels[conversation.priority]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>

                  {conversation.tags && conversation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {conversation.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                      {conversation.tags.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{conversation.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedConversation.customer_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.customer_email}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border ${
                      priorityColors[selectedConversation.priority]
                    }`}
                  >
                    {priorityLabels[selectedConversation.priority]}
                  </span>
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {selectedConversation.warranty_id && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Garantie:</span> {selectedConversation.warranty_id}
                </div>
              )}
              {selectedConversation.claim_id && (
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">Réclamation:</span> {selectedConversation.claim_id}
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_type === 'staff' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-md px-4 py-2 rounded-lg ${
                      message.sender_type === 'staff'
                        ? 'bg-primary text-white'
                        : message.sender_type === 'system'
                        ? 'bg-gray-200 text-gray-700 italic'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {message.sender_type !== 'system' && (
                      <div className="text-xs opacity-75 mb-1">
                        {message.sender_name}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <div className="text-xs opacity-75 mt-1">
                      {formatTime(message.created_at)}
                      {message.sender_type === 'staff' && (
                        <span className="ml-2">
                          {message.read_by_customer ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicators */}
              {typingIndicators
                .filter((t) => t.user_type === 'customer')
                .map((indicator) => (
                  <div key={indicator.user_id} className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {indicator.user_name} est en train d'écrire...
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Écrivez votre message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || isSending}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Envoyer</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sélectionnez une conversation
              </h3>
              <p className="text-gray-500">
                Choisissez une conversation dans la liste pour commencer à discuter
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
