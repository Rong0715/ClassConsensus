# 🎓 Programmable Society DAO

![Status](https://img.shields.io/badge/Network-Sepolia%20Testnet-blue)
![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-363636)
![Frontend](https://img.shields.io/badge/React-Vite-61DAFB)
![License](https://img.shields.io/badge/License-MIT-green)

**Programmable Society DAO** is a decentralized academic grading application deployed on the Sepolia Testnet. It implements a **4-Panel Consensus Mechanism** to grade student presentations, ensuring transparency, immutability, and democratic student participation while maintaining academic authority.

---

## 🏗 Architecture & Consensus Logic

The grading panel consists of 4 distinct entities. A presentation must achieve a **Majority Vote (3:1 or 4:0)** to pass.

### 1. The Panel Structure
| Role | Votes | Power | Notes |
|------|-------|-------|-------|
| **Professor** | 1 Vote | **Veto / Tie-Breaker** | Deployed the contract. Has ultimate override power in tie scenarios. |
| **TA 1** | 1 Vote | Standard | Registered via a cryptographically hashed secret code. |
| **TA 2** | 1 Vote | Standard | Registered via a cryptographically hashed secret code. |
| **Student Bloc**| 1 Vote | **Majoritarian** | Derived from the majority vote of the entire student body. |

### 2. Resolution States
* **PASSED:** 3 or 4 votes in favor.
* **FAILED:** 3 or 4 votes against.
* **TIE (2:2):** Example: (Prof + Student) vs (TA1 + TA2). Result is **NOT finalized**.
    * *Resolution:* The contract enters `TieNeedsProfDecision` state. The Professor must execute an override transaction to settle the grade.

### 3. Privacy Features
* **Soft Privacy:** While individual votes are recorded on-chain, the frontend UI only displays the aggregated "Student Consensus" (e.g., "15 Pass / 3 Fail") to prevent peer pressure or retaliation.

---

## 🛠 Tech Stack

* **Smart Contract:** Solidity ^0.8.20, Hardhat Environment.
* **Frontend:** React (Vite), Tailwind CSS v3.4.
* **Blockchain Interaction:** Ethers.js v6.
* **Identity Management:**
    * **RBAC:** Role-Based Access Control for Prof/TA/Student.
    * **Security:** TA registration requires a hashed secret code verification.

---

## 🚀 Installation & Setup

### Prerequisites
* Node.js & npm
* Browser Wallet (MetaMask / Brave Wallet)
* Sepolia Testnet ETH (for gas fees)

### 1. Clone & Install
```bash
git clone [https://github.com/Rong0715/ClassConsensus.git](https://github.com/Rong0715/ClassConsensus.git)
cd ClassConsensus
npm install
````

### 2\. Smart Contract Deployment

1.  Navigate to the `scripts/deploy.ts` file.
2.  Set your TA Secret Code (Default is `"programmable2025"`).
3.  Deploy to Sepolia:

<!-- end list -->

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

> **Note:** The account used to deploy this contract will automatically be assigned the **PROFESSOR** role.

### 3\. Frontend Configuration

1.  Copy the **Contract Address** output from the deployment step.
2.  Open `src/App.jsx`.
3.  Update the `CONTRACT_ADDRESS` constant:

<!-- end list -->

```javascript
const CONTRACT_ADDRESS = "0xYourDeployedContractAddress...";
```

### 4\. Run the DApp

```bash
# Start the local development server
npm run dev
```

Open `http://localhost:5173` in your browser.

-----

## 📄 License

This project is licensed under the [MIT License](https://www.google.com/search?q=LICENSE).

-----

*Built for the DD2585 Programmable Society with Blockchains and Smart Contracts Course at KTH Royal Institute of Technology.*
