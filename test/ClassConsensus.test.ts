// npx hardhat test

import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ClassConsensus Protocol Test Suite", function () {
  // 1. set up test environment
  // making sure contract is clean
  async function deployConsensusFixture() {
    const [professor, ta1, ta2, student1, student2, student3, outsider] =
      await ethers.getSigners();

    const TA_SECRET = "programmable2025";
    const SECRET_HASH = ethers.keccak256(ethers.toUtf8Bytes(TA_SECRET));

    const ClassConsensus = await ethers.getContractFactory("ClassConsensus");
    // deploy contract
    const consensus = await ClassConsensus.deploy(
      professor.address,
      SECRET_HASH
    );

    return {
      consensus,
      professor,
      ta1,
      ta2,
      student1,
      student2,
      student3,
      outsider,
      TA_SECRET,
    };
  }

  describe("1. Deployment & Auth", function () {
    it("Should set the right professor", async function () {
      const { consensus, professor } = await loadFixture(
        deployConsensusFixture
      );
      expect(await consensus.professor()).to.equal(professor.address);
    });

    it("Should allow TA registration with correct secret", async function () {
      const { consensus, ta1, TA_SECRET } = await loadFixture(
        deployConsensusFixture
      );

      await consensus.connect(ta1).registerTA("Alice TA", TA_SECRET);

      const role = await consensus.getUserRole(ta1.address);
      expect(role[0]).to.equal("TA");
      expect(await consensus.ta1()).to.equal(ta1.address);
    });

    it("Should fail TA registration with wrong secret", async function () {
      const { consensus, ta2 } = await loadFixture(deployConsensusFixture);
      await expect(
        consensus.connect(ta2).registerTA("Bad TA", "wrong-secret")
      ).to.be.revertedWith("Wrong TA Secret");
    });
  });

  describe("2. Full Presentation Workflow", function () {
    // integration test simulating the full workflow
    it("Should execute a full round: Create -> Vote -> Finalize", async function () {
      const { consensus, professor, ta1, student1, student2, TA_SECRET } =
        await loadFixture(deployConsensusFixture);

      // --- setup: register roles ---
      await consensus.connect(ta1).registerTA("TA One", TA_SECRET);
      await consensus.connect(student1).registerStudent("Student One");
      await consensus.connect(student2).registerStudent("Student Two"); // audience student

      // --- step 1: professor creates presentation ---
      await consensus
        .connect(professor)
        .createPresentation("DEMO", student1.address);

      // verify if id starts from 101
      const ids = await consensus.getAllIDs();
      const presentationId = ids[0];
      expect(presentationId).to.equal(101);

      // --- step 2: voting phase ---
      // prof: pass
      await consensus.connect(professor).voteProfessor(presentationId, true);
      // ta1: pass
      await consensus.connect(ta1).voteTA(presentationId, true);
      // student bloc: student2 votes pass (representing student body)
      await consensus.connect(student2).voteAsStudent(presentationId, true);

      // --- step 3: finalize ---
      // current state: prof(p), ta1(p), ta2(empty), students(p) -> 3:0 -> pass
      await expect(consensus.connect(professor).finalizeResult(presentationId))
        .to.emit(consensus, "ResultFinalized")
        .withArgs(presentationId, 1); // 1 = result.pass

      // --- step 4: verify result ---
      const view = await consensus.getPresentationView(presentationId);
      expect(view.result).to.equal(1); // ensure result is pass
    });
  });

  describe("3. Tie Breaking Mechanism", function () {
    it("Should trigger Professor Override when vote is tied (2:2)", async function () {
      const { consensus, professor, ta1, ta2, student1, student2, TA_SECRET } =
        await loadFixture(deployConsensusFixture);

      // register everyone
      await consensus.connect(ta1).registerTA("TA 1", TA_SECRET);
      await consensus.connect(ta2).registerTA("TA 2", TA_SECRET);
      await consensus.connect(student1).registerStudent("Presenter");
      await consensus.connect(student2).registerStudent("Voter");

      // create presentation id 101
      await consensus
        .connect(professor)
        .createPresentation("DEMO", student1.address);
      const id = 101;

      // create a tie situation:
      // prof: pass
      await consensus.connect(professor).voteProfessor(id, true);
      // ta1: pass
      await consensus.connect(ta1).voteTA(id, true);
      // ta2: fail
      await consensus.connect(ta2).voteTA(id, false);
      // students: fail (student2 votes fail)
      await consensus.connect(student2).voteAsStudent(id, false);

      // result: 2 pass vs 2 fail

      // finalize -> should be tieneedsprofdecision (enum index 3)
      await consensus.connect(professor).finalizeResult(id);
      let view = await consensus.getPresentationView(id);
      expect(view.result).to.equal(3);

      // professor overrides -> change to pass
      await consensus.connect(professor).professorOverride(id, true);

      // verify again
      view = await consensus.getPresentationView(id);
      expect(view.result).to.equal(1); // finally changes back to pass
    });
  });
});
