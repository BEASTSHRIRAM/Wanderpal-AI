import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users, Filter, Sparkles, Brain, Star, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const HotelSearch = () => {
	const [destination, setDestination] = useState('');
	const [checkIn, setCheckIn] = useState('');
	const [checkOut, setCheckOut] = useState('');
	const [guests, setGuests] = useState('2');
	const [isSearching, setIsSearching] = useState(false);
	const [showResults, setShowResults] = useState(false);

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSearching(true);
    
		// Simulate AI agents working
		await new Promise(resolve => setTimeout(resolve, 3000));
    
		setIsSearching(false);
		setShowResults(true);
	};

	const mockHotels = [
		{
			id: 1,
			name: "The Aurora Luxury Resort",
			image: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
			rating: 4.8,
			price: "$320",
			features: ["Ocean View", "Spa", "Pool"],
			reason: "Perfect match for luxury preferences with highest guest satisfaction scores."
		},
		{
			id: 2,
			name: "Metropolitan Grand Hotel",
			image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa",
			rating: 4.6,
			price: "$280",
			features: ["City Center", "Gym", "Restaurant"],
			reason: "Optimal location with excellent safety ratings and premium amenities."
		},
		{
			id: 3,
			name: "Seaside Boutique Inn",
			image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4",
			rating: 4.7,
			price: "$195",
			features: ["Beachfront", "Breakfast", "WiFi"],
			reason: "Best value option with exceptional reviews and beachfront access."
		}
	];

	const agentSteps = [
		{ name: "Hotel Pricer", icon: Sparkles, status: isSearching ? "working" : "complete" },
		{ name: "Ranking Agent", icon: Brain, status: isSearching ? (Math.random() > 0.5 ? "working" : "waiting") : "complete" },
		{ name: "Review & Safety", icon: Shield, status: isSearching ? (Math.random() > 0.7 ? "working" : "waiting") : "complete" }
	];

	return (
		<div className="min-h-screen p-4 md:p-8">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="text-center mb-12 animate-fade-in">
					<h1 className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4">
						Wanderpal
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Discover perfect hotels with our AI-powered travel advisor. 
						Get personalized recommendations in seconds.
					</p>
				</div>

				{/* Search Form */}
				<Card className="card-premium mb-12 animate-scale-in">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Search className="h-5 w-5 text-primary" />
							Find Your Perfect Stay
						</CardTitle>
						<CardDescription>
							Tell us where you want to go and we'll find the best hotels for you
						</CardDescription>
					</CardHeader>
          
					<CardContent>
						<form onSubmit={handleSearch} className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								<div className="space-y-2">
									<Label htmlFor="destination" className="flex items-center gap-2">
										<MapPin className="h-4 w-4" />
										Destination
									</Label>
									<Input
										id="destination"
										placeholder="Where are you going?"
										value={destination}
										onChange={(e) => setDestination(e.target.value)}
										className="input-focus"
										required
									/>
								</div>
                
								<div className="space-y-2">
									<Label htmlFor="checkin" className="flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										Check-in
									</Label>
									<Input
										id="checkin"
										type="date"
										value={checkIn}
										onChange={(e) => setCheckIn(e.target.value)}
										className="input-focus"
										required
									/>
								</div>
                
								<div className="space-y-2">
									<Label htmlFor="checkout" className="flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										Check-out
									</Label>
									<Input
										id="checkout"
										type="date"
										value={checkOut}
										onChange={(e) => setCheckOut(e.target.value)}
										className="input-focus"
										required
									/>
								</div>
                
								<div className="space-y-2">
									<Label htmlFor="guests" className="flex items-center gap-2">
										<Users className="h-4 w-4" />
										Guests
									</Label>
									<Input
										id="guests"
										type="number"
										min="1"
										max="8"
										value={guests}
										onChange={(e) => setGuests(e.target.value)}
										className="input-focus"
									/>
								</div>
							</div>
              
							<div className="flex gap-4">
								<Button 
									type="submit" 
									className="btn-gradient flex-1" 
									disabled={isSearching}
								>
									{isSearching ? 'AI Agents Working...' : 'Search Hotels'}
								</Button>
								<Button variant="outline" type="button">
									<Filter className="h-4 w-4 mr-2" />
									Filters
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				{/* AI Agents Working */}
				{isSearching && (
					<Card className="card-premium mb-12 animate-fade-in">
						<CardHeader>
							<CardTitle>AI Agents at Work</CardTitle>
							<CardDescription>
								Our intelligent agents are analyzing thousands of options to find your perfect match
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								{agentSteps.map((agent, index) => (
									<div key={agent.name} className="flex items-center space-x-4">
										<div className={`p-3 rounded-full ${agent.status === 'working' ? 'animate-pulse-glow bg-primary/20' : 'bg-muted'}`}>
											<agent.icon className={`h-6 w-6 ${agent.status === 'working' ? 'text-primary' : 'text-muted-foreground'}`} />
										</div>
										<div>
											<h3 className="font-semibold">{agent.name}</h3>
											<p className="text-sm text-muted-foreground capitalize">{agent.status}</p>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Search Results */}
				{showResults && (
					<div className="animate-fade-in-up">
						<h2 className="text-3xl font-bold mb-8">Perfect Matches for You</h2>
						<div className="grid gap-8">
							{mockHotels.map((hotel, index) => (
								<Card key={hotel.id} className="card-premium animate-fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
									<div className="md:flex">
										<div className="md:w-1/3">
											<img 
												src={hotel.image} 
												alt={hotel.name}
												className="w-full h-64 md:h-full object-cover rounded-l-xl"
											/>
										</div>
										<div className="md:w-2/3 p-6">
											<div className="flex items-start justify-between mb-4">
												<div>
													<h3 className="text-2xl font-bold mb-2">{hotel.name}</h3>
													<div className="flex items-center gap-2 mb-2">
														<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
														<span className="font-semibold">{hotel.rating}</span>
														<span className="text-muted-foreground">Exceptional</span>
													</div>
												</div>
												<div className="text-right">
													<div className="text-3xl font-bold text-primary">{hotel.price}</div>
													<div className="text-sm text-muted-foreground">per night</div>
												</div>
											</div>
                      
											<div className="flex gap-2 mb-4">
												{hotel.features.map((feature) => (
													<Badge key={feature} variant="secondary">{feature}</Badge>
												))}
											</div>
                      
											<p className="text-muted-foreground mb-6">{hotel.reason}</p>
                      
											<div className="flex gap-3">
												<Button className="btn-gradient">Book Now</Button>
												<Button variant="outline">View Details</Button>
											</div>
										</div>
									</div>
								</Card>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default HotelSearch;