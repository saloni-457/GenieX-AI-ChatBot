from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from deep_translator import GoogleTranslator as Translator
from dotenv import load_dotenv
from bson import SON

import os

load_dotenv()
import time


import google.generativeai as genai

from bson import ObjectId

gem_api_key = os.getenv("API_KEY")
jwt_secret = os.getenv("JWT_SECRET")
mongo_uri = os.getenv("MONGO_URI")

app = Flask(__name__)
app.config["MONGO_URI"] = mongo_uri
mongo = PyMongo(app)



CORS(app, origins=["http://localhost:5173"])

# CORS(app)

# MongoDB connection
# client = MongoClient("mongodb://localhost:27017/")
# db = client["genie_db"]
# chats_collection = db["chats"]

chats_collection = mongo.db.chats



# Fix chats with missing folder
chats_collection.update_many(
    {"folder": {"$in": [None, ""]}},
    {"$set": {"folder": "Default"}}
)

# Gemini API setup
genai.configure(api_key= gem_api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

# ----------------------------------------
# ✅ 1. POST /chat - Generate AI reply
@app.route("/chat", methods=["POST"])
def chatbot_response():
    data = request.get_json()
    print("Incoming data:", data)

    if not data:
        print("🔴 No data received!")
        return jsonify({"error": "No data received"}), 400

    user_message = data.get("message")
    language = data.get("language", "en")

    if not user_message:
        return jsonify({"error": "Missing message"}), 400

    # Optional: Normalize language codes
    lang_map = {
        "en": "english",
        "hi": "hindi",
        "es": "spanish",
        "fr": "french",   # ✅ Add French
        "de": "german"    # ✅ Add German
    }

    try:
        src_lang = lang_map.get(language, "english")  # source user input language
        dest_lang = "english"
        translator = Translator(source=src_lang, target=dest_lang)

        if language != "en":
            user_message = translator.translate(user_message)

        # Generate AI reply (English)
        response = model.generate_content(user_message)
        bot_reply = response.text

        # Translate back if needed
        if language != "en":
            translator = Translator(source=dest_lang, target=src_lang)
            bot_reply = translator.translate(bot_reply)

        return jsonify({"response": bot_reply})

    except Exception as e:
        print("❌ Translation or response error:", str(e))
        return jsonify({"error": "Translation or AI error occurred"}), 500# ----------------------------------------




# @app.route("/chat", methods=["POST"])
# def chatbot_response():
    
#     data = request.get_json()
#     print("Incoming data:", data)   


#     if not data:
#         print("🔴 No data received!")
#         return jsonify({"error": "No data received"}), 400
    
#     user_message = data.get("message")
#     language = data.get("language", "en")  


#     if not user_message:
#         return jsonify({"error": "Missing message"}), 400

#     translator = Translator()

#     if language != "en":
#         user_message = translator.translate(user_message, src=language, dest="en").text

#     response = model.generate_content(user_message)
#     bot_reply = response.text

#     if language != "en":
#         bot_reply = translator.translate(bot_reply, src="en", dest=language).text

#     return jsonify({"response": bot_reply})



# ----------------------------------------
# ✅ 2. POST /save-chat - Save to MongoDB
# ----------------------------------------

@app.route("/save-chat", methods=["POST"])
def save_chat():
    data = request.get_json()
    user_id = data.get("userId")
    messages = data.get("messages")
    timestamp = data.get("timestamp")
    folder = data.get("folder", "Default")  # ✅ NEW: get folder from request

    if not (user_id and messages):
        return jsonify({"error": "Missing data"}), 400

    # Use first user message as title
    title = messages[0]["text"][:30] if messages else "Untitled Chat"

    folder = data.get("folder", "Default")  # default 
    chat = {
        "userId": user_id,
        "title": title,
        "messages": messages,
        "timestamp": timestamp or int(time.time() * 1000),
        "folder": folder  # ✅ ADDED HERE
    }

    result = chats_collection.insert_one(chat)
    return jsonify({"message": "Chat saved", "chatId": str(result.inserted_id)})

# ----------------------------------------
# ✅ 3. GET /get-chats/<user_id> - Full chats
# ----------------------------------------



@app.route('/get-chats/<user_id>', methods=['GET'])
def get_chats(user_id):
    chats = list(chats_collection.find({"userId": user_id}))
    for chat in chats:
        chat["_id"] = str(chat["_id"])
    return jsonify(chats)

# ----------------------------------------
# ✅ 4. GET /get-chat-summaries/<user_id> - Sidebar titles
# ----------------------------------------
@app.route("/get-chat-summaries/<user_id>", methods=["GET"])
def get_chat_summaries(user_id):
    chats = chats_collection.find({"userId": user_id})
    summaries = [
        {
            "_id": str(chat["_id"]),
            "title": chat.get("title", "Untitled"),
            "timestamp": chat["timestamp"],
            "folder": chat.get("folder", "Default")  # ✅ include folder
        }
        for chat in chats
    ]
    return jsonify(summaries)


# ----------------------------------------------------
#            for  Deleting chat button  

# -----------------------------------------------------

# @app.route("/delete-chat/<chat_id>", methods=["DELETE"])
# def delete_chat(chat_id):
#     result = chats_collection.delete_one({"_id": ObjectId(chat_id)})
#     if result.deleted_count:
#         return jsonify({"message": "Chat deleted"}), 200
#     else:
#         return jsonify({"error": "Chat not found"}), 404

@app.route("/delete-chat/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    mongo.db.chats.delete_one({"_id": ObjectId(chat_id)})
    return jsonify({"message": "Chat deleted"})

# ----------------------------------
#            Chat - id
# -------------------------------------
@app.route("/rename-chat/<chat_id>", methods=["PUT"])
def rename_chat(chat_id):
    new_title = request.json.get("title")
    if not new_title:
        return jsonify({"error": "Missing title"}), 400

    mongo.db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$set": {"title": new_title}}
    )
    return jsonify({"message": "Title updated"})

# -------------------------------------
#        put folder 
# -------------------------------------


@app.route("/update-folder/<chat_id>", methods=["PUT"])
def update_folder(chat_id):
    folder = request.json.get("folder")
    if not folder:
        return jsonify({"error": "Missing folder"}), 400

    mongo.db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$set": {"folder": folder}}
    )
    return jsonify({"message": "Folder updated"})


# @app.route("/", methods=["GET"])
# def home():
#     return "✅ Flask backend is running!"


# ✅ Run server
if __name__ == "__main__":
    app.run(debug=True)
