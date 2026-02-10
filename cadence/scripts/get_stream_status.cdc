import "StreamVest"
import "NonFungibleToken"
import "MetadataViews"

access(all) struct StreamStatus {
    access(all) let id: UInt64
    access(all) let totalAmount: UFix64
    access(all) let totalStreamed: UFix64
    access(all) let remaining: UFix64
    access(all) let claimable: UFix64
    access(all) let streamRate: UFix64
    access(all) let startTime: UFix64
    access(all) let endTime: UFix64
    access(all) let lastStreamTime: UFix64
    access(all) let destinationAddress: Address
    access(all) let status: String
    access(all) let progressPercent: UFix64
    access(all) let isActive: Bool

    init(
        id: UInt64,
        totalAmount: UFix64,
        totalStreamed: UFix64,
        remaining: UFix64,
        claimable: UFix64,
        streamRate: UFix64,
        startTime: UFix64,
        endTime: UFix64,
        lastStreamTime: UFix64,
        destinationAddress: Address,
        status: String,
        progressPercent: UFix64,
        isActive: Bool
    ) {
        self.id = id
        self.totalAmount = totalAmount
        self.totalStreamed = totalStreamed
        self.remaining = remaining
        self.claimable = claimable
        self.streamRate = streamRate
        self.startTime = startTime
        self.endTime = endTime
        self.lastStreamTime = lastStreamTime
        self.destinationAddress = destinationAddress
        self.status = status
        self.progressPercent = progressPercent
        self.isActive = isActive
    }
}

access(all) fun main(owner: Address, nftID: UInt64): StreamStatus {
    let account = getAccount(owner)

    let collection = account.capabilities.get<&StreamVest.Collection>(
        StreamVest.CollectionPublicPath
    ).borrow() ?? panic("Could not borrow public StreamVest collection")

    let nft = collection.borrowStreamVestNFT(id: nftID) ?? panic("NFT not found")

    return StreamStatus(
        id: nft.id,
        totalAmount: nft.totalAmount,
        totalStreamed: nft.totalStreamed,
        remaining: nft.getRemainingBalance(),
        claimable: nft.calculateClaimable(),
        streamRate: nft.streamRate,
        startTime: nft.startTime,
        endTime: nft.endTime,
        lastStreamTime: nft.lastStreamTime,
        destinationAddress: nft.destinationAddress,
        status: nft.getStatus(),
        progressPercent: nft.getProgressPercent(),
        isActive: nft.isActive
    )
}
