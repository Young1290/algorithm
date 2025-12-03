/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";

// 🌏 Set global options: Deploy to Singapore region for Binance API access
setGlobalOptions({
  region: "asia-southeast1", // Singapore region - Binance允许访问
  maxInstances: 10,
});

// Binance Price Proxy - deployed in Singapore region
export const getBinancePrice = onRequest(
  {cors: true}, // Enable CORS for frontend access
  async (request, response) => {
    try {
      const symbol = (request.query.symbol as string) || "BTC";
      const pair = symbol.toUpperCase().endsWith("USDT")
        ? symbol.toUpperCase()
        : `${symbol.toUpperCase()}USDT`;

      logger.info(`Fetching Binance price for ${pair}`);

      const binanceResponse = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`
      );

      if (!binanceResponse.ok) {
        throw new Error(`Binance API error: ${binanceResponse.status}`);
      }

      const data = await binanceResponse.json();
      logger.info(`Successfully fetched price for ${pair}: ${data.price}`);

      response.json({
        symbol: pair,
        price: parseFloat(data.price),
        timestamp: new Date().toISOString(),
        region: "asia-southeast1",
      });
    } catch (error) {
      logger.error("Error fetching Binance price:", error);
      response.status(500).json({
        error: "Failed to fetch price",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
