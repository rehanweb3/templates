import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const deployedTokens = pgTable("deployed_tokens", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  tokenName: text("token_name").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  tokenSupply: text("token_supply").notNull(),
  contractAddress: text("contract_address").notNull(),
  chainId: integer("chain_id").notNull(),
  deployedAt: timestamp("deployed_at").defaultNow().notNull(),
});

export type DeployedToken = typeof deployedTokens.$inferSelect;
export type InsertDeployedToken = typeof deployedTokens.$inferInsert;
