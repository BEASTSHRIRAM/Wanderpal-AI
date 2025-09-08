import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Star, 
  Bookmark, 
  Search, 
  Plus,
  ExternalLink,
  Trash2,
  Edit3,
  Heart
} from 'lucide-react';

interface Trip {
  id: string;
  name: string;
  destination: string;
  dates: string;
  guests: number;
  status: 'planned' | 'booked' | 'completed';
  hotels: SavedHotel[];
  createdAt: Date;
}

interface SavedHotel {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: number;
  location: string;
  features: string[];
  savedAt: Date;
  isBooked?: boolean;
}

const Trips = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
    }
  }, [navigate]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('trips');

  const trips: Trip[] = [
    {
      id: '1',
      name: 'Paris Getaway',
      destination: 'Paris, France',
      dates: 'Mar 15-20, 2024',
      guests: 2,
      status: 'planned',
      hotels: [
        {
          id: '1',
          name: 'The Grand Plaza Hotel',
          image: '/placeholder.svg',
          rating: 4.8,
          price: 289,
          location: 'Downtown Paris',
          features: ['Pool', 'Spa', 'Free WiFi'],
          savedAt: new Date(),
          isBooked: true
        },
        {
          id: '2',
          name: 'Boutique Charm Suites',
          image: '/placeholder.svg',
          rating: 4.6,
          price: 195,
          location: 'Marais District',
          features: ['Free Breakfast', 'Balcony'],
          savedAt: new Date()
        }
      ],
      createdAt: new Date('2024-02-01')
    },
    {
      id: '2',
      name: 'Tokyo Adventure',
      destination: 'Tokyo, Japan',
      dates: 'May 10-18, 2024',
      guests: 1,
      status: 'booked',
      hotels: [
        {
          id: '3',
          name: 'Modern Tokyo Tower Hotel',
          image: '/placeholder.svg',
          rating: 4.9,
          price: 320,
          location: 'Shibuya',
          features: ['City View', 'Restaurant', 'Gym'],
          savedAt: new Date(),
          isBooked: true
        }
      ],
      createdAt: new Date('2024-01-15')
    }
  ];

  const savedHotels: SavedHotel[] = [
    {
      id: '4',
      name: 'Luxury Beach Resort',
      image: '/placeholder.svg',
      rating: 4.7,
      price: 450,
      location: 'Maldives',
      features: ['Beach Access', 'All Inclusive', 'Spa'],
      savedAt: new Date('2024-02-10')
    },
    {
      id: '5',
      name: 'Mountain Lodge Retreat',
      image: '/placeholder.svg',
      rating: 4.5,
      price: 180,
      location: 'Swiss Alps',
      features: ['Ski Access', 'Fireplace', 'Mountain View'],
      savedAt: new Date('2024-02-05')
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'booked':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const filteredTrips = trips.filter(trip =>
    trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHotels = savedHotels.filter(hotel =>
    hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hotel.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">
            Your <span className="bg-gradient-hero bg-clip-text text-transparent">Trips</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your travel plans and saved hotels
          </p>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trips and hotels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-focus"
            />
          </div>
          <Button className="btn-gradient">
            <Plus className="h-4 w-4 mr-2" />
            New Trip
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="trips" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              My Trips ({trips.length})
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Saved Hotels ({savedHotels.length})
            </TabsTrigger>
          </TabsList>

          {/* Trips Tab */}
          <TabsContent value="trips" className="space-y-6">
            {filteredTrips.length === 0 ? (
              <Card className="card-premium text-center py-12">
                <CardContent>
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No trips found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Try adjusting your search terms' : 'Start planning your next adventure!'}
                  </p>
                  <Button className="btn-gradient">
                    <Plus className="h-4 w-4 mr-2" />
                    Plan New Trip
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredTrips.map((trip, index) => (
                  <Card 
                    key={trip.id} 
                    className="card-premium animate-scale-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl mb-2">{trip.name}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {trip.destination}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {trip.dates}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {trip.guests} {trip.guests === 1 ? 'guest' : 'guests'}
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(trip.status)}>
                          {trip.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-3">Hotels ({trip.hotels.length})</h4>
                          <div className="space-y-3">
                            {trip.hotels.map((hotel) => (
                              <div key={hotel.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                <img
                                  src={hotel.image}
                                  alt={hotel.name}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h5 className="font-medium truncate">{hotel.name}</h5>
                                    {hotel.isBooked && (
                                      <Badge variant="secondary" className="ml-2">
                                        Booked
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      {hotel.rating}
                                    </div>
                                    <span>•</span>
                                    <span>${hotel.price}/night</span>
                                    <span>•</span>
                                    <span>{hotel.location}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Trip
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Saved Hotels Tab */}
          <TabsContent value="saved" className="space-y-6">
            {filteredHotels.length === 0 ? (
              <Card className="card-premium text-center py-12">
                <CardContent>
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No saved hotels</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Try adjusting your search terms' : 'Save hotels you love for future trips!'}
                  </p>
                  <Button className="btn-gradient">
                    <Search className="h-4 w-4 mr-2" />
                    Discover Hotels
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHotels.map((hotel, index) => (
                  <Card 
                    key={hotel.id} 
                    className="card-premium animate-scale-in overflow-hidden"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="relative">
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-3 right-3 h-8 w-8 rounded-full p-0"
                      >
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      </Button>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold truncate">{hotel.name}</h3>
                        <div className="text-right ml-2">
                          <p className="font-bold text-primary">${hotel.price}</p>
                          <p className="text-xs text-muted-foreground">per night</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{hotel.rating}</span>
                        </div>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground truncate">{hotel.location}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {hotel.features.slice(0, 3).map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" className="btn-gradient flex-1">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Book
                        </Button>
                        <Button size="sm" variant="outline">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Saved {hotel.savedAt.toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Trips;