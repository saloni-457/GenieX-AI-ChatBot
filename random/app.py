from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from pymongo import MongoClient
import time

app = Flask(__name__)
CORS(app)

# MongoDB Connection
client = MongoClient("mongodb://localhost:27017/")
db = client["genie_db"]
chats_collection = db["chats"]

# Gemini API Key
API_KEY = "AIzaSyBqGrIASvFUWs3NUYhTx_HjLEnI1G4U-2M"
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

# GEMINI CHATBOT
@app.route("/chat", methods=["POST"])
def chatbot_response():
    try:
        user_message = request.json.get("message")
        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        time.sleep(2)  # To avoid quota 429
        response = model.generate_content(user_message)
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# MONGODB: SAVE CHAT
@app.route("/save-chat", methods=["POST"])
def save_chat():
    data = request.json
    chats_collection.insert_one(data)
    return jsonify({"message": "Chat saved successfully"}), 200

# MONGODB: GET CHAT BY USER ID
@app.route("/get-chats/<user_id>", methods=["GET"])
def get_chats(user_id):
    chats = list(chats_collection.find({"userId": user_id}, {"_id": 0}))
    return jsonify(chats)

if __name__ == "__main__":
    app.run(debug=True)
