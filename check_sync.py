import pandas as pd
import pickle
import os
import torch

csv_path = 'job_data_merged.csv'
pkl_path = 'backend/job_embeddings.pkl'

if os.path.exists(csv_path):
    df = pd.read_csv(csv_path)
    print(f"CSV Rows: {len(df)}")
else:
    print("CSV not found in root")

if os.path.exists(pkl_path):
    with open(pkl_path, 'rb') as f:
        embeddings = pickle.load(f)
    print(f"PKL Rows: {len(embeddings)}")
    if hasattr(embeddings, 'shape'):
        print(f"PKL Shape: {embeddings.shape}")
else:
    print("PKL not found in backend")
