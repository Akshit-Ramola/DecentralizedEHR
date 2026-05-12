import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

export default {
    solidity: "0.8.20",
    paths: {
        sources: "./contracts"
    },
    networks: {
        sepolia: {
            url: process.env.RPC_URL || "https://rpc2.sepolia.org",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
        }
    }
};
