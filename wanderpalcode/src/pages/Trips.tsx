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


interface Hotel {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: number;
  location: string;
  isBooked?: boolean;
  savedAt?: Date;
}

interface Trip {
  id: string;
  name: string;
  destination: string;
  dates: string;
  guests: number;
  status: 'planned' | 'booked' | 'completed';
  hotels: Hotel[];
  createdAt: Date;
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

  // Trending destinations state
  const [trendingDestinations, setTrendingDestinations] = useState<any[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  // Fetch trending places when Trending tab is active, with caching by location
  useEffect(() => {
    if (activeTab !== 'trending') return;
    setTrendingError(null);
    setLoadingTrending(true);
    if (!navigator.geolocation) {
      setTrendingError('Geolocation is not supported by your browser.');
      setLoadingTrending(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const cacheKey = 'trending_places_cache';
        const cacheRadius = 10000; // meters, must match backend default
        const cached = localStorage.getItem(cacheKey);
        let useCache = false;
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const dist = Math.sqrt(
              Math.pow(parsed.lat - latitude, 2) + Math.pow(parsed.lon - longitude, 2)
            ) * 111139; // rough meters per degree
            if (dist < cacheRadius && Array.isArray(parsed.trending)) {
              setTrendingDestinations(parsed.trending);
              setLoadingTrending(false);
              useCache = true;
            }
          } catch {}
        }
        if (!useCache) {
          fetch(`http://localhost:8000/trending?lat=${latitude}&lon=${longitude}`)
            .then(res => {
              if (!res.ok) throw new Error('Failed to fetch trending places');
              return res.json();
            })
            .then(data => {
              setTrendingDestinations(data.trending || []);
              localStorage.setItem(cacheKey, JSON.stringify({
                lat: latitude,
                lon: longitude,
                trending: data.trending || []
              }));
              setLoadingTrending(false);
            })
            .catch(err => {
              setTrendingError(err.message);
              setLoadingTrending(false);
            });
        }
      },
      (err) => {
        setTrendingError('Unable to get your location.');
        setLoadingTrending(false);
      }
    );
  }, [activeTab]);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Helper to extract email from JWT
  function getEmailFromToken(token: string | null): string | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.email || null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = getEmailFromToken(token);
    if (!token || !email) {
      navigate('/signin');
      return;
    }
    setLoadingTrips(true);
    fetch(`http://localhost:8000/users/${email}/trips`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch trips');
        return res.json();
      })
      .then(data => {
        // Convert createdAt and savedAt to Date objects if needed
        const trips = (data.trips || []).map((trip: any) => ({
          ...trip,
          createdAt: trip.createdAt ? new Date(trip.createdAt) : new Date(),
          hotels: (trip.hotels || []).map((hotel: any) => ({
            ...hotel,
            savedAt: hotel.savedAt ? new Date(hotel.savedAt) : new Date()
          }))
        }));
        setTrips(trips);
        setLoadingTrips(false);
      })
      .catch(err => {
        setFetchError(err.message);
        setLoadingTrips(false);
      });
  }, [navigate]);

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

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">
            Your <span className="bg-gradient-hero bg-clip-text text-transparent">Trips</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your travel plans
          </p>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trips..."
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
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              Trending
            </TabsTrigger>
          </TabsList>
          {/* Trending Tab */}
          <TabsContent value="trending" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Trending Destinations</h2>
              <p className="text-muted-foreground mb-4">Popular places near you</p>
            </div>
            {loadingTrending ? (
              <div className="text-center py-12 text-muted-foreground">Loading trending places...</div>
            ) : trendingError ? (
              <div className="text-center py-12 text-red-500">{trendingError}</div>
            ) : trendingDestinations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No trending places found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingDestinations.map((place, index) => (
                  <Card key={place.xid || index} className="card-premium animate-scale-in overflow-hidden" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="relative">
                      <img
                        src={place.preview || '/placeholder.svg'}
                        alt={place.name}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{place.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{place.address && (place.address.city || place.address.town || place.address.village || place.address.state || '')}</p>
                      <p className="text-sm mb-3">{place.wikipedia_extracts || place.kinds}</p>
                      {place.otm && (
                        <Button size="sm" className="btn-gradient" asChild>
                          <a href={place.otm} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Explore
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trips Tab */}
          <TabsContent value="trips" className="space-y-6">
            {loadingTrips ? (
              <div className="text-center py-12 text-muted-foreground">Loading trips...</div>
            ) : fetchError ? (
              <div className="text-center py-12 text-red-500">{fetchError}</div>
            ) : filteredTrips.length === 0 ? (
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
                            {trip.hotels.length === 0 ? (
                              <div className="text-muted-foreground text-sm">No hotels for this trip.</div>
                            ) : (
                              trip.hotels.map((hotel) => (
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
                              ))
                            )}
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


        </Tabs>
      </div>
    </div>
  );
};

export default Trips;