import type { Express } from "express";
import { db } from "./db";
import { deployedTokens } from "./schema";
import { eq } from "drizzle-orm";
import { compileContract } from "./compiler";

export function registerRoutes(app: Express) {
  app.post("/api/tokens", async (req, res) => {
    try {
      const { walletAddress, tokenName, tokenSymbol, tokenSupply, contractAddress, chainId } = req.body;

      if (!walletAddress || !tokenName || !tokenSymbol || !tokenSupply || !contractAddress || !chainId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const [token] = await db.insert(deployedTokens).values({
        walletAddress: walletAddress.toLowerCase(),
        tokenName,
        tokenSymbol,
        tokenSupply,
        contractAddress,
        chainId,
      }).returning();

      res.json(token);
    } catch (error) {
      console.error("Error saving token:", error);
      res.status(500).json({ error: "Failed to save token" });
    }
  });

  app.get("/api/tokens/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const tokens = await db
        .select()
        .from(deployedTokens)
        .where(eq(deployedTokens.walletAddress, walletAddress.toLowerCase()));

      res.json(tokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      res.status(500).json({ error: "Failed to fetch tokens" });
    }
  });

  app.post("/api/compile", async (req, res) => {
    try {
      const { source, contractName } = req.body;

      if (!source || !contractName) {
        return res.status(400).json({ error: "Missing source or contractName" });
      }

      const result = await compileContract(source, contractName);
      res.json(result);
    } catch (error) {
      console.error("Compilation error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Compilation failed" });
    }
  });
}
