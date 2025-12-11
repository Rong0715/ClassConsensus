// npm dev start

import React, { useState } from "react";
import { ethers } from "ethers";
import {
  User,
  Shield,
  GraduationCap,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Users,
  ChevronDown,
} from "lucide-react";

// Contract address goes here
const CONTRACT_ADDRESS = "0x3B6E0Aa0e149A0bD54cD713A95693f7C60Db4BD3";

// Contract ABI
const CONTRACT_ABI = [
  "function registerStudent(string _name) external",
  "function registerTA(string _name, string _secretCode) external",
  "function getUserRole(address user) view returns (string role, string name, bool registered)",
  "function createPresentation(string _category, address _studentAddr) external",
  "function getAllStudents() view returns (tuple(address addr, string name)[])", // 新增
  "function voteProfessor(uint256 id, bool pass) external",
  "function voteTA(uint256 id, bool pass) external",
  "function voteAsStudent(uint256 id, bool pass) external",
  "function finalizeResult(uint256 id) external",
  "function professorOverride(uint256 id, bool pass) external",
  "function getAllIDs() view returns (uint256[])",
  "function getPresentationView(uint256 id) view returns (tuple(uint256 id, string category, string studentName, address studentAddr, uint256 timestamp) detail, uint8 result, uint256 sPass, uint256 sFail)",
];

const CATEGORIES = [
  "DEMO",
  "PRESENTATION",
  "PAPER PRESENTATION",
  "SMART CONTRACT PROTOCOL",
];

export default function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  // User state
  const [role, setRole] = useState("GUEST");
  const [userName, setUserName] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login form
  const [regName, setRegName] = useState("");
  const [regIsTa, setRegIsTa] = useState(false);
  const [regSecret, setRegSecret] = useState("");

  // Class data
  const [presentations, setPresentations] = useState([]);
  const [studentRoster, setStudentRoster] = useState([]); // student roster

  // Create new poll
  const [newPres, setNewPres] = useState({
    addr: "",
    cat: CATEGORIES[0],
  });

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install Wallet");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAccount(addr);

      const tempContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );
      setContract(tempContract);

      const status = await tempContract.getUserRole(addr);
      const userRole = status[0];
      setRole(userRole);
      setUserName(status[1]);
      setIsRegistered(status[2]);

      if (status[2]) {
        fetchData(tempContract, userRole); // to see if we need roster based on current role
      }
    } catch (e) {
      console.error(e);
      alert("Connection failed");
    }
  };

  const handleRegister = async () => {
    if (!contract || !regName) return alert("Please enter name");
    setLoading(true);
    try {
      let tx;
      if (regIsTa) tx = await contract.registerTA(regName, regSecret);
      else tx = await contract.registerStudent(regName);
      await tx.wait();
      alert("Registered!");
      window.location.reload();
    } catch (e) {
      alert("Error: " + (e.reason || e.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (ct, currentRole) => {
    try {
      // get presentation list
      const ids = await ct.getAllIDs();
      const items = [];
      for (let i = ids.length - 1; i >= 0; i--) {
        const id = ids[i];
        const data = await ct.getPresentationView(id);
        items.push({
          id: data.detail.id.toString(),
          category: data.detail.category,
          studentName: data.detail.studentName,
          studentAddr: data.detail.studentAddr,
          result: Number(data.result),
          passCount: Number(data.sPass),
          failCount: Number(data.sFail),
        });
      }
      setPresentations(items);

      // get all students list if prof or ta is current role
      if (currentRole === "PROF" || currentRole === "TA") {
        const rosterData = await ct.getAllStudents();
        // rosterData is tuple, so needs to unwrap
        const formatted = rosterData.map((s) => ({
          addr: s.addr,
          name: s.name,
        }));
        setStudentRoster(formatted);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  const createPres = async () => {
    if (!newPres.addr) return alert("Please select a student from the list");
    try {
      // only need category and address
      const tx = await contract.createPresentation(newPres.cat, newPres.addr);
      await tx.wait();
      alert("Presentation Created!");
      fetchData(contract, role);
    } catch (e) {
      alert(e.reason || e.message);
    }
  };

  const castVote = async (id, pass) => {
    try {
      let tx;
      if (role === "PROF") tx = await contract.voteProfessor(id, pass);
      else if (role === "TA") tx = await contract.voteTA(id, pass);
      else tx = await contract.voteAsStudent(id, pass);
      await tx.wait();
      alert("Voted!");
      fetchData(contract, role);
    } catch (e) {
      alert(e.reason || e.message);
    }
  };

  const finalize = async (id) => {
    try {
      const tx = await contract.finalizeResult(id);
      await tx.wait();
      fetchData(contract, role);
    } catch (e) {
      alert(e.reason || e.message);
    }
  };

  const override = async (id, pass) => {
    try {
      const tx = await contract.professorOverride(id, pass);
      await tx.wait();
      fetchData(contract, role);
    } catch (e) {
      alert(e.reason || e.message);
    }
  };

  const renderStatus = (p) => {
    if (p.result === 0)
      return (
        <span className="text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-xs font-bold">
          IN PROGRESS
        </span>
      );
    if (p.result === 1)
      return (
        <span className="text-green-600 flex items-center gap-1 font-bold">
          <CheckCircle size={16} /> PASSED
        </span>
      );
    if (p.result === 2)
      return (
        <span className="text-red-600 flex items-center gap-1 font-bold">
          <XCircle size={16} /> FAILED
        </span>
      );
    if (p.result === 3)
      return (
        <span className="text-purple-600 flex items-center gap-1 font-bold">
          <AlertTriangle size={16} /> TIE BREAK
        </span>
      );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Programmable Society <span className="text-blue-600">DAO</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  role === "GUEST"
                    ? "bg-gray-100"
                    : role === "PROF"
                    ? "bg-purple-100 text-purple-700"
                    : role === "TA"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {role}
              </span>
              <p className="text-gray-400 text-xs font-mono">
                {account
                  ? account.slice(0, 6) + "..." + account.slice(-4)
                  : "Not Connected"}
              </p>
            </div>
          </div>
          {!account ? (
            <button
              onClick={connectWallet}
              className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="text-right">
              <div className="font-bold text-lg">{userName || "Unknown"}</div>
              <div className="text-xs text-gray-400">Sepolia Testnet</div>
            </div>
          )}
        </header>

        {/* Auth or Dashboard */}
        {!account ? (
          <div className="text-center py-20 text-gray-400">
            Please connect your wallet.
          </div>
        ) : !isRegistered ? (
          // Registration Form
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Class Registration</h2>
            <div className="space-y-4">
              <input
                type="text"
                className="w-full border p-3 rounded-lg"
                placeholder="Full Name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={regIsTa}
                  onChange={(e) => setRegIsTa(e.target.checked)}
                  className="w-5 h-5"
                  id="taCheck"
                />
                <label htmlFor="taCheck" className="font-bold text-sm">
                  Register as TA
                </label>
              </div>
              {regIsTa && (
                <input
                  type="password"
                  className="w-full border p-3 rounded-lg"
                  placeholder="TA Secret Code"
                  value={regSecret}
                  onChange={(e) => setRegSecret(e.target.value)}
                />
              )}
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
              >
                {loading ? "Registering..." : "Confirm"}
              </button>
            </div>
          </div>
        ) : (
          // Dashboard
          <>
            {/* Professor / TA Control Panel */}
            {(role === "PROF" || role === "TA") && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* 1. Create Presentation Form */}
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                    <FileText size={16} /> New Presentation
                  </h2>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <select
                        className="border p-2 rounded bg-gray-50 flex-1"
                        value={newPres.cat}
                        onChange={(e) =>
                          setNewPres({ ...newPres, cat: e.target.value })
                        }
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Student Dropdown (Roster) */}
                    <div className="relative">
                      <select
                        className="w-full border p-2 rounded bg-gray-50 appearance-none"
                        value={newPres.addr}
                        onChange={(e) =>
                          setNewPres({ ...newPres, addr: e.target.value })
                        }
                      >
                        <option value="">
                          -- Select Registered Student --
                        </option>
                        {studentRoster.map((s) => (
                          <option key={s.addr} value={s.addr}>
                            {s.name} ({s.addr.slice(0, 6)}...)
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                        size={16}
                      />
                    </div>

                    <button
                      onClick={createPres}
                      disabled={!newPres.addr}
                      className="bg-gray-900 text-white py-2 rounded font-bold hover:bg-black disabled:bg-gray-300 transition mt-2"
                    >
                      Create Session
                    </button>
                  </div>
                </div>

                {/* 2. Class Roster View - Modified to show history stats */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto max-h-[300px]">
                  <h2 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                    <Users size={16} /> Class Roster ({studentRoster.length})
                  </h2>
                  <div className="space-y-2">
                    {studentRoster.length === 0 ? (
                      <p className="text-xs text-gray-400">No students yet.</p>
                    ) : (
                      studentRoster.map((s) => {
                        // Find students history in frontend
                        const history = presentations.filter(
                          (p) =>
                            p.studentAddr.toLowerCase() === s.addr.toLowerCase()
                        );
                        const total = history.length;
                        // Result 1 = Pass, Result 2 = Fail
                        const passed = history.filter(
                          (p) => p.result === 1
                        ).length;

                        // calculate failed if needed later
                        // const failed = history.filter((p) => p.result === 2).length;

                        return (
                          <div
                            key={s.addr}
                            className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded border border-gray-100"
                          >
                            <div>
                              <div className="font-bold text-gray-800">
                                {s.name}
                              </div>
                              <div className="font-mono text-gray-400 text-xs">
                                {s.addr.slice(0, 6)}...{s.addr.slice(-4)}
                              </div>
                            </div>

                            {/* show stats result */}
                            <div className="text-right">
                              {total === 0 ? (
                                <span className="text-xs text-gray-400 italic">
                                  No records
                                </span>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span className="text-xs font-bold bg-gray-200 px-1.5 py-0.5 rounded mb-1">
                                    {total} Presentations
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    Passed:{" "}
                                    <span className="text-green-600 font-bold">
                                      {passed}
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Presentation Feed */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">Live Sessions</h2>
              {presentations.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl text-gray-400">
                  No sessions active.
                </div>
              )}

              {presentations.map((p) => (
                <div
                  key={p.id}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded">
                          {p.category}
                        </span>
                        <h3 className="text-lg font-bold">
                          #{p.id} {p.studentName}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        {p.studentAddr}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">{renderStatus(p)}</div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
                        Student Consensus:{" "}
                        <span className="text-green-600 font-bold">
                          {p.passCount} Pass
                        </span>{" "}
                        /{" "}
                        <span className="text-red-500 font-bold">
                          {p.failCount} Fail
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  {p.result === 0 ? (
                    <div className="flex items-center gap-2 border-t pt-4 mt-2">
                      <button
                        onClick={() => castVote(p.id, true)}
                        className="flex-1 bg-green-50 text-green-700 border border-green-200 py-2 rounded font-bold hover:bg-green-100"
                      >
                        PASS
                      </button>
                      <button
                        onClick={() => castVote(p.id, false)}
                        className="flex-1 bg-red-50 text-red-700 border border-red-200 py-2 rounded font-bold hover:bg-red-100"
                      >
                        FAIL
                      </button>

                      {/* only render finalize button for prof or ta */}
                      {(role === "PROF" || role === "TA") && (
                        <button
                          onClick={() => finalize(p.id)}
                          className="ml-2 px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded uppercase tracking-wider hover:bg-black"
                        >
                          Finalize
                        </button>
                      )}
                    </div>
                  ) : p.result === 3 && role === "PROF" ? (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex items-center justify-between gap-4">
                      <span className="text-purple-800 font-bold text-sm">
                        Decision Required:
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => override(p.id, true)}
                          className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm"
                        >
                          Override PASS
                        </button>
                        <button
                          onClick={() => override(p.id, false)}
                          className="bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm"
                        >
                          Override FAIL
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
