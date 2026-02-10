import "StreamVest"
import "NonFungibleToken"
import "MetadataViews"

access(all) struct StreamInfo {
    access(all) let id: UInt64
    access(all) let totalAmount: UFix64
    access(all) let totalStreamed: UFix64
    access(all) let status: String
    access(all) let isActive: Bool
    access(all) let destinationAddress: Address

    init(
        id: UInt64,
        totalAmount: UFix64,
        totalStreamed: UFix64,
        status: String,
        isActive: Bool,
        destinationAddress: Address
    ) {
        self.id = id
        self.totalAmount = totalAmount
        self.totalStreamed = totalStreamed
        self.status = status
        self.isActive = isActive
        self.destinationAddress = destinationAddress
    }
}

access(all) fun main(owner: Address): [StreamInfo] {
    let account = getAccount(owner)

    let collection = account.capabilities.get<&StreamVest.Collection>(
        StreamVest.CollectionPublicPath
    ).borrow() ?? panic("Could not borrow public StreamVest collection")

    let ids = collection.getIDs()
    var streams: [StreamInfo] = []

    for id in ids {
        let nft = collection.borrowStreamVestNFT(id: id) ?? panic("Failed to borrow NFT")

        streams.append(StreamInfo(
            id: nft.id,
            totalAmount: nft.totalAmount,
            totalStreamed: nft.totalStreamed,
            status: nft.getStatus(),
            isActive: nft.isActive,
            destinationAddress: nft.destinationAddress
        ))
    }

    return streams
}
