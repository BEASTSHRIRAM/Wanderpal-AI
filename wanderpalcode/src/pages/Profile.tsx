import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin,  
  Camera,
  Save,
  Edit3
} from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
    }
  }, [navigate]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    notifications: {
      deals: true,
      recommendations: true,
      bookingUpdates: true,
      marketing: false,
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }
    fetchUserData();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Decode JWT to get user email
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userEmail = payload.sub;

      const response = await fetch(`http://localhost:8000/profile/${userEmail}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/signin');
          return;
        }
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      setFormData({
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        location: userData.location || '',
        notifications: userData.notifications || {
          deals: true,
          recommendations: true,
          bookingUpdates: true,
          marketing: false,
        }
      });
    } catch (error) {
      setError('Failed to load profile data');
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

// For future functionalities
  const handleNotificationChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Decode JWT to get user email
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userEmail = payload.sub;

      const response = await fetch(`http://localhost:8000/profile/${userEmail}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          email: formData.email,
          location: formData.location // This will still save the settings, even if UI is hidden
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setIsEditing(false);
      setError(null);
    } catch (error) {
      setError('Failed to save changes');
      console.error('Error updating profile:', error);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">
            Your <span className="bg-gradient-hero bg-clip-text text-transparent">Profile</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-100 text-red-700 border border-red-300 shadow-sm animate-fade-in text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
              {error}
            </span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="card-premium animate-scale-in">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                      <AvatarFallback className="bg-gradient-hero text-white text-2xl">
                        {formData.firstName && formData.lastName ? `${formData.firstName[0]}${formData.lastName[0]}` : <User />}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-1">
                    {formData.firstName} {formData.lastName}
                  </h3>
                  <p className="text-muted-foreground mb-4">{formData.email}</p>

                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="card-premium animate-scale-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </div>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={isEditing ? handleSave : () => setIsEditing(true)}
                  className={isEditing ? "btn-gradient" : ""}
                >
                  {isEditing ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      disabled={!isEditing}
                      className="input-focus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      disabled={!isEditing}
                      className="input-focus"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing} 
                      className="pl-10 input-focus"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!isEditing}
                      className="pl-10 input-focus"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      disabled={!isEditing}
                      className="pl-10 input-focus"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive animate-scale-in" 
              style={{ animationDelay: '0.2s' }}
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('lastActiveChatId'); // Also clear the last active chat on sign out
                navigate('/');
              }}
            >
              <User className="h-4 w-4 mr-2" />
              Sign out
            </Button>
            
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default Profile;