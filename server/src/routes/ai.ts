import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// POST /api/ai/chat
router.post("/chat", async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system:
        "You are a productivity assistant helping users manage their tasks. Be concise and helpful.",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const reply = textBlock && textBlock.type === "text" ? textBlock.text : "";

    return res.json({ reply });
  } catch (error) {
    console.error("Anthropic API error:", error);
    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(401).json({ error: "Invalid API key. Please check your ANTHROPIC_API_KEY." });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Rate limit exceeded. Please try again shortly." });
    }
    return res.status(500).json({ error: "Failed to get AI response. Please try again." });
  }
});

export default router;
