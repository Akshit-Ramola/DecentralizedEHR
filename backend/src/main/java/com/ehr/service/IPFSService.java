package com.ehr.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import com.ehr.exception.StorageUnavailableException;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.security.Key;
import java.util.Map;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class IPFSService {

    @Value("${pinata.api.key}")
    private String pinataApiKey;

    @Value("${pinata.secret.api.key}")
    private String pinataSecretApiKey;

    // In production, fetch this dynamically or from a secure vault (must be 32
    // bytes for AES-256)
    @Value("${aes.secret.key:12345678901234567890123456789012}")
    private String aesSecretKey;

    private final WebClient webClient = WebClient.builder().baseUrl("https://api.pinata.cloud").build();

    public String encryptAndUpload(MultipartFile file) throws Exception {
        // 1. Read file bytes
        byte[] fileBytes = file.getBytes();

        // 2. Encrypt using AES-256
        byte[] encryptedBytes = encryptAES(fileBytes);

        // 3. Upload encypted binary to IPFS via Pinata API
        return uploadToPinata(encryptedBytes, file.getOriginalFilename() + ".enc");
    }

    private byte[] encryptAES(byte[] data) throws Exception {
        byte[] keyBytes;
        // If the key is exactly 64 characters, treat it as a hex string (32 bytes)
        if (aesSecretKey.length() == 64) {
            keyBytes = org.web3j.utils.Numeric.hexStringToByteArray(aesSecretKey);
        } else {
            keyBytes = aesSecretKey.getBytes();
        }

        Key key = new SecretKeySpec(keyBytes, "AES");
        Cipher cipher = Cipher.getInstance("AES");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        return cipher.doFinal(data);
    }

    private String uploadToPinata(byte[] fileBytes, String filename) {
        // If using the default/dummy Pinata key, return a mock IPFS hash for local testing
        // We will store the encrypted bytes locally to simulate IPFS storage so downloads work properly.
        if ("40f1a4b6218857acb96a".equals(pinataApiKey) || pinataApiKey == null || pinataApiKey.isEmpty()) {
            System.out.println("Using dummy Pinata API key. Mocking IPFS upload to local disk...");
            String mockHash = "QmMockHashForTesting123abcXYZ" + System.currentTimeMillis();
            try {
                Path mockDir = Paths.get("mock_ipfs");
                if (!Files.exists(mockDir)) {
                    Files.createDirectories(mockDir);
                }
                Files.write(mockDir.resolve(mockHash), fileBytes);
            } catch (Exception e) {
                System.err.println("Failed to write mock IPFS file locally: " + e.getMessage());
            }
            return mockHash;
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        // Wrap bytes in ByteArrayResource so WebClient handles it as a file part
        body.add("file", new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        });

        // Push File to IPFS
        try {
            Map response = webClient.post()
                    .uri("/pinning/pinFileToIPFS")
                    .header("pinata_api_key", pinataApiKey)
                    .header("pinata_secret_api_key", pinataSecretApiKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            return (String) response.get("IpfsHash"); // Return the CID
        } catch (WebClientResponseException e) {
            // Catches 4xx from Pinata (e.g., unauthorized) or 5xx (Pinata down)
            throw new StorageUnavailableException("Storage Service Unavailable. Please try again later.", e);
        }
    }

    public byte[] downloadAndDecrypt(String ipfsHash) throws Exception {
        byte[] encryptedBytes;

        // Check if it's our mock hash
        if (ipfsHash.startsWith("QmMockHashForTesting")) {
            System.out.println("Intercepted mock IPFS hash. Returning decrypted bytes from local disk simulation...");
            try {
                Path mockPath = Paths.get("mock_ipfs", ipfsHash);
                if (Files.exists(mockPath)) {
                    encryptedBytes = Files.readAllBytes(mockPath);
                    return decryptAES(encryptedBytes);
                } else {
                    return "This is a mocked health record downloaded from local simulation (Original file not found).".getBytes();
                }
            } catch (Exception e) {
                System.err.println("Failed to read mock IPFS file locally: " + e.getMessage());
                return "Error reading mocked file.".getBytes();
            }
        }

        // Fetch from Pinata Gateway
        try {
            encryptedBytes = org.springframework.web.reactive.function.client.WebClient.create()
                    .get()
                    .uri("https://gateway.pinata.cloud/ipfs/" + ipfsHash)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block();
        } catch (Exception e) {
            throw new StorageUnavailableException("Failed to download from IPFS Gateway: " + e.getMessage(), e);
        }

        // Decrypt using AES-256
        return decryptAES(encryptedBytes);
    }

    private byte[] decryptAES(byte[] encryptedData) throws Exception {
        byte[] keyBytes;
        if (aesSecretKey.length() == 64) {
            keyBytes = org.web3j.utils.Numeric.hexStringToByteArray(aesSecretKey);
        } else {
            keyBytes = aesSecretKey.getBytes();
        }

        Key key = new SecretKeySpec(keyBytes, "AES");
        Cipher cipher = Cipher.getInstance("AES");
        cipher.init(Cipher.DECRYPT_MODE, key);
        return cipher.doFinal(encryptedData);
    }
}
