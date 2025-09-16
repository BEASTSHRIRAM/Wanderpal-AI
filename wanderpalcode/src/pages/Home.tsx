import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Brain, Shield, Users, Clock, Award } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';

const Home = () => {
  const navigate = useNavigate();

  // Redirect to sign in if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('token'); // Change key if needed
    if (!token) {
      navigate('/signin');
    }
  }, [navigate]);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Recommendations",
      description: "Our intelligent agents analyze thousands of options to find your perfect match"
    },
    {
      icon: Sparkles,
      title: "Hyper-Personalized",
      description: "Every recommendation is tailored specifically to your preferences and travel style"
    },
    {
      icon: Shield,
      title: "Safety & Review Analysis",
      description: "Advanced algorithms evaluate safety ratings and authentic guest reviews"
    },
    {
      icon: Clock,
      title: "Instant Results",
      description: "Get premium hotel recommendations in seconds, not hours of searching"
    },
    {
      icon: Award,
      title: "Best Price Guarantee",
      description: "Our pricing agents ensure you get the best deals available"
    },
    {
      icon: Users,
      title: "Group Optimization",
      description: "Perfect matches for solo travelers, couples, families, and business trips"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Luxury hotel interior" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto animate-fade-in-up">
          <Badge variant="secondary" className="mb-6 px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            AI-Powered Travel Intelligence
          </Badge>
          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Wanderpal
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Discover perfect hotels with our hyper-personalized AI travel advisor. 
            Get premium recommendations tailored just for you in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button size="lg" className="btn-gradient text-lg px-8 py-4" onClick={() => navigate('/chat')}>
              Plan a Trip
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Join thousands of travelers who trust our AI recommendations
          </div>
        </div>
      </section>
      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-4">
              Why Choose <span className="bg-gradient-hero bg-clip-text text-transparent">Wanderpal</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of travel planning with our cutting-edge AI technology
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="card-premium animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="mb-4">
                    <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
