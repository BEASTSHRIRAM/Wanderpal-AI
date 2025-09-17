import zipfile
import os

zip_filename = 'wanderpal_submission.zip'
parquet_filename = 'wanderpal_travel_data.parquet'
csv_filename = 'wanderpal_travel_data.csv'


files_to_zip = []
for filename in [parquet_filename, csv_filename]:
    if os.path.exists(filename):
        files_to_zip.append(filename)
        print(f"✅ Found: {filename}")
    else:
        print(f"❌ Missing: {filename}")

if not files_to_zip:
    print("❌ No data files found to zip!")
    exit(1)

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for filename in files_to_zip:
        zipf.write(filename)
        print(f"📦 Added {filename} to {zip_filename}")

with zipfile.ZipFile(zip_filename, 'r') as zipf:
    files_in_zip = zipf.namelist()
    print(f"\n� Files in ZIP: {files_in_zip}")
    
    for file_info in zipf.filelist:
        print(f"   📄 {file_info.filename}: {file_info.file_size:,} bytes")

print(f"\n🎯 Kaggle submission ready: {zip_filename}")
print("💡 Upload this ZIP file to Kaggle dataset submission")
print("\n📝 Dataset contains:")
print("   • 1,000 travel booking records")
print("   • WanderPal AI agent performance metrics")
print("   • Hotel search and recommendation data")
print("   • Groq/Qwen-32B and SerpAPI usage statistics")
