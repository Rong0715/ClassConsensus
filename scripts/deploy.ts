import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // set deployer to be prof
  const professorAddress = deployer.address;

  // set TA password
  const taSecret = "programmable2025";

  // generate hash for pw
  const secretHash = ethers.keccak256(ethers.toUtf8Bytes(taSecret));

  console.log("-----------------------------------------");
  console.log("Deploying ClassConsensusV4...");
  console.log("Professor (You):", professorAddress);
  console.log("TA Secret Hash:", secretHash);

  // deploy the contract
  const ClassConsensusV4 = await ethers.getContractFactory("ClassConsensus");
  const consensus = await ClassConsensusV4.deploy(professorAddress, secretHash);

  await consensus.waitForDeployment();
  const contractAddress = await consensus.getAddress();

  console.log("-----------------------------------------");
  console.log("✅ Contract deployed to:", contractAddress);
  console.log("👇 NEXT STEP:");
  console.log(`Copy '${contractAddress}' to your Frontend App.js`);
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
