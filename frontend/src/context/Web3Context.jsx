import React, { createContext, useState } from 'react';
import Web3 from 'web3';

export const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState('');
    const [web3, setWeb3] = useState(null);
    const [contract, setContract] = useState(null);

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const web3Instance = new Web3(window.ethereum);
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const accounts = await web3Instance.eth.getAccounts();
                setAccount(accounts[0]);
                setWeb3(web3Instance);

                // Updated Smart Contract ABI
                const contractABI = [{ "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "patient", "type": "address" }, { "indexed": true, "internalType": "address", "name": "doctor", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "duration", "type": "uint256" }, { "indexed": false, "internalType": "enum MedicalRegistry.Role", "name": "role", "type": "uint8" }], "name": "AccessGranted", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "patient", "type": "address" }, { "indexed": true, "internalType": "address", "name": "doctor", "type": "address" }], "name": "AccessRevoked", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "patient", "type": "address" }, { "indexed": true, "internalType": "address", "name": "responder", "type": "address" }], "name": "EmergencyAccessTriggered", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "responder", "type": "address" }, { "indexed": false, "internalType": "bool", "name": "status", "type": "bool" }], "name": "EmergencyResponderUpdated", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "patient", "type": "address" }, { "indexed": false, "internalType": "bytes32", "name": "zkProofHash", "type": "bytes32" }], "name": "HealthClearanceIssued", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "enum MedicalRegistry.IdentityType", "name": "identityType", "type": "uint8" }], "name": "IdentityMinted", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "patient", "type": "address" }, { "indexed": false, "internalType": "string", "name": "ipfsHash", "type": "string" }, { "indexed": false, "internalType": "string", "name": "recordType", "type": "string" }], "name": "RecordAdded", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "patient", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "index", "type": "uint256" }], "name": "RecordDeleted", "type": "event" }, { "inputs": [{ "internalType": "address", "name": "_patient", "type": "address" }, { "internalType": "string", "name": "_ipfsHash", "type": "string" }, { "internalType": "string", "name": "_recordType", "type": "string" }], "name": "addRecord", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_patient", "type": "address" }, { "internalType": "address", "name": "_doctor", "type": "address" }], "name": "checkAccess", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint8", "name": "", "type": "uint8" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_patient", "type": "address" }, { "internalType": "uint256", "name": "_index", "type": "uint256" }], "name": "deleteRecord", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "emergencyResponders", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_doctor", "type": "address" }], "name": "getDoctorPatients", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_patient", "type": "address" }], "name": "getRecords", "outputs": [{ "components": [{ "internalType": "string", "name": "ipfsHash", "type": "string" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }, { "internalType": "string", "name": "recordType", "type": "string" }], "internalType": "struct MedicalRegistry.RecordStruct[]", "name": "", "type": "tuple[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_doctor", "type": "address" }, { "internalType": "uint256", "name": "_durationSeconds", "type": "uint256" }, { "internalType": "uint8", "name": "_role", "type": "uint8" }], "name": "grantAccess", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "bytes32", "name": "", "type": "bytes32" }], "name": "healthClearances", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "identitySBTs", "outputs": [{ "internalType": "enum MedicalRegistry.IdentityType", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_patient", "type": "address" }, { "internalType": "bytes32", "name": "_zkProofHash", "type": "bytes32" }], "name": "issueHealthClearance", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "uint8", "name": "_type", "type": "uint8" }], "name": "mintIdentitySBT", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_doctor", "type": "address" }], "name": "revokeAccess", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_responder", "type": "address" }, { "internalType": "bool", "name": "_status", "type": "bool" }], "name": "setEmergencyResponder", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_patient", "type": "address" }], "name": "triggerEmergencyAccess", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_patient", "type": "address" }, { "internalType": "bytes32", "name": "_zkProofHash", "type": "bytes32" }], "name": "verifyHealthClearance", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }];

                // Address from Hardhat deployment
                const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
                const contractInstance = new web3Instance.eth.Contract(contractABI, contractAddress);
                setContract(contractInstance);
            } catch (error) {
                console.error("User denied account access", error);
            }
        } else {
            alert("No Web3 Provider detected. Please install MetaMask!");
        }
    };

    const disconnectWallet = async () => {
        try {
            if (window.ethereum) {
                // EIP-2255: Request to revoke permissions, forces MetaMask to disconnect the site
                await window.ethereum.request({
                    method: "wallet_revokePermissions",
                    params: [{ eth_accounts: {} }]
                });
            }
        } catch (error) {
            console.error("Error revoking MetaMask permissions:", error);
        }

        setAccount(null);
        setContract(null);
        setWeb3(null);
    };

    return (
        <Web3Context.Provider value={{ account, web3, contract, connectWallet, disconnectWallet }}>
            {children}
        </Web3Context.Provider>
    );
};
