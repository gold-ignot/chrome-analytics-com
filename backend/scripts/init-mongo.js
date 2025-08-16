// MongoDB initialization script
db = db.getSiblingDB('chrome_analytics');

// Create indexes for better performance
db.extensions.createIndex({ "extensionId": 1 }, { unique: true });
db.extensions.createIndex({ "name": "text", "description": "text", "developer": "text" });
db.extensions.createIndex({ "users": -1 });
db.extensions.createIndex({ "rating": -1 });
db.extensions.createIndex({ "updatedAt": -1 });

db.analytics.createIndex({ "extensionId": 1, "date": -1 });

// Insert sample data for testing
db.extensions.insertMany([
  {
    extensionId: "cjpalhdlnbpafiamejdnhcphjbkeiagm",
    name: "uBlock Origin",
    description: "Finally, an efficient blocker. Easy on CPU and memory.",
    category: "Productivity",
    developer: "Raymond Hill",
    users: 10000000,
    rating: 4.8,
    reviewCount: 124567,
    keywords: ["adblocker", "privacy", "security", "productivity"],
    createdAt: new Date(),
    updatedAt: new Date(),
    snapshots: [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        users: 9950000,
        rating: 4.7,
        reviewCount: 124000
      },
      {
        date: new Date(),
        users: 10000000,
        rating: 4.8,
        reviewCount: 124567
      }
    ]
  },
  {
    extensionId: "nkbihfbeogaeaoehlefnkodbefgpgknn",
    name: "MetaMask",
    description: "An Ethereum Wallet in your Browser",
    category: "Finance",
    developer: "MetaMask",
    users: 30000000,
    rating: 4.2,
    reviewCount: 89234,
    keywords: ["ethereum", "wallet", "cryptocurrency", "web3"],
    createdAt: new Date(),
    updatedAt: new Date(),
    snapshots: [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        users: 29800000,
        rating: 4.1,
        reviewCount: 88900
      },
      {
        date: new Date(),
        users: 30000000,
        rating: 4.2,
        reviewCount: 89234
      }
    ]
  },
  {
    extensionId: "gighmmpiobklfepjocnamgkkbiglidom",
    name: "AdBlock",
    description: "Block ads and pop-ups on YouTube, Facebook, Twitch, and your favorite websites.",
    category: "Productivity",
    developer: "AdBlock",
    users: 65000000,
    rating: 4.6,
    reviewCount: 567890,
    keywords: ["adblocker", "youtube", "facebook", "productivity"],
    createdAt: new Date(),
    updatedAt: new Date(),
    snapshots: [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        users: 64800000,
        rating: 4.5,
        reviewCount: 565000
      },
      {
        date: new Date(),
        users: 65000000,
        rating: 4.6,
        reviewCount: 567890
      }
    ]
  }
]);

// Insert sample analytics data
db.analytics.insertMany([
  {
    extensionId: "cjpalhdlnbpafiamejdnhcphjbkeiagm",
    date: new Date(),
    metrics: {
      userGrowth: 50000,
      ratingChange: 0.1,
      reviewGrowth: 567
    },
    keywords: [
      { keyword: "adblocker", position: 2, searchVolume: 12000 },
      { keyword: "privacy", position: 5, searchVolume: 8500 },
      { keyword: "security", position: 8, searchVolume: 6200 }
    ]
  },
  {
    extensionId: "nkbihfbeogaeaoehlefnkodbefgpgknn",
    date: new Date(),
    metrics: {
      userGrowth: 200000,
      ratingChange: 0.1,
      reviewGrowth: 334
    },
    keywords: [
      { keyword: "ethereum", position: 1, searchVolume: 15000 },
      { keyword: "wallet", position: 3, searchVolume: 11000 },
      { keyword: "cryptocurrency", position: 4, searchVolume: 9500 }
    ]
  }
]);

print("Database initialized with sample data");