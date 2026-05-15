import React, { useContext, useState, useEffect } from 'react';
import { Web3Context } from '../context/Web3Context';
import axios from 'axios';

const PatientDashboard = () => {
    const { account, contract, disconnectWallet } = useContext(Web3Context);
    const [records, setRecords] = useState([]);

    const [file, setFile] = useState(null);
    const [recordType, setRecordType] = useState('Laboratory Results');
    const [isUploading, setIsUploading] = useState(false);
    const [deletingIndex, setDeletingIndex] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [approvedDoctors, setApprovedDoctors] = useState([]);

    // In a real dApp, access requests might be stored in a traditional DB or via off-chain IPFS notifications.
    const [requests, setRequests] = useState([]);

    const [identityType, setIdentityType] = useState(0); // 0=NONE, 1=PATIENT, 2=DOCTOR
    const [emergencyAlert, setEmergencyAlert] = useState(null);

    useEffect(() => {
        if (account) {
            fetchRecords();
            fetchIdentity();
        }

        // Listen for off-chain cross-tab notifications
        const handleStorage = (e) => {
            if (e.key === 'emergency_request' && e.newValue) {
                const data = JSON.parse(e.newValue);
                if (data.patient.toLowerCase() === account.toLowerCase()) {
                    checkEmergencyStatus(data.doctor);
                }
            }
            if (e.key === 'access_request' && e.newValue) {
                const data = JSON.parse(e.newValue);
                if (data.patient.toLowerCase() === account.toLowerCase()) {
                    setRequests(prev => {
                        if(prev.some(req => req.doctorAddress.toLowerCase() === data.doctor.toLowerCase())) return prev;
                        return [...prev, { id: Date.now(), doctorAddress: data.doctor }];
                    });
                }
            }
        };

        // Also check on mount if there's an active emergency request
        const activeReq = localStorage.getItem('emergency_request');
        if (activeReq) {
            const data = JSON.parse(activeReq);
            if (data.patient.toLowerCase() === account?.toLowerCase()) {
                checkEmergencyStatus(data.doctor);
            }
        }

        // Also check on mount for standard access request
        const normalReq = localStorage.getItem('access_request');
        if (normalReq) {
            const data = JSON.parse(normalReq);
            if (data.patient.toLowerCase() === account?.toLowerCase()) {
                setRequests(prev => {
                    if(prev.some(req => req.doctorAddress.toLowerCase() === data.doctor.toLowerCase())) return prev;
                    return [...prev, { id: Date.now(), doctorAddress: data.doctor }];
                });
            }
        }

        // Load Approved Doctors list for this account
        const savedApproved = localStorage.getItem(`approved_doctors_${account}`);
        if (savedApproved) {
            setApprovedDoctors(JSON.parse(savedApproved));
        }

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [account]);

    const checkEmergencyStatus = async (doctorAddr) => {
        try {
            const res = await axios.get(`http://localhost:8080/api/records/patient/${account}/emergency-request/${doctorAddr}`);
            const data = res.data;
            if (data.isActive && !data.isDenied) {
                const unlockMs = parseInt(data.unlockTime) * 1000;
                if (Date.now() < unlockMs) {
                    setEmergencyAlert({ doctor: doctorAddr, unlockTime: data.unlockTime });
                }
            }
        } catch (err) {
            console.error("Error fetching emergency status", err);
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

    const fetchRecords = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/records/${account}`);
            setRecords(res.data);
        } catch (error) {
            console.error("Error fetching patient records:", error);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert("Please select a file to upload.");

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("patientAddress", account); // Pass connected wallet address
        formData.append("recordType", recordType);

        try {
            const res = await axios.post("http://localhost:8080/api/records/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            alert("Success: " + res.data.message);
            setFile(null);
            fetchRecords(); // Refresh the list
        } catch (error) {
            console.error("Upload error", error);
            alert("Upload Failed: " + (error.response?.data?.error || error.message));
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (index) => {
        if (!window.confirm("Are you sure you want to delete this record from the blockchain?")) return;
        setDeletingIndex(index);
        try {
            const res = await axios.delete(`http://localhost:8080/api/records/${account}/${index}`);
            alert("Success: " + res.data.message);
            fetchRecords();
        } catch (error) {
            console.error("Delete error", error);
            alert("Delete Failed: " + (error.response?.data?.error || error.message));
        } finally {
            setDeletingIndex(null);
        }
    };

    const handleGrantAccess = async (doctorAddr, durationSeconds, roleId) => {
        if (!contract) return alert("Contract not loaded");
        try {
            await contract.methods.grantAccess(doctorAddr, durationSeconds, roleId).send({ from: account });
            
            // Show Success Message
            setSuccessMsg(`✅ Successfully granted access to ${doctorAddr.substring(0, 10)}...`);
            setTimeout(() => setSuccessMsg(''), 5000);

            // Update the request card to show "Approved"
            setRequests(prev => prev.map(req => 
                req.doctorAddress === doctorAddr ? { ...req, status: 'approved' } : req
            ));

            // Wait 2.5 seconds before moving it to the approved list
            setTimeout(() => {
                setRequests(prev => prev.filter(req => req.doctorAddress !== doctorAddr));
                
                // Update Approved Doctors Panel
                const newDoctor = { address: doctorAddr, role: roleId, timestamp: Date.now() };
                setApprovedDoctors(prev => {
                    // Check if already in the list to avoid duplicates
                    if (prev.some(d => d.address.toLowerCase() === doctorAddr.toLowerCase())) return prev;
                    const updated = [...prev, newDoctor];
                    localStorage.setItem(`approved_doctors_${account}`, JSON.stringify(updated));
                    return updated;
                });
            }, 2500);

        } catch (error) {
            console.error(error);
            alert("Transaction failed or was rejected.");
        }
    };

    const handleRevokeAccess = async (doctorAddr) => {
        if (!window.confirm("Are you sure you want to revoke this doctor's access?")) return;
        if (!contract) return;
        try {
            await contract.methods.revokeAccess(doctorAddr).send({ from: account });
            alert("Access revoked successfully.");
            setApprovedDoctors(prev => {
                const updated = prev.filter(doc => doc.address.toLowerCase() !== doctorAddr.toLowerCase());
                localStorage.setItem(`approved_doctors_${account}`, JSON.stringify(updated));
                return updated;
            });
        } catch (error) {
            console.error(error);
            alert("Failed to revoke access.");
        }
    };

    const handleRejectAccess = (doctorAddr) => {
        setRequests(requests.filter(req => req.doctorAddress !== doctorAddr));
        alert("Access request discarded.");
    };

    const handleDenyEmergency = async () => {
        if (!contract || !emergencyAlert) return;
        try {
            await contract.methods.denyEmergencyAccess(emergencyAlert.doctor).send({ from: account });
            alert("Success: Emergency Access Denied.");
            setEmergencyAlert(null);
            localStorage.removeItem('emergency_request');
        } catch (error) {
            console.error(error);
            alert("Failed to deny access.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in p-6">
            {/* Success Message Banner */}
            {successMsg && (
                <div className="bg-emerald-900/90 border border-emerald-500 text-emerald-100 px-6 py-4 rounded-2xl shadow-lg animate-fade-in-up font-medium flex items-center gap-3">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {successMsg}
                </div>
            )}

            {/* Critical Emergency Banner */}
            {emergencyAlert && (
                <div className="bg-red-900/90 border-2 border-red-500 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.5)] animate-pulse relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <svg className="w-48 h-48 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"></path></svg>
                    </div>
                    <div className="relative z-10 flex flex-col items-start gap-4">
                        <h2 className="text-4xl font-black text-white flex items-center gap-3">
                            <svg className="w-10 h-10 text-red-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            CRITICAL ALERT: BREAK-GLASS PROTOCOL INITIATED
                        </h2>
                        <p className="text-red-100 text-lg max-w-3xl font-medium">
                            An emergency responder (<span className="font-mono bg-red-950 px-2 py-1 rounded">{emergencyAlert.doctor}</span>) is attempting to bypass standard permissions to view your medical records due to a declared medical emergency.
                        </p>
                        <div className="bg-red-950/50 p-4 rounded-xl border border-red-500/30">
                            <p className="text-red-200 font-bold text-xl">
                                IF YOU ARE CONSCIOUS AND THIS IS NOT AN EMERGENCY, YOU MUST DENY ACCESS NOW.
                            </p>
                        </div>
                        <div className="mt-4 flex gap-4">
                            <button onClick={handleDenyEmergency} className="bg-red-500 hover:bg-red-400 text-white font-black text-xl px-10 py-4 rounded-2xl shadow-xl transition-all transform hover:scale-105">
                                BLOCK ACCESS IMMEDIATELY
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Identity Badge Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 shadow-xl backdrop-blur-xl">
                <div>
                    <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">
                        Patient Dashboard
                    </h2>
                    <p className="text-slate-400 font-mono text-sm mt-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700 inline-block">{account}</p>
                </div>
                <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-center gap-4">
                    {identityType === 1 ? (
                        <span className="px-5 py-2.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-fade-in">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            Verified Patient SBT
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* File Upload Section */}
                <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700/50 shadow-2xl backdrop-blur-xl transform transition-all hover:scale-[1.01] duration-300">
                    <h3 className="text-xl font-bold mb-6 text-blue-200 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        Upload New Record
                    </h3>
                    <form onSubmit={handleUpload} className="flex flex-col gap-4">
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-300 hover:file:bg-blue-800/50 border border-slate-600 p-2 rounded-xl bg-slate-800/80 backdrop-blur-sm text-slate-300 w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            type="text"
                            value={recordType}
                            onChange={(e) => setRecordType(e.target.value)}
                            placeholder="Record Type (e.g. Blood Test)"
                            className="border border-slate-600 text-slate-100 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-800/80 backdrop-blur-sm shadow-sm transition-all duration-200 placeholder-slate-500 w-full"
                        />
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none w-full">
                            {isUploading ? 'Uploading...' : 'Upload Record'}
                        </button>
                    </form>
                </div>


            </div>

            <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <h3 className="text-xl font-bold mb-4 border-b border-slate-700/60 pb-3 flex items-center gap-2 text-white">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    My Health Records
                </h3>
                {records.length > 0 ? (
                    <ul className="space-y-4">
                        {records.map((rec, i) => (
                            <li key={i} className="group flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm hover:shadow-md hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: `${300 + i * 100}ms` }}>
                                <div className="mb-4 md:mb-0">
                                    <span className="font-bold text-lg text-blue-300 group-hover:text-blue-400 transition-colors">{rec.recordType}</span>
                                    <div className="text-sm font-mono mt-1 break-all text-slate-400">IPFS: {rec.ipfsHash}</div>
                                </div>
                                <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
                                    <a
                                        href={`http://localhost:8080/api/records/download/${rec.ipfsHash}`}
                                        className="flex-1 md:flex-none text-center px-5 py-2.5 bg-indigo-900/40 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl font-semibold transition-colors duration-200 border border-indigo-800/50"
                                        download>
                                        Download
                                    </a>
                                    <div className="flex flex-col justify-center text-xs text-slate-400 font-mono bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                                        <span>Uploaded: <span className="text-slate-300">{formatTimestamp(rec.timestamp).date}</span></span>
                                        <span>Duration: <span className="text-indigo-400">{formatTimestamp(rec.timestamp).duration}</span></span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(i)}
                                        disabled={deletingIndex === i}
                                        className="flex-1 md:flex-none px-5 py-2.5 bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-800/50 rounded-xl font-semibold transition-colors duration-200 disabled:opacity-50">
                                        {deletingIndex === i ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-10 bg-slate-800/40 rounded-2xl border border-dashed border-slate-600">
                        <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                        <p className="text-slate-400 font-medium">No records found on the blockchain.</p>
                        <p className="text-slate-500 text-sm mt-1">Upload a new record above to get started.</p>
                    </div>
                )}
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <h3 className="text-xl font-bold mb-4 border-b border-slate-700/60 pb-3 flex items-center gap-2 text-orange-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    Doctor Access Requests
                </h3>
                {requests.length > 0 ? (
                    <ul className="space-y-4">
                        {requests.map((req) => (
                            <li key={req.id} className="flex flex-col bg-orange-900/20 p-5 rounded-2xl border border-orange-800/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${400 + req.id * 100}ms` }}>
                                <div className="mb-4">
                                    <span className="text-sm font-mono truncate mr-4 bg-slate-800 px-3 py-1 rounded-md border border-orange-800/50 text-orange-200">{req.doctorAddress}</span>
                                </div>
                                {req.status === 'approved' ? (
                                    <div className="bg-emerald-900/40 border border-emerald-500/50 text-emerald-400 font-bold rounded-xl px-5 py-3 flex items-center justify-center gap-2 w-full animate-pulse">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        Request Approved! Adding to Approved Doctors...
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row gap-3 w-full">
                                        <select id={`role-${req.doctorAddress}`} className="bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500">
                                            <option value="1">Pharmacist</option>
                                            <option value="2">General Practitioner</option>
                                            <option value="3">Surgeon (Full Access)</option>
                                        </select>
                                        <select id={`duration-${req.doctorAddress}`} className="bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500">
                                            <option value="86400">24 Hours</option>
                                            <option value="604800">7 Days</option>
                                            <option value="0">Permanent</option>
                                        </select>
                                        <button onClick={() => {
                                            const role = document.getElementById(`role-${req.doctorAddress}`).value;
                                            const duration = document.getElementById(`duration-${req.doctorAddress}`).value;
                                            handleGrantAccess(req.doctorAddress, duration, role);
                                        }}
                                            className="flex-1 md:flex-none px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-bold border border-green-500">
                                            Approve
                                        </button>
                                        <button onClick={() => handleRejectAccess(req.doctorAddress)}
                                            className="flex-1 md:flex-none px-5 py-2 bg-slate-800 text-slate-200 border border-slate-600 rounded-xl hover:bg-slate-700 hover:text-red-400 transition-colors font-bold">
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-500 italic">No pending requests.</p>
                )}
            </div>

            {/* Approved Doctors Panel */}
            <div className="animate-fade-in-up mt-10" style={{ animationDelay: '400ms' }}>
                <h3 className="text-xl font-bold mb-4 border-b border-slate-700/60 pb-3 flex items-center gap-2 text-emerald-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    Approved Doctors
                </h3>
                {approvedDoctors.length > 0 ? (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {approvedDoctors.map((doc, idx) => (
                            <li key={idx} className="bg-slate-800/80 p-5 rounded-2xl border border-emerald-900/50 shadow-sm flex flex-col gap-2">
                                <span className="text-sm font-mono truncate text-emerald-300 bg-slate-900/50 p-2 rounded-lg border border-slate-700">{doc.address}</span>
                                <div className="text-xs text-slate-400 flex justify-between items-center">
                                    <span>
                                        Role ID: <span className="text-white font-bold">{doc.role}</span> &bull; 
                                        Approved At: {new Date(doc.timestamp).toLocaleString()}
                                    </span>
                                    <button 
                                        onClick={() => handleRevokeAccess(doc.address)}
                                        className="text-red-400 hover:text-red-300 font-semibold px-3 py-1 bg-red-900/30 rounded-lg border border-red-800/50 hover:bg-red-800/50 transition-colors"
                                    >
                                        Revoke
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-500 italic">No doctors have been granted access yet.</p>
                )}
            </div>
        </div>
    );
};

export default PatientDashboard;
