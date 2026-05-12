import React, { useContext, useState } from 'react';
import { Web3Provider, Web3Context } from './context/Web3Context';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import './assets/index.css';

const MainApp = () => {
    const { account, connectWallet } = useContext(Web3Context);
    const [role, setRole] = useState('patient');
    const [userSbtType, setUserSbtType] = useState(null);

    React.useEffect(() => {
        if (account) {
            const fetchIdentity = async () => {
                try {
                    // Import axios dynamically or at top of file. Let's just use fetch here to avoid modifying imports if we don't have to, 
                    // or I'll just use fetch since axios is not imported yet.
                    const response = await fetch(`http://localhost:8080/api/zkp/identity/${account}`);
                    const data = await response.json();
                    setUserSbtType(data.identityType);
                    
                    if (data.identityType === 1) {
                        setRole('patient');
                    } else if (data.identityType === 2) {
                        setRole('doctor');
                    }
                } catch (error) {
                    console.error("Error fetching identity:", error);
                    setUserSbtType(0);
                }
            };
            fetchIdentity();
        } else {
            setUserSbtType(null);
        }
    }, [account]);

    return (
        <div className="min-h-screen text-gray-800 font-sans p-4 md:p-10 bg-transparent">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-12 py-8 bg-white/40 backdrop-blur-md rounded-3xl shadow-sm border border-white/60">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 tracking-tight drop-shadow-sm">Decentralized EHR</h1>
                    <p className="text-gray-600 mt-3 font-medium tracking-wide">Powered by Polygon, IPFS, & Spring Boot</p>
                </header>

                {!account ? (
                    !window.ethereum ? (
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-t-4 border-orange-500">
                                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-3">MetaMask Required</h2>
                                <p className="text-gray-600 mb-6 leading-relaxed">Please install the MetaMask extension to access your decentralized medical records.</p>
                                <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="block w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 px-4 rounded-xl hover:shadow-lg transition transform hover:-translate-y-0.5">
                                    Download MetaMask
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white shadow-xl rounded-2xl p-10 text-center max-w-lg mx-auto">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">🦊</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Web3 Wallet Required</h2>
                            <p className="text-gray-600 mb-8">Please connect your MetaMask wallet to interact with the blockchain and authenticate your role.</p>

                            <button
                                onClick={connectWallet}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition transform hover:-translate-y-1">
                                Connect MetaMask
                            </button>
                        </div>
                    )
                ) : (
                    <div>
                        {userSbtType === 0 && (
                            <div className="flex justify-center bg-white rounded-lg shadow-sm p-2 mb-6 max-w-sm mx-auto">
                                <button
                                    onClick={() => setRole('patient')}
                                    className={`flex-1 py-2 text-center rounded-md transition font-semibold ${role === 'patient' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    Patient
                                </button>
                                <button
                                    onClick={() => setRole('doctor')}
                                    className={`flex-1 py-2 text-center rounded-md transition font-semibold ${role === 'doctor' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    Doctor
                                </button>
                            </div>
                        )}

                        {role === 'patient' ? <PatientDashboard /> : <DoctorDashboard />}
                    </div>
                )}
            </div>
        </div>
    );
};

const App = () => (
    <Web3Provider>
        <MainApp />
    </Web3Provider>
);

export default App;
