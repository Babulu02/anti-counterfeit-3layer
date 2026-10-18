// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  ProductRegistry
 * @notice Layer-1 of the anti-counterfeiting system.
 *
 * Design decisions (see docs/DECISIONS.md for rationale):
 *  - No strings stored on-chain. Everything is a bytes32 hash.
 *  - Product details, images, and QR/NFC payloads live off-chain (backend DB).
 *  - Owner manages a manufacturer whitelist.
 *  - A separate "operator" account (the backend) is the only caller allowed
 *    to record scan verdicts via logScan().
 *  - No unbounded loops. All mappings are keyed by productId.
 *  - Verdict codes: 0 = Verified, 1 = ManualReview, 2 = Suspicious, 3 = Unregistered.
 */
contract ProductRegistry {

    // ─── State ───────────────────────────────────────────────────────────────

    address public owner;      // Deployer; manages whitelists and operator
    address public operator;   // Backend account; calls logScan()

    // Whitelisted manufacturer addresses
    mapping(address => bool) public isManufacturer;

    // Core product record stored on-chain
    struct Product {
        bytes32 recordHash;   // SHA-256 hash of off-chain product details (JSON + image hash)
        address manufacturer; // Who registered it
        uint256 registeredAt; // Block timestamp
        bool    sold;         // Has the product been marked as sold?
        bool    exists;       // Guard for duplicate / not-found checks
    }

    // productId (bytes32) → Product
    mapping(bytes32 => Product) private products;

    // ─── Events ──────────────────────────────────────────────────────────────

    event ManufacturerAdded(address indexed manufacturer);
    event ManufacturerRemoved(address indexed manufacturer);
    event OperatorChanged(address indexed oldOperator, address indexed newOperator);

    event ProductRegistered(
        bytes32 indexed productId,
        bytes32         recordHash,
        address indexed manufacturer,
        uint256         timestamp
    );

    event ProductSold(
        bytes32 indexed productId,
        uint256         timestamp
    );

    /**
     * @param productId  The product being scanned.
     * @param scanHash   Hash of (productId + channel + deviceHash + lat + lon + timestamp)
     *                   computed by the backend so raw PII never touches the chain.
     * @param verdict    0 Verified | 1 ManualReview | 2 Suspicious | 3 Unregistered
     */
    event ScanLogged(
        bytes32 indexed productId,
        bytes32         scanHash,
        uint8           verdict,
        uint256         timestamp
    );

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "ProductRegistry: caller is not owner");
        _;
    }

    modifier onlyManufacturer() {
        require(isManufacturer[msg.sender], "ProductRegistry: caller is not a whitelisted manufacturer");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "ProductRegistry: caller is not the operator");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    /**
     * @param _operator  Address of the backend account that will call logScan().
     *                   Can be the same as owner during development.
     */
    constructor(address _operator) {
        require(_operator != address(0), "ProductRegistry: operator cannot be zero address");
        owner    = msg.sender;
        operator = _operator;
        emit OperatorChanged(address(0), _operator);
    }

    // ─── Owner functions ─────────────────────────────────────────────────────

    /// @notice Add an address to the manufacturer whitelist.
    function addManufacturer(address _mfr) external onlyOwner {
        require(_mfr != address(0), "ProductRegistry: zero address");
        require(!isManufacturer[_mfr], "ProductRegistry: already whitelisted");
        isManufacturer[_mfr] = true;
        emit ManufacturerAdded(_mfr);
    }

    /// @notice Remove an address from the manufacturer whitelist.
    function removeManufacturer(address _mfr) external onlyOwner {
        require(isManufacturer[_mfr], "ProductRegistry: not whitelisted");
        isManufacturer[_mfr] = false;
        emit ManufacturerRemoved(_mfr);
    }

    /// @notice Change the backend operator account.
    function setOperator(address _newOperator) external onlyOwner {
        require(_newOperator != address(0), "ProductRegistry: zero address");
        emit OperatorChanged(operator, _newOperator);
        operator = _newOperator;
    }

    // ─── Manufacturer functions ───────────────────────────────────────────────

    /**
     * @notice Register a new product on-chain.
     * @param productId   Unique identifier (e.g. keccak256 of UUID).
     * @param recordHash  SHA-256 hash of the off-chain JSON record (product details + image hash).
     */
    function registerProduct(bytes32 productId, bytes32 recordHash) external onlyManufacturer {
        require(productId  != bytes32(0), "ProductRegistry: productId cannot be zero");
        require(recordHash != bytes32(0), "ProductRegistry: recordHash cannot be zero");
        require(!products[productId].exists, "ProductRegistry: product already registered");

        products[productId] = Product({
            recordHash:   recordHash,
            manufacturer: msg.sender,
            registeredAt: block.timestamp,
            sold:         false,
            exists:       true
        });

        emit ProductRegistered(productId, recordHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Mark a product as sold. Can only move from not-sold → sold.
     *         Called by the backend operator (or a whitelisted manufacturer).
     *         We allow both so the frontend can call it without routing through backend.
     * @dev    The modifier here is onlyOperator; manufacturers call /sell via the API
     *         which uses the operator key. Change to onlyManufacturer if needed.
     */
    function markSold(bytes32 productId) external onlyOperator {
        require(products[productId].exists, "ProductRegistry: product not found");
        require(!products[productId].sold,  "ProductRegistry: already sold");

        products[productId].sold = true;
        emit ProductSold(productId, block.timestamp);
    }

    // ─── Operator functions ───────────────────────────────────────────────────

    /**
     * @notice Log a scan verdict on-chain.
     * @param productId  The scanned product (may not exist – verdict 3 in that case).
     * @param scanHash   Privacy-preserving hash of scan metadata.
     * @param verdict    0 Verified | 1 ManualReview | 2 Suspicious | 3 Unregistered
     */
    function logScan(
        bytes32 productId,
        bytes32 scanHash,
        uint8   verdict
    ) external onlyOperator {
        require(scanHash != bytes32(0), "ProductRegistry: scanHash cannot be zero");
        require(verdict  <= 3,         "ProductRegistry: invalid verdict code");

        emit ScanLogged(productId, scanHash, verdict, block.timestamp);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /**
     * @notice Retrieve on-chain product data.
     * @return recordHash   Hash of off-chain record.
     * @return manufacturer Who registered it.
     * @return registeredAt Block timestamp of registration.
     * @return sold         Whether it has been sold.
     * @return exists       False if the productId was never registered.
     */
    function getProduct(bytes32 productId)
        external
        view
        returns (
            bytes32 recordHash,
            address manufacturer,
            uint256 registeredAt,
            bool    sold,
            bool    exists
        )
    {
        Product storage p = products[productId];
        return (p.recordHash, p.manufacturer, p.registeredAt, p.sold, p.exists);
    }
}
