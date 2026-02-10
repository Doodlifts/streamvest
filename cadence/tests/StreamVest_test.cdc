import Test
import BlockchainHelpers
import "StreamVest"
import "NonFungibleToken"
import "FlowToken"
import "FungibleToken"

// ── Accounts ──
// admin is the service account that deploys StreamVest (owns the Minter)
access(all) let admin = Test.getAccount(0x0000000000000007)
access(all) let recipient = Test.createAccount()
access(all) let secondRecipient = Test.createAccount()
access(all) let transferee = Test.createAccount()

// ── Setup ──

access(all) fun setup() {
    let err = Test.deployContract(
        name: "StreamVest",
        path: "../contracts/StreamVest.cdc",
        arguments: []
    )
    Test.expect(err, Test.beNil())
}

// ── Helpers ──

access(all) fun doSetupCollection(_ account: Test.TestAccount) {
    let txResult = executeTransaction(
        "../transactions/setup_collection.cdc",
        [],
        account
    )
    Test.expect(txResult, Test.beSucceeded())
}

access(all) fun doMintStream(
    signer: Test.TestAccount,
    amount: UFix64,
    destination: Address,
    duration: UFix64
) {
    let txResult = executeTransaction(
        "../transactions/mint_stream.cdc",
        [amount, destination, duration],
        signer
    )
    Test.expect(txResult, Test.beSucceeded())
}

// ──────────────── Test 1: Setup Collection ────────────────

access(all) fun testSetupCollection() {
    doSetupCollection(recipient)

    // Verify collection exists by querying all streams (returns empty list)
    let result = executeScript(
        "../scripts/get_all_streams.cdc",
        [recipient.address]
    )
    Test.expect(result, Test.beSucceeded())
}

// ──────────────── Test 2: Mint Stream ────────────────

access(all) fun testMintStream() {
    doSetupCollection(admin)
    doSetupCollection(recipient)

    // Mint 1000 FLOW over 3600 seconds
    doMintStream(
        signer: admin,
        amount: 1000.0,
        destination: recipient.address,
        duration: 3600.0
    )

    // Verify the NFT exists
    let result = executeScript(
        "../scripts/get_stream_status.cdc",
        [admin.address, 0 as UInt64]
    )
    Test.expect(result, Test.beSucceeded())
}

// ──────────────── Test 3: Stream Execution (time advance) ────────────────

access(all) fun testStreamExecution() {
    doSetupCollection(admin)
    doSetupCollection(recipient)

    doMintStream(
        signer: admin,
        amount: 1000.0,
        destination: recipient.address,
        duration: 3600.0
    )

    // Check status immediately
    let initial = executeScript(
        "../scripts/get_stream_status.cdc",
        [admin.address, 0 as UInt64]
    )
    Test.expect(initial, Test.beSucceeded())

    // Advance time by 1800 seconds (half duration)
    tickN(1800)

    let mid = executeScript(
        "../scripts/get_stream_status.cdc",
        [admin.address, 0 as UInt64]
    )
    Test.expect(mid, Test.beSucceeded())

    // Advance past end
    tickN(1800)

    let endResult = executeScript(
        "../scripts/get_stream_status.cdc",
        [admin.address, 0 as UInt64]
    )
    Test.expect(endResult, Test.beSucceeded())
}

// ──────────────── Test 4: Update Destination ────────────────

access(all) fun testUpdateDestination() {
    doSetupCollection(admin)
    doSetupCollection(recipient)
    doSetupCollection(secondRecipient)

    doMintStream(
        signer: admin,
        amount: 500.0,
        destination: recipient.address,
        duration: 1800.0
    )

    // Update destination
    let txResult = executeTransaction(
        "../transactions/update_destination.cdc",
        [0 as UInt64, secondRecipient.address],
        admin
    )
    Test.expect(txResult, Test.beSucceeded())

    // Verify
    let status = executeScript(
        "../scripts/get_stream_status.cdc",
        [admin.address, 0 as UInt64]
    )
    Test.expect(status, Test.beSucceeded())
}

// ──────────────── Test 5: Cancel Stream ────────────────

access(all) fun testCancelStream() {
    doSetupCollection(admin)
    doSetupCollection(recipient)

    doMintStream(
        signer: admin,
        amount: 1000.0,
        destination: recipient.address,
        duration: 3600.0
    )

    // Advance a little
    tickN(100)

    // Cancel
    let txResult = executeTransaction(
        "../transactions/cancel_stream.cdc",
        [0 as UInt64],
        admin
    )
    Test.expect(txResult, Test.beSucceeded())

    // Verify cancelled
    let status = executeScript(
        "../scripts/get_stream_status.cdc",
        [admin.address, 0 as UInt64]
    )
    Test.expect(status, Test.beSucceeded())
}

// ──────────────── Test 6: Transfer NFT ────────────────

access(all) fun testTransferNFT() {
    doSetupCollection(admin)
    doSetupCollection(transferee)

    doMintStream(
        signer: admin,
        amount: 500.0,
        destination: recipient.address,
        duration: 1800.0
    )

    // Transfer to transferee
    let txResult = executeTransaction(
        "../transactions/claim_nft.cdc",
        [0 as UInt64, transferee.address],
        admin
    )
    Test.expect(txResult, Test.beSucceeded())

    // Verify transferee has it
    let result = executeScript(
        "../scripts/get_all_streams.cdc",
        [transferee.address]
    )
    Test.expect(result, Test.beSucceeded())
}

// ──────────────── Test 7: Stream Completion ────────────────

access(all) fun testStreamCompletion() {
    doSetupCollection(admin)
    doSetupCollection(recipient)

    // Short stream: 100 FLOW over 100 seconds
    doMintStream(
        signer: admin,
        amount: 100.0,
        destination: recipient.address,
        duration: 100.0
    )

    // Advance past end
    tickN(150)

    let status = executeScript(
        "../scripts/get_stream_status.cdc",
        [admin.address, 0 as UInt64]
    )
    Test.expect(status, Test.beSucceeded())
}

// ──────────────── Test 8: SVG Generation ────────────────

access(all) fun testSVGGeneration() {
    doSetupCollection(admin)
    doSetupCollection(recipient)

    doMintStream(
        signer: admin,
        amount: 1000.0,
        destination: recipient.address,
        duration: 3600.0
    )

    let result = executeScript(
        "../scripts/get_nft_display.cdc",
        [admin.address, 0 as UInt64]
    )
    Test.expect(result, Test.beSucceeded())
}

// ──────────────── Test 9: Multiple Streams ────────────────

access(all) fun testMultipleStreams() {
    doSetupCollection(admin)
    doSetupCollection(recipient)

    doMintStream(signer: admin, amount: 500.0, destination: recipient.address, duration: 1800.0)
    doMintStream(signer: admin, amount: 1000.0, destination: recipient.address, duration: 3600.0)
    doMintStream(signer: admin, amount: 250.0, destination: recipient.address, duration: 900.0)

    let result = executeScript(
        "../scripts/get_all_streams.cdc",
        [admin.address]
    )
    Test.expect(result, Test.beSucceeded())
}

// ──────────────── Test 10: Error — Update Non-Existent ────────────────

access(all) fun testErrorUpdateNonExistent() {
    doSetupCollection(admin)

    let txResult = executeTransaction(
        "../transactions/update_destination.cdc",
        [999 as UInt64, secondRecipient.address],
        admin
    )
    Test.expect(txResult, Test.beFailed())
}

// ──────────────── Test 11: Error — Cancel Non-Existent ────────────────

access(all) fun testErrorCancelNonExistent() {
    doSetupCollection(admin)

    let txResult = executeTransaction(
        "../transactions/cancel_stream.cdc",
        [999 as UInt64],
        admin
    )
    Test.expect(txResult, Test.beFailed())
}

// ──────────────── Test 12: Fee Estimation ────────────────

access(all) fun testEstimateFees() {
    let result = executeScript(
        "../scripts/estimate_fees.cdc",
        [2592000.0 as UFix64, 1.0 as UFix64, 0.001 as UFix64]
    )
    Test.expect(result, Test.beSucceeded())
}

// ── Helper: advance N blocks ──
access(all) fun tickN(_ n: Int) {
    var i = 0
    while i < n {
        commitBlock()
        i = i + 1
    }
}
