import csv

# Simple lead data preparation script for international client targeting
# This organizes our pipeline for web scraping and automation services

sample_clients = [
    {
        "Company": "Turin Premium Store",
        "Service": "Web Scraping & Data Automation",
        "Status": "Ready",
    },
    {
        "Company": "Client A - International",
        "Service": "Lead Generation",
        "Status": "Pending",
    },
]

# Save the data into a clean CSV file format
with open(
    "clients_pipeline.csv", "w", newline="", encoding="utf-8"
) as target_file:
  field_names = ["Company", "Service", "Status"]
  writer = csv.DictWriter(target_file, fieldnames=field_names)
  writer.writeheader()
  writer.writerows(sample_clients)

print("Client pipeline list successfully generated!")
