window.MPData = {
  markets: [
    { symbol: "NIFTY50", name: "NIFTY 50 Index", type: "indices", region: "India", price: 22540, change: 0.7, trend: 72, vol: 34, liq: 96, sentiment: 66, yahoo: "^NSEI", tv: "NSE:NIFTY" },
    { symbol: "BANKNIFTY", name: "NIFTY Bank Index", type: "indices", region: "India", price: 48280, change: 1.1, trend: 75, vol: 43, liq: 94, sentiment: 68, yahoo: "^NSEBANK", tv: "NSE:BANKNIFTY" },
    { symbol: "FINNIFTY", name: "NIFTY Financial Services", type: "indices", region: "India", price: 21460, change: 0.5, trend: 64, vol: 39, liq: 88, sentiment: 61, yahoo: "NIFTY_FIN_SERVICE.NS", tv: "NSE:CNXFINANCE" },
    { symbol: "MIDCPNIFTY", name: "NIFTY Midcap Select", type: "indices", region: "India", price: 11280, change: 1.6, trend: 79, vol: 52, liq: 82, sentiment: 70, yahoo: "NIFTY_MID_SELECT.NS", tv: "NSE:MIDCPNIFTY" },
    { symbol: "SENSEX", name: "BSE Sensex", type: "indices", region: "India", price: 74220, change: 0.6, trend: 69, vol: 31, liq: 92, sentiment: 64, yahoo: "^BSESN", tv: "BSE:SENSEX" },
    { symbol: "BTC", name: "Bitcoin", type: "crypto", region: "Global", price: 5480000, change: 2.8, trend: 82, vol: 68, liq: 95, sentiment: 72, coingecko: "bitcoin", tv: "BINANCE:BTCUSDT" },
    { symbol: "ETH", name: "Ethereum", type: "crypto", region: "Global", price: 286000, change: 1.9, trend: 76, vol: 63, liq: 90, sentiment: 68, coingecko: "ethereum", tv: "BINANCE:ETHUSDT" },
    { symbol: "SOL", name: "Solana", type: "crypto", region: "Global", price: 14200, change: 4.6, trend: 84, vol: 78, liq: 76, sentiment: 74, coingecko: "solana", tv: "BINANCE:SOLUSDT" },
    { symbol: "RELIANCE", name: "Reliance Industries", type: "stocks", region: "India", price: 2920, change: 0.8, trend: 67, vol: 38, liq: 88, sentiment: 61, yahoo: "RELIANCE.NS", tv: "NSE:RELIANCE" },
    { symbol: "TCS", name: "Tata Consultancy Services", type: "stocks", region: "India", price: 3880, change: -0.4, trend: 54, vol: 32, liq: 84, sentiment: 55, yahoo: "TCS.NS", tv: "NSE:TCS" },
    { symbol: "HDFCBANK", name: "HDFC Bank", type: "stocks", region: "India", price: 1685, change: 1.2, trend: 64, vol: 36, liq: 91, sentiment: 60, yahoo: "HDFCBANK.NS", tv: "NSE:HDFCBANK" },
    { symbol: "AAPL", name: "Apple", type: "stocks", region: "US", price: 18320, change: 0.6, trend: 61, vol: 29, liq: 93, sentiment: 58, yahoo: "AAPL", tv: "NASDAQ:AAPL" },
    { symbol: "NVDA", name: "Nvidia", type: "stocks", region: "US", price: 92400, change: 3.4, trend: 88, vol: 58, liq: 94, sentiment: 79, yahoo: "NVDA", tv: "NASDAQ:NVDA" },
    { symbol: "GOLD", name: "Gold Futures", type: "commodities", region: "Global", price: 6320, change: -0.2, trend: 49, vol: 26, liq: 72, sentiment: 48, yahoo: "GC=F", tv: "COMEX:GC1!" }
  ],
  sectors: [
    { name: "PSU Banks", change: 1.9, strength: 82 },
    { name: "Auto", change: 1.4, strength: 76 },
    { name: "IT Services", change: 1.1, strength: 70 },
    { name: "Pharma", change: 0.8, strength: 64 },
    { name: "Energy", change: 0.6, strength: 61 },
    { name: "FMCG", change: -0.2, strength: 48 }
  ]
};
