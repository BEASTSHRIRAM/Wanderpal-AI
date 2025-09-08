
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const SignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Please ensure both passwords match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          email: email,
          password: password
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.detail === 'User with this email already exists') {
          setError('An account with this email already exists.');
        } else {
          setError(errorData.detail || 'Unable to create account.');
        }
        setIsLoading(false);
        return;
      }

      // Store JWT token in localStorage
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        navigate('/home');
      } else {
        setError('Sign up failed: No token received.');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
            Wanderpal
          </h1>
          <p className="text-muted-foreground">Start your personalized travel journey</p>
        </div>

        <Card className="card-premium">
          <div className="mb-2">
            <a
              href="http://localhost:8080/"
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-glow transition-colors font-medium px-2 py-1 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </a>
          </div>
          {error && (
            <div className="flex items-center justify-center mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-100 text-red-700 border border-red-300 shadow-sm animate-fade-in text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                {error}
              </span>
            </div>
          )}
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Create your account to get personalized hotel recommendations
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-focus"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-focus"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 555 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-focus"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-focus"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-focus"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-focus"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="Location">Location</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="Mumbai, MA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-focus"
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full btn-gradient" 
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  to="/signin" 
                  className="text-primary hover:text-primary-glow transition-colors font-medium"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;