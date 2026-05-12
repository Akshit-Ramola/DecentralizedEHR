// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalRegistry {
    
    struct RecordStruct {
        string ipfsHash;
        uint256 timestamp;
        string recordType;
    }
    
    enum Role { NONE, PHARMACIST, GENERAL, SURGEON }
    enum IdentityType { NONE, PATIENT, LICENSED_DOCTOR }
    
    struct AccessRight {
        bool hasAccess;
        uint256 expirationTime; // 0 = permanent
        Role role;
        uint256 grantedAt;
    }

    struct EmergencyRequest {
        uint256 unlockTime;
        bool isDenied;
        bool isActive;
    }
    
    uint256 public constant TIMELOCK_DURATION = 3 minutes;
    
    // Mapping from patient address to their list of records
    mapping(address => RecordStruct[]) private patientRecords;
    
    // Access Control List: patient => doctor => AccessRight
    mapping(address => mapping(address => AccessRight)) private doctorAccess;
    
    // Doctor Tracking: doctor => list of patients they have interacted with
    mapping(address => address[]) private doctorPatients;
    mapping(address => mapping(address => bool)) private doctorPatientAdded;
    
    // Emergency Responders
    mapping(address => bool) public emergencyResponders;
    mapping(address => mapping(address => EmergencyRequest)) public emergencyRequests;
    
    // Soulbound Tokens (Identity Masking)
    mapping(address => IdentityType) public identitySBTs;
    
    // ZKP Health Clearances: patient => clearanceHash => bool
    mapping(address => mapping(bytes32 => bool)) public healthClearances;
    
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // Events
    event RecordAdded(address indexed patient, string ipfsHash, string recordType);
    event RecordDeleted(address indexed patient, uint256 index);
    event AccessGranted(address indexed patient, address indexed doctor, uint256 duration, Role role);
    event AccessRevoked(address indexed patient, address indexed doctor);
    event EmergencyAccessTriggered(address indexed patient, address indexed responder); // Legacy, kept for ABI compatibility
    event EmergencyAccessRequested(address indexed patient, address indexed responder, uint256 unlockTime);
    event EmergencyAccessDenied(address indexed patient, address indexed responder);
    event EmergencyResponderUpdated(address indexed responder, bool status);
    event IdentityMinted(address indexed user, IdentityType identityType);
    event HealthClearanceIssued(address indexed patient, bytes32 zkProofHash);
    
    // Modifier to check if caller is the patient or an authorized doctor or the backend owner
    modifier onlyAuthorized(address _patient) {
        if (msg.sender == _patient || msg.sender == owner) {
            _;
            return;
        }
        
        if (emergencyResponders[msg.sender]) {
            EmergencyRequest memory req = emergencyRequests[_patient][msg.sender];
            require(req.isActive, "No active emergency request");
            require(!req.isDenied, "Emergency access was denied by patient");
            require(block.timestamp >= req.unlockTime, "Timelock is still active");
            _;
            return;
        }

        AccessRight memory access = doctorAccess[_patient][msg.sender];
        require(access.hasAccess, "Not authorized to view these records");
        require(access.expirationTime == 0 || block.timestamp <= access.expirationTime, "Access expired");
        
        _;
    }
    
    // Admin function to set emergency responders
    function setEmergencyResponder(address _responder, bool _status) public {
        require(msg.sender == owner, "Only owner can set emergency responders");
        emergencyResponders[_responder] = _status;
        emit EmergencyResponderUpdated(_responder, _status);
    }

    // Function to request emergency access (starts the timelock)
    function requestEmergencyAccess(address _patient) public {
        require(emergencyResponders[msg.sender], "Not an emergency responder");
        uint256 unlock = block.timestamp + TIMELOCK_DURATION;
        emergencyRequests[_patient][msg.sender] = EmergencyRequest({
            unlockTime: unlock,
            isDenied: false,
            isActive: true
        });
        emit EmergencyAccessRequested(_patient, msg.sender, unlock);
    }

    // Function for patient to deny an active emergency request
    function denyEmergencyAccess(address _responder) public {
        require(emergencyRequests[msg.sender][_responder].isActive, "No active request");
        emergencyRequests[msg.sender][_responder].isDenied = true;
        emit EmergencyAccessDenied(msg.sender, _responder);
    }

    // Legacy function, kept to avoid breaking ABI if possible, but updated to use the new flow
    function triggerEmergencyAccess(address _patient) public {
        requestEmergencyAccess(_patient);
    }
    
    // Add a new record
    function addRecord(address _patient, string memory _ipfsHash, string memory _recordType) public onlyAuthorized(_patient) {
        patientRecords[_patient].push(RecordStruct({
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            recordType: _recordType
        }));
        emit RecordAdded(_patient, _ipfsHash, _recordType);
    }
    
    // Delete a record by index
    function deleteRecord(address _patient, uint256 _index) public onlyAuthorized(_patient) {
        require(_index < patientRecords[_patient].length, "Index out of bounds");
        
        uint256 lastIndex = patientRecords[_patient].length - 1;
        if (_index != lastIndex) {
            patientRecords[_patient][_index] = patientRecords[_patient][lastIndex];
        }
        patientRecords[_patient].pop();
        
        emit RecordDeleted(_patient, _index);
    }
    
    // Grant access to a doctor for a specific duration
    function grantAccess(address _doctor, uint256 _durationSeconds, uint8 _role) public {
        uint256 expiration = _durationSeconds == 0 ? 0 : block.timestamp + _durationSeconds;
        doctorAccess[msg.sender][_doctor] = AccessRight({
            hasAccess: true,
            expirationTime: expiration,
            role: Role(_role),
            grantedAt: block.timestamp
        });
        
        if (!doctorPatientAdded[_doctor][msg.sender]) {
            doctorPatients[_doctor].push(msg.sender);
            doctorPatientAdded[_doctor][msg.sender] = true;
        }
        
        emit AccessGranted(msg.sender, _doctor, _durationSeconds, Role(_role));
    }
    
    // Revoke access from a doctor
    function revokeAccess(address _doctor) public {
        delete doctorAccess[msg.sender][_doctor];
        emit AccessRevoked(msg.sender, _doctor);
    }
    
    // Get records for a patient
    function getRecords(address _patient) public view onlyAuthorized(_patient) returns (RecordStruct[] memory) {
        return patientRecords[_patient];
    }
    
    // Check if a doctor has access to a patient's records, returning role, expiration, and grant time
    function checkAccess(address _patient, address _doctor) public view returns (bool, uint256, uint8, uint256) {
        if (_doctor == owner) {
            return (true, 0, uint8(Role.SURGEON), block.timestamp); // Full access
        }

        if (emergencyResponders[_doctor]) {
            EmergencyRequest memory req = emergencyRequests[_patient][_doctor];
            bool isEmergencyValid = req.isActive && !req.isDenied && block.timestamp >= req.unlockTime;
            return (isEmergencyValid, 0, uint8(Role.SURGEON), block.timestamp);
        }
        
        AccessRight memory access = doctorAccess[_patient][_doctor];
        bool isValid = access.hasAccess && (access.expirationTime == 0 || block.timestamp <= access.expirationTime);
        return (isValid, access.expirationTime, uint8(access.role), access.grantedAt);
    }
    
    // Get list of patients a doctor has interacted with
    function getDoctorPatients(address _doctor) public view returns (address[] memory) {
        return doctorPatients[_doctor];
    }

    // Helper to view an emergency request
    function getEmergencyRequest(address _patient, address _responder) public view returns (uint256 unlockTime, bool isDenied, bool isActive) {
        EmergencyRequest memory req = emergencyRequests[_patient][_responder];
        return (req.unlockTime, req.isDenied, req.isActive);
    }
    
    // Mint Soulbound Token (Identity Masking)
    function mintIdentitySBT(address _user, uint8 _type) public {
        require(msg.sender == owner, "Only owner can mint SBT");
        identitySBTs[_user] = IdentityType(_type);
        emit IdentityMinted(_user, IdentityType(_type));
    }
    
    // ZKP: Issue a Health Clearance (Verification without disclosure)
    function issueHealthClearance(address _patient, bytes32 _zkProofHash) public {
        require(identitySBTs[msg.sender] == IdentityType.LICENSED_DOCTOR, "Only licensed doctors can issue health clearances");
        // In a real ZKP system, the patient generates a cryptographic proof. We simulate the hash registration here.
        healthClearances[_patient][_zkProofHash] = true;
        emit HealthClearanceIssued(_patient, _zkProofHash);
    }
    
    // ZKP: Verify a Health Clearance
    function verifyHealthClearance(address _patient, bytes32 _zkProofHash) public view returns (bool) {
        return healthClearances[_patient][_zkProofHash];
    }
}
