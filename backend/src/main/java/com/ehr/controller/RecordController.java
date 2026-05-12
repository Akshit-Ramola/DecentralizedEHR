package com.ehr.controller;

import com.ehr.service.BlockchainService;
import com.ehr.service.IPFSService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/records")
public class RecordController {

    private final BlockchainService blockchainService;
    private final IPFSService ipfsService;

    public RecordController(BlockchainService blockchainService, IPFSService ipfsService) {
        this.blockchainService = blockchainService;
        this.ipfsService = ipfsService;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadRecord(
            @RequestParam("file") MultipartFile file,
            @RequestParam("patientAddress") String patientAddress,
            @RequestParam("recordType") String recordType) {
        try {
            // 1. Encrypt file (AES-256) and Upload to IPFS via Pinata
            String ipfsHash = ipfsService.encryptAndUpload(file);

            // 2. Add Hash & Metadata to the Polygon/Local Blockchain
            String txHash = blockchainService.addRecord(patientAddress, ipfsHash, recordType);

            return ResponseEntity.ok(Map.of(
                    "message", "EHR Record encrypted and saved successfully",
                    "ipfsHash", ipfsHash,
                    "transactionHash", txHash));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{patientAddress}")
    public ResponseEntity<?> getRecords(@PathVariable String patientAddress, @RequestParam(required = false) String callerAddress) {
        try {
            // Permission check happens inherently inside BlockchainService/Smart Contract for owner
            // But we must enforce ACL rules explicitly for the callerAddress
            if (callerAddress != null && !callerAddress.equalsIgnoreCase(patientAddress)) {
                org.web3j.tuples.generated.Tuple4<Boolean, java.math.BigInteger, java.math.BigInteger, java.math.BigInteger> accessDetails = 
                    (org.web3j.tuples.generated.Tuple4<Boolean, java.math.BigInteger, java.math.BigInteger, java.math.BigInteger>) blockchainService.checkAccess(patientAddress, callerAddress);
                Boolean hasAccess = accessDetails.component1();
                java.math.BigInteger expiration = accessDetails.component2();
                java.math.BigInteger roleId = accessDetails.component3();
                
                if (!hasAccess) {
                    return ResponseEntity.status(403).body(Map.of("error", "Access Denied: You do not have permission."));
                }
                
                if (expiration.compareTo(java.math.BigInteger.ZERO) > 0 && expiration.compareTo(java.math.BigInteger.valueOf(System.currentTimeMillis() / 1000)) < 0) {
                    return ResponseEntity.status(403).body(Map.of("error", "Access Denied: Your access has expired."));
                }

                var records = blockchainService.getPatientRecords(patientAddress);
                
                // Role 1 = PHARMACIST, only allow Medication
                if (roleId.intValue() == 1) {
                    records = records.stream()
                        .filter(r -> r.recordType != null && r.recordType.toLowerCase().contains("medication"))
                        .toList();
                }

                var mappedRecords = records.stream().map(r -> Map.of(
                    "ipfsHash", r.ipfsHash != null ? r.ipfsHash : "",
                    "timestamp", r.timestamp != null ? r.timestamp.toString() : "0",
                    "recordType", r.recordType != null ? r.recordType : ""
                )).toList();
                return ResponseEntity.ok(mappedRecords);
            }

            // If it's the patient themselves or no callerAddress provided (defaulting to patient viewing their own)
            var records = blockchainService.getPatientRecords(patientAddress);
            var mappedRecords = records.stream().map(r -> Map.of(
                "ipfsHash", r.ipfsHash != null ? r.ipfsHash : "",
                "timestamp", r.timestamp != null ? r.timestamp.toString() : "0",
                "recordType", r.recordType != null ? r.recordType : ""
            )).toList();
            return ResponseEntity.ok(mappedRecords);
        } catch (Throwable e) {
            return ResponseEntity.status(403).body(Map.of(
                    "error", "Access Denied or Not Authorized",
                    "details", e.getMessage() != null ? e.getMessage() : e.toString(),
                    "cause", e.getCause() != null ? e.getCause().toString() : "null"));
        }
    }

    private String determineExtension(byte[] data) {
        if (data.length >= 4) {
            if (data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 && data[3] == 0x46) return ".pdf";
            if (data[0] == (byte) 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47) return ".png";
            if (data[0] == (byte) 0xFF && data[1] == (byte) 0xD8) return ".jpg";
        }
        return ".pdf"; // default to pdf as requested
    }

    @GetMapping("/download/{ipfsHash}")
    public ResponseEntity<org.springframework.core.io.Resource> downloadRecord(@PathVariable String ipfsHash) {
        try {
            byte[] decryptedData = ipfsService.downloadAndDecrypt(ipfsHash);
            org.springframework.core.io.ByteArrayResource resource = new org.springframework.core.io.ByteArrayResource(
                    decryptedData);

            String extension = determineExtension(decryptedData);
            
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"record-" + ipfsHash + extension + "\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(decryptedData.length)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{patientAddress}/{index}")
    public ResponseEntity<?> deleteRecord(@PathVariable String patientAddress, @PathVariable int index) {
        try {
            String txHash = blockchainService.deleteRecord(patientAddress, index);
            return ResponseEntity.ok(Map.of(
                    "message", "Record deleted successfully",
                    "transactionHash", txHash));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/doctor/{doctorAddress}/access-list")
    public ResponseEntity<?> getDoctorAccessList(@PathVariable String doctorAddress) {
        try {
            List<Map<String, Object>> accessList = blockchainService.getDoctorAccessList(doctorAddress);
            return ResponseEntity.ok(accessList);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/patient/{patientAddress}/emergency-request/{responderAddress}")
    public ResponseEntity<?> getEmergencyRequest(
            @PathVariable String patientAddress, 
            @PathVariable String responderAddress) {
        try {
            Map<String, Object> req = blockchainService.getEmergencyRequest(patientAddress, responderAddress);
            return ResponseEntity.ok(req);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
