// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClassConsensus {
    address public professor;
    address public ta1;
    address public ta2;

    bytes32 private taSecretHash;

    // Calculate ID
    uint256 public nextPresentationId = 101; 

    enum Vote { None, Pass, Fail }
    enum Result { NotFinalized, Pass, Fail, TieNeedsProfDecision }

    struct PresentationDetails {
        uint256 id;
        string category;
        string studentName;
        address studentAddr;
        uint256 timestamp;
    }

    struct PanelVotes {
        Vote prof;
        Vote ta1;
        Vote ta2;
        Vote studentsBloc;
        bool exists;
        Result finalResult;
    }

    struct StudentAggregation {
        uint256 passCount;
        uint256 failCount;
        mapping(address => bool) hasVoted;
        bool blocComputed;
    }

    // Data Structure for students history
    struct StudentInfo {
        address addr;
        string name;
    }

    mapping(uint256 => PanelVotes) public votes;
    mapping(uint256 => PresentationDetails) public details;
    mapping(uint256 => StudentAggregation) private studentAgg;
    
    mapping(address => string) public userNames;
    mapping(address => bool) public isRegistered;

    // Store students list
    address[] public studentList;

    uint256[] public allPresentationIds;
    mapping(address => uint256[]) public studentHistory;

    event PresentationCreated(uint256 indexed id, string studentName, string category);
    event ResultFinalized(uint256 indexed id, Result result);
    event UserRegistered(address indexed user, string role, string name);

    modifier onlyProfessor() { require(msg.sender == professor, "Not Prof"); _; }
    
    // Panel only operation
    modifier onlyPanel() { 
        require(
            msg.sender == professor || msg.sender == ta1 || msg.sender == ta2, 
            "Not Panel Member"
        ); 
        _; 
    }

    constructor(address _professor, bytes32 _taSecretHash) {
        professor = _professor;
        taSecretHash = _taSecretHash;

        isRegistered[_professor] = true;
        userNames[_professor] = "Professor";
    }

    function registerStudent(string memory _name) external {
        require(!isRegistered[msg.sender], "Already registered");
        userNames[msg.sender] = _name;
        isRegistered[msg.sender] = true;
        
        // add new student
        studentList.push(msg.sender);

        emit UserRegistered(msg.sender, "STUDENT", _name);
    }

    function registerTA(string memory _name, string memory _secretCode) external {
        require(!isRegistered[msg.sender], "Already registered");
        require(ta1 == address(0) || ta2 == address(0), "TA slots full");
        
        require(keccak256(abi.encodePacked(_secretCode)) == taSecretHash, "Wrong TA Secret");

        userNames[msg.sender] = _name;
        isRegistered[msg.sender] = true;

        if (ta1 == address(0)) {
            ta1 = msg.sender;
        } else {
            ta2 = msg.sender;
        }
        
        emit UserRegistered(msg.sender, "TA", _name);
    }

    // create new poll
    function createPresentation(
        string memory _category, 
        address _studentAddr
    ) external onlyPanel {
        require(isRegistered[_studentAddr], "Student not registered");

        uint256 _id = nextPresentationId;
        nextPresentationId++;

        votes[_id].exists = true;
        votes[_id].finalResult = Result.NotFinalized;

        string memory _fetchedName = userNames[_studentAddr];

        details[_id] = PresentationDetails({
            id: _id,
            category: _category,
            studentName: _fetchedName,
            studentAddr: _studentAddr,
            timestamp: block.timestamp
        });

        allPresentationIds.push(_id);
        studentHistory[_studentAddr].push(_id);

        emit PresentationCreated(_id, _fetchedName, _category);
    }

    function voteProfessor(uint256 id, bool pass) external onlyProfessor {
        require(votes[id].finalResult == Result.NotFinalized, "Finalized");
        votes[id].prof = pass ? Vote.Pass : Vote.Fail;
    }

    function voteTA(uint256 id, bool pass) external {
        require(votes[id].finalResult == Result.NotFinalized, "Finalized");
        if (msg.sender == ta1) votes[id].ta1 = pass ? Vote.Pass : Vote.Fail;
        else if (msg.sender == ta2) votes[id].ta2 = pass ? Vote.Pass : Vote.Fail;
        else revert("Not TA");
    }

    function voteAsStudent(uint256 id, bool pass) external {
        require(isRegistered[msg.sender], "Please register first");
        require(msg.sender != professor && msg.sender != ta1 && msg.sender != ta2, "Panel cannot vote");
        require(votes[id].finalResult == Result.NotFinalized, "Finalized");
        
        StudentAggregation storage s = studentAgg[id];
        require(!s.hasVoted[msg.sender], "Already voted");

        s.hasVoted[msg.sender] = true;
        if (pass) s.passCount++; else s.failCount++;
    }

    // Only panel can finalize
    function finalizeResult(uint256 id) external onlyPanel {
        PanelVotes storage p = votes[id];
        require(p.finalResult == Result.NotFinalized, "Finalized");

        StudentAggregation storage s = studentAgg[id];
        if (!s.blocComputed) {
            if (s.passCount > s.failCount) p.studentsBloc = Vote.Pass;
            else p.studentsBloc = Vote.Fail; 
            s.blocComputed = true;
        }

        uint256 pass = 0;
        uint256 fail = 0;
        
        if (p.prof == Vote.Pass) pass++; else fail++;
        if (p.ta1 == Vote.Pass) pass++; else fail++;
        if (p.ta2 == Vote.Pass) pass++; else fail++;
        if (p.studentsBloc == Vote.Pass) pass++; else fail++;

        if (pass > fail) p.finalResult = Result.Pass;
        else if (fail > pass) p.finalResult = Result.Fail;
        else p.finalResult = Result.TieNeedsProfDecision;

        emit ResultFinalized(id, p.finalResult);
    }

    function professorOverride(uint256 id, bool pass) external onlyProfessor {
        require(votes[id].finalResult == Result.TieNeedsProfDecision, "Not a tie");
        votes[id].finalResult = pass ? Result.Pass : Result.Fail;
        // votes[id].profReconsidered = true; 
        emit ResultFinalized(id, votes[id].finalResult);
    }

    // View Functions
    function getPresentationView(uint256 id) external view returns (
        PresentationDetails memory detail,
        Result result,
        uint256 sPass,
        uint256 sFail
    ) {
        return (
            details[id],
            votes[id].finalResult,
            studentAgg[id].passCount,
            studentAgg[id].failCount
        );
    }

    // give student list to FE
    function getAllStudents() external view returns (StudentInfo[] memory) {
        StudentInfo[] memory list = new StudentInfo[](studentList.length);
        for (uint i = 0; i < studentList.length; i++) {
            list[i] = StudentInfo({
                addr: studentList[i],
                name: userNames[studentList[i]]
            });
        }
        return list;
    }

    function getAllIDs() external view returns (uint256[] memory) {
        return allPresentationIds;
    }
    
    function getUserRole(address user) external view returns (string memory role, string memory name, bool registered) {
        string memory _role = "GUEST";
        if (user == professor) _role = "PROF";
        else if (user == ta1 || user == ta2) _role = "TA";
        else if (isRegistered[user]) _role = "STUDENT";
        
        return (_role, userNames[user], isRegistered[user]);
    }
}