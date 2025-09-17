import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Generate sample travel data for WanderPal submission
def generate_travel_data(n_samples=1000):
    destinations = [
        'Paris', 'London', 'Tokyo', 'New York', 'Rome', 'Barcelona', 'Amsterdam',
        'Berlin', 'Prague', 'Vienna', 'Budapest', 'Istanbul', 'Dubai', 'Bangkok',
        'Singapore', 'Sydney', 'Melbourne', 'Los Angeles', 'San Francisco', 'Miami'
    ]
    
    hotel_types = ['Budget', 'Mid-range', 'Luxury', 'Boutique', 'Resort']
    booking_platforms = ['Booking.com', 'Expedia', 'Hotels.com', 'Airbnb', 'Direct']
    
    data = []
    
    for i in range(n_samples):
        # Generate travel query and response data
        destination = random.choice(destinations)
        checkin_date = datetime.now() + timedelta(days=random.randint(1, 365))
        checkout_date = checkin_date + timedelta(days=random.randint(1, 14))
        
        # Simulate AI agent workflow data
        search_time = random.uniform(0.5, 3.0)  # seconds
        num_hotels_found = random.randint(5, 50)
        avg_price = random.uniform(50, 500)
        user_rating = random.uniform(3.5, 5.0)
        
        record = {
            'query_id': f'Q{i+1:06d}',
            'destination': destination,
            'checkin_date': checkin_date.strftime('%Y-%m-%d'),
            'checkout_date': checkout_date.strftime('%Y-%m-%d'),
            'num_guests': random.randint(1, 6),
            'hotel_type_preference': random.choice(hotel_types),
            'max_budget': random.randint(100, 1000),
            'search_duration_seconds': round(search_time, 2),
            'hotels_found': num_hotels_found,
            'avg_price_per_night': round(avg_price, 2),
            'recommended_hotel_rating': round(user_rating, 1),
            'booking_platform': random.choice(booking_platforms),
            'user_satisfaction': random.choice(['High', 'Medium', 'Low']),
            'langflow_agent_version': '1.0.0',
            'groq_model_used': 'qwen-32b',
            'serpapi_searches': random.randint(3, 10),
            'response_generated': random.choice([True, False]),
            'timestamp': datetime.now().isoformat()
        }
        
        data.append(record)
    
    return pd.DataFrame(data)

# Generate the dataset
print("Generating travel data for WanderPal Kaggle submission...")
df = generate_travel_data(1000)

# Add some metadata
df['project_name'] = 'WanderPal'
df['project_type'] = 'AI Travel Assistant'
df['tech_stack'] = 'React+FastAPI+Langflow+MongoDB'

# Display basic info
print(f"Generated {len(df)} records")
print(f"Columns: {list(df.columns)}")
print(f"Data types:\n{df.dtypes}")

# Save as parquet file
output_file = 'wanderpal_travel_data.parquet'
df.to_parquet(output_file, engine='pyarrow', compression='snappy')

print(f"\n✅ Parquet file created: {output_file}")
print(f"File size: {df.memory_usage(deep=True).sum() / 1024:.1f} KB")

# Show sample data
print(f"\nSample data (first 3 rows):")
print(df.head(3).to_string())
