# RedLine Express: Bus Ticket Help Bot

An AI support assistant that answers bus ticket doubts such as cancellation
charges, refund timelines, date and boarding point changes, luggage rules,
payment failures and bus delays.

Answers come only from the official policy document (RAG), so the bot never
invents refund amounts or rules. If the answer isn't in the policy, it says so
and points the user to customer support.

## Features
- Policy PDF loads automatically, so customers don't upload anything
- Clickable topic cards and quick-question chips
- Answers with source citations: "From policy page 2" shows the exact passage
- Admin "Update policy" button to replace the policy PDF
- Clean red and white help-center UI with an animated bus illustration

## Tech Stack
React + Vite + Tailwind CSS | FastAPI | FAISS | fastembed (local embeddings) | Gemini / Ollama / OpenRouter

## How it works
PDF -> pages -> chunks -> embeddings -> FAISS index -> retrieve top-k -> prompt -> LLM

## Run locally
Backend:  cd backend, pip install -r requirements.txt, copy .env.example to .env, then uvicorn app.main:app --reload --port 8000
Frontend: cd frontend, npm install, npm run dev

## Credits
Built on the open-source RAG workshop template by Harihs14
(https://github.com/Harihs14/rag-workshop), customised into a bus ticket support bot.

Note: RedLine Express and its policy are a fictional sample for demonstration.
