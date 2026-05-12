import React, { useContext, useState } from 'react';
import { Web3Context } from '../context/Web3Context';
import axios from 'axios';

const DoctorDashboard = () => {
    const { account, contract, disconnectWallet } = useContext(Web3Context);
    const [patientAddress, setPatientAddress] = useState('');
    const [records, setRecords] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [identityType, setIdentityType] = useState(0);
    const [zkpType, setZkpType] = useState("Vaccinated");
    const [zkpStatus, setZkpStatus] = useState(null);
    const [accessList, setAccessList] = useState([]);

    React.useEffect(() => {
        if (account) {
            fetchIdentity();
            fetchAccessList();
        }
    }, [account]);

    const fetchAccessList = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/records/doctor/${account}/access-list`);
            setAccessList(res.data || []);
        } catch (error) {
            console.error("Error fetching access list:", error);
        }
    };

    const fetchIdentity = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/zkp/identity/${account}`);
            setIdentityType(res.data.identityType);
        } catch (error) {
            console.error("Error fetching identity:", error);
        }
    };

    const formatTimestamp = (ts) => {
        if (!ts || ts === "0") return { date: "Unknown Time", duration: "" };
        const date = new Date(parseInt(ts) * 1000);
        const diffMs = new Date() - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let durationStr = "";
        if (diffDays > 0) durationStr = `${diffDays} days ago`;
        else if (diffHours > 0) durationStr = `${diffHours} hours ago`;
        else if (diffMins > 0) durationStr = `${diffMins} mins ago`;
        else durationStr = "Just now";

        return { 
            date: date.toLocaleDateString() + " " + date.toLocaleTimeString(), 
            duration: durationStr 
        };
    };

    const handleGenerateZKP = async () => {
        if (!patientAddress) return alert("Please enter a Patient Address first.");
        if (identityType !== 2) return alert("You must have a Licensed Doctor SBT to issue a clearance.");
        if (!contract) return alert("Smart contract not loaded.");

        setZkpStatus('Generating and Signing...');
        try {
            // Simulate ZKP generation by hashing the specific fact + patient address
            const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(patientAddress + zkpType + "SECRET_SALT"));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const zkProofHash = "0x" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Call Smart Contract directly via Web3.js using MetaMask
            await contract.methods.issueHealthClearance(patientAddress, zkProofHash).send({ from: account });
            
            setZkpStatus(`Issued & Signed Successfully! Hash: ${zkProofHash.substring(0, 18)}...`);
        } catch (error) {
            console.error("Error generating/signing ZKP:", error);
            setZkpStatus('Error generating or transaction rejected.');
        }
    };

    const searchPatient = async () => {
        try {
            setErrorMsg('');
            setRecords(null);

            // Backend API verifies ACL Smart Contract Modifier rules and explicitly checks callerAddress
            const res = await axios.get(`http://localhost:8080/api/records/${patientAddress}?callerAddress=${account}`);
            setRecords(res.data);

        } catch (err) {
            if (err.response && err.response.status === 403) {
                setErrorMsg("Not Authorized. You don't have access to this patient's records.");
            } else {
                setErrorMsg("Error fetching records. Make sure the backend is running.");
            }
        }
    };

    const [emergencyTimer, setEmergencyTimer] = useState(null);

    const handleEmergencyAccess = async () => {
        if (!window.confirm("WARNING: Break-Glass Protocol will notify the patient and lock access for 3 minutes to allow denial. Proceed?")) return;
        try {
            setErrorMsg('');
            setRecords(null);
            
            // Initiate the Smart Contract Timelock directly
            await contract.methods.requestEmergencyAccess(patientAddress).send({ from: account });
            
            // Notify Patient Dashboard locally
            localStorage.setItem('emergency_request', JSON.stringify({
                doctor: account,
                patient: patientAddress,
                timestamp: Date.now()
            }));

            // Start local polling/timer logic
            setEmergencyTimer(180); // 3 minutes
            alert("Emergency access initiated. Timelock active.");
        } catch (err) {
            console.error(err);
            setErrorMsg("Emergency access request failed. Are you a verified emergency responder?");
        }
    };

    React.useEffect(() => {
        if (emergencyTimer === null) return;
        if (emergencyTimer > 0) {
            const interval = setInterval(() => setEmergencyTimer(prev => prev - 1), 1000);
            return () => clearInterval(interval);
        } else {
            // Timer finished, try to auto-fetch records
            searchPatient();
            setEmergencyTimer(null);
        }
    }, [emergencyTimer]);

    const requestAccess = () => {
        // Trigger generic Off-Chain API Call to notify the patient
        alert("Access request sent to Patient's Dashboard: " + patientAddress);
        // e.g., axios.post('http://localhost:8080/api/requests', { doctor: account, patient: patientAddress })
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in p-6">
            {/* Identity Badge Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 shadow-xl backdrop-blur-xl">
                <div>
                    <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 tracking-tight">
                        Doctor Dashboard
                    </h2>
                    <p className="text-slate-400 font-mono text-sm mt-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700 inline-block">{account}</p>
                </div>
                <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-center gap-4">
                    {identityType === 2 ? (
                        <span className="px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/30 rounded-full font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.15)] animate-fade-in">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            Licensed Doctor SBT
                        </span>
                    ) : (
                        <span className="px-5 py-2.5 bg-slate-800 text-slate-400 border border-slate-600 rounded-full font-bold">Unverified Identity</span>
                    )}
                    <button 
                        onClick={disconnectWallet}
                        className="px-5 py-2.5 bg-red-900/60 text-red-300 border border-red-700/50 rounded-full font-bold hover:bg-red-700 hover:text-white transition-all flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        Logout
                    </button>
                </div>
            </div>

            {/* My Patients Access Panel */}
            <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700/50 shadow-2xl backdrop-blur-xl mb-8 animate-fade-in-up">
                <h3 className="text-xl font-bold mb-6 text-emerald-300 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    My Patients Access List ({accessList.length})
                </h3>
                {accessList.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">You do not have active access to any patients' records.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900/50 text-slate-400 font-medium">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-xl">Patient Address</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Granted At</th>
                                    <th className="px-4 py-3 rounded-tr-xl">Duration Left</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {accessList.map((access, i) => {
                                    const grantedDate = new Date(parseInt(access.grantedAt) * 1000);
                                    let timeLeftStr = "Permanent";
                                    let isExpired = false;

                                    if (access.expirationTime !== "0") {
                                        const expireDate = new Date(parseInt(access.expirationTime) * 1000);
                                        const diffMs = expireDate - new Date();
                                        if (diffMs <= 0) {
                                            timeLeftStr = "Expired";
                                            isExpired = true;
                                        } else {
                                            const diffMins = Math.floor(diffMs / 60000);
                                            const diffHours = Math.floor(diffMins / 60);
                                            const diffDays = Math.floor(diffHours / 24);
                                            if (diffDays > 0) timeLeftStr = `${diffDays} days left`;
                                            else if (diffHours > 0) timeLeftStr = `${diffHours} hours left`;
                                            else timeLeftStr = `${diffMins} mins left`;
                                        }
                                    }

                                    return (
                                        <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                                            <td className="px-4 py-4 font-mono text-xs">{access.patientAddress.substring(0, 15)}...</td>
                                            <td className="px-4 py-4">
                                                <span className="px-2 py-1 bg-slate-700 text-emerald-300 rounded-md font-semibold">
                                                    {["NONE", "PHARMACIST", "GENERAL", "SURGEON"][access.role]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">{grantedDate.toLocaleDateString()} {grantedDate.toLocaleTimeString()}</td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 rounded-md font-semibold ${isExpired ? 'bg-red-900/50 text-red-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
                                                    {timeLeftStr}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Search and Decrypt Patient Record */}

            <div className="bg-slate-900/60 backdrop-blur-xl shadow-xl rounded-3xl p-8 border border-slate-700/50 transition-all duration-300 animate-fade-in-up">

            <div className="flex flex-col md:flex-row gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <input
                    type="text"
                    placeholder="Enter Patient Wallet Address (0x...)"
                    className="border border-slate-600 text-slate-100 px-4 py-3 rounded-xl flex-grow font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800/80 backdrop-blur-sm shadow-sm transition-all duration-200 placeholder-slate-500"
                    value={patientAddress}
                    onChange={(e) => setPatientAddress(e.target.value)}
                />
                <button
                    onClick={searchPatient}
                    disabled={!patientAddress || emergencyTimer !== null}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none">
                    Search
                </button>
                <button
                    onClick={handleEmergencyAccess}
                    disabled={!patientAddress || emergencyTimer !== null}
                    className="bg-red-900/60 text-red-300 border border-red-700/50 px-6 py-3 rounded-xl font-bold hover:bg-red-700 hover:text-white transition-all duration-200 disabled:opacity-50 flex-none flex items-center gap-2"
                    title="Emergency Access (Break-Glass Protocol)">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Break-Glass
                </button>
            </div>

            {emergencyTimer !== null && (
                <div className="mb-8 p-5 bg-amber-900/40 backdrop-blur-sm border border-amber-500/50 text-amber-300 rounded-2xl flex items-center gap-4 shadow-lg animate-pulse">
                    <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div>
                        <h4 className="font-bold text-lg">Timelock Active</h4>
                        <p className="text-sm text-amber-400/80">
                            Break-Glass protocol initiated. Waiting for patient denial window to close... 
                            <strong className="text-amber-200 ml-2 block sm:inline mt-1 sm:mt-0 text-xl">{Math.floor(emergencyTimer / 60)}:{(emergencyTimer % 60).toString().padStart(2, '0')}</strong>
                        </p>
                    </div>
                </div>
            )}

            {/* ZKP Generation Section for Doctors */}
            {patientAddress && (
                <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700/50 shadow-2xl backdrop-blur-xl mb-8 animate-fade-in-up">
                    <h3 className="text-xl font-bold mb-4 text-purple-300 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        Issue Zero-Knowledge Clearance
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                        As a verified Doctor, you can cryptographically sign and issue a health clearance proof for this patient.
                    </p>
                    <div className="flex flex-col md:flex-row gap-4">
                        <select 
                            value={zkpType} 
                            onChange={(e) => setZkpType(e.target.value)}
                            className="border border-slate-600 text-slate-100 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-900/80 flex-grow">
                            <option value="Vaccinated">COVID-19 Vaccinated</option>
                            <option value="FitForWork">Fit for Work</option>
                            <option value="NoAllergies">No Severe Allergies</option>
                        </select>
                        <button
                            onClick={handleGenerateZKP}
                            className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap">
                            Generate & Sign Proof
                        </button>
                    </div>
                    {zkpStatus && (
                        <div className="mt-4 p-3 bg-slate-900/50 rounded-xl border border-purple-500/30 text-sm font-mono text-purple-300 break-all">
                            {zkpStatus}
                        </div>
                    )}
                </div>
            )}

            {errorMsg && (
                <div className="mt-4 p-5 bg-red-900/40 backdrop-blur-sm border border-red-800/50 text-red-300 rounded-2xl flex flex-col items-start gap-4 shadow-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <p className="font-semibold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {errorMsg}
                    </p>
                    {errorMsg.includes("Not Authorized") && (
                        <button onClick={requestAccess} className="bg-red-600 text-white px-6 py-2.5 rounded-xl shadow hover:bg-red-500 hover:shadow-md transition-all font-bold hover:-translate-y-0.5 duration-200">
                            Request Access
                        </button>
                    )}
                </div>
            )}

            {records && (
                <div className="mt-8 pt-6 border-t border-slate-700/60 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <h3 className="text-xl font-bold mb-5 flex items-center gap-2 text-emerald-300">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Decrypted Records File List
                    </h3>
                    <ul className="space-y-4">
                        {records.map((rec, i) => (
                            <li key={i} className="group flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all duration-300 transform hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: `${300 + i * 100}ms` }}>
                                <div className="mb-4 md:mb-0">
                                    <span className="font-bold text-lg text-emerald-200 group-hover:text-emerald-400 transition-colors">{rec.recordType}</span>
                                    <div className="text-sm font-mono mt-1 break-all text-slate-400">
                                        IPFS: {rec.ipfsHash} <span className="text-emerald-400 ml-2 font-semibold bg-emerald-900/40 px-2 py-0.5 rounded-md text-xs border border-emerald-800/50">Decrypted Ready</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3 w-full md:w-auto items-center mt-3 md:mt-0">
                                    <div className="flex flex-col justify-center text-xs text-slate-400 font-mono bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700 w-full md:w-auto">
                                        <span>Uploaded: <span className="text-slate-300">{formatTimestamp(rec.timestamp).date}</span></span>
                                        <span>Duration: <span className="text-emerald-400">{formatTimestamp(rec.timestamp).duration}</span></span>
                                    </div>
                                    <a
                                        href={`http://localhost:8080/api/records/download/${rec.ipfsHash}`}
                                        className="flex-1 md:flex-none text-center px-6 py-2.5 bg-emerald-900/40 text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-xl font-semibold transition-colors duration-200 border border-emerald-800/50 hover:border-emerald-500"
                                        download>
                                        Download
                                    </a>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            </div>
        </div>
    );
};

export default DoctorDashboard;
