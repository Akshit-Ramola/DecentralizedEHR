package com.ehr.service;

import com.ehr.contract.MedicalRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.tuples.generated.Tuple3;
import org.web3j.tuples.generated.Tuple4;

import jakarta.annotation.PostConstruct;
import java.math.BigInteger;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;

@Service
public class BlockchainService {
    
    @Value("${web3j.client-address:http://127.0.0.1:8545}") // Default Ganache/Hardhat RPC URL
    private String rpcUrl;
    
    @Value("${contract.address}")
    private String contractAddress;
    
    @Value("${wallet.private-key}")
    private String privateKey;
    
    private Web3j web3j;
    private MedicalRegistry medicalRegistry;
    
    @PostConstruct
    public void init() {
        // Connect to the local Hardhat/Ganache provider
        this.web3j = Web3j.build(new HttpService(rpcUrl));
        
        // Load the caller's wallet (Backend wallet handling the transactions)
        Credentials credentials = Credentials.create(privateKey);
        
        // Load the Smart Contract Wrapper
        this.medicalRegistry = MedicalRegistry.load(contractAddress, web3j, credentials, new DefaultGasProvider());
    }
    
    public String addRecord(String patientAddress, String ipfsHash, String recordType) throws Exception {
        // Call the addRecord function on the blockchain
        TransactionReceipt receipt = medicalRegistry.addRecord(patientAddress, ipfsHash, recordType).send();
        return receipt.getTransactionHash();
    }
    
    public List<MedicalRegistry.RecordStruct> getPatientRecords(String patientAddress) throws Exception {
        // The contract's onlyAuthorized modifier automatically throws an exception if the
        // caller (msg.sender - our configured privateKey wallet) lacks permission.
        return medicalRegistry.getRecords(patientAddress).send();
    }
    
    public String deleteRecord(String patientAddress, int index) throws Exception {
        TransactionReceipt receipt = medicalRegistry.deleteRecord(patientAddress, java.math.BigInteger.valueOf(index)).send();
        return receipt.getTransactionHash();
    }

    public String grantAccess(String doctorAddress, long durationSeconds, int role) throws Exception {
        TransactionReceipt receipt = medicalRegistry.grantAccess(doctorAddress, BigInteger.valueOf(durationSeconds), BigInteger.valueOf(role)).send();
        return receipt.getTransactionHash();
    }

    public String revokeAccess(String doctorAddress) throws Exception {
        TransactionReceipt receipt = medicalRegistry.revokeAccess(doctorAddress).send();
        return receipt.getTransactionHash();
    }

    public Object checkAccess(String patientAddress, String doctorAddress) throws Exception {
        Tuple4<Boolean, BigInteger, BigInteger, BigInteger> result = medicalRegistry.checkAccess(patientAddress, doctorAddress).send();
        return result;
    }

    public List<Map<String, Object>> getDoctorAccessList(String doctorAddress) throws Exception {
        List<String> patients = medicalRegistry.getDoctorPatients(doctorAddress).send();
        List<Map<String, Object>> accessList = new ArrayList<>();
        
        for (String patient : patients) {
            Tuple4<Boolean, BigInteger, BigInteger, BigInteger> access = medicalRegistry.checkAccess(patient, doctorAddress).send();
            boolean isValid = access.component1();
            if (isValid) {
                Map<String, Object> info = new HashMap<>();
                info.put("patientAddress", patient);
                info.put("expirationTime", access.component2().toString());
                info.put("role", access.component3().intValue());
                info.put("grantedAt", access.component4().toString());
                accessList.add(info);
            }
        }
        return accessList;
    }

    public String triggerEmergencyAccess(String patientAddress) throws Exception {
        TransactionReceipt receipt = medicalRegistry.triggerEmergencyAccess(patientAddress).send();
        return receipt.getTransactionHash();
    }

    public String requestEmergencyAccess(String patientAddress) throws Exception {
        TransactionReceipt receipt = medicalRegistry.requestEmergencyAccess(patientAddress).send();
        return receipt.getTransactionHash();
    }

    public String denyEmergencyAccess(String responderAddress) throws Exception {
        TransactionReceipt receipt = medicalRegistry.denyEmergencyAccess(responderAddress).send();
        return receipt.getTransactionHash();
    }

    public Map<String, Object> getEmergencyRequest(String patientAddress, String responderAddress) throws Exception {
        Tuple3<BigInteger, Boolean, Boolean> result = medicalRegistry.getEmergencyRequest(patientAddress, responderAddress).send();
        Map<String, Object> req = new HashMap<>();
        req.put("unlockTime", result.component1().toString());
        req.put("isDenied", result.component2());
        req.put("isActive", result.component3());
        return req;
    }

    public String setEmergencyResponder(String responderAddress, boolean status) throws Exception {
        TransactionReceipt receipt = medicalRegistry.setEmergencyResponder(responderAddress, status).send();
        return receipt.getTransactionHash();
    }

    public String mintIdentitySBT(String userAddress, int identityType) throws Exception {
        TransactionReceipt receipt = medicalRegistry.mintIdentitySBT(userAddress, BigInteger.valueOf(identityType)).send();
        return receipt.getTransactionHash();
    }

    public String issueHealthClearance(String patientAddress, byte[] zkProofHash) throws Exception {
        TransactionReceipt receipt = medicalRegistry.issueHealthClearance(patientAddress, zkProofHash).send();
        return receipt.getTransactionHash();
    }

    public boolean verifyHealthClearance(String patientAddress, byte[] zkProofHash) throws Exception {
        return medicalRegistry.verifyHealthClearance(patientAddress, zkProofHash).send();
    }

    public int getIdentityType(String userAddress) throws Exception {
        return medicalRegistry.identitySBTs(userAddress).send().intValue();
    }
}
