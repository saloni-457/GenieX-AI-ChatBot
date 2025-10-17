from flask import Flask, request, jsonify
from pymongo import MongoClient
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from deep_translator import GoogleTranslator as Translator
from dotenv import load_dotenv
from bson import SON
import re


import os
import time
import traceback

from flask_cors import CORS

load_dotenv()

app = Flask(__name__)


CORS(app, resources={r"/*": {
    "origins": ["http://localhost:5173", "https://genix-frontend.netlify.app"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

import google.generativeai as genai

from bson import ObjectId

gem_api_key = os.getenv("API_KEY")
jwt_secret = os.getenv("JWT_SECRET")
mongo_uri = os.getenv("MONGO_URI")

# app = Flask(__name__)
app.config["MONGO_URI"] = mongo_uri
mongo = PyMongo(app)

# print("Gemini API:", gem_api_key)

CORS(app, origins=["http://localhost:5173", "https://genix-frontend.netlify.app"])


chats_collection = mongo.db.chats

# Fix chats with missing folder
chats_collection.update_many(
    {"folder": {"$in": [None, ""]}},
    {"$set": {"folder": "All"}}
)
# AIzaSyBUi7sM5_uVG_2cV9KRrFf7evB1qWhYlP4
# Helper: list models (kept above initialization so we can call it during setup)
def list_available_models():
    """Try to list available models from the genai SDK and return a readable result.
    This is intentionally defensive because SDK versions differ in method names.
    """
    try:
        if hasattr(genai, "list_models"):
            result = genai.list_models()
        elif hasattr(genai, "Models") and hasattr(genai.Models, "list"):
            result = genai.Models.list()
        else:
            # Fallback: try to call an undocumented method and return its string
            result = getattr(genai, "list_models", lambda: None)()

        return result
    except Exception as e:
        print("❌ Error listing models:", str(e))
        print(traceback.format_exc())
        return None


# Gemini API setup with fallback
model = None
try:
    if not gem_api_key:
        raise RuntimeError("API_KEY not set in environment")

    genai.configure(api_key=gem_api_key)

    # Preferred model can be overridden via env var MODEL_NAME for local testing
    preferred_model = os.getenv("MODEL_NAME", "gemini-2.5-flash")
    try:
        model = genai.GenerativeModel(preferred_model)
        print(f"✅ Initialized preferred model: {preferred_model}")
    except Exception as init_err:
        print("❌ Error initializing preferred Gemini model:", str(init_err))
        print(traceback.format_exc())
        # Attempt fallback: query available models and try to pick a compatible one
        models = list_available_models()
        candidates = []
        if models:
            # Try to extract candidate model names robustly
            try:
                if isinstance(models, list):
                    for m in models:
                        if isinstance(m, dict):
                            for key in ("name", "id", "model", "displayName"):
                                if key in m and isinstance(m[key], str) and "gemini" in m[key].lower():
                                    candidates.append(m[key])
                        elif isinstance(m, str) and "gemini" in m.lower():
                            candidates.append(m)
                elif isinstance(models, dict):
                    # Sometimes SDK returns dict with nested lists
                    txt = str(models)
                    import re
                    found = re.findall(r"(gemini[\w\-\.\/_]*)", txt, flags=re.IGNORECASE)
                    candidates.extend(found)
                else:
                    txt = str(models)
                    import re
                    found = re.findall(r"(gemini[\w\-\.\/_]*)", txt, flags=re.IGNORECASE)
                    candidates.extend(found)
            except Exception:
                print("⚠️ Could not parse models list; falling back to string search")
                txt = str(models)
                import re
                candidates = re.findall(r"(gemini[\w\-\.\/_]*)", txt, flags=re.IGNORECASE)

        # De-duplicate candidates
        candidates = list(dict.fromkeys(candidates))
        for cand in candidates:
            try:
                print("Trying fallback model:", cand)
                model = genai.GenerativeModel(cand)
                print("✅ Successfully initialized model:", cand)
                break
            except Exception as e2:
                print("Fallback model failed:", cand, str(e2))
                print(traceback.format_exc())

        if model is None:
            print("❌ No compatible Gemini model available from SDK/list_models output.")
except Exception as e:
    print("❌ Gemini setup failed:", str(e))
    print(traceback.format_exc())
    model = None


# def list_available_models():
#     """Try to list available models from the genai SDK and return a readable result.
#     This is intentionally defensive because SDK versions differ in method names.
#     """
#     try:
#         if hasattr(genai, "list_models"):
#             result = genai.list_models()
#         elif hasattr(genai, "Models") and hasattr(genai.Models, "list"):
#             result = genai.Models.list()
#         else:
#             # Fallback: try to call an undocumented method and return its string
#             result = getattr(genai, "list_models", lambda: None)()

#         # Convert to a readable string if necessary
#         try:
#             return result if isinstance(result, (list, dict)) else str(result)
#         except Exception:
#             return str(result)
#     except Exception as e:
#         print("❌ Error listing models:", str(e))
#         print(traceback.format_exc())
#         return None


@app.route('/list-models', methods=['GET'])
def list_models_route():
    models = list_available_models()
    if models is None:
        return jsonify({"error": "Could not list models (check API_KEY/SDK)"}), 500
    return jsonify({"models": models}), 200


@app.route("/chat", methods=["POST"])
def chatbot_response():
    try:
        data = request.get_json()
        print("Incoming data:", data)

        if not data:
            return jsonify({"error": "No data received"}), 400

        user_message = data.get("message")
        language = data.get("language", "en")

        if not user_message:
            return jsonify({"error": "Missing message"}), 400

        # Language mapping
        lang_map = {
            "en": "English",
            "hi": "Hindi",
            "es": "Spanish",
            "fr": "French",
            "de": "German"
        }

        src_lang = lang_map.get(language, "English")
        dest_lang = "English"

        # # 🔁 Translate user message to English if needed
        if language != "en":
            translator = Translator(source=src_lang.lower(), target=dest_lang.lower())
            user_message = translator.translate(user_message)

        # 🎯 Construct Gemini prompt

        # formatted_prompt = f"""
        # You are **GenieX**, an intelligent, friendly and expressive AI assistant modeled after ChatGPT.

        # 🎯 **Your Goal:**
        # - Always respond to the user's message naturally, intelligently, warmth, and structured formatting beautifully — just like ChatGPT. 
        # - Always add **a blank line** between paragraphs, lists, or major sections.  
        # - Use `---` (horizontal line) to separate main sections.  
        # - Avoid long walls of text — break ideas into neat, readable chunks.  
        # - Use whitespace generously to make responses breathable and clean.
        # - Format all responses using **Markdown**, with proper spacing, emojis (when suitable), section dividers (`---`), and bold or italic emphasis.
        # - Add **proper spacing**, **line breaks**, and **empty lines** between paragraphs or sections for readability.  
        # - Every reply must feel natural, beautifully spaced, and visually clean to read.


        # ---

        # ### 🧩 **Response Style Rules:**
        
        # 1. **Spacing & Layout**
        # - Always add **line breaks** between sections, lists, or paragraphs.  
        # - Avoid clutter — keep everything neatly spaced.  
        # - Leave an empty line between the intro, main points, and closing.  
        # - Do **not** write long walls of text — break them into readable chunks.

        # 2. Always understand the **intent** of the user’s message before replying.  
        # - If they ask for a list → use numbered or bulleted Markdown lists.  
        # - If they want help or explanation → write clearly, use examples or steps.  
        # - If they share emotions → reply empathetically and friendly.  
        # - If it’s a technical or code query → show formatted code blocks with ```language```.  
        # - If it’s a creative request (songs, ideas, motivation) → use expressive, warm tone with emojis.  

        # 3. Structure replies like ChatGPT:
        # - Start with a short engaging intro (often with an emoji 🎯✨💡🎶 etc.)
        # - Use `###` for section headers.
        # - Use `---` between major sections.
        # - Use **bold** and _italic_ emphasis.
        # - Use ✅, ⚡, 💡, 💬, ❤️, etc. where relevant.
        # - End politely or encouragingly (“Hope this helps!”, “Would you like me to refine it further?”)

        # 3. Keep tone:
        # - Professional when explaining.
        # - Conversational when chatting.
        # - Empathetic when personal.
        # - Motivating when user sounds low.
        # - Sound like a confident, human-like expert — never robotic.  
        # - Don’t repeat unnecessary words or headings.  
        # - Never mention “ChatGPT” or “AI model.”  
        # - Avoid disclaimers like “As an AI model…”. You are **GenieX**. 

        # 4. Never say “As an AI language model…”  
        # You are **GenieX**, a confident, smart conversational partner.

        # ---

        # Now generate a beautifully formatted, engaging, ChatGPT-style reply following the above tone and structure.


        # 🗣️ **User message:**  
        # {user_message}

        # """


        # generation_config = {
        # "temperature": 0.95,
        # "top_p": 0.9,
        # "top_k": 40,
        # "max_output_tokens": 1200,
        # }

        # formatted_prompt = f"""
        # You are **GenieX**, an intelligent, friendly and expressive AI assistant modeled after ChatGPT.

        # 🎯 **Your Goal:**
        # Always respond to the user's message naturally, intelligently, warmth, and structured formatting beautifully — just like ChatGPT. 
        # Format all responses using **Markdown**, with proper spacing, emojis (when suitable), section dividers (`---`), and bold or italic emphasis.
        # Add **proper spacing**, **line breaks**, and **empty lines** between paragraphs or sections for readability.  
        # Every reply must feel natural, beautifully spaced, and visually clean to read.


        # ---

        # ### 🧩 **Response Style Rules:**
        
        # 1. **Spacing & Layout**
        # - Always add **line breaks** between sections, lists, or paragraphs.  
        # - Avoid clutter — keep everything neatly spaced.  
        # - Leave an empty line between the intro, main points, and closing.  
        # - Do **not** write long walls of text — break them into readable chunks.

        # 2. Always understand the **intent** of the user’s message before replying.  
        # - If they ask for a list → use numbered or bulleted Markdown lists.  
        # - If they want help or explanation → write clearly, use examples or steps.  
        # - If they share emotions → reply empathetically and friendly.  
        # - If it’s a technical or code query → show formatted code blocks with ```language```.  
        # - If it’s a creative request (songs, ideas, motivation) → use expressive, warm tone with emojis.  

        # 3. Structure replies like ChatGPT:
        # - Start with a short engaging intro (often with an emoji 🎯✨💡🎶 etc.)
        # - Use `###` for section headers.
        # - Use `---` between major sections.
        # - Use **bold** and _italic_ emphasis.
        # - Use ✅, ⚡, 💡, 💬, ❤️, etc. where relevant.
        # - End politely or encouragingly (“Hope this helps!”, “Would you like me to refine it further?”)

        # 3. Keep tone:
        # - Professional when explaining.
        # - Conversational when chatting.
        # - Empathetic when personal.
        # - Motivating when user sounds low.
        # - Sound like a confident, human-like expert — never robotic.  
        # - Don’t repeat unnecessary words or headings.  
        # - Never mention “ChatGPT” or “AI model.”  

        # - Avoid disclaimers like “As an AI model…”. You are **GenieX**. 

        # 4. Never say “As an AI language model…”  
        # You are **GenieX**, a confident, smart conversational partner.

        # ---

        # Now generate a beautifully formatted, engaging, ChatGPT-style reply following the above tone and structure.


        # 🗣️ **User message:**  
        # {user_message}

        # """


        # generation_config = {
        # "temperature": 0.95,
        # "top_p": 0.9,
        # "top_k": 40,
        # "max_output_tokens": 1200,
        # }


        formatted_prompt = f"""
        You are **GenieX**, a warm, articulate, and expressive AI assistant that writes with perfect structure, tone, and formatting — just like ChatGPT — but never mention ChatGPT or AI models.

        🎯 **Your Goal:**  
        Deliver every response with **beautiful Markdown formatting**, **clean spacing**, and **natural conversational flow** — always easy to read, expressive, and professional.
        Start with a short engaging intro (often with an emoji 🎯✨💡🎶 etc.).
        Add **proper spacing**, **line breaks**, and **empty lines** between paragraphs or sections for readability.
        Use numbers when giving steps for a particular thing.

        ---

        ### 🧠 Response Rules

        #### 1. Layout & Formatting
        - Use **Markdown** for every reply.  
        - Add **empty lines between all sections or ideas**.  
        - Never produce long, dense paragraphs — break them into small, easy chunks.  
        - Use **horizontal dividers (`---`)** to separate sections.  
        - Use **section headers (`###`)** for clarity.  
        - Use **bullet or numbered lists** for steps, summaries, or tips.  
        - Use **bold** and _italic_ emphasis to highlight key ideas.  
        - Always include emojis at the start or within sections to add friendliness (🎯💡✨🔥✅🌟).

        #### 2. Tone & Personality
        - Friendly, clear, confident, and intelligent.  
        - Write like a human expert — conversational but polished.  
        - Adapt to user intent:
        - For logical or educational answers → **clear explanation + short summary**.  
        - For creative or personal ones → **empathetic, lively tone**.  
        - For technical → **clean code, concise commentary, and spacing**.  
        - Never be robotic or overly formal.

        #### 3. Readability Enhancements
        - Always start with a short engaging intro line (often with an emoji).  
        - Add **mini headers** for each logical part of the reply.  
        - Maintain **visual rhythm** (one idea per paragraph).  
        - End with a short, friendly line (e.g., “Hope this clears it up! 😊” or “Would you like me to expand on this?”).

        ---

        ### 💬 Example — Perfect ChatGPT-Style Output

        **User:**  
        What has to be broken before you can use it?

        **GenieX:**

        💡 That’s one of the most classic riddles — and the answer is **an egg!**

        ---

        ### 🧩 Explanation

        To use an egg — whether for cooking or eating — you must **break its shell first**.  
        You can’t fry, scramble, or boil it properly without cracking it open.  
        So the “breaking” is a necessary step **before** it becomes usable.

        Even when hard-boiled, the egg must be **peeled** (broken) before eating.  
        That’s the entire logic behind this clever riddle — it’s a play on the literal action required to use the object.

        ---

        ✅ **In short:**  
        You have to break an egg before you can use it. Simple, logical, and satisfying. 🥚✨

        ---

        ### ⚙️ Recommended Configuration



        🗣️ **User message:**  
        {user_message}

        """

        generation_config = {
            "temperature": 0.9,
            "top_p": 0.9,
            "top_k": 40,
            "max_output_tokens": 1200
        }



        
        # formatted_prompt = f"""
        # You are GenieX, an intelligent tutor and mentor. 
        # Always reply in {src_lang} language. 

        # Your responses must follow this format:
        # 1. Summary – 1–2 lines that directly answer the question.  
        # 2. Step-by-Step Explanation – explain logically in simple steps.  
        # 3. Example or Analogy – give a code snippet, real-world analogy, or case.  
        # 4. Next Step or Tip – suggest what the user should try or learn next.  

        # Always structure with clear spacing. Use symbols like:
        # - ✅ for key steps
        # - 💡 for tips
        # - 📌 for important notes
        # - 🔗 for resources or links
        # - ❌ for common mistakes to avoid
        # - 📚 for further reading or study
        # - 🛠️ for tools or commands
        # - ⚠️ for warnings or cautions
        # - 🔍 for suggestions to explore
        # - 🧩 for additional related concepts
        # - 🎯 for focus points

        # Rules:
        # - Do not use markdown symbols (***, *, _, `, ~).  
        # - Use plain text with bullet points (•) or numbered steps.  
        # - Keep the tone professional, natural, and supportive.  
        # - Do not repeat the user’s question word for word.  



        # User asked: {user_message}
        # """

        

        # generation_config = {
        #     "temperature": 0.7,
        #     "top_p": 0.95,
        #     "top_k": 40,
        #     "max_output_tokens": 500,
        # }

        # 🔮 Get Gemini AI response
        print("Prompt sent to Gemini:\n", formatted_prompt)
        if model is None:
            # Model isn't available/initialized — return a useful error to the client
            err_msg = "AI model not available. Check API_KEY and model availability."
            print("❌", err_msg)
            return jsonify({"error": err_msg}), 502

        response = model.generate_content(formatted_prompt, generation_config=generation_config)

        if not hasattr(response, "text") or not response.text:
            print("⚠️ Gemini did not return text, as this is the error", response)
            return jsonify({"error": "Gemini did not return any response"}), 500

        # 🧹 Clean Gemini response
        # Replace markdown symbols early
        bot_reply = response.text.strip()
        bot_reply = re.sub(r"\*\*(.*?)\*\*", r"\1", bot_reply)  # Remove bold markdown (**bold**)
        bot_reply = re.sub(r"[*_`~]", "", bot_reply)             # Remove single *, _, `, ~
        bot_reply = re.sub(r"\n{2,}", "\n", bot_reply)           # Clean extra line breaks
        bot_reply = re.sub(r"^\s*\*\s+", "• ", bot_reply, flags=re.MULTILINE)


        # 🌍 Translate bot reply back to user’s language if needed
        if language != "en":
            translator = Translator(source=dest_lang.lower(), target=src_lang.lower())
            bot_reply = translator.translate(bot_reply)

        print("Final bot reply:", bot_reply)

        return jsonify({"response": bot_reply})

    except Exception as e:
        # Print full traceback to the server log for easier debugging
        print("❌ Error in /chat route:", str(e))
        print(traceback.format_exc())
        # Return the error details to the client (safe for dev). For production
        # you might want to remove the full details field.
        return jsonify({
            "error": "Translation or AI error occurred",
            "details": str(e)
        }), 500


# @app.route("/chat", methods=["POST"])
# def chatbot_response():
#     try:
#         data = request.get_json()
#         print("Incoming data:", data)

#         if not data:
#             return jsonify({"error": "No data received"}), 400

#         user_message = data.get("message")
#         language = data.get("language", "en")

#         if not user_message:
#             return jsonify({"error": "Missing message"}), 400

#         lang_map = {
#             "en": "english",
#             "hi": "hindi",
#             "es": "spanish",
#             "fr": "french",
#             "de": "german"
#         }

#         src_lang = lang_map.get(language, "english")
#         dest_lang = "english"

#         # 🔁 Translate user message to English
#         if language != "en":
#             translator = Translator(source=src_lang, target=dest_lang)
#             user_message = translator.translate(user_message)

#         # 🧠 Prompt Gemini to reply in user's selected language
#         formatted_prompt = f"""
#         You are GenieX, a helpful and smart AI chatbot. Reply in {lang_map.get(language, 'English')} language.
#         Your reply should:
#         - Be clear, short, and friendly
#         - Use bullet points or steps if needed
#         - Avoid using *** or any markdown styling
#         User asked: {user_message}
#         """

#         generation_config = {
#             "temperature": 0.7,
#             "top_p": 0.95,
#             "top_k": 40,
#             "max_output_tokens": 500,
#         }

#         # 🔮 Get response from Gemini
#         print("Prompt sent to Gemini:\n", formatted_prompt)

#         response = model.generate_content(formatted_prompt, generation_config=generation_config)

#         if not hasattr(response, "text") or not response.text:
#             print("⚠️ Gemini did not return text")
#             return jsonify({"error": "Gemini did not return any response"}), 500

#         # ✨ Clean unwanted characters
#         bot_reply = response.text.strip()
#         bot_reply = re.sub(r"[*_`~]", "", bot_reply)
#         bot_reply = bot_reply.replace("\n\n", "\n").strip()

#         print("Final bot reply:", bot_reply)

#         return jsonify({"response": bot_reply})

#     except Exception as e:
#         print("❌ Error in /chat route:", str(e))
#         return jsonify({"error": "
#  or AI error occurred", "details": str(e)}), 500

#                    Above one is more correct than the below Code.
# **********************************************************************************************************************
    #     # 🔮 Generate Gemini response
    #     # response = model.generate_content(user_message)
    #             # ⬇️ Enhance prompt for structure + clarity
    #     formatted_prompt = f"""
    #     You are GenieX, a helpful and smart AI chatbot. Reply in {language.upper()} language.
    #     Your reply should:
    #     - Be clear, short, and friendly
    #     - Use bullet points or steps if needed
    #     - Avoid using *** or any markdown styling
    #     User asked: {user_message}
    #     """

    #     generation_config = {
    #         "temperature": 0.7,
    #         "top_p": 0.95,
    #         "top_k": 40,
    #         "max_output_tokens": 500,
    #     }

    #     # 🔮 Generate Gemini response
    #     response = model.generate_content(formatted_prompt,  generation_config=generation_config)

    #     cleaned = re.sub(r"[*_`~]", "", response.text)



    #     print("Gemini raw response:", response)
    #     if not hasattr(response, "text") or not response.text:
    #         print("⚠️ Gemini did not return text")
    #         return jsonify({"error": "Gemini did not return any response"}), 500

    #     bot_reply = response.text.strip()
    #     bot_reply = bot_reply.replace("*", "")
    #     bot_reply = bot_reply.replace("\n\n", "\n")
    



    #     if language != "en":
    #         translator = Translator(source=dest_lang, target=src_lang)
    #         # final_response = translator.translate(cleaned, dest=language).text if language != 'en' else cleaned

    #         bot_reply = translator.translate(bot_reply)

    #     return jsonify({"response": bot_reply})

    # except Exception as e:
    #     print("❌ Error in /chat route:", str(e))  # ✅ Print exact issue
    #     return jsonify({"error": "Translation or AI error occurred", "details": str(e)}), 500




# def clean_response(text):
#         # Remove asterisks, markdown, etc.
#     return re.sub(r"[*_`~]", "", text)

# cleaned = clean_response(response.text)
# final_response = translator.translate(cleaned, dest=language).text if language != 'en' else cleaned

# @app.after_request
# def add_cors_headers(response):
#     response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
#     response.headers["Access-Control-Allow-Origin"] = "https://genix-frontend.netlify.app"
#     response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
#     response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
#     return response



# ----------------------------------------
# ✅ 2. POST /save-chat - Save to MongoDB
# ----------------------------------------


# @app.route("/save-chat", methods=["POST"])
# def save_chat():
#     try:
#         data = request.get_json()

#         user_id = data.get("userId")
#         messages = data.get("messages", [])
#         timestamp = data.get("timestamp") or int(time.time() * 1000)
#         folder = data.get("folder", "Default")
#         chat_id = data.get("chatId")  # ✅ added

#         if not user_id:
#             return jsonify({"error": "Missing userId"}), 400

#         if not messages:
#             messages = [{"role": "system", "content": "Empty Chat"}]

#         # Generate a title from first user message
#         title = messages[0].get("content", "Untitled Chat")[:30] if messages else "Untitled Chat"

#         if chat_id:
#             # ✅ Update existing chat
#             result = chats_collection.update_one(
#                 {"_id": ObjectId(chat_id)},
#                 {"$set": {
#                     "messages": messages,
#                     "timestamp": timestamp,
#                     "folder": folder,
#                     "title": title
#                 }}
#             )
#             if result.modified_count > 0:
#                 return jsonify({
#                     "message": "Chat updated successfully",
#                     "chatId": chat_id
#                 }), 200
#             else:
#                 return jsonify({
#                     "message": "No changes (chat unchanged)",
#                     "chatId": chat_id
#                 }), 200

#         else:
#             # ✅ Create new chat
#             new_chat = {
#                 "userId": user_id,
#                 "title": title,
#                 "messages": messages,
#                 "timestamp": timestamp,
#                 "folder": folder
#             }
#             result = chats_collection.insert_one(new_chat)
#             return jsonify({
#                 "message": "Chat saved successfully",
#                 "chatId": str(result.inserted_id)
#             }), 201

#     except Exception as e:
#         print("❌ Error in /save-chat:", e)
#         print(traceback.format_exc())
#         return jsonify({"error": str(e)}), 500



@app.route("/save-chat", methods=["POST"])
def save_chat():
    try:
        data = request.get_json(force=True)

        user_id = data.get("userId")
        messages = data.get("messages", [])
        timestamp = data.get("timestamp") or int(time.time() * 1000)
        folder = data.get("folder", "Default")
        chat_id = data.get("chatId")

        print("📩 Incoming /save-chat data:", data)

        if not user_id:
            return jsonify({"error": "Missing userId"}), 400

        if not messages:
            messages = [{"role": "system", "content": "Empty Chat"}]

        # Safe title
        first_msg = messages[0] if len(messages) > 0 else {}
        title = first_msg.get("content", "Untitled Chat")[:30]

        if chat_id:
            try:
                result = chats_collection.update_one(
                    {"_id": ObjectId(chat_id)},
                    {"$set": {
                        "messages": messages,
                        "timestamp": timestamp,
                        "folder": folder,
                        "title": title
                    }}
                )
                print("✅ Updated chat:", chat_id)
                return jsonify({
                    "message": "Chat updated successfully",
                    "chatId": chat_id
                }), 200
            except Exception as e:
                print("⚠️ Error updating chat:", e)
                return jsonify({"error": str(e)}), 500

        else:
            new_chat = {
                "userId": user_id,
                "title": title,
                "messages": messages,
                "timestamp": timestamp,
                "folder": folder
            }
            result = chats_collection.insert_one(new_chat)
            print("✅ New chat inserted:", result.inserted_id)
            return jsonify({
                "message": "Chat saved successfully",
                "chatId": str(result.inserted_id)
            }), 201

    except Exception as e:
        print("❌ Error in /save-chat:", e)
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


# @app.route("/save-chat", methods=["POST"])
# def save_chat():
#     data = request.get_json()

#     # Extract fields safely
#     user_id = data.get("userId")
#     messages = data.get("messages", [])
#     timestamp = data.get("timestamp") or int(time.time() * 1000)
#     folder = data.get("folder", "Default")

#     # Validate required fields
#     if not user_id:
#         return jsonify({"error": "Missing userId or messages"}), 400

#     if not messages:
#         messages = [{"role": "system", "content": "Empty Chat"}]
    
#     # Use first user message as chat title (fallback if empty)
#     title = messages[0].get("content", "Untitled Chat")[:30] if messages else "Untitled Chat"

#     chat = {
#         "userId": user_id,
#         "title": title,
#         "messages": messages,
#         "timestamp": timestamp,
#         "folder": folder
#     }

#     try:
#         result = chats_collection.insert_one(chat)
#         return jsonify({
#             "message": "Chat saved successfully",
#             "chatId": str(result.inserted_id)
#         }), 201
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# ----------------------------------------
# ✅ 3. GET /get-chats/<user_id> - Full chats
# ----------------------------------------


# @app.route('/get-chat-summaries/<user_id>', methods=['GET'])
# def get_chats(user_id):
#     chats = list(chats_collection.find({"userId": user_id}))
#     for chat in chats:
#         chat["_id"] = str(chat["_id"])
#     return jsonify(chats)

@app.route("/get-chat/<chat_id>", methods=["GET"])
def get_chat(chat_id):
    chat = chats_collection.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        return jsonify({"error": "Chat not found"}), 404
    chat["_id"] = str(chat["_id"])
    return jsonify(chat)


# @app.route("/get-chat/<chat_id>", methods=["GET"])
# def get_chat(chat_id):
#     try:
#         chat = mongo.db.chats.find_one({"_id": ObjectId(chat_id)})
#         if chat:
#             chat["_id"] = str(chat["_id"])
#             return jsonify(chat)
#         else:
#             return jsonify({"error": "Chat not found"}), 404
#     except Exception as e:
#         print("Error fetching chat:", e)
#         return jsonify({"error": "Server error"}), 500


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
            "folder": chat.get("folder", "Default")   
        }
        for chat in chats
    ]
    return jsonify(summaries)


# ----------------------------------------------------
#            for  Deleting chat button  

# -----------------------------------------------------


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
#        update chat 
# -------------------------------------


@app.route("/update-chat/<chat_id>", methods=["PUT"])
def update_chat(chat_id):
    data = request.get_json()
    user_id = data.get("userId")
    messages = data.get("messages", [])
    timestamp = data.get("timestamp")

    if not user_id or not messages:
        return jsonify({"error": "Missing data"}), 400

    result = mongo.db.chats.update_one(
        {"_id": ObjectId(chat_id), "userId": user_id},
        {"$set": {"messages": messages, "timestamp": timestamp}}
    )

    if result.modified_count == 0:
        return jsonify({"error": "No chat updated"}), 404

    return jsonify({"success": True, "chatId": chat_id})


# @app.route('/update-chat/<chat_id>', methods=['PUT', 'OPTIONS'])
# def update_chat(chat_id):
#     if request.method == "OPTIONS":
#         # Preflight response for CORS
#         return jsonify({"message": "CORS preflight passed"}), 200

#     data = request.json
#     chats_collection.update_one(
#         {"_id": ObjectId(chat_id)},
#         {"$set": {
#             "messages": data["messages"],
#             "timestamp": data["timestamp"]
#         }}
#     )
#     return jsonify({"success": True})

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


# ✅ Run server
if __name__ == "__main__":
    app.run(debug=True)

