import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  ExternalLink
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
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
<<<<<<< HEAD
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 600 seconds in milliseconds

      const response = await fetch('http://localhost:8000/api/langflow-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input_value: userMessage.content }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await response.json();
      const data = json.outputs?.[0]?.outputs?.[0]?.artifacts?.message;
      console.log(data);
      let aiText = '';
      if (typeof data === 'string') {
        aiText = data;
      } else if (data?.message) {
        aiText = data.message;
      } else if (data?.text) {
        aiText = data.text;
      } else if (data?.output) {
        aiText = data.output;
      } else if (data?.response) {
        aiText = data.response;
      } else if (data?.result) {
        aiText = data.result;
      } else if (typeof data === 'object') {
        aiText = Object.values(data).find(v => typeof v === 'string') || '';
      }
      if (!aiText) aiText = 'Sorry, I could not understand the response.';
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: 'Sorry, there was an error contacting the AI agent.',
        timestamp: new Date(),
      }]);
=======
      // Try with token if present, otherwise send anonymously
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Send message to backend
      let response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: messageText, user_id: null }),
      });

      // If we got 401 and we had sent a token, retry without auth (backend may accept anonymous)
      if (response.status === 401 && token) {
        console.info('Auth failed, retrying anonymously');
        const anonHeaders = { 'Content-Type': 'application/json' };
        response = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: anonHeaders,
          body: JSON.stringify({ message: messageText, user_id: null }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Create AI response message
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      // Create error response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I'm sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
>>>>>>> f4f0c70 (fixed chat functionality from backend anbd integrated langflow)
    } finally {
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
                  <p className="text-sm md:text-base whitespace-pre-wrap">{message.content}</p>
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
    </div>
  );
};

export default Chat;