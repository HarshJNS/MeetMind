import os

from dotenv import load_dotenv
import google.generativeai as genai


def main() -> None:
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise RuntimeError("Add your real GEMINI_API_KEY to .env first.")

    genai.configure(api_key=api_key)

    print("Models that support generateContent:")
    for model in genai.list_models():
        methods = getattr(model, "supported_generation_methods", []) or []
        if "generateContent" in methods:
            print(f"- {model.name}")

    print("\nModels that support embedContent:")
    for model in genai.list_models():
        methods = getattr(model, "supported_generation_methods", []) or []
        if "embedContent" in methods:
            print(f"- {model.name}")


if __name__ == "__main__":
    main()
