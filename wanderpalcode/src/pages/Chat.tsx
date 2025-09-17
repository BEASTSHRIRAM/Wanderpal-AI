import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  MapPin, 
  DollarSign, 
  Star, 
  Shield,
  Loader2,
  ExternalLink,
  MessageSquarePlus,
  MessageSquare
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  agents?: AgentWorkflow[];
  hotelCards?: HotelCard[];
}

interface AgentWorkflow {
  name: string;
  icon: React.ElementType;
  status: 'working' | 'complete' | 'pending';
  description: string;
}

interface HotelCard {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: number;
  location: string;
  features: string[];
  whyChosen: string;
  bookingLink: string;
}
interface Conversation {
  id: string;
  title: string;
  created_at: string;
}
const DEFAULT_WELCOME_MESSAGE: Message = {
  id: '1',
  type: 'ai',
  content: "Hi! I'm your AI travel advisor. I can help you find the perfect hotels, plan your trips, and answer any travel questions. What can I help you with today?",
  timestamp: new Date(),
};
const Chat = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Don't auto-redirect - allow anonymous chat if backend allows it
      // navigate('/signin');
    }
  }, [navigate]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AI travel advisor. I can help you find the perfect hotels, plan your trips, and answer any travel questions. What can I help you with today?",
      timestamp: new Date(),
    }
  ]);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
// This automatically loads the last active chat ID from the browser's storage
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    () => localStorage.getItem("lastActiveChatId")
  );
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem("lastActiveChatId", currentConversationId);
    } else {
      // If the user clicks "New Chat" (so the ID becomes null), remove it from storage.
      localStorage.removeItem("lastActiveChatId");
    }
  }, [currentConversationId]);

  const agents: AgentWorkflow[] = [
    {
      name: 'Search Agent',
      icon: MapPin,
      status: 'pending',
      description: 'Finding hotels in your destination'
    },
    {
      name: 'Pricing Agent',
      icon: DollarSign,
      status: 'pending',
      description: 'Comparing prices and deals'
    },
    {
      name: 'Ranking Agent',
      icon: Star,
      status: 'pending',
      description: 'Analyzing ratings and reviews'
    },
    {
      name: 'Safety Agent',
      icon: Shield,
      status: 'pending',
      description: 'Checking safety and security'
    }
  ];

  const sampleHotels: HotelCard[] = [
    {
      id: '1',
      name: 'The Grand Plaza Hotel',
      image: '/placeholder.svg',
      rating: 4.8,
      price: 289,
      location: 'Downtown Paris',
      features: ['Pool', 'Spa', 'Free WiFi', 'Restaurant'],
      whyChosen: 'Perfect location near Eiffel Tower with exceptional reviews for cleanliness and service.',
      bookingLink: '#'
    },
    {
      id: '2',
      name: 'Boutique Charm Suites',
      image: '/placeholder.svg',
      rating: 4.6,
      price: 195,
      location: 'Marais District',
      features: ['Free Breakfast', 'Balcony', 'Pet Friendly'],
      whyChosen: 'Authentic Parisian experience in historic neighborhood with great value for money.',
      bookingLink: '#'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  // This hook runs once when the component first loads

  useEffect(() => {
    // Only scroll if we are not loading. This stops the page from jumping
    // while the user is trying to read the newly loaded history.
    if (!isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]); // Dependency array updated

// function to fetch the list of conversations for the sidebar
  const fetchConversations = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // Not logged in, can't fetch convos

    try {
      // Calls your new GET /conversations endpoint
      const response = await fetch('http://localhost:8000/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        console.error('Could not fetch conversations');
        return;
      }
      const data = await response.json();
      setConversations(data.conversations || []); // Saves the list to our new state
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  }, []); // useCallback ensures this function doesn't change on every render

  // This effect runs ONCE when the page loads to populate the sidebar
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchConversations();
    }
  }, [fetchConversations]); // Runs once on mount

  useEffect(() => {
    const fetchHistory = async (convoId: string) => {
      const token = localStorage.getItem('token');
      if (!token) return;

      setIsLoading(true); // Show loader while fetching this chat's history
      try {
        // Calls your new GET /chat/history/{id} endpoint
        const response = await fetch(`http://localhost:8000/chat/history/${convoId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          console.error('Could not fetch chat history');
          setMessages([DEFAULT_WELCOME_MESSAGE]); // Reset to default on error
          return;
        }

        const data = await response.json();
        if (data.history && data.history.length > 0) {
          // Format the DB data into the React Message interface
          const loadedMessages: Message[] = data.history.map((msg: any) => ({
            id: msg.id,
            type: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(loadedMessages); // Load the messages into the window
        } else {
          // This chat is empty, just show the welcome message
          setMessages([DEFAULT_WELCOME_MESSAGE]);
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentConversationId) {
      // If user clicked a real conversation, fetch its history
      fetchHistory(currentConversationId);
    } else {
      // If user clicked "New Chat" (so the ID is null), just reset the messages
      setMessages([DEFAULT_WELCOME_MESSAGE]);
    }
  }, [currentConversationId]); // This is the key: it re-runs ANY time currentConversationId changes

  const simulateAgentWorkflow = async () => {
    const workflowAgents = [...agents];
    
    for (let i = 0; i < workflowAgents.length; i++) {
      workflowAgents[i].status = 'working';
      
      // Update the last message with current agent workflow
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.type === 'ai' && lastMessage.agents) {
          lastMessage.agents = [...workflowAgents];
        }
        return newMessages;
      });

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      workflowAgents[i].status = 'complete';
    }

    // Final update with hotels
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage.type === 'ai') {
        lastMessage.agents = workflowAgents;
        lastMessage.hotelCards = sampleHotels;
        lastMessage.content = "Great! I found some excellent hotels for you in Paris. Here are my top recommendations based on your preferences:";
      }
      return newMessages;
    });

    setIsLoading(false);
  };
    const pollForResult = (taskId: string, token: string | null) => {
    const intervalId = setInterval(async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`http://localhost:8000/chat/result/${taskId}`, {
          method: 'GET',
          headers: headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch task status: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status === 'done') {
          // --- TASK IS COMPLETE ---
          clearInterval(intervalId); // Stop polling
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: data.result,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);
          setIsLoading(false);

        } else if (data.status === 'error') {
          // --- TASK FAILED ---
          clearInterval(intervalId); // Stop polling
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: `I'm sorry, I encountered an error: ${data.error}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);

        } 
        // If status is "pending", do nothing and let the interval run again.

      } catch (err) {
        console.error('Polling error:', err);
        clearInterval(intervalId); // Stop polling on any network error
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `I'm sorry, I lost connection: ${err instanceof Error ? err.message : 'Unknown error'}.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
      }
    }, 3000); // Poll every 3 seconds
  };

// Message handler
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    
    // If this is the *first* message (content is just the default), replace it. Otherwise, add to it.
    setMessages(prev => 
      prev.length === 1 && prev[0].id === '1' ? [userMessage] : [...prev, userMessage]
    );

    const messageText = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Send the request to /chat/async, passing the CURRENT conversation ID
      //    (On the first message, this will correctly be 'null')
      const asyncResponse = await fetch('http://localhost:8000/chat/async', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          message: messageText, 
          user_id: null, 
          conversation_id: currentConversationId // <-- Sends the current ID (or null)
        }),
      });

      if (!asyncResponse.ok) {
        const errorData = await asyncResponse.json();
        throw new Error(errorData.detail || `HTTP Error: ${asyncResponse.statusText}`);
      }

      // 2. Get BOTH the task_id AND the conversation_id back from the backend.
      const taskData = await asyncResponse.json();
      const { task_id, conversation_id: newConvoId } = taskData; // This is the ID the backend used (either the old one or a new one)

      if (!task_id || !newConvoId) {
        throw new Error('Failed to create an async task: Invalid response from server.');
      }
      
      // If the state was 'null' (a new chat), update the state to the NEW ID
      // that the backend just created.
      if (currentConversationId === null) {
        setCurrentConversationId(newConvoId); // <-- This saves the new ID to the state
        fetchConversations(); // <-- This refreshes the sidebar to show the new chat
      }

      // 4. Start polling for the result as normal.
      pollForResult(task_id, token);

    } catch (err) {
      console.error('Failed to start chat task:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I'm sorry, I couldn't start your request: ${err instanceof Error ? err.message : 'Unknown error'}.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const AgentWorkflowDisplay = ({ agents }: { agents: AgentWorkflow[] }) => (
    <div className="space-y-3 my-4">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        AI Agents Working...
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {agents.map((agent, index) => (
          <div
            key={agent.name}
            className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 ${
              agent.status === 'working'
                ? 'bg-primary/10 border-primary/30 animate-pulse'
                : agent.status === 'complete'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-muted/30 border-border'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              agent.status === 'working'
                ? 'bg-primary text-white animate-pulse'
                : agent.status === 'complete'
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground'
            }`}>
              <agent.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{agent.name}</p>
              <p className="text-xs text-muted-foreground">{agent.description}</p>
            </div>
            {agent.status === 'working' && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const HotelCardDisplay = ({ hotels }: { hotels: HotelCard[] }) => (
    <div className="space-y-4 my-4">
      {hotels.map((hotel) => (
        <Card key={hotel.id} className="card-premium animate-scale-in overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3">
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  className="w-full h-48 md:h-full object-cover"
                />
              </div>
              <div className="flex-1 p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{hotel.name}</h3>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">${hotel.price}</p>
                    <p className="text-sm text-muted-foreground">per night</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{hotel.rating}</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{hotel.location}</span>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {hotel.features.map((feature) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">{hotel.whyChosen}</p>
                
                <Button className="btn-gradient w-full md:w-auto">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Book Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

return (
    <div className="min-h-screen flex h-screen">
      
      {}
      <nav className="w-64 bg-card border-r border-border p-4 flex flex-col md:flex">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={() => setCurrentConversationId(null)} // Clicking "New Chat" just sets the ID to null
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>
        
        {/* List of Recent Chats */}
        <div className="mt-4 flex-1 overflow-y-auto">
          <p className="text-sm font-medium text-muted-foreground px-2 mb-2">Recent</p>
          <div className="space-y-1">
            {conversations.map((convo) => (
              <Button
                key={convo.id}
                variant={currentConversationId === convo.id ? "secondary" : "ghost"}
                className="w-full justify-start gap-2 truncate"
                onClick={() => setCurrentConversationId(convo.id)}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{convo.title}</span>
              </Button>
            ))}
          </div>
        </div>
      </nav>

      {}
      <main className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-16 z-40">
          <div className="max-w-4xl mx-auto px-4 py-4">
            {/* ... (Your existing Header JSX is unchanged) ... */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">AI Travel Advisor</h1>
                <p className="text-sm text-muted-foreground">Get personalized hotel recommendations</p>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 animate-fade-in ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.type === 'ai' && (
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-hero text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-2xl ${message.type === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`p-4 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-gradient-hero text-white ml-auto'
                        : 'bg-card border border-border'
                    }`}
                  >
                    <div className="prose prose-sm md:prose-base prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  
                  {message.agents && (
                    <AgentWorkflowDisplay agents={message.agents} />
                  )}
                  {message.hotelCards && (
                    <HotelCardDisplay hotels={message.hotelCards} />
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {message.type === 'user' && (
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-muted">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 justify-start animate-fade-in">
                 {}
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-hero text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card border border-border p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card/50 backdrop-blur-md sticky bottom-0">
          <div className="max-w-4xl mx-auto px-4 py-4">
             {}
            <div className="flex gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about hotels, destinations, or travel planning..."
                className="flex-1 input-focus"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="btn-gradient"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;