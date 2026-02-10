// mint_and_schedule.cdc
// Mints a StreamVest NFT AND sets up autonomous scheduled streaming
// so tokens are delivered to the destination automatically.
//
// Args:
//   amount            — FLOW to lock in the stream
//   destinationAddress — who receives the streamed tokens
//   durationSeconds   — total vesting duration
//   intervalSeconds   — how often the scheduler triggers delivery
//   feeAmount         — FLOW to pre-fund scheduling fees

import "StreamVest"
import "StreamVestSchedulerV2"
import "NonFungibleToken"
import "FungibleToken"
import "FlowToken"
import "FlowTransactionScheduler"

transaction(
    amount: UFix64,
    destinationAddress: Address,
    durationSeconds: UFix64,
    intervalSeconds: UFix64,
    feeAmount: UFix64
) {
    prepare(signer: auth(Storage, Capabilities) &Account) {

        // ── 1. Ensure collection exists ──
        if signer.storage.borrow<&StreamVest.Collection>(from: StreamVest.CollectionStoragePath) == nil {
            let collection <- StreamVest.createEmptyCollection(nftType: Type<@StreamVest.NFT>())
            signer.storage.save(<-collection, to: StreamVest.CollectionStoragePath)
            let pubCap = signer.capabilities.storage.issue<&StreamVest.Collection>(StreamVest.CollectionStoragePath)
            signer.capabilities.publish(pubCap, at: StreamVest.CollectionPublicPath)
        }

        // ── 2. Withdraw FLOW for the stream + scheduling fees ──
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken vault")

        let streamVault <- flowVault.withdraw(amount: amount) as! @FlowToken.Vault
        let feeVault    <- flowVault.withdraw(amount: feeAmount) as! @FlowToken.Vault

        // ── 3. Mint the stream NFT ──
        let nft <- StreamVest.createStream(
            vault: <- streamVault,
            destination: destinationAddress,
            duration: durationSeconds
        )
        let nftID = nft.id

        // ── 4. Deposit NFT into collection ──
        let collection = signer.storage.borrow<&StreamVest.Collection>(
            from: StreamVest.CollectionStoragePath
        ) ?? panic("Could not borrow collection")
        collection.deposit(token: <- nft)

        // ── 5. Create the scheduled handler (low priority, minimal effort) ──
        let handler <- StreamVestSchedulerV2.createHandler(
            collectionAddress: signer.address,
            nftID: nftID,
            intervalSeconds: intervalSeconds,
            priorityRaw: 2,
            effort: 500,
            feeVault: <- feeVault
        )

        // ── 6. Store the handler ──
        let handlerPath = StoragePath(identifier: "StreamVestHandlerV2_".concat(nftID.toString()))!
        signer.storage.save(<- handler, to: handlerPath)

        // ── 7. Issue Execute capability and set self-reference ──
        let handlerCap = signer.capabilities.storage.issue<
            auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}
        >(handlerPath)

        let handlerRef = signer.storage.borrow<&StreamVestSchedulerV2.ScheduledStreamHandler>(from: handlerPath)
            ?? panic("Could not borrow handler")
        handlerRef.setSelfCapability(cap: handlerCap)

        // ── 8. Estimate fees and schedule the first execution ──
        let firstTime = getCurrentBlock().timestamp + intervalSeconds
        let priority = FlowTransactionScheduler.Priority(rawValue: 2)!

        let est = FlowTransactionScheduler.estimate(
            data: nil,
            timestamp: firstTime,
            priority: priority,
            executionEffort: 500
        )

        let firstFee <- flowVault.withdraw(amount: est.flowFee ?? 0.001) as! @FlowToken.Vault

        let receipt <- FlowTransactionScheduler.schedule(
            handlerCap: handlerCap,
            data: nil,
            timestamp: firstTime,
            priority: priority,
            executionEffort: 500,
            fees: <- firstFee
        )
        destroy receipt
    }

    execute {
        log("Stream minted and scheduled for autonomous delivery!")
    }
}
