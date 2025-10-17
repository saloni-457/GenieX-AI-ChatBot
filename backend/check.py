import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("API_KEY") or "AIzaSyBqGrIASvFUWs3NUYhTx_HjLEnI1G4U-2M")

print("🔍 Listing available Gemini models...\n")

for m in genai.list_models():
    print(m.name)
