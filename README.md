# SleekLLM

A lightweight browser app for chatting with OpenAI models in a clean, branching interface.

## What it does

- Lets you paste an OpenAI API key into a password-style field
- Lets you pick a model and thinking level before chatting
- Saves conversations in a left sidebar similar to ChatGPT
- Lets you highlight any assistant response text and open a focused side thread on that exact span
- Supports nested side threads while keeping the full main conversation as context

## Run it

This project is static HTML, CSS, and JavaScript. You can:

1. Open `index.html` directly in a browser, or
2. Serve the folder locally with a simple static server such as:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.
