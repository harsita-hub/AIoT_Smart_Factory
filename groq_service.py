import os

from dotenv import load_dotenv
from groq import Groq


load_dotenv()


GROQ_API_KEY = os.getenv("GROQ_API_KEY")


if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY is not set in the .env file"
    )


client = Groq(
    api_key=GROQ_API_KEY
)


MODEL_NAME = "openai/gpt-oss-20b"


def ask_groq(question: str) -> str:

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an AI assistant for an "
                    "AIoT Smart Factory Monitoring Platform. "
                    "Answer clearly and concisely. "
                    "Do not invent sensor data."
                )
            },
            {
                "role": "user",
                "content": question
            }
        ],
        temperature=0.2
    )

    return response.choices[0].message.content