import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {  
  ExternalLink,
} from 'lucide-react';

const Trips = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
    }
  }, [navigate]);

  const [activeTab, setActiveTab] = useState('trending');

  // Trending destinations state
  const [trendingDestinations, setTrendingDestinations] = useState<any[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);

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
  // Clear trending cache on user change
  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = getEmailFromToken(token);
    if (email) {
      // Use per-user cache key
      localStorage.removeItem(`trending_places_cache_${email}`);
    }
  }, [localStorage.getItem('token')]);

  // Fetch trending places logic (unchanged)
  useEffect(() => {
    if (activeTab !== 'trending') return;
    setTrendingError(null);
    setLoadingTrending(true);
    if (!navigator.geolocation) {
      setTrendingError('Geolocation is not supported by your browser.');
      setLoadingTrending(false);
      return;
    }
    const token = localStorage.getItem('token');
    const email = getEmailFromToken(token);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Round lat/lon to 4 decimals for cache stability
        const round = (n: number) => Math.round(n * 10000) / 10000;
        const latitude = round(pos.coords.latitude);
        const longitude = round(pos.coords.longitude);
        const cacheKey = email ? `trending_places_cache_${email}` : 'trending_places_cache';
        const cacheRadius = 10000; // meters, must match backend default
        const cacheExpiryMs = 60 * 60 * 1000; // 1 hour
        const cached = localStorage.getItem(cacheKey);
        let useCache = false;
        // Haversine formula for accurate distance
        function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
          const toRad = (x: number) => x * Math.PI / 180;
          const R = 6371000; // meters
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        }
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const dist = haversine(parsed.lat, parsed.lon, latitude, longitude);
            const now = Date.now();
            const cacheTime = parsed.cachedAt || 0;
            if (dist < cacheRadius && Array.isArray(parsed.trending) && (now - cacheTime) < cacheExpiryMs) {
              console.log('[Trending] Using cached trending places:', parsed);
              setTrendingDestinations(parsed.trending);
              setLoadingTrending(false);
              useCache = true;
            } else {
              console.log('[Trending] Cache miss: dist', dist, 'radius', cacheRadius, 'age', now - cacheTime);
            }
          } catch (e) {
            console.log('[Trending] Cache parse error', e);
          }
        } else {
          console.log('[Trending] No cache found for key', cacheKey);
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
                trending: data.trending || [],
                cachedAt: Date.now()
              }));
              setLoadingTrending(false);
              console.log('[Trending] Fetched and cached trending places');
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

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">
            Trending <span className="bg-gradient-hero bg-clip-text text-transparent">Destinations</span>
          </h1>
          <p className="text-muted-foreground">
            Popular places near your current location
          </p>
        </div>

        <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
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
        </div>
        
      </div>
    </div>
  );
};

export default Trips;