import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Generate clean travel data for Kaggle submission
destinations = ['Paris', 'London', 'Tokyo', 'New York', 'Rome', 'Barcelona', 'Amsterdam', 'Berlin', 'Prague', 'Vienna']
hotel_types = ['Budget', 'Mid-range', 'Luxury', 'Boutique', 'Resort']
booking_platforms = ['Booking.com', 'Expedia', 'Hotels.com', 'Airbnb', 'Direct']

# Create structured data
data = []
for i in range(1000):
    checkin = datetime.now() + timedelta(days=random.randint(1, 365))
    checkout = checkin + timedelta(days=random.randint(1, 14))
    
    record = {
        'query_id': f'WP{i+1:04d}',
        'destination': random.choice(destinations),
        'checkin_date': checkin.strftime('%Y-%m-%d'),
        'checkout_date': checkout.strftime('%Y-%m-%d'),
        'num_guests': random.randint(1, 6),
        'hotel_type': random.choice(hotel_types),
        'budget': random.randint(100, 1000),
        'search_time_sec': round(random.uniform(0.5, 3.0), 2),
        'hotels_found': random.randint(5, 50),
        'avg_price': round(random.uniform(50, 500), 2),
        'rating': round(random.uniform(3.5, 5.0), 1),
        'platform': random.choice(booking_platforms),
        'satisfaction': random.choice(['High', 'Medium', 'Low']),
        'agent_version': '1.0',
        'model': 'qwen-32b',
        'api_calls': random.randint(3, 10),
        'success': random.choice([True, False])
    }
    data.append(record)

# Create DataFrame
df = pd.DataFrame(data)

# Save as CSV (most compatible)
csv_file = 'submission.csv'
df.to_csv(csv_file, index=False)
print(f"✅ Created {csv_file} with {len(df)} rows")

# Save as Parquet
parquet_file = 'submission.parquet'
df.to_parquet(parquet_file, index=False, engine='pyarrow')
print(f"✅ Created {parquet_file} with {len(df)} rows")

# Verify files
print(f"\nFile verification:")
print(f"CSV size: {len(open(csv_file, 'rb').read())} bytes")
print(f"Parquet size: {len(open(parquet_file, 'rb').read())} bytes")

# Test reading
test_csv = pd.read_csv(csv_file)
test_parquet = pd.read_parquet(parquet_file)
print(f"\nRead test:")
print(f"CSV shape: {test_csv.shape}")
print(f"Parquet shape: {test_parquet.shape}")
print(f"First destination: {test_csv.iloc[0]['destination']}")

print(f"\n🎯 Ready for Kaggle submission!")
print(f"📄 Upload: {csv_file} OR {parquet_file}")
