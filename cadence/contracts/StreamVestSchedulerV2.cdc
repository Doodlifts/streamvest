// StreamVestSchedulerV2.cdc
// Companion contract that integrates StreamVest with Flow's
// scheduled-transaction infrastructure for autonomous streaming.
//
// Priority and executionEffort are configurable per handler so the
// contract never needs to be updated for gas tuning.

import "FlowTransactionScheduler"
import "StreamVest"
import "FlowToken"
import "FungibleToken"

access(all) contract StreamVestSchedulerV2 {

    // ───────── Events ─────────
    access(all) event HandlerCreated(nftID: UInt64, collectionAddress: Address, intervalSeconds: UFix64)
    access(all) event StreamTriggered(nftID: UInt64)
    access(all) event HandlerCompleted(nftID: UInt64)
    access(all) event FeesLow(nftID: UInt64, remainingFees: UFix64)

    // ═══════════════════════════════════════════════════════════════════
    //  ScheduledStreamHandler
    // ═══════════════════════════════════════════════════════════════════

    access(all) resource ScheduledStreamHandler: FlowTransactionScheduler.TransactionHandler {
        access(self) let collectionAddress: Address
        access(self) let nftID: UInt64
        access(self) let intervalSeconds: UFix64
        access(self) let priorityRaw: UInt8
        access(self) let effort: UInt64
        access(all)  var isComplete: Bool
        access(self) var feeVault: @FlowToken.Vault
        access(self) var selfCap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>?

        init(
            collectionAddress: Address,
            nftID: UInt64,
            intervalSeconds: UFix64,
            priorityRaw: UInt8,
            effort: UInt64,
            feeVault: @FlowToken.Vault
        ) {
            self.collectionAddress = collectionAddress
            self.nftID             = nftID
            self.intervalSeconds   = intervalSeconds
            self.priorityRaw       = priorityRaw
            self.effort            = effort
            self.isComplete        = false
            self.feeVault          <- feeVault
            self.selfCap           = nil
        }

        /// Must be called once after storing the handler and issuing its capability.
        access(all) fun setSelfCapability(
            cap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>
        ) {
            pre { self.selfCap == nil: "Self capability already set" }
            self.selfCap = cap
        }

        /// Called by the Flow blockchain at each scheduled interval.
        access(FlowTransactionScheduler.Execute) fun executeTransaction(id: UInt64, data: AnyStruct?) {
            if self.isComplete { return }

            // Borrow the public collection from the owner's account.
            let account = getAccount(self.collectionAddress)
            let collection = account.capabilities
                .get<&StreamVest.Collection>(StreamVest.CollectionPublicPath)
                .borrow()
                ?? panic("StreamVestSchedulerV2: cannot borrow collection")

            // Deliver vested tokens to the destination.
            collection.triggerStream(nftID: self.nftID)
            emit StreamTriggered(nftID: self.nftID)

            // Check if the stream is finished.
            if let nft = collection.borrowStreamVestNFT(id: self.nftID) {
                if !nft.isActive {
                    self.isComplete = true
                    emit HandlerCompleted(nftID: self.nftID)
                    return
                }
            } else {
                self.isComplete = true
                emit HandlerCompleted(nftID: self.nftID)
                return
            }

            // ── Reschedule for the next interval ──
            let nextTime = getCurrentBlock().timestamp + self.intervalSeconds
            let priority = FlowTransactionScheduler.Priority(rawValue: self.priorityRaw)!

            let est = FlowTransactionScheduler.estimate(
                data: nil,
                timestamp: nextTime,
                priority: priority,
                executionEffort: self.effort
            )

            let fee = est.flowFee ?? 0.0
            if fee == 0.0 || self.feeVault.balance < fee {
                emit FeesLow(nftID: self.nftID, remainingFees: self.feeVault.balance)
                return
            }

            let fees <- self.feeVault.withdraw(amount: fee) as! @FlowToken.Vault

            let receipt <- FlowTransactionScheduler.schedule(
                handlerCap: self.selfCap!,
                data: nil,
                timestamp: nextTime,
                priority: priority,
                executionEffort: self.effort,
                fees: <- fees
            )
            destroy receipt
        }

        /// How much FLOW remains for scheduling fees.
        access(all) view fun getFeeBalance(): UFix64 {
            return self.feeVault.balance
        }

        /// Top up the fee vault so the handler can keep rescheduling.
        access(all) fun depositFees(from: @FlowToken.Vault) {
            self.feeVault.deposit(from: <- from)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Factory
    // ═══════════════════════════════════════════════════════════════════

    access(all) fun createHandler(
        collectionAddress: Address,
        nftID: UInt64,
        intervalSeconds: UFix64,
        priorityRaw: UInt8,
        effort: UInt64,
        feeVault: @FlowToken.Vault
    ): @ScheduledStreamHandler {
        emit HandlerCreated(
            nftID: nftID,
            collectionAddress: collectionAddress,
            intervalSeconds: intervalSeconds
        )
        return <- create ScheduledStreamHandler(
            collectionAddress: collectionAddress,
            nftID: nftID,
            intervalSeconds: intervalSeconds,
            priorityRaw: priorityRaw,
            effort: effort,
            feeVault: <- feeVault
        )
    }

    init() {}
}
