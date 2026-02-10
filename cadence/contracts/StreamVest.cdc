// StreamVest.cdc
// A streaming vesting NFT primitive on Flow.
//
// Each StreamVest NFT literally contains a vault of fungible tokens and
// autonomously streams them to a destination address over time using
// Flow's scheduled-transaction infrastructure — zero off-chain deps.

import "NonFungibleToken"
import "ViewResolver"
import "MetadataViews"
import "FungibleToken"
import "FlowToken"

// FlowTransactionScheduler integration lives in the companion
// StreamVestScheduler contract — keeps this contract update-safe.

access(all) contract StreamVest: NonFungibleToken, ViewResolver {

    // ───────── Paths ─────────
    access(all) let CollectionStoragePath: StoragePath
    access(all) let CollectionPublicPath:  PublicPath
    access(all) let MinterStoragePath:     StoragePath

    // ───────── State ─────────
    access(all) var totalSupply: UInt64

    // ───────── Events ─────────
    access(all) event ContractInitialized()
    access(all) event Withdraw(id: UInt64, from: Address?)
    access(all) event Deposit(id: UInt64, to: Address?)
    access(all) event StreamMinted(
        id: UInt64,
        amount: UFix64,
        destination: Address,
        startTime: UFix64,
        endTime: UFix64,
        streamRate: UFix64
    )
    access(all) event TokensStreamed(id: UInt64, amount: UFix64, totalStreamed: UFix64)
    access(all) event StreamCompleted(id: UInt64, totalStreamed: UFix64)
    access(all) event StreamCancelled(id: UInt64, returnedAmount: UFix64)
    access(all) event DestinationUpdated(id: UInt64, newDestination: Address)

    // ───────── Entitlements ─────────
    access(all) entitlement StreamOwner    // owner-facing mutations
    access(all) entitlement StreamExecute  // handler / trigger streaming

    // ═══════════════════════════════════════════════════════════════════
    //  NFT Resource
    // ═══════════════════════════════════════════════════════════════════
    access(all) resource NFT: NonFungibleToken.NFT {

        access(all) let id: UInt64

        // ── Locked vault (the tokens being vested) ──
        access(self) var lockedVault: @FlowToken.Vault

        // ── Vesting parameters ──
        access(all) let totalAmount:  UFix64
        access(all) let startTime:    UFix64
        access(all) let endTime:      UFix64
        access(all) let streamRate:   UFix64   // tokens per second

        // ── Mutable state ──
        access(all) var destinationAddress: Address
        access(all) var totalStreamed:       UFix64
        access(all) var lastStreamTime:     UFix64
        access(all) var isActive:           Bool

        // ── Optional scheduler reference ──
        access(all) var schedulerID: UInt64?

        // ────────────────────── init ──────────────────────
        init(
            id: UInt64,
            vault: @FlowToken.Vault,
            destination: Address,
            startTime: UFix64,
            endTime: UFix64
        ) {
            pre {
                endTime > startTime: "endTime must be after startTime"
                vault.balance > 0.0:  "vault must contain tokens"
            }
            self.id                = id
            self.totalAmount       = vault.balance
            self.startTime         = startTime
            self.endTime           = endTime
            self.destinationAddress = destination
            self.totalStreamed      = 0.0
            self.lastStreamTime    = startTime
            self.isActive          = true
            self.schedulerID       = nil

            let duration = endTime - startTime
            self.streamRate = self.totalAmount / duration

            self.lockedVault <- vault
        }

        // ────────────────────── View helpers ──────────────────────

        /// Total amount vested up to `now` (linearly).
        access(all) view fun calculateVestedAmount(): UFix64 {
            let now = getCurrentBlock().timestamp
            if now <= self.startTime { return 0.0 }
            if now >= self.endTime   { return self.totalAmount }
            let elapsed = now - self.startTime
            var vested  = self.streamRate * elapsed
            if vested > self.totalAmount { vested = self.totalAmount }
            return vested
        }

        /// Tokens that have vested but have not yet been streamed out.
        access(all) view fun calculateClaimable(): UFix64 {
            let vested = self.calculateVestedAmount()
            if vested <= self.totalStreamed { return 0.0 }
            return vested - self.totalStreamed
        }

        /// How many tokens are still inside the vault.
        access(all) view fun getRemainingBalance(): UFix64 {
            return self.lockedVault.balance
        }

        /// Vesting progress as a percentage (0–100).
        access(all) view fun getProgressPercent(): UFix64 {
            if self.totalAmount == 0.0 { return 100.0 }
            return (self.totalStreamed / self.totalAmount) * 100.0
        }

        /// Human-readable status string.
        access(all) view fun getStatus(): String {
            if !self.isActive { return "COMPLETED" }
            let now = getCurrentBlock().timestamp
            if now < self.startTime { return "PENDING" }
            return "STREAMING"
        }

        // ────────────────────── Streaming logic ──────────────────────

        /// Withdraw tokens that have vested since the last stream.
        /// Callable by the Collection on behalf of the scheduler / trigger.
        access(StreamExecute) fun withdrawVestedTokens(): @{FungibleToken.Vault}? {
            if !self.isActive { return nil }

            let now = getCurrentBlock().timestamp
            if now <= self.startTime { return nil }

            let effectiveTime = now >= self.endTime ? self.endTime : now
            let elapsed       = effectiveTime - self.startTime
            var vested        = self.streamRate * elapsed
            if vested > self.totalAmount { vested = self.totalAmount }

            let claimable = vested - self.totalStreamed
            if claimable <= 0.0 { return nil }

            // Guard against rounding: never withdraw more than the vault holds.
            var withdrawAmount = claimable
            if withdrawAmount > self.lockedVault.balance {
                withdrawAmount = self.lockedVault.balance
            }
            if withdrawAmount <= 0.0 { return nil }

            let tokens <- self.lockedVault.withdraw(amount: withdrawAmount)
            self.totalStreamed  = self.totalStreamed + withdrawAmount
            self.lastStreamTime = now

            if self.totalStreamed >= self.totalAmount || self.lockedVault.balance == 0.0 {
                self.isActive = false
                emit StreamCompleted(id: self.id, totalStreamed: self.totalStreamed)
            }

            emit TokensStreamed(
                id: self.id,
                amount: withdrawAmount,
                totalStreamed: self.totalStreamed
            )
            return <- tokens
        }

        // ────────────────────── Owner mutations ──────────────────────

        /// Change the address that receives the streamed tokens.
        access(StreamOwner) fun updateDestination(newAddress: Address) {
            self.destinationAddress = newAddress
            emit DestinationUpdated(id: self.id, newDestination: newAddress)
        }

        /// Cancel the stream and return all remaining tokens.
        access(StreamOwner) fun cancelStream(): @FlowToken.Vault {
            pre  { self.isActive: "Stream is not active" }
            self.isActive = false
            let remaining <- self.lockedVault.withdraw(amount: self.lockedVault.balance)
            emit StreamCancelled(id: self.id, returnedAmount: remaining.balance)
            return <- (remaining as! @FlowToken.Vault)
        }

        // ────────────────────── SVG Generation ──────────────────────

        /// Produce a dynamic SVG reflecting current vesting state.
        access(all) view fun generateSVG(): String {
            let pct        = self.getProgressPercent()
            let remaining  = self.getRemainingBalance()
            let status     = self.getStatus()
            let claimable  = self.calculateClaimable()

            // Tank dimensions
            let tankTop:    UFix64 = 70.0
            let tankHeight: UFix64 = 180.0
            let fillPct = (100.0 - pct) / 100.0   // inverse: full → empty

            var fillHeight = tankHeight * fillPct
            if fillHeight > tankHeight { fillHeight = tankHeight }
            let fillY = tankTop + (tankHeight - fillHeight)

            // Status colour
            var statusColour = "#00d4ff"
            if status == "COMPLETED" { statusColour = "#00ff88" }
            if status == "PENDING"   { statusColour = "#ffaa00" }

            // Build SVG
            var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'>"

            // ── defs (gradient) ──
            svg = svg.concat("<defs>")
            svg = svg.concat("<linearGradient id='fill' x1='0' y1='0' x2='0' y2='1'>")
            svg = svg.concat("<stop offset='0%' stop-color='#00d4ff' stop-opacity='0.9'/>")
            svg = svg.concat("<stop offset='100%' stop-color='#0066cc' stop-opacity='0.9'/>")
            svg = svg.concat("</linearGradient>")
            svg = svg.concat("<linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'>")
            svg = svg.concat("<stop offset='0%' stop-color='#0a0e27'/>")
            svg = svg.concat("<stop offset='100%' stop-color='#121835'/>")
            svg = svg.concat("</linearGradient>")
            svg = svg.concat("</defs>")

            // ── Background ──
            svg = svg.concat("<rect width='400' height='500' rx='20' fill='url(#bg)'/>")

            // ── Border glow ──
            svg = svg.concat("<rect x='2' y='2' width='396' height='496' rx='19' fill='none' stroke='#1a3a5c' stroke-width='1.5'/>")

            // ── Title ──
            svg = svg.concat("<text x='200' y='38' text-anchor='middle' fill='#00d4ff' font-family='monospace' font-size='22' font-weight='bold'>STREAMVEST</text>")
            svg = svg.concat("<text x='200' y='58' text-anchor='middle' fill='#556688' font-family='monospace' font-size='13'>#")
            svg = svg.concat(self.id.toString())
            svg = svg.concat("</text>")

            // ── Tank outline ──
            svg = svg.concat("<rect x='100' y='")
            svg = svg.concat(StreamVest.ufix64ToIntString(tankTop))
            svg = svg.concat("' width='200' height='")
            svg = svg.concat(StreamVest.ufix64ToIntString(tankHeight))
            svg = svg.concat("' rx='10' fill='#0d1230' stroke='#1a3a5c' stroke-width='2'/>")

            // ── Fill level ──
            if fillHeight > 0.0 {
                svg = svg.concat("<rect x='103' y='")
                svg = svg.concat(StreamVest.ufix64ToIntString(fillY))
                svg = svg.concat("' width='194' height='")
                svg = svg.concat(StreamVest.ufix64ToIntString(fillHeight))
                svg = svg.concat("' rx='8' fill='url(#fill)' opacity='0.85'/>")
            }

            // ── Tank label (percentage remaining) ──
            let remainPctStr = StreamVest.ufix64ToDecimalString(100.0 - pct, 1)
            svg = svg.concat("<text x='200' y='")
            let labelY = tankTop + tankHeight / 2.0 + 6.0
            svg = svg.concat(StreamVest.ufix64ToIntString(labelY))
            svg = svg.concat("' text-anchor='middle' fill='white' font-family='monospace' font-size='28' font-weight='bold' opacity='0.9'>")
            svg = svg.concat(remainPctStr)
            svg = svg.concat("%</text>")

            // ── Stream droplets (decorative) ──
            let dropY = tankTop + tankHeight + 10.0
            if status == "STREAMING" {
                svg = svg.concat("<circle cx='190' cy='")
                svg = svg.concat(StreamVest.ufix64ToIntString(dropY))
                svg = svg.concat("' r='3' fill='#00d4ff' opacity='0.7'/>")
                svg = svg.concat("<circle cx='200' cy='")
                svg = svg.concat(StreamVest.ufix64ToIntString(dropY + 8.0))
                svg = svg.concat("' r='2.5' fill='#00d4ff' opacity='0.5'/>")
                svg = svg.concat("<circle cx='210' cy='")
                svg = svg.concat(StreamVest.ufix64ToIntString(dropY + 4.0))
                svg = svg.concat("' r='2' fill='#00d4ff' opacity='0.6'/>")
            }

            // ── Stats block ──
            let statsY = tankTop + tankHeight + 45.0

            svg = svg.concat("<text x='200' y='")
            svg = svg.concat(StreamVest.ufix64ToIntString(statsY))
            svg = svg.concat("' text-anchor='middle' fill='white' font-family='monospace' font-size='14'>Remaining: ")
            svg = svg.concat(StreamVest.ufix64ToDecimalString(remaining, 4))
            svg = svg.concat(" FLOW</text>")

            svg = svg.concat("<text x='200' y='")
            svg = svg.concat(StreamVest.ufix64ToIntString(statsY + 22.0))
            svg = svg.concat("' text-anchor='middle' fill='#8899aa' font-family='monospace' font-size='12'>Streamed: ")
            svg = svg.concat(StreamVest.ufix64ToDecimalString(self.totalStreamed, 4))
            svg = svg.concat(" / ")
            svg = svg.concat(StreamVest.ufix64ToDecimalString(self.totalAmount, 4))
            svg = svg.concat("</text>")

            svg = svg.concat("<text x='200' y='")
            svg = svg.concat(StreamVest.ufix64ToIntString(statsY + 42.0))
            svg = svg.concat("' text-anchor='middle' fill='#00d4ff' font-family='monospace' font-size='12'>Rate: ")
            svg = svg.concat(StreamVest.ufix64ToDecimalString(self.streamRate, 8))
            svg = svg.concat(" FLOW/sec</text>")

            // ── Progress bar ──
            let barY = statsY + 60.0
            svg = svg.concat("<rect x='60' y='")
            svg = svg.concat(StreamVest.ufix64ToIntString(barY))
            svg = svg.concat("' width='280' height='10' rx='5' fill='#0d1230' stroke='#1a3a5c' stroke-width='1'/>")

            let barWidth = 280.0 * pct / 100.0
            if barWidth > 0.0 {
                svg = svg.concat("<rect x='60' y='")
                svg = svg.concat(StreamVest.ufix64ToIntString(barY))
                svg = svg.concat("' width='")
                svg = svg.concat(StreamVest.ufix64ToIntString(barWidth))
                svg = svg.concat("' height='10' rx='5' fill='")
                svg = svg.concat(statusColour)
                svg = svg.concat("'/>")
            }

            // ── Status badge ──
            let badgeY = barY + 32.0
            svg = svg.concat("<text x='200' y='")
            svg = svg.concat(StreamVest.ufix64ToIntString(badgeY))
            svg = svg.concat("' text-anchor='middle' fill='")
            svg = svg.concat(statusColour)
            svg = svg.concat("' font-family='monospace' font-size='14' font-weight='bold'>")
            svg = svg.concat(status)
            svg = svg.concat("</text>")

            svg = svg.concat("</svg>")
            return svg
        }

        // ────────────────────── MetadataViews ──────────────────────

        access(all) view fun getViews(): [Type] {
            return [
                Type<MetadataViews.Display>(),
                Type<MetadataViews.Traits>(),
                Type<MetadataViews.ExternalURL>(),
                Type<MetadataViews.NFTCollectionData>(),
                Type<MetadataViews.NFTCollectionDisplay>()
            ]
        }

        access(all) fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<MetadataViews.Display>():
                    let svg = self.generateSVG()
                    let dataURI = "data:image/svg+xml;utf8,".concat(svg)
                    return MetadataViews.Display(
                        name: "StreamVest #".concat(self.id.toString()),
                        description: "Streaming vesting NFT — "
                            .concat(StreamVest.ufix64ToDecimalString(self.totalAmount, 4))
                            .concat(" FLOW over ")
                            .concat(StreamVest.ufix64ToIntString(self.endTime - self.startTime))
                            .concat(" seconds"),
                        thumbnail: MetadataViews.HTTPFile(url: dataURI)
                    )

                case Type<MetadataViews.Traits>():
                    let traits: [MetadataViews.Trait] = [
                        MetadataViews.Trait(name: "totalAmount",   value: self.totalAmount,   displayType: nil, rarity: nil),
                        MetadataViews.Trait(name: "totalStreamed",  value: self.totalStreamed,  displayType: nil, rarity: nil),
                        MetadataViews.Trait(name: "streamRate",    value: self.streamRate,     displayType: nil, rarity: nil),
                        MetadataViews.Trait(name: "status",        value: self.getStatus(),    displayType: nil, rarity: nil),
                        MetadataViews.Trait(name: "remaining",     value: self.getRemainingBalance(), displayType: nil, rarity: nil)
                    ]
                    return MetadataViews.Traits(traits)

                case Type<MetadataViews.NFTCollectionData>():
                    return StreamVest.resolveContractView(
                        resourceType: Type<@StreamVest.NFT>(),
                        viewType: Type<MetadataViews.NFTCollectionData>()
                    )

                case Type<MetadataViews.NFTCollectionDisplay>():
                    return StreamVest.resolveContractView(
                        resourceType: Type<@StreamVest.NFT>(),
                        viewType: Type<MetadataViews.NFTCollectionDisplay>()
                    )

                case Type<MetadataViews.ExternalURL>():
                    return MetadataViews.ExternalURL("https://flowfoundation.org")
            }
            return nil
        }

        access(all) fun createEmptyCollection(): @{NonFungibleToken.Collection} {
            return <- StreamVest.createEmptyCollection(nftType: Type<@StreamVest.NFT>())
        }

        // ────────────────────── Destroy ──────────────────────
        // When destroyed, any remaining tokens in the vault are also destroyed.
        // Only destroy completed / cancelled streams!
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Collection
    // ═══════════════════════════════════════════════════════════════════
    access(all) resource Collection: NonFungibleToken.Collection {

        access(all) var ownedNFTs: @{UInt64: {NonFungibleToken.NFT}}

        init() {
            self.ownedNFTs <- {}
        }

        // ── Standard NFT ops ──

        access(all) view fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        access(all) view fun getLength(): Int {
            return self.ownedNFTs.length
        }

        access(all) view fun getSupportedNFTTypes(): {Type: Bool} {
            return { Type<@StreamVest.NFT>(): true }
        }

        access(all) view fun isSupportedNFTType(type: Type): Bool {
            return type == Type<@StreamVest.NFT>()
        }

        access(all) fun deposit(token: @{NonFungibleToken.NFT}) {
            let nft <- token as! @StreamVest.NFT
            let id  = nft.id
            let old <- self.ownedNFTs[id] <- nft
            destroy old
            emit Deposit(id: id, to: self.owner?.address)
        }

        access(NonFungibleToken.Withdraw) fun withdraw(withdrawID: UInt64): @{NonFungibleToken.NFT} {
            let nft <- self.ownedNFTs.remove(key: withdrawID)
                ?? panic("StreamVest.Collection.withdraw: NFT not found")
            emit Withdraw(id: withdrawID, from: self.owner?.address)
            return <- nft
        }

        access(all) view fun borrowNFT(_ id: UInt64): &{NonFungibleToken.NFT}? {
            return &self.ownedNFTs[id]
        }

        access(all) fun createEmptyCollection(): @{NonFungibleToken.Collection} {
            return <- StreamVest.createEmptyCollection(nftType: Type<@StreamVest.NFT>())
        }

        // ── StreamVest-specific borrows ──

        /// Public borrow — view functions only.
        access(all) view fun borrowStreamVestNFT(id: UInt64): &StreamVest.NFT? {
            if self.ownedNFTs[id] != nil {
                let ref = &self.ownedNFTs[id] as &{NonFungibleToken.NFT}?
                return ref as! &StreamVest.NFT
            }
            return nil
        }

        // ── Trigger streaming (public — anyone can trigger) ──

        /// Calculates owed tokens for `nftID` and deposits them to the
        /// NFT's configured destination.  Safe for anyone to call: it can
        /// only send tokens to the destination stored inside the NFT.
        access(all) fun triggerStream(nftID: UInt64) {
            let nftRef = (&self.ownedNFTs[nftID] as auth(StreamExecute) &{NonFungibleToken.NFT}?)
                ?? panic("StreamVest: NFT not found")
            let streamNFT = nftRef as! auth(StreamExecute) &StreamVest.NFT

            let tokens <- streamNFT.withdrawVestedTokens()
            if tokens == nil {
                destroy tokens
                return
            }

            let vault <- tokens!

            let receiver = getAccount(streamNFT.destinationAddress)
                .capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
                .borrow()
                ?? panic("StreamVest: destination account has no FLOW receiver capability")

            receiver.deposit(from: <- vault)
        }

        // ── Owner mutations (require entitlement) ──

        access(StreamOwner) fun updateDestination(nftID: UInt64, newAddress: Address) {
            let nftRef = (&self.ownedNFTs[nftID] as auth(StreamOwner) &{NonFungibleToken.NFT}?)
                ?? panic("StreamVest: NFT not found")
            let streamNFT = nftRef as! auth(StreamOwner) &StreamVest.NFT
            streamNFT.updateDestination(newAddress: newAddress)
        }

        access(StreamOwner) fun cancelStream(nftID: UInt64): @FlowToken.Vault {
            let nftRef = (&self.ownedNFTs[nftID] as auth(StreamOwner) &{NonFungibleToken.NFT}?)
                ?? panic("StreamVest: NFT not found")
            let streamNFT = nftRef as! auth(StreamOwner) &StreamVest.NFT
            return <- streamNFT.cancelStream()
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  StreamHandler — Scheduled Transaction Integration
    // ═══════════════════════════════════════════════════════════════════
    //
    // This resource conforms to FlowTransactionScheduler.TransactionHandler.
    // When Flow's scheduler invokes execute(), the handler borrows the
    // owner's Collection via a stored Capability and triggers streaming
    // for the associated NFT.
    //
    // NOTE: FlowTransactionScheduler is currently behind the
    // --scheduled-transactions emulator flag.  On networks where it is
    // unavailable, use the public `triggerStream` function on the
    // Collection instead (manually or via a lightweight cron).
    // ─────────────────────────────────────────────────────────────────

    // Placeholder interface when the scheduler import is not available.
    // Replace with the real FlowTransactionScheduler.TransactionHandler
    // import when deploying with scheduled-tx support.
    access(all) resource interface ITransactionHandler {
        access(all) fun run()
    }

    access(all) resource StreamHandler: ITransactionHandler {
        access(self) let collectionCap: Capability<auth(StreamExecute) &Collection>
        access(self) let nftID: UInt64
        access(self) let intervalSeconds: UFix64
        access(all)  var isComplete: Bool

        init(
            collectionCap: Capability<auth(StreamExecute) &Collection>,
            nftID: UInt64,
            intervalSeconds: UFix64
        ) {
            self.collectionCap    = collectionCap
            self.nftID            = nftID
            self.intervalSeconds  = intervalSeconds
            self.isComplete       = false
        }

        /// Called by the scheduler at each interval.
        access(all) fun run() {
            if self.isComplete { return }

            let collection = self.collectionCap.borrow()
                ?? panic("StreamHandler: cannot borrow collection capability")

            // Trigger the stream — deposits owed tokens to destination.
            collection.triggerStream(nftID: self.nftID)

            // Check if the stream is now finished.
            if let nft = collection.borrowStreamVestNFT(id: self.nftID) {
                if !nft.isActive {
                    self.isComplete = true
                    // When using the real scheduler, do NOT reschedule here.
                    return
                }
            } else {
                // NFT no longer in collection (transferred out?).
                self.isComplete = true
                return
            }

            // When using FlowTransactionSchedulerUtils, reschedule:
            // FlowTransactionSchedulerUtils.Manager.scheduleTransaction(
            //     handler: selfCapability,
            //     executeAfter: getCurrentBlock().timestamp + self.intervalSeconds
            // )
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Minter
    // ═══════════════════════════════════════════════════════════════════
    access(all) resource Minter {

        /// Mint a new StreamVest NFT.
        ///
        /// - vault:       FLOW tokens to lock for vesting
        /// - destination: address that will receive streamed tokens
        /// - duration:    vesting duration in seconds
        access(all) fun mintNFT(
            vault: @FlowToken.Vault,
            destination: Address,
            duration: UFix64
        ): @StreamVest.NFT {
            pre {
                duration > 0.0:       "Duration must be positive"
                vault.balance > 0.0:  "Must deposit tokens"
            }

            let now   = getCurrentBlock().timestamp
            let start = now
            let end   = now + duration
            let id    = StreamVest.totalSupply

            let nft <- create NFT(
                id: id,
                vault: <- vault,
                destination: destination,
                startTime: start,
                endTime: end
            )

            emit StreamMinted(
                id: id,
                amount: nft.totalAmount,
                destination: destination,
                startTime: start,
                endTime: end,
                streamRate: nft.streamRate
            )

            StreamVest.totalSupply = StreamVest.totalSupply + 1
            return <- nft
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Public Stream Creation
    // ═══════════════════════════════════════════════════════════════════

    /// Create a new StreamVest NFT.  Anyone can call this — you lock
    /// your own tokens and choose the destination and duration.
    ///
    /// Returns the NFT; the caller is responsible for depositing it
    /// into their (or someone else's) Collection.
    access(all) fun createStream(
        vault: @FlowToken.Vault,
        destination: Address,
        duration: UFix64
    ): @StreamVest.NFT {
        pre {
            duration > 0.0:       "Duration must be positive"
            vault.balance > 0.0:  "Must deposit tokens"
        }

        let now   = getCurrentBlock().timestamp
        let start = now
        let end   = now + duration
        let id    = self.totalSupply

        let nft <- create NFT(
            id: id,
            vault: <- vault,
            destination: destination,
            startTime: start,
            endTime: end
        )

        emit StreamMinted(
            id: id,
            amount: nft.totalAmount,
            destination: destination,
            startTime: start,
            endTime: end,
            streamRate: nft.streamRate
        )

        self.totalSupply = self.totalSupply + 1
        return <- nft
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Contract-level helpers
    // ═══════════════════════════════════════════════════════════════════

    /// Create a new StreamHandler resource.  The caller must store it and
    /// issue a Capability for the scheduler.
    access(all) fun createStreamHandler(
        collectionCap: Capability<auth(StreamExecute) &Collection>,
        nftID: UInt64,
        intervalSeconds: UFix64
    ): @StreamHandler {
        return <- create StreamHandler(
            collectionCap: collectionCap,
            nftID: nftID,
            intervalSeconds: intervalSeconds
        )
    }

    // ── Numeric → String helpers (view-safe) ──

    /// Convert a UFix64 to an integer string (truncates decimals).
    access(all) view fun ufix64ToIntString(_ value: UFix64): String {
        let str = value.toString()
        // UFix64.toString() returns "123.45600000" — split and take the integer part
        let parts = str.split(separator: ".")
        if parts.length > 0 {
            return parts[0]
        }
        return "0"
    }

    /// Convert a UFix64 to a decimal string with up to `places` decimals.
    access(all) view fun ufix64ToDecimalString(_ value: UFix64, _ places: Int): String {
        let str = value.toString()
        let parts = str.split(separator: ".")

        var intPart = "0"
        var decPart = ""

        if parts.length > 0 {
            intPart = parts[0]
        }
        if parts.length > 1 {
            decPart = parts[1]
        }

        // Trim or pad the decimal part to match the desired places
        if decPart.length > places {
            // Trim: take only the first 'places' characters
            decPart = decPart.slice(from: 0, upTo: places)
        } else {
            // Pad with zeros
            while decPart.length < places {
                decPart = "\(decPart)0"
            }
        }

        if places == 0 { return intPart }
        return "\(intPart).\(decPart)"
    }

    /// Estimate scheduled-tx fees for a given duration and interval.
    /// This is a rough estimate: (duration / interval) * feePerExecution.
    access(all) view fun estimateFees(
        durationSeconds: UFix64,
        intervalSeconds: UFix64,
        feePerExecution: UFix64
    ): UFix64 {
        if intervalSeconds == 0.0 { return 0.0 }
        let executions = durationSeconds / intervalSeconds
        return executions * feePerExecution
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ViewResolver conformance
    // ═══════════════════════════════════════════════════════════════════

    access(all) view fun getContractViews(resourceType: Type?): [Type] {
        return [
            Type<MetadataViews.NFTCollectionData>(),
            Type<MetadataViews.NFTCollectionDisplay>()
        ]
    }

    access(all) fun resolveContractView(resourceType: Type?, viewType: Type): AnyStruct? {
        switch viewType {
            case Type<MetadataViews.NFTCollectionData>():
                return MetadataViews.NFTCollectionData(
                    storagePath: self.CollectionStoragePath,
                    publicPath: self.CollectionPublicPath,
                    publicCollection: Type<&StreamVest.Collection>(),
                    publicLinkedType: Type<&StreamVest.Collection>(),
                    createEmptyCollectionFunction: fun(): @{NonFungibleToken.Collection} {
                        return <- StreamVest.createEmptyCollection(nftType: Type<@StreamVest.NFT>())
                    }
                )

            case Type<MetadataViews.NFTCollectionDisplay>():
                return MetadataViews.NFTCollectionDisplay(
                    name: "StreamVest",
                    description: "Streaming vesting NFTs — fully on-chain token vesting with dynamic SVG visuals.",
                    externalURL: MetadataViews.ExternalURL("https://flowfoundation.org"),
                    squareImage: MetadataViews.Media(
                        file: MetadataViews.HTTPFile(url: "https://flowfoundation.org/streamvest-square.png"),
                        mediaType: "image/png"
                    ),
                    bannerImage: MetadataViews.Media(
                        file: MetadataViews.HTTPFile(url: "https://flowfoundation.org/streamvest-banner.png"),
                        mediaType: "image/png"
                    ),
                    socials: {}
                )
        }
        return nil
    }

    // ═══════════════════════════════════════════════════════════════════
    //  NonFungibleToken conformance
    // ═══════════════════════════════════════════════════════════════════

    access(all) fun createEmptyCollection(nftType: Type): @{NonFungibleToken.Collection} {
        return <- create Collection()
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Initializer
    // ═══════════════════════════════════════════════════════════════════

    init() {
        self.totalSupply = 0

        self.CollectionStoragePath = /storage/StreamVestCollection
        self.CollectionPublicPath  = /public/StreamVestCollection
        self.MinterStoragePath     = /storage/StreamVestMinter

        // Save a Minter to the deployer's account.
        let minter <- create Minter()
        self.account.storage.save(<- minter, to: self.MinterStoragePath)

        // Save an empty Collection for the deployer.
        let collection <- create Collection()
        self.account.storage.save(<- collection, to: self.CollectionStoragePath)

        // Publish a public capability for the collection.
        let cap = self.account.capabilities.storage.issue<&StreamVest.Collection>(
            self.CollectionStoragePath
        )
        self.account.capabilities.publish(cap, at: self.CollectionPublicPath)

        emit ContractInitialized()
    }
}
