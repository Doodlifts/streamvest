import "StreamVest"
import "NonFungibleToken"
import "MetadataViews"

access(all) struct NFTDisplay {
    access(all) let id: UInt64
    access(all) let displayName: String
    access(all) let description: String
    access(all) let thumbnailUrl: String
    access(all) let rawSVG: String

    init(
        id: UInt64,
        displayName: String,
        description: String,
        thumbnailUrl: String,
        rawSVG: String
    ) {
        self.id = id
        self.displayName = displayName
        self.description = description
        self.thumbnailUrl = thumbnailUrl
        self.rawSVG = rawSVG
    }
}

access(all) fun main(owner: Address, nftID: UInt64): NFTDisplay {
    let account = getAccount(owner)

    let collection = account.capabilities.get<&StreamVest.Collection>(
        StreamVest.CollectionPublicPath
    ).borrow() ?? panic("Could not borrow public StreamVest collection")

    let nft = collection.borrowStreamVestNFT(id: nftID) ?? panic("NFT not found")

    let display = nft.resolveView(Type<MetadataViews.Display>())! as! MetadataViews.Display

    return NFTDisplay(
        id: nft.id,
        displayName: display.name,
        description: display.description,
        thumbnailUrl: display.thumbnail.uri(),
        rawSVG: nft.generateSVG()
    )
}
