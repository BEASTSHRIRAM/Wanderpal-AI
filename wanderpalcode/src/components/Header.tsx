import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  X, 
  User, 
  MessageSquare, 
  Search, 
  BookOpen, 
  Settings,
  Sparkles,
  Home
} from 'lucide-react';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Home', href: '/home', icon: Home },
  // { name: 'Search Hotels', href: '/search', icon: Search },
    { name: 'AI Chat', href: '/chat', icon: MessageSquare },
    { name: 'My Trips', href: '/trips', icon: BookOpen },
    // { name: 'Profile', href: '/profile', icon: User },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/home" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                Wanderpal
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.slice(0, 4).map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  onClick={e => {
                    const token = localStorage.getItem('token');
                    if (!token) {
                      e.preventDefault();
                      navigate('/signin');
                    }
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>

            {/* User Profile & Mobile Menu */}
            <div className="flex items-center space-x-4">
              {/* User Profile Icon */}
              <Link
                to="/profile"
                className="hidden md:flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-all duration-200"
              >
                <Avatar className="h-8 w-8 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-200">
                  <AvatarFallback className="bg-gradient-hero text-white text-sm">
                    JD
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-muted-foreground">Profile</span>
              </Link>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={toggleMobileMenu}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={toggleMobileMenu} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-card border-l border-border animate-slide-in-right">
            <div className="flex flex-col p-6">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                    Wanderpal
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={toggleMobileMenu}>
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* User Profile Section */}
              <div className="flex items-center space-x-3 p-4 bg-gradient-card rounded-xl mb-6">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-hero text-white">
                    JD
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">John Doe</p>
                  <p className="text-sm text-muted-foreground">john@example.com</p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={toggleMobileMenu}
                    className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                    {isActive(item.href) && (
                      <Badge variant="secondary" className="ml-auto">
                        Active
                      </Badge>
                    )}
                  </Link>
                ))}
              </nav>

              {/* Settings Link */}
              <div className="mt-auto pt-6 border-t border-border">
                <Link
                  to="/settings"
                  onClick={toggleMobileMenu}
                  className="flex items-center space-x-3 p-4 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200"
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;