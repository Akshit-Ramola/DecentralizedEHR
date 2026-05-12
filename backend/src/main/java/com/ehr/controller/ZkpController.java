package com.ehr.controller;

import com.ehr.service.BlockchainService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.web3j.utils.Numeric;

import java.util.Map;

@RestController
@RequestMapping("/api/zkp")
public class ZkpController {

    private final BlockchainService blockchainService;

    public ZkpController(BlockchainService blockchainService) {
        this.blockchainService = blockchainService;
    }


    @GetMapping("/verify/{patientAddress}/{zkProofHash}")
    public ResponseEntity<?> verifyClearance(@PathVariable String patientAddress, @PathVariable String zkProofHash) {
        try {
            byte[] hashBytes = Numeric.hexStringToByteArray(zkProofHash.startsWith("0x") ? zkProofHash : "0x" + zkProofHash);
            boolean isValid = blockchainService.verifyHealthClearance(patientAddress, hashBytes);
            return ResponseEntity.ok(Map.of("patient", patientAddress, "zkProofHash", zkProofHash, "isValid", isValid));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/identity/{userAddress}")
    public ResponseEntity<?> getIdentity(@PathVariable String userAddress) {
        try {
            int identityType = blockchainService.getIdentityType(userAddress);
            String identityName = "NONE";
            if (identityType == 1) identityName = "PATIENT";
            if (identityType == 2) identityName = "LICENSED_DOCTOR";
            return ResponseEntity.ok(Map.of("user", userAddress, "identityType", identityType, "identityName", identityName));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
