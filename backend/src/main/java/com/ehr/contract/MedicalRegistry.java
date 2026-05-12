package com.ehr.contract;

import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.DynamicArray;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.RemoteFunctionCall;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.Contract;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tuples.generated.Tuple3;
import org.web3j.tuples.generated.Tuple4;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;

public class MedicalRegistry extends Contract {
    public static final String BINARY = "0x..."; // Replace with actual compiled bytecode
    public static final String FUNC_ADDRECORD = "addRecord";
    public static final String FUNC_GETRECORDS = "getRecords";
    public static final String FUNC_DELETERECORD = "deleteRecord";
    public static final String FUNC_GRANTACCESS = "grantAccess";
    public static final String FUNC_REVOKEACCESS = "revokeAccess";
    public static final String FUNC_CHECKACCESS = "checkAccess";
    public static final String FUNC_TRIGGEREMERGENCYACCESS = "triggerEmergencyAccess";
    public static final String FUNC_REQUESTEMERGENCYACCESS = "requestEmergencyAccess";
    public static final String FUNC_DENYEMERGENCYACCESS = "denyEmergencyAccess";
    public static final String FUNC_GETEMERGENCYREQUEST = "getEmergencyRequest";
    public static final String FUNC_SETEMERGENCYRESPONDER = "setEmergencyResponder";
    public static final String FUNC_MINTIDENTITYSBT = "mintIdentitySBT";
    public static final String FUNC_ISSUEHEALTHCLEARANCE = "issueHealthClearance";
    public static final String FUNC_VERIFYHEALTHCLEARANCE = "verifyHealthClearance";
    public static final String FUNC_IDENTITYSBTS = "identitySBTs";

    protected MedicalRegistry(String contractAddress, Web3j web3j, Credentials credentials,
            ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, credentials, contractGasProvider);
    }

    public RemoteFunctionCall<TransactionReceipt> addRecord(String _patient, String _ipfsHash, String _recordType) {
        final Function function = new Function(
                FUNC_ADDRECORD,
                Arrays.<Type>asList(new Address(160, _patient),
                        new Utf8String(_ipfsHash),
                        new Utf8String(_recordType)),
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> deleteRecord(String _patient, BigInteger _index) {
        final Function function = new Function(
                FUNC_DELETERECORD,
                Arrays.<Type>asList(new Address(160, _patient),
                        new org.web3j.abi.datatypes.generated.Uint256(_index)),
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public static final String FUNC_GETDOCTORPATIENTS = "getDoctorPatients";
    
    @SuppressWarnings("unchecked")
    public RemoteFunctionCall<List<String>> getDoctorPatients(String _doctor) {
        final Function function = new Function(FUNC_GETDOCTORPATIENTS,
                Arrays.<Type>asList(new Address(160, _doctor)),
                Arrays.<TypeReference<?>>asList(new TypeReference<DynamicArray<Address>>() {}));
        return new RemoteFunctionCall<List<String>>(
                function,
                new Callable<List<String>>() {
                    @Override
                    @SuppressWarnings("unchecked")
                    public List<String> call() throws Exception {
                        List<Type> result = (List<Type>) executeCallSingleValueReturn(function, List.class);
                        return convertToNative(result);
                    }
                });
    }

    @SuppressWarnings("unchecked")
    public RemoteFunctionCall<List<RecordStruct>> getRecords(String _patient) {
        final Function function = new Function(FUNC_GETRECORDS,
                Arrays.<Type>asList(new Address(160, _patient)),
                Arrays.<TypeReference<?>>asList(new TypeReference<DynamicArray<RecordStruct>>() {
                }));
        return (RemoteFunctionCall<List<RecordStruct>>) (Object) executeRemoteCallSingleValueReturn(function, List.class);
    }

    public RemoteFunctionCall<TransactionReceipt> grantAccess(String _doctor, BigInteger _durationSeconds, BigInteger _role) {
        final Function function = new Function(
                FUNC_GRANTACCESS,
                Arrays.<Type>asList(new Address(160, _doctor),
                        new org.web3j.abi.datatypes.generated.Uint256(_durationSeconds),
                        new org.web3j.abi.datatypes.generated.Uint8(_role)),
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> revokeAccess(String _doctor) {
        final Function function = new Function(
                FUNC_REVOKEACCESS,
                Arrays.<Type>asList(new Address(160, _doctor)),
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> triggerEmergencyAccess(String _patient) {
        final Function function = new Function(
                FUNC_TRIGGEREMERGENCYACCESS,
                Arrays.<Type>asList(new Address(160, _patient)),
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> requestEmergencyAccess(String _patient) {
        final Function function = new Function(
                FUNC_REQUESTEMERGENCYACCESS,
                Arrays.<Type>asList(new Address(160, _patient)),
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> denyEmergencyAccess(String _responder) {
        final Function function = new Function(
                FUNC_DENYEMERGENCYACCESS,
                Arrays.<Type>asList(new Address(160, _responder)),
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> setEmergencyResponder(String _responder, Boolean _status) {
        final Function function = new Function(
                FUNC_SETEMERGENCYRESPONDER,
                Arrays.<Type>asList(new Address(160, _responder),
                        new org.web3j.abi.datatypes.Bool(_status)),
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<Tuple4<Boolean, BigInteger, BigInteger, BigInteger>> checkAccess(String _patient, String _doctor) {
        final Function function = new Function(FUNC_CHECKACCESS,
                Arrays.<Type>asList(new Address(160, _patient),
                        new Address(160, _doctor)),
                Arrays.<TypeReference<?>>asList(new TypeReference<org.web3j.abi.datatypes.Bool>() {},
                        new TypeReference<org.web3j.abi.datatypes.generated.Uint256>() {},
                        new TypeReference<org.web3j.abi.datatypes.generated.Uint8>() {},
                        new TypeReference<org.web3j.abi.datatypes.generated.Uint256>() {}));
        return new RemoteFunctionCall<Tuple4<Boolean, BigInteger, BigInteger, BigInteger>>(function,
                new Callable<Tuple4<Boolean, BigInteger, BigInteger, BigInteger>>() {
                    @Override
                    public Tuple4<Boolean, BigInteger, BigInteger, BigInteger> call() throws Exception {
                        List<Type> results = executeCallMultipleValueReturn(function);
                        return new Tuple4<Boolean, BigInteger, BigInteger, BigInteger>(
                                (Boolean) results.get(0).getValue(),
                                (BigInteger) results.get(1).getValue(),
                                (BigInteger) results.get(2).getValue(),
                                (BigInteger) results.get(3).getValue());
                    }
                });
    }

    public RemoteFunctionCall<Tuple3<BigInteger, Boolean, Boolean>> getEmergencyRequest(String _patient, String _responder) {
        final Function function = new Function(FUNC_GETEMERGENCYREQUEST,
                Arrays.<Type>asList(new Address(160, _patient),
                        new Address(160, _responder)),
                Arrays.<TypeReference<?>>asList(new TypeReference<org.web3j.abi.datatypes.generated.Uint256>() {},
                        new TypeReference<org.web3j.abi.datatypes.Bool>() {},
                        new TypeReference<org.web3j.abi.datatypes.Bool>() {}));
        return new RemoteFunctionCall<Tuple3<BigInteger, Boolean, Boolean>>(function,
                new Callable<Tuple3<BigInteger, Boolean, Boolean>>() {
                    @Override
                    public Tuple3<BigInteger, Boolean, Boolean> call() throws Exception {
                        List<Type> results = executeCallMultipleValueReturn(function);
                        return new Tuple3<BigInteger, Boolean, Boolean>(
                                (BigInteger) results.get(0).getValue(),
                                (Boolean) results.get(1).getValue(),
                                (Boolean) results.get(2).getValue());
                    }
                });
    }

    public RemoteFunctionCall<TransactionReceipt> mintIdentitySBT(String _user, BigInteger _type) {
        final Function function = new Function(
                FUNC_MINTIDENTITYSBT, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, _user), 
                new org.web3j.abi.datatypes.generated.Uint8(_type)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> issueHealthClearance(String _patient, byte[] _zkProofHash) {
        final Function function = new Function(
                FUNC_ISSUEHEALTHCLEARANCE, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, _patient),
                new org.web3j.abi.datatypes.generated.Bytes32(_zkProofHash)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<Boolean> verifyHealthClearance(String _patient, byte[] _zkProofHash) {
        final Function function = new Function(FUNC_VERIFYHEALTHCLEARANCE, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, _patient), 
                new org.web3j.abi.datatypes.generated.Bytes32(_zkProofHash)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<org.web3j.abi.datatypes.Bool>() {}));
        return executeRemoteCallSingleValueReturn(function, Boolean.class);
    }

    public RemoteFunctionCall<BigInteger> identitySBTs(String param0) {
        final Function function = new Function(FUNC_IDENTITYSBTS, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, param0)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<org.web3j.abi.datatypes.generated.Uint8>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public static MedicalRegistry load(String contractAddress, Web3j web3j, Credentials credentials,
            ContractGasProvider contractGasProvider) {
        return new MedicalRegistry(contractAddress, web3j, credentials, contractGasProvider);
    }

    public static class RecordStruct extends org.web3j.abi.datatypes.DynamicStruct {
        public String ipfsHash;
        public BigInteger timestamp;
        public String recordType;

        public RecordStruct(String ipfsHash, BigInteger timestamp, String recordType) {
            super(new Utf8String(ipfsHash), new org.web3j.abi.datatypes.generated.Uint256(timestamp),
                    new Utf8String(recordType));
            this.ipfsHash = ipfsHash;
            this.timestamp = timestamp;
            this.recordType = recordType;
        }

        public RecordStruct(Utf8String ipfsHash, org.web3j.abi.datatypes.generated.Uint256 timestamp, Utf8String recordType) {
            super(ipfsHash, timestamp, recordType);
            this.ipfsHash = ipfsHash.getValue();
            this.timestamp = timestamp.getValue();
            this.recordType = recordType.getValue();
        }
    }
}
