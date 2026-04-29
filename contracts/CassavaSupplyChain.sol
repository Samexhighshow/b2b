// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CassavaSupplyChain {
    enum Role {
        NONE,
        FARMER,
        PROCESSOR,
        DISTRIBUTOR,
        RETAILER,
        ADMIN
    }

    enum Status {
        CREATED,
        PROCESSED,
        IN_TRANSIT,
        DELIVERED
    }

    struct Batch {
        uint256 batchId;
        string originLocation;
        uint256 quantityKg;
        uint256 createdAt;
        address currentOwner;
        Status status;
        bool exists;
    }

    address public immutable admin;
    mapping(address => Role) public roles;
    mapping(uint256 => Batch) private batches;

    event BatchCreated(uint256 indexed batchId, address indexed owner);
    event OwnershipTransferred(uint256 indexed batchId, address indexed from, address indexed to);
    event StatusUpdated(uint256 indexed batchId, Status newStatus);
    event RoleAssigned(address indexed user, Role role);

    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Role.ADMIN;
        emit RoleAssigned(msg.sender, Role.ADMIN);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyRole(Role role) {
        require(roles[msg.sender] == role, "Invalid role");
        _;
    }

    modifier batchExists(uint256 batchId) {
        require(batches[batchId].exists, "Batch not found");
        _;
    }

    modifier onlyOwner(uint256 batchId) {
        require(batches[batchId].currentOwner == msg.sender, "Only current owner");
        _;
    }

    function _roleForStatus(Status status) internal pure returns (Role) {
        if (status == Status.PROCESSED) {
            return Role.PROCESSOR;
        }
        if (status == Status.IN_TRANSIT) {
            return Role.DISTRIBUTOR;
        }
        if (status == Status.DELIVERED) {
            return Role.RETAILER;
        }
        return Role.FARMER;
    }

    function _nextCustodianRole(Status currentStatus) internal pure returns (Role) {
        require(currentStatus != Status.DELIVERED, "Transfer not allowed after delivery");
        return _roleForStatus(Status(uint8(currentStatus) + 1));
    }

    function assignRole(address user, Role role) external onlyAdmin {
        require(user != address(0), "Invalid user");
        require(role != Role.NONE, "Invalid role");
        roles[user] = role;
        emit RoleAssigned(user, role);
    }

    function createBatch(
        uint256 batchId,
        string calldata originLocation,
        uint256 quantityKg
    ) external onlyRole(Role.FARMER) {
        require(!batches[batchId].exists, "Batch exists");
        require(batchId != 0, "Invalid batchId");
        require(bytes(originLocation).length != 0, "Origin required");
        require(quantityKg > 0, "Quantity required");

        batches[batchId] = Batch({
            batchId: batchId,
            originLocation: originLocation,
            quantityKg: quantityKg,
            createdAt: block.timestamp,
            currentOwner: msg.sender,
            status: Status.CREATED,
            exists: true
        });

        emit BatchCreated(batchId, msg.sender);
    }

    function transferOwnership(
        uint256 batchId,
        address newOwner
    ) external batchExists(batchId) onlyOwner(batchId) {
        require(newOwner != address(0), "Invalid new owner");
        Batch storage batch = batches[batchId];
        Role ownerRole = roles[msg.sender];
        Role requiredOwnerRole = _roleForStatus(batch.status);
        Role requiredNewOwnerRole = _nextCustodianRole(batch.status);

        require(ownerRole == requiredOwnerRole, "Owner role mismatch for stage");
        require(roles[newOwner] == requiredNewOwnerRole, "Transfer requires next stakeholder role");

        address previousOwner = batch.currentOwner;
        batch.currentOwner = newOwner;
        emit OwnershipTransferred(batchId, previousOwner, newOwner);
    }

    function updateStatus(
        uint256 batchId,
        Status newStatus
    ) external batchExists(batchId) onlyOwner(batchId) {
        Batch storage batch = batches[batchId];

        require(newStatus != Status.CREATED, "Status cannot reset to CREATED");
        require(batch.status != Status.DELIVERED, "Status already final");
        require(uint8(newStatus) == uint8(batch.status) + 1, "Status must advance one step");
        require(roles[msg.sender] == _roleForStatus(newStatus), "Status update role mismatch");

        batch.status = newStatus;
        emit StatusUpdated(batchId, newStatus);
    }

    function getBatch(
        uint256 batchId
    ) external view batchExists(batchId) returns (
        uint256,
        string memory,
        uint256,
        uint256,
        address,
        Status,
        bool
    ) {
        Batch memory batch = batches[batchId];
        return (
            batch.batchId,
            batch.originLocation,
            batch.quantityKg,
            batch.createdAt,
            batch.currentOwner,
            batch.status,
            batch.exists
        );
    }
}
