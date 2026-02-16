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
        address previousOwner = batches[batchId].currentOwner;
        batches[batchId].currentOwner = newOwner;
        emit OwnershipTransferred(batchId, previousOwner, newOwner);
    }

    function updateStatus(
        uint256 batchId,
        Status newStatus
    ) external batchExists(batchId) onlyOwner(batchId) {
        batches[batchId].status = newStatus;
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
