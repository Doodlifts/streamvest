import "StreamVest"
import "NonFungibleToken"
import "FungibleToken"
import "FlowToken"

transaction {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Check if the signer already has a collection
        if signer.storage.borrow<&StreamVest.Collection>(from: StreamVest.CollectionStoragePath) != nil {
            return
        }

        // Create a new collection
        let collection <- StreamVest.createEmptyCollection(nftType: Type<@StreamVest.NFT>())

        // Save the collection to storage
        signer.storage.save(<-collection, to: StreamVest.CollectionStoragePath)

        // Create and publish a public capability
        let publicCapability = signer.capabilities.storage.issue<&StreamVest.Collection>(
            StreamVest.CollectionStoragePath
        )
        signer.capabilities.publish(publicCapability, at: StreamVest.CollectionPublicPath)
    }

    execute {
        // Transaction executed successfully
    }
}
